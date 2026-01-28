import argparse
import json
from extractor import extract_po

parser = argparse.ArgumentParser(description="Run PO extractor on a PDF and print JSON output")
parser.add_argument("pdf", help="Path to PDF file")
args = parser.parse_args()

result = extract_po(args.pdf, email_meta={"email_from":"sample@acme.com","email_subject":"Sample PO"})
print(json.dumps(result, indent=2, default=str))
