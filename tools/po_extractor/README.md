PO Extractor Prototype

This prototype extracts basic PO header fields from a PDF and returns a JSON payload matching the BRD schema (simplified).

Setup

1. Create and activate a Python environment (recommended Python 3.10+).

2. Install dependencies:

```bash
pip install -r tools/po_extractor/requirements.txt
```

Running

Place a sample PO PDF at `tools/po_extractor/samples/` (create the directory). Then run:

```bash
python tools/po_extractor/sample_runner.py tools/po_extractor/samples/PO_sample.pdf
```

Notes

- The prototype uses `pdfplumber` if available and falls back to `PyPDF2`.
- It applies simple regex heuristics for PO number and dates. Table parsing is heuristic and limited.
- This is a starter implementation to validate the JSON schema and extraction flow.

Next steps

- Add more robust table parsing and mapping to master data.
- Integrate OCR for image PDFs (Tesseract or cloud OCR).
- Add unit tests and CI checks.
