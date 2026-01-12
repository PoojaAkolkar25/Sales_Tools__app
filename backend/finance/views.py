from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Invoice, BankConnection, BankTransaction, ReceiptVoucher, ReceiptAdjustment, BankTransactionStatus, ReceiptStatus, BankTransactionSource
from .serializers import (
    InvoiceSerializer, BankConnectionSerializer, BankTransactionSerializer, 
    ReceiptVoucherSerializer, ReceiptAdjustmentSerializer
)
import csv
import io

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['invoice_no', 'lead__customer_name']

    def get_queryset(self):
        queryset = super().get_queryset()
        customer_name = self.request.query_params.get('customer_name')
        status = self.request.query_params.get('status')
        if customer_name:
            queryset = queryset.filter(lead__customer_name=customer_name)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

class BankConnectionViewSet(viewsets.ModelViewSet):
    queryset = BankConnection.objects.all()
    serializer_class = BankConnectionSerializer

class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.all()
    serializer_class = BankTransactionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['description', 'customer_name']

    @action(detail=False, methods=['post'])
    def sync(self, request):
        import random
        from datetime import date, timedelta
        
        connections = BankConnection.objects.filter(is_active=True)
        if not connections.exists():
             return Response({'error': 'No active bank connections found'}, status=status.HTTP_400_BAD_REQUEST)
             
        today = date.today()
        count = 0
        for conn in connections:
            # Create dummy transactions
            num_transactions = random.randint(1, 3)
            for i in range(num_transactions):
                deposit = random.randint(5000, 50000)
                withdrawal = 0
                tx_date = today - timedelta(days=random.randint(0, 5))
                
                BankTransaction.objects.create(
                    bank_connection=conn,
                    transaction_date=tx_date,
                    description=f"Payment received - REF{random.randint(1000, 9999)}",
                    amount_received=deposit, # Keeping this for legacy compatibility
                    
                    # New Fields
                    transaction_id=f"TXN{random.randint(10000, 99999)}",
                    value_date=tx_date,
                    posted_date=tx_date,
                    cheque_ref_no=f"CHQ{random.randint(100,999)}",
                    transaction_remarks=f"Payment received",
                    withdrawal_amount=withdrawal,
                    deposit_amount=deposit,
                    balance=random.randint(100000, 500000),
                    
                    customer_name=f"Customer {random.randint(1, 10)}", # Mock customer extraction
                    source=BankTransactionSource.AUTO,
                    status=BankTransactionStatus.FOR_REVIEW
                )
                count += 1
                
        return Response({'status': 'Synced successfully', 'count': count})

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        file_obj = request.FILES.get('file')
        bank_type = request.data.get('bank_type', 'generic')
        
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        valid_extensions = ['.csv', '.xlsx', '.xls']
        if not any(file_obj.name.endswith(ext) for ext in valid_extensions):
             return Response({'error': 'Only CSV, XLSX, and XLS files are supported'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = []
            if file_obj.name.endswith('.csv'):
                decoded_file = file_obj.read().decode('utf-8-sig')
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                data = list(reader)
            else:
                import pandas as pd
                # Adjust header based on bank_type
                header_row = 0
                if bank_type == 'icici' and file_obj.name.endswith('.xlsx'):
                    header_row = 16 # ICICI typically has headers at row 17
                
                df = pd.read_excel(file_obj, header=header_row)
                df = df.where(pd.notnull(df), None)
                data = df.to_dict('records')
            
            connection = BankConnection.objects.filter(is_active=True).first()
            if not connection:
                return Response({'error': 'No active bank connections found'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_count = 0
            
            def parse_decimal(value):
                if value is None: return 0
                val_str = str(value).strip().replace(',', '')
                if val_str.lower() in ['', 'nan', 'none']: return 0
                try:
                    return float(val_str)
                except (ValueError, TypeError):
                    return 0
                    
            def parse_date(date_val):
                if not date_val: return None
                if hasattr(date_val, 'date'): return date_val.date()
                
                date_str = str(date_val).strip()
                if date_str.lower() in ['nan', 'nat', 'none', '']: return None

                formats = [
                    '%d/%b/%Y', '%d-%b-%Y', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', 
                    '%d-%b-%y', '%m/%d/%Y', '%m-%d-%Y', '%b %d, %Y'
                ]
                for fmt in formats:
                    try:
                        from datetime import datetime
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                return None

            for row in data:
                try:
                    deposit = 0
                    withdrawal = 0
                    tx_date = None
                    remarks = ''
                    tx_id = ''
                    val_date = None
                    post_date = None
                    cheque_ref = ''
                    balance = 0

                    if bank_type == 'icici':
                        tx_date = parse_date(row.get('Transaction Date'))
                        val_date = parse_date(row.get('Value Date'))
                        tx_id = str(row.get('Tran. Id') or '')
                        cheque_ref = str(row.get('Cheque. No./Ref. No.') or '')
                        remarks = str(row.get('Transaction Remarks') or '')
                        withdrawal = parse_decimal(row.get('Withdrawal Amt (INR)'))
                        deposit = parse_decimal(row.get('Deposit Amt (INR)'))
                        balance = parse_decimal(row.get('Balance (INR)'))
                    
                    elif bank_type == 'idfc':
                        tx_date = parse_date(row.get('Date') or row.get('Transaction Date'))
                        remarks = str(row.get('Narration') or row.get('Description') or '')
                        withdrawal = parse_decimal(row.get('Debit'))
                        deposit = parse_decimal(row.get('Credit'))
                        balance = parse_decimal(row.get('Balance'))
                        tx_id = str(row.get('Ref No./Cheque No.') or '')
                    
                    elif bank_type == 'bofa':
                        tx_date = parse_date(row.get('Date'))
                        remarks = str(row.get('Description') or '')
                        amount = parse_decimal(row.get('Amount'))
                        deposit = amount if amount > 0 else 0
                        withdrawal = abs(amount) if amount < 0 else 0
                        balance = parse_decimal(row.get('Running Bal.') or row.get('Balance'))

                    else: # Generic
                        tx_date = parse_date(row.get('Date') or row.get('Transaction Date'))
                        remarks = str(row.get('Description') or row.get('Remarks') or '')
                        if 'Deposit' in row or 'Withdrawal' in row:
                            deposit = parse_decimal(row.get('Deposit'))
                            withdrawal = parse_decimal(row.get('Withdrawal'))
                        else:
                            amount = parse_decimal(row.get('Amount'))
                            deposit = amount if amount > 0 else 0
                            withdrawal = abs(amount) if amount < 0 else 0
                        balance = parse_decimal(row.get('Balance'))

                    if not tx_date:
                        continue
                     
                    val_date = val_date or tx_date
                    post_date = post_date or tx_date
                    
                    customer_name = str(remarks).split(' ')[0] if remarks else 'Unknown'
                    
                    BankTransaction.objects.create(
                        bank_connection=connection,
                        transaction_date=tx_date,
                        description=remarks,
                        amount_received=deposit,
                        transaction_id=tx_id,
                        value_date=val_date,
                        posted_date=post_date,
                        cheque_ref_no=cheque_ref,
                        transaction_remarks=remarks,
                        withdrawal_amount=withdrawal,
                        deposit_amount=deposit,
                        balance=balance,
                        customer_name=customer_name,
                        source=BankTransactionSource.MANUAL,
                        status=BankTransactionStatus.FOR_REVIEW
                    )
                    created_count += 1
                except Exception as row_err:
                    print(f"Error parsing row: {row_err}")
                    continue
                
            return Response({'status': 'Uploaded successfully', 'count': created_count})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        transaction = self.get_object()
        receipt_ids = request.data.get('receipt_ids', [])
        
        if not receipt_ids:
            return Response({'error': 'No receipt vouchers selected'}, status=status.HTTP_400_BAD_REQUEST)
            
        receipts = ReceiptVoucher.objects.filter(id__in=receipt_ids)
        total_receipt_amount = sum(r.amount_received for r in receipts)
        
        if total_receipt_amount != transaction.amount_received:
            return Response({
                'error': f'Total receipt amount ({total_receipt_amount}) does not match transaction amount ({transaction.amount_received})'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        reconciliation_date = request.data.get('reconciliation_date')
        
        # Perform matching
        for receipt in receipts:
            receipt.bank_transaction = transaction
            receipt.status = ReceiptStatus.RECONCILED
            receipt.save()
            
        transaction.status = BankTransactionStatus.CATEGORIZED
        if reconciliation_date:
            transaction.reconciliation_date = reconciliation_date
        transaction.save()
        
        return Response({'status': 'Transaction matched and categorized'})

    @action(detail=True, methods=['post'])
    def exclude(self, request, pk=None):
        transaction = self.get_object()
        reason = request.data.get('reason', 'Other')
        transaction.status = BankTransactionStatus.EXCLUDED
        transaction.exclusion_reason = reason
        transaction.save()
        return Response({'status': 'Excluded successfully'})

    @action(detail=True, methods=['post'])
    def undo_exclude(self, request, pk=None):
        transaction = self.get_object()
        transaction.status = BankTransactionStatus.FOR_REVIEW
        transaction.exclusion_reason = None
        transaction.save()
        return Response({'status': 'Transaction moved back to for review'})

class ReceiptVoucherViewSet(viewsets.ModelViewSet):
    queryset = ReceiptVoucher.objects.all()
    serializer_class = ReceiptVoucherSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['status', 'payment_date', 'customer_name']
    search_fields = ['receipt_no', 'lead__customer_name', 'customer_name', 'reference_number']

    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['receipt_no', 'lead__customer_name', 'customer_name', 'reference_number']

    def perform_create(self, serializer):
        from decimal import Decimal
        import json
        from leads.models import Lead

        # Try to find a matching lead if customer_name is provided
        customer_name = self.request.data.get('customer_name')
        lead = None
        if customer_name:
            lead = Lead.objects.filter(customer_name=customer_name).first()

        receipt = serializer.save(lead=lead)
        # Handle adjustments
        adjustments_data = self.request.data.get('adjustments', [])
        if isinstance(adjustments_data, str):
            try:
                adjustments_data = json.loads(adjustments_data)
            except json.JSONDecodeError:
                adjustments_data = []
                
        for adj_data in adjustments_data:
            invoice_id = adj_data.get('invoice')
            payment_amount = Decimal(adj_data.get('payment_amount') or 0)
            tds_amount = Decimal(adj_data.get('tds_amount') or 0)
            bank_charges = Decimal(adj_data.get('bank_charges') or 0)
            
            if payment_amount == 0 and tds_amount == 0 and bank_charges == 0:
                continue

            invoice = Invoice.objects.get(id=invoice_id)
            ReceiptAdjustment.objects.create(
                receipt_voucher=receipt,
                invoice=invoice,
                payment_amount=payment_amount,
                tds_amount=tds_amount,
                bank_charges=bank_charges
            )
            
            # Update invoice balance
            invoice.open_balance -= (payment_amount + tds_amount + bank_charges)
            if invoice.open_balance <= 0:
                invoice.open_balance = 0
                invoice.status = 'PAID'
            else:
                invoice.status = 'PARTIAL'
            invoice.save()
            
        # Handle Attachments
        files = self.request.FILES.getlist('attachments')
        for f in files:
            ReceiptAttachment.objects.create(
                receipt_voucher=receipt,
                file=f,
                filename=f.name
            )
