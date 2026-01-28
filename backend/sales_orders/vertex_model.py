import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig
import google.auth
import google.api_core.exceptions as gae
import json
import mimetypes
import os
import time
import random
from typing import Union, Dict, Any, Optional, Callable
from dotenv import load_dotenv
import logging
from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.errors import PdfReadError
import io
from PIL import Image

# Setup logger
logger = logging.getLogger(__name__)

# --- Configuration ---
load_dotenv()

LOCATION = os.getenv("LOCATION")
MODEL_ID = os.getenv("MODEL_ID") # This should be 'gemini-1.5-flash' in your .env
service_account_key_path = os.getenv('SERVICE_ACCOUNT_KEY_PATH')
FALLBACK_MODEL_ID = os.getenv("FALLBACK_MODEL_ID")

# Initialize Vertex AI (deferred to avoid issues during Django management commands)
_initialized = False
_project_id = None
_model_ready: Optional[bool] = None

def _ensure_initialized():
    global _initialized, _project_id
    if not _initialized:
        try:
            credentials, project_id = google.auth.load_credentials_from_file(service_account_key_path)
            vertexai.init(project=project_id, location=LOCATION, credentials=credentials)
            _project_id = project_id
            _initialized = True
            print(f"Vertex AI initialized for project: {project_id}, location: {LOCATION}")
        except Exception as e:
            print(f"Error initializing Vertex AI: {e}")
            raise

def _get_model():
    _ensure_initialized()
    # Always reload env to catch changes without site restart if possible
    load_dotenv()
    model_id = os.getenv("MODEL_ID", "gemini-2.5-flash")
    fallback_id = os.getenv("FALLBACK_MODEL_ID", FALLBACK_MODEL_ID)

    # Log the ID specifically to debug 404s
    logger.info(f"Using Vertex AI Model ID: {model_id}")

    try:
        return GenerativeModel(model_id)
    except Exception as e:
        err_str = str(e).lower()
        logger.warning("Failed to load model '%s': %s", model_id, err_str)

        # If model not found or access issue, try fallback if provided
        if fallback_id and (isinstance(e, gae.NotFound) or 'not found' in err_str or 'does not have access' in err_str or isinstance(e, gae.PermissionDenied)):
            try:
                logger.info("Attempting fallback model '%s'", fallback_id)
                return GenerativeModel(fallback_id)
            except Exception as e2:
                logger.error("Fallback model '%s' also failed: %s", fallback_id, str(e2))
                raise Exception(f"Both primary model '{model_id}' and fallback '{fallback_id}' failed: {e2}") from e2

        # No fallback or unrelated error: raise with guidance
        guidance = (
            f"Error loading GenerativeModel '{model_id}': {e}. "
            "Ensure MODEL_ID is correct and your project has access to the model, or set FALLBACK_MODEL_ID to a model your project can access."
        )
        logger.error(guidance)
        raise Exception(guidance) from e


def is_model_ready(force_check: bool = False) -> bool:
    """Return True if a Vertex generative model can be initialized and is available.

    Caches the result to avoid repeated expensive API calls and noisy stack traces.
    Set `force_check=True` to re-attempt initialization.
    """
    global _model_ready
    if _model_ready is not None and not force_check:
        return _model_ready

    try:
        _get_model()
        _model_ready = True
    except Exception as e:
        logger.warning("Vertex model not ready: %s", str(e))
        _model_ready = False

    return _model_ready


# Retry configuration
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 1  # seconds
MAX_RETRY_DELAY = 60  # seconds
BACKOFF_FACTOR = 2

class APIRateLimitError(Exception):
    """Custom exception for API rate limiting errors"""
    pass

def exponential_backoff(retry_count):
    """Calculate delay with exponential backoff and jitter"""
    delay = min(INITIAL_RETRY_DELAY * (BACKOFF_FACTOR ** retry_count), MAX_RETRY_DELAY)
    jitter = random.uniform(0, 0.1 * delay)  # Add up to 10% jitter
    total_delay = delay + jitter
    logger.debug(f"Calculated retry delay: {total_delay:.2f} seconds (base: {delay:.2f}, jitter: {jitter:.2f})")
    return total_delay

