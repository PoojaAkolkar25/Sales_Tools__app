import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from deals.models import CountryMaster

def fix_integrity_error():
    with connection.cursor() as cursor:
        print("Dropping NOT NULL constraint from country_old...")
        try:
            cursor.execute("ALTER TABLE deals_deal ALTER COLUMN country_old DROP NOT NULL;")
            print("Successfully dropped NOT NULL constraint.")
        except Exception as e:
            print(f"Error dropping constraint: {e}")

        print("\nFetching deals to migrate using raw SQL...")
        cursor.execute("SELECT id, country_old FROM deals_deal WHERE country_id IS NULL AND country_old IS NOT NULL AND country_old != '';")
        rows = cursor.fetchall()
        
        count = 0
        for deal_id, country_name in rows:
            country_name = country_name.strip()
            if country_name:
                print(f"Migrating deal ID {deal_id}: {country_name}")
                country_obj, created = CountryMaster.objects.get_or_create(name=country_name)
                
                # Update using raw SQL to be safe
                cursor.execute("UPDATE deals_deal SET country_id = %s WHERE id = %s;", [country_obj.id, deal_id])
                count += 1
        
        print(f"\nTotal deals migrated: {count}")

if __name__ == "__main__":
    fix_integrity_error()
