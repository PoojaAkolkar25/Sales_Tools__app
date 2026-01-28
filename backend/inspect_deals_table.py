import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def inspect_table():
    with connection.cursor() as cursor:
        # Check columns in deals_deal
        cursor.execute("""
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'deals_deal';
        """)
        columns = cursor.fetchall()
        print("Columns in deals_deal:")
        for col in columns:
            print(f"- {col[0]}: nullable={col[1]}, type={col[2]}")

        # Check data in country_old if it exists
        cursor.execute("""
            SELECT count(*) FROM information_schema.columns 
            WHERE table_name = 'deals_deal' AND column_name = 'country_old';
        """)
        if cursor.fetchone()[0] > 0:
            cursor.execute("SELECT country_old, count(*) FROM deals_deal GROUP BY country_old;")
            data = cursor.fetchall()
            print("\nData in country_old:")
            for row in data:
                print(f"- {row[0]}: {row[1]} records")
        else:
            print("\ncountry_old column does not exist.")

if __name__ == "__main__":
    inspect_table()
