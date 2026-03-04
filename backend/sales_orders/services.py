import re
import json
import pdfplumber
import logging
from datetime import datetime
from .models import SalesOrder, SalesOrderItem, SalesOrderStatus, PurchaseOrderFile
from deals.models import Customer, Product
from django.db import transaction
from . import vertex_model

logger = logging.getLogger(__name__)

class PDFExtractor:
    @staticmethod
    def extract_from_po(file_path):
        """
        Universal heuristic extraction engine.
        Combines PDF table extraction with fuzzy regex line-by-line parsing.
        Resilient to variable formats like HDFC, Mirae, Elitser.
        """
        data = {
            'customer_name': 'Pending Mapping',
            'cust_id': '',
            'po_number': 'N/A',
            'po_date': None,
            'delivery_date': None,
            'billing_address': '',
            'shipping_address': '',
            'items': [],
            'currency': 'INR',
            'total_amount': 0,
            'full_text': ''
        }
        # First attempt: use Vertex AI LLM to extract into strict JSON schema
        if vertex_model.is_model_ready():
            try:
                # Fetch existing customers for context
                existing_customers = list(Customer.objects.values_list('name', flat=True))
                customers_context = "\n- ".join(existing_customers) if existing_customers else "No existing customers found."

                prompt = (
                    "You are an enterprise-grade Purchase Order extraction engine.\n\n"
                    "Input: Text extracted from a customer Purchase Order PDF.\n"
                    "Task: Extract Purchase Order data and return a SINGLE, VALID JSON OBJECT ONLY.\n\n"
                    "STRICT RULES:\n"
                    "- OUTPUT FORMAT: Return ONLY the raw JSON object. DO NOT include markdown code blocks (like ```json), backticks, or any conversational text.\n\n"
                    
                    "- CUSTOMER IDENTIFICATION:\n"
                    "  * The CUSTOMER is the BUYER/ISSUER of the Purchase Order (the company PLACING the order).\n"
                    "  * Look for sections labeled: 'Bill To', 'Sold To', 'Customer', 'Buyer', 'Purchaser', 'Client'.\n"
                    "  * IGNORE 'AutomationEdge Technologies', 'Automation Edge', or any variations - they are the SUPPLIER/VENDOR, NOT the customer.\n"
                    "  * If you see 'Vendor: AutomationEdge', the customer is the OTHER party.\n"
                    "  * Extract the complete company name from the customer section.\n\n"
                    
                    "- PO NUMBER EXTRACTION:\n"
                    "  * Look for labels: 'PO No', 'PO Number', 'Order No', 'Purchase Order #', 'PO Ref', 'Reference No', 'Order Reference'.\n"
                    "  * Extract the COMPLETE number including all parts, dashes, slashes, and alphanumeric characters.\n"
                    "  * Examples: 'PO-2024-001', 'MACM/IT/PO/2026/015', 'ORD-12345-REV2'.\n"
                    "  * Do NOT truncate or abbreviate the PO number.\n\n"
                    
                    "- ADDRESS EXTRACTION (CRITICAL):\n"
                    "  * billing_address: Extract the CUSTOMER's billing address (where they receive invoices).\n"
                    "    - Look for: 'Bill To', 'Billing Address', 'Invoice To', 'Sold To' sections.\n"
                    "    - This should be the CUSTOMER's address, NOT the supplier's address.\n"
                    "    - Include: Company name, street, city, state, postal code, country.\n"
                    "  * shipping_address: Extract the delivery/shipping address (where goods will be delivered).\n"
                    "    - Look for: 'Ship To', 'Delivery Address', 'Shipping Location', 'Deliver To' sections.\n"
                    "    - If shipping address is same as billing, you may copy the billing address.\n"
                    "    - Include: Location name, street, city, state, postal code, country.\n"
                    "  * DO NOT extract AutomationEdge's address as the customer's address.\n\n"
                    
                                        "- LINE ITEMS: This is CRITICAL.\n"
                    "  - Extract every line item with 'item_type', 'description', 'start_date', 'end_date', 'quantity', 'unit_price', and 'line_total'.\n"
                    "  - ITEM_TYPE: Determine if the item is a 'LICENSE' or 'SERVICES'. If it mentions subscription, license, software, use 'LICENSE'. If it mentions implementation, support, consulting, man-days, use 'SERVICES'.\n"
                    "  - DATES: Look for service start and end dates or subscription periods related to the item.\n"
                    "  - DESCRIPTION: Extract the full item name and its particulars. If the PDF has 'Particulars' or 'Item Name' or 'Service' column, use that as the description. If a description spans multiple rows in the PDF table, CONCATENATE them into a single string. Do not split one item into multiple JSON entries unless they have different quantities/prices.\n"
                    "  - DATA TYPES: item_type (string: LICENSE or SERVICES), description (string), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), quantity (number), unit_price (number), line_total (number).\n\n"
                    
                    "- CUSTOMER MATCHING: Match the extracted customer name to one of the EXISTING CUSTOMERS listed below if it's a clear match.\n\n"
                    "EXISTING CUSTOMERS:\n"
                    f"- {customers_context}\n\n"
                    "OUTPUT JSON SCHEMA:\n"
                    "{\n"
                    "  \"header\": {\n"
                    "    \"customer_name\": {\"value\": string, \"confidence\": number},\n"
                    "    \"cust_id\": {\"value\": string, \"confidence\": number},\n"
                    "    \"po_number\": {\"value\": string, \"confidence\": number},\n"
                    "    \"po_date\": {\"value\": \"YYYY-MM-DD\", \"confidence\": number},\n"
                    "    \"delivery_date\": {\"value\": \"YYYY-MM-DD\", \"confidence\": number},\n"
                    "    \"billing_address\": {\"value\": string, \"confidence\": number},\n"
                    "    \"shipping_address\": {\"value\": string, \"confidence\": number},\n"
                    "    \"currency\": {\"value\": string, \"confidence\": number}\n"
                    "  },\n"
                    "  \"line_items\": [\n"
                    "    {\n"
                    "      \"line_number\": number,\n"
                    "      \"item_type\": {\"value\": string, \"confidence\": number, \"note\": \"Must be either LICENSE or SERVICES\"},\n"
                    "      \"item_code\": {\"value\": string, \"confidence\": number},\n"
                    "      \"description\": {\"value\": string, \"confidence\": number},\n"
                    "      \"start_date\": {\"value\": \"YYYY-MM-DD\", \"confidence\": number},\n"
                    "      \"end_date\": {\"value\": \"YYYY-MM-DD\", \"confidence\": number},\n"
                    "      \"quantity\": {\"value\": number, \"confidence\": number},\n"
                    "      \"unit_price\": {\"value\": number, \"confidence\": number},\n"
                    "      \"discount\": {\"value\": number, \"confidence\": number, \"note\": \"Return the ABSOLUTE AMOUNT of discount, not the percentage. If 40% of 7500, return 3000.\"},\n"
                    "      \"tax\": {\"value\": number, \"confidence\": number},\n"
                    "      \"line_total\": {\"value\": number, \"confidence\": number}\n"
                    "    }\n"
                    "  ],\n"
                    "  \"totals\": {\n"
                    "    \"grand_total\": {\"value\": number, \"confidence\": number}\n"
                    "  }\n"
                    "}\n"
                )

                # Ask Vertex to return JSON only; limit pages to first 3 for cost control
                resp = vertex_model.call_gemini_api(
                    prompt_text=prompt,
                    input_data=file_path,
                    response_mime_type='application/json',
                    max_pages=3,
                    max_retries=2
                )

                # Log token usage for cost monitoring
                usage = resp.get('usageMetadata', {})
                total_input = usage.get('promptTokenCount', 0)
                total_output = usage.get('candidatesTokenCount', 0)
                
                # Explicit messages as requested
                msg_input = f"Total input token: {total_input}"
                msg_output = f"Total Output Token: {total_output}"
                logger.info(msg_input)
                logger.info(msg_output)
                print(msg_input)
                print(msg_output)

                # Extract text candidate
                llm_text = None
                if resp.get('candidates'):
                    parts = resp['candidates'][0].get('content', {}).get('parts', [])
                    if parts:
                        llm_text = parts[0].get('text')
                        # Log raw response for verification as requested
                        logger.info(f"Raw LLM Response: {llm_text}")

                if llm_text:
                    try:
                        # Pre-process: Remove potential markdown wrappers if AI ignored instructions
                        llm_text = re.sub(r'^```json\s*|\s*```$', '', llm_text.strip(), flags=re.MULTILINE)
                        parsed = json.loads(llm_text)

                        def _parse_date(d_str):
                            if not d_str: return None
                            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d %b %Y", "%d %B %Y", "%Y/%m/%d"):
                                try:
                                    return datetime.strptime(str(d_str), fmt).date()
                                except: continue
                            return None

                        def _get_val(obj, key, default_val=0):
                            if not isinstance(obj, dict): return default_val
                            val = obj.get(key)
                            if isinstance(val, dict):
                                return val.get('value') or val.get('amount') or default_val
                            return val if val is not None else default_val

                        # Map parsed JSON into our internal data dict form if present
                        header = parsed.get('header')
                        if isinstance(header, dict):
                            if header.get('customer_name'):
                                data['customer_name'] = _get_val(header, 'customer_name', data['customer_name'])
                            if header.get('cust_id'):
                                data['cust_id'] = _get_val(header, 'cust_id', data['cust_id'])
                            if header.get('po_number'):
                                data['po_number'] = _get_val(header, 'po_number', data['po_number'])
                            if header.get('po_date'):
                                data['po_date'] = _parse_date(_get_val(header, 'po_date', ''))
                            if header.get('delivery_date'):
                                data['delivery_date'] = _parse_date(_get_val(header, 'delivery_date', ''))
                            if header.get('billing_address'):
                                data['billing_address'] = _get_val(header, 'billing_address', '')
                            if header.get('shipping_address'):
                                data['shipping_address'] = _get_val(header, 'shipping_address', '')
                            if header.get('currency'):
                                data['currency'] = _get_val(header, 'currency', data['currency'])

                        items = []
                        line_items = parsed.get('line_items')
                        if isinstance(line_items, list):
                            for li in line_items:
                                try:
                                    if not isinstance(li, dict): continue
                                    description = str(_get_val(li, 'description', ''))
                                    if not description:
                                        # Fallback to item_code or item_name if description is uniquely missing
                                        description = str(_get_val(li, 'item_name', '') or _get_val(li, 'item_code', ''))
                                        
                                    item_data = {
                                        'item_type': str(_get_val(li, 'item_type', 'LICENSE')).upper(),
                                        'qty': float(_get_val(li, 'quantity', 1)),
                                        'description': description,
                                        'start_date': _parse_date(_get_val(li, 'start_date', '')),
                                        'end_date': _parse_date(_get_val(li, 'end_date', '')),
                                        'rate': float(_get_val(li, 'unit_price', 0)),
                                        'tax': float(_get_val(li, 'tax', 0)),
                                        'tax_percent': 0.0,
                                        'discount': float(_get_val(li, 'discount', 0)),
                                        'discount_percent': 0.0,
                                        'amount': float(_get_val(li, 'line_total', 0))
                                    }
                                    
                                    # Post-process LLM extraction for discounts
                                    qty = item_data['qty']
                                    rate = item_data['rate']
                                    extracted_amount = item_data['amount']
                                    extracted_discount = item_data['discount']
                                    initial_total = qty * rate
                                    
                                    if extracted_discount > 0 and extracted_amount > 0:
                                        # Check if extracted discount IS the percentage
                                        if extracted_discount <= 100 and abs((initial_total * (1 - extracted_discount/100)) - extracted_amount) < 5.0:
                                            item_data['discount_percent'] = extracted_discount
                                            item_data['discount'] = round(initial_total * (extracted_discount / 100.0), 2)
                                        else:
                                            # If absolute discount matches the amount gap, calculate percentage
                                            if abs((initial_total - extracted_discount + item_data['tax']) - extracted_amount) < 1.0:
                                                item_data['discount'] = extracted_discount
                                                if initial_total > 0:
                                                    item_data['discount_percent'] = round((extracted_discount / initial_total) * 100, 2)
                                            else:
                                                # Fallback to old percentage check
                                                percent_calc = round(initial_total * (extracted_discount / 100.0), 2)
                                                if abs((initial_total - percent_calc + item_data['tax']) - extracted_amount) < 1.0:
                                                    item_data['discount'] = percent_calc
                                                    item_data['discount_percent'] = extracted_discount
                                    elif extracted_amount > 0 and extracted_discount == 0:
                                        if initial_total > extracted_amount:
                                            item_data['discount'] = initial_total + item_data['tax'] - extracted_amount
                                            if initial_total > 0:
                                                item_data['discount_percent'] = round((item_data['discount'] / initial_total) * 100, 2)

                                    items.append(item_data)
                                except Exception as e:
                                    logger.warning(f"Failed to parse line item: {str(e)}")
                                    continue

                        if items:
                            data['items'] = items
                            try:
                                totals = parsed.get('totals', {})
                                if isinstance(totals, dict):
                                    gt = totals.get('grand_total')
                                    gt_val = _get_val(totals, 'grand_total', 0) if gt else 0
                                    data['total_amount'] = float(gt_val or sum(i['amount'] for i in items))
                                else:
                                    data['total_amount'] = sum(i['amount'] for i in items)
                            except Exception:
                                data['total_amount'] = sum(i['amount'] for i in items)

                            # If we got items from LLM, return immediately (high-confidence path)
                            return data
                    except Exception as e:
                        logger.exception("Error during LLM JSON processing")
                        # Fall through to heuristics
            except Exception as e:
                logger.warning('LLM extraction failed, falling back to heuristic parser: %s', str(e))
        else:
            logger.info('Vertex LLM model unavailable, skipping LLM extraction and using heuristic parser')
        
        try:
            with pdfplumber.open(file_path) as pdf:
                full_text = ""
                all_tables = []
                for page in pdf.pages:
                    full_text += (page.extract_text() or "") + "\n"
                    all_tables.extend(page.extract_tables() or [])
                
                # 1. PO Number Extraction (Wide regex net)
                po_patterns = [
                    r'(?:PO|Order|Purchase Order)\s*(?:No|Number)?\.?[:\s]*([A-Za-z0-9\-\/\.]{4,})',
                    r'PO\s*No\.?[:\s]*([A-Za-z0-9\-\/\.]{2,})',
                    r'(?:Ref|Reference)\s*(?:No|Number)?\.?[:\s]*([A-Za-z0-9\-\/\.]{4,})',
                    r'([A-Za-z0-9\-]{3,}/[A-Za-z0-9/\-]{8,})' # Matches SO/PO patterns like MACM/IT/PO/2026/015
                ]
                for pattern in po_patterns:
                    match = re.search(pattern, full_text, re.I)
                    if match:
                        potential_po = match.group(1).strip()
                        # Avoid picking up single words or too short strings that aren't POs
                        if len(potential_po) > 2 and not potential_po.upper().startswith('PR/'):
                             data['po_number'] = potential_po
                             break
                
                # 2. Date Extraction (Multi-format)
                date_patterns = [
                    r'(?:Date|Date of Order)[:\s]+(\d{1,2}[/\-\.\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[/\-\.\s]+\d{2,4})',
                    r'(?:Date|Date of Order)[:\s]+(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                    r'([A-Z][a-z]+\s+\d{1,2},\s+\d{4})', # January 23, 2026
                    r'(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})' # 10 Nov 2025
                ]
                for pattern in date_patterns:
                    match = re.search(pattern, full_text, re.I)
                    if match:
                        date_str = match.group(1).strip()
                        for fmt in ("%d %b %Y", "%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%Y-%m-%d"):
                            try:
                                data['po_date'] = datetime.strptime(date_str, fmt).date()
                                break
                            except: continue
                        if data['po_date']: break

                # 2b. Delivery Date Extraction
                delivery_patterns = [
                    r'(?:Delivery|Ship|Expect|Target)\s*(?:Date|By)[:\s]+(\d{1,2}[/\-\.\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[/\-\.\s]+\d{2,4})',
                    r'(?:Delivery|Ship|Expect|Target)\s*(?:Date|By)[:\s]+(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                ]
                for pattern in delivery_patterns:
                    match = re.search(pattern, full_text, re.I)
                    if match:
                        date_str = match.group(1).strip()
                        for fmt in ("%d %b %Y", "%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%Y-%m-%d"):
                            try:
                                data['delivery_date'] = datetime.strptime(date_str, fmt).date()
                                break
                            except: continue
                        if data['delivery_date']: break

                # 3. Customer Identification (Improved)
                top_lines = [l.strip() for l in full_text.split('\n') if l.strip()][:20]
                our_keywords = ['AUTOMATIONEDGE', 'AUTOMATION EDGE', 'TECHNOLOGIES']
                
                # Try multiple patterns for customer name
                # Pattern 1: Look for "TO" or "TO," followed by company name
                to_match = re.search(r'\bTO[,:]?\s*\n\s*([A-Z][A-Z\s&]+(?:BANK|LIMITED|LTD|PVT|PRIVATE|LLC|INC|CORP)?)', full_text, re.M)
                if to_match:
                    potential = to_match.group(1).strip()
                    if not any(k in potential.upper() for k in our_keywords) and len(potential) > 3:
                        data['customer_name'] = potential
                
                # Pattern 2: Traditional Bill To / Sold To
                if data['customer_name'] == 'Pending Mapping':
                    bill_to_match = re.search(r'(?:Bill|Ship|Sold)\s+(?:To|As Per)[:\s]*\n?([^\n,]+)', full_text, re.I)
                    if bill_to_match:
                        potential = bill_to_match.group(1).strip()
                        if not any(k in potential.upper() for k in our_keywords) and len(potential) > 3:
                            data['customer_name'] = potential
                
                # Pattern 3: Look in top lines for company names (avoiding addresses)
                if data['customer_name'] == 'Pending Mapping':
                    for line in top_lines:
                        if not any(k in line.upper() for k in our_keywords) and len(line) > 3:
                            # Skip address-like lines
                            if any(k in line.upper() for k in ['FLOOR', 'OFFICE', 'STREET', 'ROAD', 'BUILDING', 'TOWER', 'PUNE', 'MUMBAI', 'DELHI', 'INDIA', 'DATE', 'PO NO', 'PURCHASE']):
                                continue
                            # Look for company indicators
                            if any(k in line.upper() for k in ['BANK', 'LIMITED', 'LTD', 'PVT', 'PRIVATE', 'LLC', 'INC', 'CORP', 'CAPITAL', 'ASSET']):
                                data['customer_name'] = line
                                break

                # 3b. Customer Code
                code_match = re.search(r'(?:Customer|Client|Vendor|Party)\s*(?:Code|ID|Ref)[:\s]*([A-Z0-9\-]{3,})', full_text, re.I)
                if code_match:
                    data['cust_id'] = code_match.group(1).strip()

                # 3c. Billing & Shipping Address (Improved)
                # For BILLING ADDRESS: Look for markers followed by multi-line address
                bill_patterns = [
                    r'(?:BILLING\s+ADDRESS|BILL\s+TO)[:\s]*\n([^\n]+(?:\n[^\n]+){1,5}?)(?=\n\s*\n|SHIP|GSTIN|PAN|Item|TRN|Place)',
                    r'\bTO[,:]?\s*\n([A-Z][^\n]+(?:\n[^\n]+){2,8}?)(?=\n\s*\n|Purchase Order|PO No|Date|TRN)',
                    r'(?:Bill|Sold)\s+(?:To|As Per)[:\s]*\n([^\n]+(?:\n[^\n]+){2,8}?)(?=\n\s*\n|Ship|GSTIN|PAN)'
                ]
                for pattern in bill_patterns:
                    bill_addr_match = re.search(pattern, full_text, re.I | re.M)
                    if bill_addr_match:
                        addr = bill_addr_match.group(1).strip()
                        # Clean up the address
                        addr_lines = [l.strip() for l in addr.split('\n') if l.strip()]
                        # Remove lines that are clearly not address
                        addr_lines = [l for l in addr_lines if not any(k in l.upper() for k in ['PURCHASE ORDER', 'PO NO', 'DATE:', 'TRN:', 'DETAILS OF'])]
                        addr = '\n'.join(addr_lines)
                        if not any(k in addr.upper() for k in our_keywords) and len(addr) > 10:
                            data['billing_address'] = addr
                            break
                
                # Fallback for Billing: Look for address after "TO," marker if pattern failed
                if data['billing_address'] == 'Pending Mapping':
                    to_lines_match = re.search(r'\bTO[,:]\s*\n(.*?)(?=\n\s*\n|PO NO|DATE|SHIP)', full_text, re.S | re.I)
                    if to_lines_match:
                        addr_block = to_lines_match.group(1).strip()
                        lines = [l.strip() for l in addr_block.split('\n') if l.strip()]
                        if len(lines) > 2:
                            data['billing_address'] = '\n'.join(lines[1:]) # Skip the first line as it's likely the customer name
                
                # For SHIPPING ADDRESS: Look for "Ship To" or "Place of supply"
                ship_patterns = [
                    r'(?:SHIPPING\s+ADDRESS|SHIP\s+TO|DELIVER\s+TO|BILL\s+SUBMISSION\s+ADDRESS)[:\s]*\n([^\n]+(?:\n[^\n]+){1,5}?)(?=\n\s*\n|Bill|GSTIN|PAN|Item|TRN)',
                    r'(?:Place\s+of\s+supply|Location\s+Address)[:\s]*\n?([^\n]+(?:\n[^\n]+){0,5}?)(?=\n\s*\n|Date|Payment|TRN|Sl\.|Description|Details)'
                ]
                for pattern in ship_patterns:
                    ship_addr_match = re.search(pattern, full_text, re.I | re.M)
                    if ship_addr_match:
                        addr = ship_addr_match.group(1).strip()
                        addr_lines = [l.strip() for l in addr.split('\n') if l.strip()]
                        addr_lines = [l for l in addr_lines if not any(k in l.upper() for k in ['DATE:', 'PAYMENT', 'TRN:', 'PLACE OF', 'LOCATION'])]
                        addr = '\n'.join(addr_lines)
                        if not any(k in addr.upper() for k in our_keywords) and len(addr) > 10:
                            data['shipping_address'] = addr
                            break

                # 4. Currency
                if any(c in full_text.upper() for c in ['$', 'USD', 'DOLLAR']):
                    data['currency'] = 'USD'

                # 5. Item Extraction (Hybrid Method)
                # Method A: Table Parsing
                items_from_table = []
                for table in all_tables:
                    if not table or len(table) < 2: continue
                    headers = [str(c).lower() for c in table[0] if c]
                    
                    # Fuzzy identify column indices
                    idx_desc = next((i for i, h in enumerate(headers) if any(k in h for k in ['desc', 'item', 'service', 'particular'])), -1)
                    idx_qty = next((i for i, h in enumerate(headers) if any(k in h for k in ['qty', 'quantity', 'ship', 'bill'])), -1)
                    idx_rate = next((i for i, h in enumerate(headers) if any(k in h for k in ['rate', 'price', 'unit', 'cost'])), -1)
                    idx_tax = next((i for i, h in enumerate(headers) if any(k in h for k in ['tax', 'gst', 'vat'])), -1)
                    idx_discount = next((i for i, h in enumerate(headers) if any(k in h for k in ['disc', 'off', 'less'])), -1)
                    idx_amount = next((i for i, h in enumerate(headers) if any(k in h for k in ['amount', 'total', 'charge', 'value', 'price'])), -1)
                    
                    if idx_desc != -1:
                        for row_idx, row in enumerate(table[1:]):
                            if not row or not any(row): continue
                            desc = str(row[idx_desc]).strip()
                            if len(desc) < 3 or any(k in desc.lower() for k in ['total', 'tax', 'gst', 'bank', 'rupees']): continue
                            
                            # Concatenate subsequent rows if they only contain description text (no numbers in other columns)
                            look_ahead = row_idx + 2
                            while look_ahead < len(table):
                                next_row = table[look_ahead]
                                if not next_row: break
                                # If next row has something in desc but NO obvious numbers in qty/amount columns
                                next_desc = str(next_row[idx_desc]).strip()
                                next_qty = str(next_row[idx_qty]).strip() if idx_qty != -1 else ""
                                next_amt = str(next_row[idx_amount]).strip() if idx_amount != -1 else ""
                                
                                # If desc exists but quantities are missing, it's a continuation
                                if next_desc and not re.search(r'\d', next_qty) and not re.search(r'\d', next_amt):
                                    desc += " " + next_desc
                                    look_ahead += 1
                                else:
                                    break

                            try:
                                # Extract numbers cleaning common symbols
                                def _clean_num(val):
                                    return re.sub(r'[^0-9\.]', '', str(val))

                                qty_str = _clean_num(row[idx_qty]) if idx_qty != -1 else ""
                                qty = float(qty_str) if qty_str else 1.0
                                
                                amt_str = _clean_num(row[idx_amount]) if idx_amount != -1 else ""
                                amount = float(amt_str) if amt_str else 0.0
                                
                                rate_str = _clean_num(row[idx_rate]) if idx_rate != -1 else ""
                                rate = float(rate_str) if rate_str else (amount / qty if qty > 0 else 0)
                                
                                # Better Tax/Discount heuristics for tables:
                                # Redefine tax/disc indices for robustness
                                tax_val, is_tax_percent = 0.0, False
                                disc_val, is_disc_percent = 0.0, False

                                tax_indices = [i for i, h in enumerate(headers) if any(k in h for k in ['tax', 'gst', 'vat'])]
                                disc_indices = [i for i, h in enumerate(headers) if any(k in h for k in ['disc', 'off', 'less'])]

                                for idx in tax_indices:
                                    val_s = _clean_num(row[idx])
                                    if val_s:
                                        tax_val = float(val_s)
                                        is_tax_percent = '%' in headers[idx]
                                        break
                                
                                for idx in disc_indices:
                                    val_s = _clean_num(row[idx])
                                    if val_s:
                                        disc_val = float(val_s)
                                        is_disc_percent = '%' in headers[idx]
                                        break

                                # Calculate absolute values
                                initial_total = qty * rate
                                discount = initial_total * (disc_val / 100.0) if is_disc_percent else disc_val
                                tax = (initial_total - discount) * (tax_val / 100.0) if is_tax_percent else tax_val

                                items_from_table.append({
                                    'qty': qty,
                                    'description': desc.replace('\n', ' ').strip(),
                                    'rate': rate,
                                    'tax': tax,
                                    'tax_percent': tax_val if is_tax_percent else 0,
                                    'discount': discount,
                                    'discount_percent': disc_val if is_disc_percent else 0,
                                    'amount': amount or (qty * rate + tax - discount)
                                })
                            except: continue
                
                # Method B: Text-Line Parsing (Fallback if table failed)
                if not items_from_table:
                    # Look for lines with Qty + Rate + Amount patterns
                    # Regex: [Description...] [Qty] [Rate] [Amount]
                    lines = full_text.split('\n')
                    for line in lines:
                        # Matches: "Software Enhancement 1.00 317,520.00 ..."
                        match = re.search(r'(.+?)\s+(\d+(?:\.\d+)?)\s+[\w/]*\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})', line)
                        if match:
                            desc = match.group(1).strip()
                            if 'TOTAL' in desc.upper(): continue
                            try:
                                qty = float(match.group(2))
                                rate = float(re.sub(r'[,]', '', match.group(3)))
                                amount = float(re.sub(r'[,]', '', match.group(4)))
                                items_from_table.append({
                                    'qty': qty,
                                    'description': desc,
                                    'rate': rate,
                                    'amount': amount
                                })
                            except: continue
                            
                data['full_text'] = full_text
                data['items'] = items_from_table
                data['total_amount'] = sum(item['amount'] for item in data['items'])

        except Exception as e:
            logger.error(f"PO Extraction Failed: {str(e)}")
            # Even if it fails, we return the N/A data so a Draft can still be created
            pass
            
        return data

class SalesOrderCreator:
    @staticmethod
    @transaction.atomic
    def create_from_po(po_file_obj):
        """
        Creates a Draft Sales Order from extracted PDF data.
        Guarantees creation even with partial data.
        """
        extracted_data = PDFExtractor.extract_from_po(po_file_obj.file.path)
        
        # Log extraction results for debugging
        logger.info(f"Extracted Data Summary:")
        logger.info(f"  Customer Name: {extracted_data.get('customer_name', 'N/A')}")
        logger.info(f"  PO Number: {extracted_data.get('po_number', 'N/A')}")
        logger.info(f"  Billing Address: {extracted_data.get('billing_address', 'N/A')[:100]}...")  # First 100 chars
        logger.info(f"  Shipping Address: {extracted_data.get('shipping_address', 'N/A')[:100]}...")
        logger.info(f"  Line Items Count: {len(extracted_data.get('items', []))}")
        
        # Check for existing PO number (excluding cancelled) to avoid duplicate drafts
        po_num = extracted_data.get('po_number')
        if po_num and po_num != 'N/A':
            existing_so = SalesOrder.objects.filter(po_number__iexact=po_num).exclude(status='CANCELLED').first()
            if existing_so:
                logger.info(f"Duplicate PO found: {po_num} in SO {existing_so.id}")
                # We raise an exception which will be caught in the view
                raise Exception(f"PO Number {po_num} already exists. Check first PO (ID: {existing_so.id}).")
        
        # Use extracted customer name directly
        cust_name = extracted_data.get('customer_name', 'Pending Mapping')
        
        # Automated Customer Mapping (Improved)
        customer_obj = None
        if cust_name and cust_name != 'Pending Mapping':
            # Normalize the extracted name for better matching
            normalized_name = cust_name.strip()
            
            # Try exact match (case-insensitive)
            customer_obj = Customer.objects.filter(name__iexact=normalized_name).first()
            
            # If not found, try word-by-word matching (handles "HDFC BANK" vs "HDFC Bank")
            if not customer_obj and len(normalized_name) > 4:
                # Split into words and try matching each significant word
                words = [w for w in normalized_name.split() if len(w) > 2]  # Ignore short words like "&", "OF"
                if words:
                    # Try matching on the first significant word (e.g., "HDFC" in "HDFC BANK")
                    customer_obj = Customer.objects.filter(name__icontains=words[0]).first()
                    
                    # If multiple matches possible, try to match more words
                    if not customer_obj and len(words) > 1:
                        # Try matching first two words
                        search_term = ' '.join(words[:2])
                        customer_obj = Customer.objects.filter(name__icontains=search_term).first()
            
            # Log the matching attempt
            if customer_obj:
                logger.info(f"Customer matching: '{normalized_name}' -> '{customer_obj.name}'")
        
        # BRD Requirement: If no customer match is found, display "Not Customer Match"
        if not customer_obj:
            logger.info(f"No customer match found for: {cust_name}")
            cust_name = 'Not Customer Match'
        else:
            logger.info(f"Matched customer: {customer_obj.name}")
        
        # Create SO Draft
        so = SalesOrder.objects.create(
            so_number=None,
            customer=customer_obj, 
            customer_name=cust_name,
            po_number=extracted_data['po_number'],
            po_date=extracted_data['po_date'],
            delivery_date=extracted_data['delivery_date'],
            cust_id=extracted_data['cust_id'],
            order_date=datetime.now().date(),
            currency=extracted_data['currency'],
            status=SalesOrderStatus.DRAFT,
            po_file=po_file_obj,
            billing_address=extracted_data.get('billing_address', '') or '',
            shipping_address=extracted_data.get('shipping_address', '') or ''
        )
        
        total = 0
        for item in extracted_data['items']:
            SalesOrderItem.objects.create(
                sales_order=so,
                item_type=item.get('item_type', 'LICENSE'),
                product=None,
                product_name="", # Empty per user request
                description=item.get('description', ""), # Populate from item description
                start_date=item.get('start_date'),
                end_date=item.get('end_date'),
                qty=item['qty'],
                rate=item['rate'],
                tax=item.get('tax', 0),
                tax_percent=item.get('tax_percent', 0),
                discount=item.get('discount', 0),
                discount_percent=item.get('discount_percent', 0),
                amount=item['amount']
            )
            total += item['amount']
        
        so.total_amount = total
        so.save()
        return so
