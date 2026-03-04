import datetime
from django.template.loader import render_to_string
from io import BytesIO
from xhtml2pdf import pisa
from finance.models import CompanyProfile, Invoice, InvoiceLineItem, InvoiceStatus, StateMaster
from finance.services import InvoiceService
from .models import MilestoneStatus

class MilestoneService:
    @staticmethod
    def generate_pdf(milestone):
        """
        Generates PDF using xhtml2pdf and the HTML template.
        """
        company = CompanyProfile.objects.first()
        
        context = {
            'milestone': milestone,
            'company': company,
            'now': datetime.date.today(),
            'currency_symbol': '₹' if milestone.sales_order.currency == 'INR' else '$'
        }
        
        html_string = render_to_string('milestones/milestone_pdf.html', context)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
        
        if pisa_status.err:
            raise Exception("Error creating PDF with xhtml2pdf")
            
        return pdf_file.getvalue()

    @staticmethod
    def create_invoice_for_milestone(milestone):
        """
        Logic to create a draft invoice for a milestone.
        """
        from sales_orders.models import SalesOrder
        sales_order = milestone.sales_order
        
        # Logic to find or create Lead/Deal (Shared with create_invoice action)
        lead, deal, cost_sheet = MilestoneService._find_context_for_invoice(sales_order)
        
        new_invoice_no = InvoiceService.generate_invoice_number()
        
        line_items_data = [{
            'type': 'Service',
            'description': f"{milestone.milestone_no}: {milestone.description}",
            'hsn_sac': '998311',
            'quantity': milestone.qty or 1,
            'rate': milestone.amount or 0,
            'discount': 0,
            'gst_rate': 18
        }]
        
        customer_state_id = MilestoneService._get_customer_state_id(sales_order)

        invoice_data = {
            'lead': lead.id if lead else None,
            'deal': deal.id if deal else None,
            'is_gst_applicable': True,
            'customer_state': customer_state_id
        }

        calc_results = InvoiceService.calculate_taxes(invoice_data, line_items_data)
        
        invoice = Invoice.objects.create(
            invoice_no=new_invoice_no,
            invoice_date=datetime.date.today(),
            due_date=milestone.due_date or datetime.date.today(),
            lead=lead,
            deal=deal,
            billing_address=sales_order.billing_address,
            shipping_address=sales_order.shipping_address,
            currency=sales_order.currency,
            invoice_type=calc_results['invoice_type'],
            subtotal=calc_results['subtotal'],
            total_discount=calc_results['total_discount'],
            taxable_amount=calc_results['taxable_amount'],
            total_tax=calc_results['total_tax'],
            sales_tax_rate=calc_results['sales_tax_rate'],
            sales_tax_amount=calc_results['sales_tax_amount'],
            round_off=calc_results['round_off'],
            total_amount=calc_results['total_amount'],
            open_balance=calc_results['total_amount'],
            grand_total_words=calc_results['grand_total_words'],
            status=InvoiceStatus.DRAFT,
            sales_order=sales_order,
            milestone=milestone
        )
        
        for idx, item in enumerate(calc_results['processed_items'], 1):
            InvoiceLineItem.objects.create(
                invoice=invoice,
                sr_no=idx,
                description=item.get('description'),
                hsn_sac=item.get('hsn_sac'),
                quantity=item.get('quantity', 1),
                rate=item.get('rate', 0),
                taxable_value=item.get('taxable_value'),
                discount=item.get('discount', 0),
                cgst_rate=item.get('cgst_rate', 0),
                cgst_amount=item.get('cgst_amount', 0),
                sgst_rate=item.get('sgst_rate', 0),
                sgst_amount=item.get('sgst_amount', 0),
                igst_rate=item.get('igst_rate', 0),
                igst_amount=item.get('igst_amount', 0),
                total_amount=item.get('total_amount')
            )
        
        milestone.invoice = invoice
        milestone.status = MilestoneStatus.INVOICED
        milestone.save(update_fields=['invoice', 'status'])
        return invoice

    @staticmethod
    def _find_context_for_invoice(sales_order):
        lead = None
        deal = None
        cost_sheet = None
        
        estimates = sales_order.estimates.all()
        if estimates.exists():
             estimate = estimates.first()
             deal = estimate.deal
             cost_sheet = estimate.cost_sheet
             if estimate.cost_sheet and estimate.cost_sheet.lead:
                 lead = estimate.cost_sheet.lead
        
        if not lead and sales_order.customer:
             customer_deals = sales_order.customer.deals.all()
             if customer_deals.exists():
                 latest_deal = customer_deals.order_by('-created_at').first()
                 if not deal:
                     deal = latest_deal
                 if latest_deal and latest_deal.lead:
                     lead = latest_deal.lead
             
             if not lead:
                 from leads.models import Lead
                 lead = Lead.objects.filter(customer_name__iexact=sales_order.customer.name).first()

        if not lead:
             try:
                 from leads.models import Lead
                 customer_name = sales_order.customer.name if sales_order.customer else sales_order.customer_name
                 if not customer_name: customer_name = "Unknown Customer"

                 lead = Lead.objects.create(
                    customer_name=customer_name,
                    project_name=f"Generated from SO {sales_order.so_number or 'Draft'}",
                    sales_person=sales_order.assigned_to.username if sales_order.assigned_to else 'System'
                 )
             except Exception as e:
                 logger.error(f"Failed to create fallback lead: {str(e)}")
        
        return lead, deal, cost_sheet

    @staticmethod
    def _get_customer_state_id(sales_order):
        if not sales_order.customer:
            return None
        state_id = None
        if sales_order.customer.state_code:
            state_obj = StateMaster.objects.filter(code=sales_order.customer.state_code).first()
            if state_obj: state_id = state_obj.id
        if not state_id and sales_order.customer.state:
            state_obj = StateMaster.objects.filter(name__iexact=sales_order.customer.state).first()
            if state_obj: state_id = state_obj.id
        return state_id