def process_input(input_data) -> Part:
    """
    Process different types of input data and return the appropriate Part for the API.
    
    Args:
        input_data: Can be a file path (str), text (str), or JSON (dict/str)
        
    Returns:
        Part: Formatted input part for the Vertex AI API
    """
    # If input is a dictionary (already parsed JSON)
    if isinstance(input_data, dict):
        return Part.from_text(json.dumps(input_data, ensure_ascii=False))
    
    # If input is a string, check if it's a file path or JSON string
    if isinstance(input_data, str):
        # Check if it's a valid file path
        if os.path.exists(input_data):
            try:
                # Try to read as binary file first
                with open(input_data, "rb") as f:
                    file_bytes = f.read()
                    
                # Get MIME type
                mime_type, _ = mimetypes.guess_type(input_data)
                if not mime_type:
                    mime_type = "application/octet-stream"
                
                return Part.from_data(file_bytes, mime_type)
            except (IOError, OSError):
                # If file read fails, treat as text
                pass
        
        # Check if it's a JSON string
        try:
            json_data = json.loads(input_data)
            return Part.from_text(json.dumps(json_data, ensure_ascii=False))
        except (json.JSONDecodeError, TypeError):
            # If not JSON, treat as plain text
            return Part.from_text(input_data)
    
    # For any other type, convert to string
    return Part.from_text(str(input_data))

def limit_pdf_pages(file_path: str, max_pages: int = 3) -> str:
    """
    Create a temporary PDF with only the first N pages

    Args:
        file_path: Path to the original PDF
        max_pages: Maximum number of pages to include

    Returns:
        Path to the limited PDF file
    """
    try:
        with open(file_path, 'rb') as file:
            reader = PdfReader(file)
            writer = PdfWriter()

            # Add only the first max_pages pages
            pages_to_add = min(len(reader.pages), max_pages)

            for i in range(pages_to_add):
                writer.add_page(reader.pages[i])

            # Create temporary file
            limited_file_path = file_path.replace('.pdf', f'_limited_{max_pages}pages.pdf')

            with open(limited_file_path, 'wb') as output_file:
                writer.write(output_file)

            logger.info(f"Created limited PDF with {pages_to_add} pages: {limited_file_path}")
            return limited_file_path

    except PdfReadError as e:
        logger.error(f"Invalid or corrupted PDF file: {e}")
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")
    except Exception as e:
        logger.error(f"Error limiting PDF pages: {e}")
        return file_path  # Return original file if limiting fails


def process_input_with_page_limit(input_data, max_pages: int = None) -> tuple[Part, int]:
    """
    Process different types of input data with page limitation and return the appropriate Part for the API.

    Args:
        input_data: Can be a file path (str), text (str), or JSON (dict/str)
        max_pages: Maximum number of pages to process for PDFs

    Returns:
        tuple: (Part object for API, actual_pages_processed)
    """
    actual_pages = 1  # Default for non-PDF files

    # If input is a dictionary (already parsed JSON)
    if isinstance(input_data, dict):
        return Part.from_text(json.dumps(input_data, ensure_ascii=False)), actual_pages

    # If input is a string, check if it's a file path or JSON string
    if isinstance(input_data, str):
        # Check if it's a valid file path
        if os.path.exists(input_data):
            try:
                # Get MIME type
                mime_type, _ = mimetypes.guess_type(input_data)
                if not mime_type:
                    mime_type = "application/octet-stream"

                file_path = input_data

                # Handle PDF page limitation
                if mime_type == "application/pdf" and max_pages is not None:
                    # Get original page count for tracking
                    try:
                        with open(input_data, 'rb') as f:
                            reader = PdfReader(f)
                            total_pages = len(reader.pages)
                            actual_pages = min(total_pages, max_pages)

                        file_path = limit_pdf_pages(input_data, max_pages)
                    except PdfReadError as e:
                        logger.error(f"Invalid or corrupted PDF file: {e}")
                        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")
                    except Exception as e:
                        logger.warning(f"Could not limit PDF pages: {e}, processing full document")
                        actual_pages = 1  # Fallback

                # Read the (possibly limited) file
                with open(file_path, "rb") as f:
                    file_bytes = f.read()

                # Clean up temporary limited file
                if file_path != input_data and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except:
                        pass  # Ignore cleanup errors

                return Part.from_data(file_bytes, mime_type), actual_pages

            except (IOError, OSError):
                # If file read fails, treat as text
                pass

        # Check if it's a JSON string
        try:
            json_data = json.loads(input_data)
            return Part.from_text(json.dumps(json_data, ensure_ascii=False)), actual_pages
        except (json.JSONDecodeError, TypeError):
            # If not JSON, treat as plain text
            return Part.from_text(input_data), actual_pages

    # For any other type, convert to string
    return Part.from_text(str(input_data)), actual_pages


