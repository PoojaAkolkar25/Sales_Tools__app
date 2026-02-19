from sales_orders.models import SalesOrder
from deals.models import Customer
honda = Customer.objects.filter(name__icontains='honda').first()
if honda:
    print(f'Honda ID: {honda.id}')
    sos = SalesOrder.objects.filter(customer=honda)
    print(f'SOs with Honda (count): {sos.count()}')
    for so in sos:
        print(f' SO ID: {so.id}, SO Number: {so.so_number}, Status: {so.status}')
else:
    print('No customer named Honda found')

# Also check for SOs with name Honda but not linked
honda_name_sos = SalesOrder.objects.filter(customer_name__icontains='honda', customer__isnull=True)
print(f'Unlinked SOs with Honda name: {honda_name_sos.count()}')
for so in honda_name_sos:
    print(f' SO ID: {so.id}, Name: {so.customer_name}, Status: {so.status}')
