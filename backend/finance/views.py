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
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Support CSV and Excel
        valid_extensions = ['.csv', '.xlsx', '.xls']
        if not any(file_obj.name.endswith(ext) for ext in valid_extensions):
             return Response({'error': 'Only CSV, XLSX, and XLS files are supported'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = []
            if file_obj.name.endswith('.csv'):
                decoded_file = file_obj.read().decode('utf-8-sig') # Handle BOM
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                data = list(reader)
            else:
                import pandas as pd
                # User specified headers start at row 17 (index 16)
                # We read skipping 16 rows, so row 17 becomes header
                df = pd.read_excel(file_obj, header=16)
                # Replace NaN with None or empty string for safer get() operations
                df = df.where(pd.notnull(df), None)
                data = df.to_dict('records')
            
            # Use first active connection
            connection = BankConnection.objects.filter(is_active=True).first()
            if not connection:
                return Response({'error': 'No active bank connections found'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_count = 0
            
            def parse_decimal(value):
                if value is None:
                    return 0
                val_str = str(value).strip().lower()
                if val_str == '' or val_str == 'nan' or val_str == 'none':
                    return 0
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return 0
                    
            def parse_date(date_val):
                if not date_val:
                    return None
                if hasattr(date_val, 'date'): # pandas Timestamp
                    return date_val.date()
                
                date_str = str(date_val).strip()
                if date_str.lower() == 'nan' or date_str.lower() == 'nat':
                    return None

                formats = ['%d/%b/%Y', '%d-%b-%Y', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d-%b-%y']
                for fmt in formats:
                    try:
                        from datetime import datetime
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                return None

            for row in data:
                try:
                    # Check for generic 'Amount' or specific 'Deposit Amt (INR)'
                    if 'Deposit Amt (INR)' in row or 'Withdrawal Amt (INR)' in row:
                        deposit = parse_decimal(row.get('Deposit Amt (INR)'))
                        withdrawal = parse_decimal(row.get('Withdrawal Amt (INR)'))
                    else:
                        amount = parse_decimal(row.get('Amount'))
                        deposit = amount if amount > 0 else 0
                        withdrawal = abs(amount) if amount < 0 else 0
                        
                except (ValueError, TypeError):
                    continue
                
                # Parse dates
                tx_date = parse_date(row.get('Transaction Date') or row.get('Date'))
                if not tx_date:
                     from datetime import date
                     tx_date = date.today()
                     
                value_date = parse_date(row.get('Value Date')) or tx_date
                posted_date = parse_date(row.get('Transaction Posted Date')) or tx_date

                remarks = row.get('Transaction Remarks') or row.get('Description') or ''
                
                # Simple customer extraction attempt
                customer_name = str(remarks).split(' ')[0] if remarks else 'Unknown'
                
                BankTransaction.objects.create(
                    bank_connection=connection,
                    transaction_date=tx_date,
                    description=remarks,
                    amount_received=deposit, # Used for matching logic (Receipts assume deposits)
                    
                    # New fields
                    transaction_id=row.get('Tran. Id'),
                    value_date=value_date,
                    posted_date=posted_date,
                    cheque_ref_no=row.get('Cheque. No./Ref. No.'),
                    transaction_remarks=remarks,
                    withdrawal_amount=withdrawal,
                    deposit_amount=deposit,
                    balance=parse_decimal(row.get('Balance (INR)')),
                    
                    customer_name=customer_name,
                    source=BankTransactionSource.MANUAL,
                    status=BankTransactionStatus.FOR_REVIEW
                )
                created_count += 1
                
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
    search_fields = ['receipt_no', 'lead__customer_name', 'reference_number']

    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['receipt_no', 'lead__customer_name', 'reference_number']

    def perform_create(self, serializer):
        from decimal import Decimal
        import json
        receipt = serializer.save()
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
