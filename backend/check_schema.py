from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, is_nullable, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deals_deal' 
        AND column_name LIKE '%country%'
        ORDER BY column_name
    """)
    results = cursor.fetchall()
    print("Country-related columns in deals_deal:")
    for row in results:
        print(f"  {row[0]}: nullable={row[1]}, type={row[2]}")
