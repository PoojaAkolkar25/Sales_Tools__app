from decimal import Decimal
from datetime import date, timedelta
import calendar
from django.db import transaction
from .models import RevenueContract, RevenueSchedule, RevenueType, PeriodLock, ConsumptionRecord, FixedBidProgress

def get_days_in_month(year, month):
    return calendar.monthrange(year, month)[1]

def get_days_in_year(year):
    return 366 if calendar.isleap(year) else 365

def calculate_pro_rata_revenue(contract):
    """
    Calculates revenue for License Subscription (Period Basis) and AMC.
    Formula: (Total Amount / days in year) * days in month
    """
    start_date = contract.start_date
    end_date = contract.end_date
    total_amount = contract.total_amount
    
    if not start_date or not end_date:
        return []

    schedules = []
    current_date = start_date
    
    total_days = (end_date - start_date).days + 1
    # Note: BRD uses / 365 days. We'll use 365 for simplicity if not a leap year, or correctly handled.
    # The BRD example: 120,000 / 365 * 30.
    
    while current_date <= end_date:
        year = current_date.year
        month = current_date.month
        
        # Determine the start and end of this month within the contract period
        month_start = date(year, month, 1)
        next_month = month + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year += 1
        month_end = date(next_year, next_month, 1) - timedelta(days=1)
        
        recon_start = max(start_date, month_start)
        recon_end = min(end_date, month_end)
        
        days_in_this_month = (recon_end - recon_start).days + 1
        
        # BRD formula: Total / 365 * days
        # We'll use 365 as per example
        revenue_amount = (total_amount / Decimal(365)) * Decimal(days_in_this_month)
        
        schedules.append({
            'period_month': month_start,
            'amount': revenue_amount.quantize(Decimal('1.00'))
        })
        
        current_date = date(next_year, next_month, 1)
        
    return schedules

def calculate_consumption_revenue(contract):
    """
    Recognize revenue based on monthly billing records.
    """
    consumptions = ConsumptionRecord.objects.filter(contract=contract)
    schedules = []
    for record in consumptions:
        schedules.append({
            'period_month': record.period_month,
            'amount': record.billed_amount
        })
    return schedules

def calculate_perpetual_revenue(contract):
    """
    Recognize the entire amount in the start_date month (billing month).
    """
    if not contract.start_date:
        return []
    
    month_start = date(contract.start_date.year, contract.start_date.month, 1)
    return [{
        'period_month': month_start,
        'amount': contract.total_amount
    }]

def calculate_fixed_bid_revenue(contract):
    """
    Recognize revenue based on completion of contract method (cumulative progress).
    """
    progress_entries = FixedBidProgress.objects.filter(contract=contract).order_by('period_month')
    schedules = []
    
    previous_cumulative_revenue = Decimal(0)
    
    for entry in progress_entries:
        # Revenue to be recognized upto this month
        cumulative_revenue = (contract.total_amount * entry.cumulative_progress_percentage) / Decimal(100)
        # Revenue for this month
        month_revenue = cumulative_revenue - previous_cumulative_revenue
        
        schedules.append({
            'period_month': entry.period_month,
            'amount': month_revenue.quantize(Decimal('1.00'))
        })
        
        previous_cumulative_revenue = cumulative_revenue
        
    return schedules

def calculate_tm_revenue(contract):
    """
    Recognize revenue in the services provided period.
    If multiple months, split based on billed amount or evenly if billed for a range.
    """
    # Assuming start/end dates are provided for the service period
    if not contract.start_date or not contract.end_date:
        return []
        
    # If it's a multi-month range, the BRD says if billed 300,000 for Apr-Jun, it's 100,000 per month.
    # This implies even split per month in the range.
    
    start_month = date(contract.start_date.year, contract.start_date.month, 1)
    end_month = date(contract.end_date.year, contract.end_date.month, 1)
    
    months = []
    curr = start_month
    while curr <= end_month:
        months.append(curr)
        next_month_val = curr.month + 1
        next_year_val = curr.year
        if next_month_val > 12:
            next_month_val = 1
            next_year_val += 1
        curr = date(next_year_val, next_month_val, 1)
        
    count = len(months)
    if count == 0:
        return []
        
    per_month_amount = contract.total_amount / Decimal(count)
    
    schedules = []
    for m in months:
        schedules.append({
            'period_month': m,
            'amount': per_month_amount.quantize(Decimal('1.00'))
        })
        
    return schedules

@transaction.atomic
def compute_revenue_schedule(contract_id):
    """
    Main entry point to compute or re-compute revenue schedules.
    """
    contract = RevenueContract.objects.get(id=contract_id)
    
    # Check if any part of the schedule is already posted/locked
    # If posted, we might want to prevent re-computation or only compute for open periods.
    # For now, let's just compute all and only update non-posted ones.
    
    revenue_type = contract.revenue_type
    calculated_schedules = []
    
    if revenue_type in [RevenueType.LICENSE_PERIOD, RevenueType.AMC_PERPETUAL]:
        calculated_schedules = calculate_pro_rata_revenue(contract)
    elif revenue_type == RevenueType.LICENSE_CONSUMPTION:
        calculated_schedules = calculate_consumption_revenue(contract)
    elif revenue_type == RevenueType.LICENSE_PERPETUAL:
        calculated_schedules = calculate_perpetual_revenue(contract)
    elif revenue_type == RevenueType.PS_FIXED_BID:
        calculated_schedules = calculate_fixed_bid_revenue(contract)
    elif revenue_type == RevenueType.PS_TM:
        calculated_schedules = calculate_tm_revenue(contract)

    # Sync with database
    existing_schedules = {s.period_month: s for s in contract.schedules.all()}
    
    for item in calculated_schedules:
        period = item['period_month']
        amount = item['amount']
        
        # Check if period is locked
        is_locked = PeriodLock.objects.filter(period_month=period, is_locked=True).exists()
        
        if period in existing_schedules:
            obj = existing_schedules[period]
            if not obj.is_posted and not is_locked:
                obj.amount = amount
                obj.save()
        else:
            if not is_locked:
                RevenueSchedule.objects.create(
                    contract=contract,
                    period_month=period,
                    amount=amount
                )

def post_to_gl(period_month):
    """
    Mock function to post revenue to GL.
    In a real system, this would create accounting entries.
    """
    # 1. Check if already posted
    # 2. Mark all schedules for this period as posted
    # 3. Lock the period
    with transaction.atomic():
        schedules = RevenueSchedule.objects.filter(period_month=period_month, is_posted=False)
        for s in schedules:
            s.is_posted = True
            s.gl_entry_reference = f"GL-REV-{period_month.strftime('%Y%m')}-{s.id}"
            s.recognized_at = timezone.now()
            s.save()
        
        PeriodLock.objects.get_or_create(period_month=period_month, defaults={'is_locked': True, 'locked_at': timezone.now()})

def lock_period(period_month, user=None):
    lock, created = PeriodLock.objects.get_or_create(period_month=period_month)
    lock.is_locked = True
    lock.locked_at = timezone.now()
    lock.locked_by = user
    lock.save()
    return lock
