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
            'customer_code': '',
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
                    "- OUTPUT FORMAT: Return ONLY the raw JSON object. DO NOT include markdown code blocks (like ```json), backticks, or any conversational text.\n"
                    "- CUSTOMER: Identify the BUYER/ISSUER of the PO. IGNORE 'AutomationEdge Technologies' as the customer (they are the supplier).\n"
                    "- PO NUMBER: Extract identifying PO Number (labeled as PO No, Order No, P.O., etc.).\n"
                    "- MAPPING: Match the customer in the PO to one of the EXISTING CUSTOMERS listed below if it's a clear match. If not, return the name as found in the PO.\n\n"
                    "EXISTING CUSTOMERS:\n"
                    f"- {customers_context}\n\n"
                    "OUTPUT JSON SCHEMA:\n"
                    "{\n"
                    "  \"header\": {\n"
                    "    \"customer_name\": {\"value\": string, \"confidence\": number},\n"
                    "    \"customer_code\": {\"value\": string, \"confidence\": number},\n"
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
                    "      \"item_code\": {\"value\": string, \"confidence\": number},\n"
                    "      \"description\": {\"value\": string, \"confidence\": number},\n"
                    "      \"quantity\": {\"value\": number, \"confidence\": number},\n"
                    "      \"unit_price\": {\"value\": number, \"confidence\": number},\n"
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
                                    return datetime.strptime(d_str, fmt).date()
                                except: continue
                            return None

                        # Map parsed JSON into our internal data dict form if present
                        header = parsed.get('header', {})
                        if header:
                            if header.get('customer_name'):
                                data['customer_name'] = header['customer_name'].get('value') or data['customer_name']
                            if header.get('customer_code'):
                                data['customer_code'] = header['customer_code'].get('value') or data['customer_code']
                            if header.get('po_number'):
                                data['po_number'] = header['po_number'].get('value') or data['po_number']
                            if header.get('po_date'):
                                data['po_date'] = _parse_date(header['po_date'].get('value'))
                            if header.get('delivery_date'):
                                data['delivery_date'] = _parse_date(header['delivery_date'].get('value'))
                            if header.get('billing_address'):
                                data['billing_address'] = header['billing_address'].get('value')
                            if header.get('shipping_address'):
                                data['shipping_address'] = header['shipping_address'].get('value')
                            if header.get('currency'):
                                data['currency'] = header['currency'].get('value') or data['currency']

                        items = []
                        for li in parsed.get('line_items', []):
                            try:
                                items.append({
                                    'qty': float(li.get('quantity', {}).get('value') or li.get('qty') or 1),
                                    'description': li.get('description', {}).get('value') or li.get('description') or '',
                                    'rate': float(li.get('unit_price', {}).get('value') or li.get('rate') or 0),
                                    'tax': float(li.get('tax', {}).get('value') or 0),
                                    'discount': float(li.get('discount', {}).get('value') or 0),
                                    'amount': float(li.get('line_total', {}).get('value') or li.get('line_total') or 0)
                                })
                            except Exception:
                                continue

                        if items:
                            data['items'] = items
                            try:
                                data['total_amount'] = float(parsed.get('totals', {}).get('grand_total', {}).get('value') or sum(i['amount'] for i in items))
                            except Exception:
                                data['total_amount'] = sum(i['amount'] for i in items)

                            # If we got items from LLM, return immediately (high-confidence path)
                            return data
                    except json.JSONDecodeError:
                        logger.warning('Vertex LLM returned non-JSON response, falling back to heuristics')
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
                    r'(?:PO|Order|Purchase Order|Ref)\s*(?:No|Number)?\.?[:\s]*([A-Za-z0-9\-\/\.]{2,})',
                    r'([A-Za-z0-9\-]{3,}/[A-Za-z0-9/\-]{8,})' # Matches SO/PO patterns like MACM/IT/PO/2026/015
                ]
                for pattern in po_patterns:
                    match = re.search(pattern, full_text, re.I)
                    if match:
                        data['po_number'] = match.group(1).strip()
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

                # 3. Customer Identification
                # Often the first few lines of the document or near "Bill To"
                top_lines = [l.strip() for l in full_text.split('\n') if l.strip()][:15]
                our_keywords = ['AUTOMATIONEDGE', 'AUTOMATION EDGE', 'TECHNOLOGIES']
                
                bill_to_match = re.search(r'(?:Bill|Ship|Sold|To)[:\s]*\n?(.*?)(?:\n|,|GSTIN|$)', full_text, re.I | re.S)
                if bill_to_match:
                    potential = bill_to_match.group(1).strip().split('\n')[0]
                    if not any(k in potential.upper() for k in our_keywords):
                        data['customer_name'] = potential
                
                if data['customer_name'] == 'Pending Mapping':
                    for line in top_lines:
                        if not any(k in line.upper() for k in our_keywords) and len(line) > 3:
                            # Skip lines that are likely addresses or dates
                            if any(k in line.upper() for k in ['SURVEY', 'FLOOR', 'OFFICE', 'BANER', 'PUNE', 'MUMBAI', 'INDIA', 'DATE']):
                                continue
                            data['customer_name'] = line
                            break

                # 3b. Customer Code
                code_match = re.search(r'(?:Customer|Client|Vendor|Party)\s*(?:Code|ID|Ref)[:\s]*([A-Z0-9\-]{3,})', full_text, re.I)
                if code_match:
                    data['customer_code'] = code_match.group(1).strip()

                # 3c. Billing & Shipping Address
                bill_addr_match = re.search(r'(?:Bill|Sold|Billing)\s*(?:To|Party|Address)?(?:\s*As\s*Per)?[:\s\n]+(.*?)(?:\n\s*\n|Ship|GSTIN|PAN|Item|$)', full_text, re.I | re.S)
                if bill_addr_match:
                    data['billing_address'] = bill_addr_match.group(1).strip()
                
                ship_addr_match = re.search(r'(?:Ship|Deliver|Shipping)\s*(?:To|Party|Address)?[:\s\n]+(.*?)(?:\n\s*\n|Bill|GSTIN|PAN|Item|$)', full_text, re.I | re.S)
                if ship_addr_match:
                    data['shipping_address'] = ship_addr_match.group(1).strip()

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
                        for row in table[1:]:
                            if not row or not any(row): continue
                            desc = str(row[idx_desc]).strip()
                            if len(desc) < 3 or any(k in desc.lower() for k in ['total', 'tax', 'gst', 'bank']): continue
                            
                            try:
                                qty_match = re.search(r'[\d\.]+', re.sub(r'[, ]', '', str(row[idx_qty]))) if idx_qty != -1 else None
                                qty = float(qty_match.group(0)) if qty_match else 1.0
                                
                                amt_match = re.search(r'[\d\.]+', re.sub(r'[, ]', '', str(row[idx_amount]))) if idx_amount != -1 else None
                                amount = float(amt_match.group(0)) if amt_match else 0.0
                                
                                rate_match = re.search(r'[\d\.]+', re.sub(r'[, ]', '', str(row[idx_rate]))) if idx_rate != -1 else None
                                rate = float(rate_match.group(0)) if rate_match else (amount / qty if qty > 0 else 0)
                                
                                tax_match = re.search(r'[\d\.]+', re.sub(r'[, ]', '', str(row[idx_tax]))) if idx_tax != -1 else None
                                tax = float(tax_match.group(0)) if tax_match else 0.0

                                disc_match = re.search(r'[\d\.]+', re.sub(r'[, ]', '', str(row[idx_discount]))) if idx_discount != -1 else None
                                discount = float(disc_match.group(0)) if disc_match else 0.0

                                items_from_table.append({
                                    'qty': qty,
                                    'description': desc.replace('\n', ' '),
                                    'rate': rate,
                                    'tax': tax,
                                    'discount': discount,
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
        
        # Mapping Customer (Try exact match first then partial)
        cust_name = extracted_data['customer_name']
        customer = Customer.objects.filter(name=cust_name).first()
        if not customer:
            clean_name = re.sub(r'\s+(?:Pvt|Private)\s+(?:Ltd|Limited).*', '', cust_name, flags=re.I).strip()
            customer = Customer.objects.filter(name__icontains=clean_name).first()

        # SUPER FALLBACK: Search for ANY existing customer name in the document text
        if not customer and extracted_data.get('full_text'):
            full_text = extracted_data['full_text'].upper()
            all_customers = Customer.objects.all()
            for cand in all_customers:
                # Clean candidate name for better search (remove Pvt Ltd)
                short_cand = re.sub(r'\s+(?:Pvt|Private)\s+(?:Ltd|Limited).*', '', cand.name, flags=re.I).strip().upper()
                if len(short_cand) > 3 and short_cand in full_text:
                    customer = cand
                    break
        
        # Create SO Draft
        so = SalesOrder.objects.create(
            so_number=None,
            customer=customer,
            po_number=extracted_data['po_number'],
            po_date=extracted_data['po_date'],
            delivery_date=extracted_data['delivery_date'],
            customer_code=extracted_data['customer_code'],
            order_date=datetime.now().date(),
            currency=extracted_data['currency'],
            status=SalesOrderStatus.DRAFT,
            po_file=po_file_obj,
            billing_address=extracted_data['billing_address'] or extracted_data['customer_name'],
            shipping_address=extracted_data['shipping_address']
        )
        
        total = 0
        for item in extracted_data['items']:
            product = Product.objects.filter(name__icontains=item['description'][:50]).first()
            SalesOrderItem.objects.create(
                sales_order=so,
                product=product,
                description=item['description'],
                qty=item['qty'],
                rate=item['rate'],
                tax=item.get('tax', 0),
                discount=item.get('discount', 0),
                amount=item['amount']
            )
            total += item['amount']
        
        so.total_amount = total
        so.save()
        return so
