import os
import re
import json
from datetime import datetime

try:
    import pdfplumber
except Exception:
    pdfplumber = None

try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None

DATE_PATTERNS = [
    r"(\d{4}-\d{2}-\d{2})",
    r"(\d{2}/\d{2}/\d{4})",
    r"(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})",
]
PO_PATTERNS = [r"\bPO\s*[:#\-]?\s*([A-Za-z0-9\-/]+)", r"Purchase Order\s*[:#\-]?\s*([A-Za-z0-9\-/]+)"]


def _find_po_number(text: str):
    for p in PO_PATTERNS:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _find_date(text: str):
    for p in DATE_PATTERNS:
        m = re.search(p, text)
        if m:
            raw = m.group(1)
            # normalize common formats
            try:
                if "-" in raw:
                    return datetime.strptime(raw, "%Y-%m-%d").date().isoformat()
                if "/" in raw:
                    return datetime.strptime(raw, "%d/%m/%Y").date().isoformat()
                # try day month year
                return datetime.strptime(raw, "%d %b %Y").date().isoformat()
            except Exception:
                return raw
    return None


def _extract_text_with_pdfplumber(path: str):
    pages_text = []
    tables = []
    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            text = p.extract_text() or ""
            pages_text.append(text)
            # try simple table extraction; may be None
            try:
                table = p.extract_table()
                if table:
                    tables.append(table)
            except Exception:
                pass
    return "\n".join(pages_text), tables


def _extract_text_with_pypdf2(path: str):
    pages_text = []
    if PdfReader is None:
        return "", []
    reader = PdfReader(path)
    for p in reader.pages:
        try:
            pages_text.append(p.extract_text() or "")
        except Exception:
            pages_text.append("")
    return "\n".join(pages_text), []


def extract_po(path: str, email_meta: dict = None) -> dict:
    """
    Extract a minimal PO JSON payload from a PDF file. This prototype uses pdfplumber if available
    and falls back to PyPDF2. It performs heuristic header extraction and returns a JSON-like dict
    following the schema from the BRD (with simplified content).
    """
    payload = {
        "source": {
            "attachment_filename": os.path.basename(path),
            "original_pdf_id": None,
        },
        "document": {"pages": 0, "raw_text": "", "parse_warnings": []},
        "header": {},
        "line_items": [],
        "totals": {},
        "mapping": {},
        "metadata": {
            "extraction_engine": None,
            "extraction_timestamp": datetime.utcnow().isoformat() + "Z",
            "processing_time_seconds": 0.0,
        },
    }

    if email_meta:
        payload["source"].update(email_meta)

    if not os.path.exists(path):
        payload["document"]["parse_warnings"].append("file_not_found")
        return payload

    start = datetime.utcnow()
    text = ""
    tables = []

    if pdfplumber is not None:
        try:
            text, tables = _extract_text_with_pdfplumber(path)
            payload["metadata"]["extraction_engine"] = "pdfplumber"
        except Exception:
            text, tables = _extract_text_with_pypdf2(path)
            payload["metadata"]["extraction_engine"] = "PyPDF2"
    else:
        text, tables = _extract_text_with_pypdf2(path)
        payload["metadata"]["extraction_engine"] = "PyPDF2"

    payload["document"]["raw_text"] = text
    payload["document"]["pages"] = text.count("\f") + 1 if text else 0

    # simple heuristics for header fields
    first_400 = text[:2000]
    payload["header"]["po_number"] = {"value": None, "confidence": 0.0}
    po_num = _find_po_number(first_400)
    if po_num:
        payload["header"]["po_number"]["value"] = po_num
        payload["header"]["po_number"]["confidence"] = 0.95

    po_date = _find_date(first_400)
    payload["header"]["po_date"] = {"value": po_date, "confidence": 0.9 if po_date else 0.0}

    # customer: naive first non-empty line
    lines = [ln.strip() for ln in first_400.splitlines() if ln.strip()]
    customer = lines[0] if lines else None
    payload["header"]["customer_name"] = {"value": customer, "confidence": 0.8 if customer else 0.0}

    # simple totals extraction: look for "Total" or "Grand Total"
    grand_total = None
    m = re.search(r"Grand\s+Total[:\s]*([\d,]+\.\d{2})", text, re.IGNORECASE)
    if not m:
        m = re.search(r"Total[:\s]*([\d,]+\.\d{2})", text, re.IGNORECASE)
    if m:
        try:
            grand_total = float(m.group(1).replace(',', ''))
            payload["totals"]["grand_total"] = {"value": grand_total, "confidence": 0.9}
        except Exception:
            pass

    # line items: try to parse simple table if available
    items = []
    if tables:
        # tables is a list of 2D arrays; try first table
        for t in tables:
            # each table row is a list of cells
            for r in t[1:]:
                # naive mapping: item_code, desc, qty, unit_price
                row = [c.strip() if isinstance(c, str) else '' for c in r]
                if len(row) >= 4:
                    try:
                        qty = float(re.sub(r"[^0-9.]", "", row[-2]))
                    except Exception:
                        qty = None
                    try:
                        price = float(re.sub(r"[^0-9.]", "", row[-1]))
                    except Exception:
                        price = None
                    items.append({
                        "line_number": len(items) + 1,
                        "item_code": {"value": row[0], "confidence": 0.8},
                        "description": {"value": row[1], "confidence": 0.8},
                        "quantity": {"value": qty, "confidence": 0.8 if qty is not None else 0.0},
                        "unit_price": {"value": price, "confidence": 0.8 if price is not None else 0.0},
                        "line_total": {"value": (qty * price) if (qty and price) else None, "confidence": 0.0},
                    })
            if items:
                break

    payload["line_items"] = items

    end = datetime.utcnow()
    payload["metadata"]["processing_time_seconds"] = (end - start).total_seconds()

    return payload


if __name__ == "__main__":
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else None
    out = extract_po(p) if p else {"error":"no_file_provided"}
    print(json.dumps(out, indent=2, default=str))
