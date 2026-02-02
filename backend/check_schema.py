import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, is_nullable, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deals_deal' 
        ORDER BY column_name
    """)
    results = cursor.fetchall()
    print("Columns in deals_deal:")
    for row in results:
        print(f"  {row[0]}: nullable={row[1]}, type={row[2]}")