def call_gemini_api_with_streaming(
    prompt_text: str,
    input_data: Optional[Union[str, dict, list]] = None,
    response_mime_type: Optional[str] = None,
    max_retries: int = MAX_RETRIES,
    temperature: float = 0.9,
    top_p: float = 1.0,
    top_k: int = 32,
    max_output_tokens: int = 65000,
    max_pages: int = None,
    progress_callback: Optional[Callable[[str], None]] = None
) -> Dict[str, Any]:
    """
    Call Gemini API with flexible input handling, page limitation, and streaming progress updates.

    Args:
        prompt_text: The prompt text to send to the model (required)
        input_data: Optional - Can be a file path (str), text (str), or JSON (dict/str)
        response_mime_type: Optional MIME type for the response
        max_retries: Maximum number of retry attempts (default: 5)
        temperature: Controls randomness in generation (0.0-1.0)
        top_p: Controls diversity via nucleus sampling (0.0-1.0)
        top_k: Controls diversity by considering top k tokens
        max_output_tokens: Maximum number of tokens to generate
        max_pages: Maximum number of pages to process for PDFs
        progress_callback: Optional callback function for progress updates

    Returns:
        dict: API response with additional metadata about pages processed

    Raises:
        APIRateLimitError: If rate limited and max retries exceeded
        Exception: For other API errors
    """

    def update_progress(message: str):
        if progress_callback:
            progress_callback(message)
        logger.info(f"Progress: {message}")

    for attempt in range(max_retries + 1):
        try:
            update_progress("Preparing document for processing...")

            # Process the input data if provided
            content_parts = []
            actual_pages_processed = 1

            if input_data is not None:
                update_progress("Processing input data...")

                # Handle multiple inputs (list/tuple)
                if isinstance(input_data, (list, tuple)):
                    for item in input_data:
                        part, pages = process_input_with_page_limit(item, max_pages)
                        content_parts.append(part)
                        actual_pages_processed = max(actual_pages_processed, pages)
                else:
                    part, actual_pages_processed = process_input_with_page_limit(input_data, max_pages)
                    content_parts.append(part)

            # Add prompt text (required)
            if not prompt_text and not content_parts:
                raise ValueError("Either prompt_text or input_data must be provided")

            if prompt_text:
                content_parts.append(Part.from_text(prompt_text))

            update_progress("Configuring AI model...")

            # Configure generation parameters
            generation_config = GenerationConfig(
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                max_output_tokens=max_output_tokens,
            )

            # Add response MIME type if specified
            if response_mime_type:
                generation_config.response_mime_type = response_mime_type

            update_progress("Sending request to AI model...")

            try:
                response = _get_model().generate_content(
                    contents=content_parts,
                    generation_config=generation_config,
                    stream=False
                )

                update_progress("Processing AI response...")

                if not response:
                    raise ValueError("API returned empty response")

                # Format response to match the original API structure
                formatted_response = {
                    "candidates": [],
                    "promptFeedback": {
                        "blockReason": None,
                        "safetyRatings": []
                    },
                    "usageMetadata": {
                        "promptTokenCount": 0,
                        "candidatesTokenCount": 0,
                        "totalTokenCount": 0
                    },
                    "pagesProcessed": actual_pages_processed  # Add metadata about pages processed
                }

                # First try to get the response text directly
                response_text = None
                if hasattr(response, 'text'):
                    response_text = response.text
                elif hasattr(response, 'content') and hasattr(response.content, 'text'):
                    response_text = response.content.text

                if response_text:
                    candidate_data = {
                        "content": {
                            "parts": [{"text": response_text}],
                            "role": "model"
                        },
                        "finishReason": None,
                        "safetyRatings": []
                    }
                    formatted_response["candidates"].append(candidate_data)
                else:
                    # Process candidates as before
                    if hasattr(response, 'candidates') and response.candidates:
                        for candidate in response.candidates:
                            if not hasattr(candidate, 'content') or not hasattr(candidate.content, 'parts'):
                                continue

                            candidate_data = {
                                "content": {
                                    "parts": [],
                                    "role": "model"
                                },
                                "finishReason": None,
                                "safetyRatings": []
                            }

                            if hasattr(candidate.content, 'parts') and candidate.content.parts:
                                for part in candidate.content.parts:
                                    if hasattr(part, 'text') and part.text:
                                        candidate_data["content"]["parts"].append({"text": str(part.text)})

                            if candidate_data["content"]["parts"]:
                                formatted_response["candidates"].append(candidate_data)

                # Update usage metadata if available
                if hasattr(response, 'usage_metadata'):
                    if hasattr(response.usage_metadata, 'prompt_token_count'):
                        formatted_response["usageMetadata"]["promptTokenCount"] = response.usage_metadata.prompt_token_count
                    if hasattr(response.usage_metadata, 'candidates_token_count'):
                        formatted_response["usageMetadata"]["candidatesTokenCount"] = response.usage_metadata.candidates_token_count
                    if hasattr(response.usage_metadata, 'total_token_count'):
                        formatted_response["usageMetadata"]["totalTokenCount"] = response.usage_metadata.total_token_count

                update_progress("Document processing completed successfully!")
                return formatted_response

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error processing Gemini API response: {error_msg}", exc_info=True)
                update_progress(f"Error processing response: {error_msg}")
                raise Exception(f"Failed to process API response: {error_msg}") from e

        except Exception as e:
            error_str = str(e).lower()

            # Check for rate limiting or quota errors
            if any(term in error_str for term in ['rate limit', 'quota', '429', 'resource exhausted']):
                if attempt < max_retries:
                    retry_delay = exponential_backoff(attempt)
                    update_progress(f"Rate limited. Retrying in {retry_delay:.2f} seconds... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise APIRateLimitError(
                        f"Max retries ({max_retries}) exceeded due to rate limiting. "
                        f"Please wait before making more requests."
                    )

            # For other errors, retry with exponential backoff
            if attempt < max_retries:
                retry_delay = exponential_backoff(attempt)
                update_progress(f"Request failed: {str(e)}. Retrying in {retry_delay:.2f} seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(retry_delay)
                continue

            update_progress(f"Processing failed: {str(e)}")
            raise Exception(f"API request failed after {max_retries} retries: {str(e)}")


# Legacy function for backward compatibility - now with page limitation
def call_gemini_api(
    prompt_text: str,
    input_data: Optional[Union[str, dict, list]] = None,
    response_mime_type: Optional[str] = None,
    max_retries: int = MAX_RETRIES,
    max_pages: int = None,
    progress_callback: Optional[Callable[[str], None]] = None
) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility with page limitation support.
    """
    return call_gemini_api_with_streaming(
        prompt_text=prompt_text,
        input_data=input_data,
        response_mime_type=response_mime_type,
        max_retries=max_retries,
        max_pages=max_pages,
        progress_callback=progress_callback
    )


def call_gemini_api_with_file(
    file_path: str,
    prompt_text: str,
    response_mime_type: Optional[str] = None,
    max_retries: int = MAX_RETRIES
) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.
    Use call_gemini_api() for more flexible input handling.
    """
    return call_gemini_api(
        prompt_text=prompt_text,
        input_data=file_path,
        response_mime_type=response_mime_type,
        max_retries=max_retries
    )