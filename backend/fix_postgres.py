from django.db import connection
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

with connection.cursor() as cursor:
    try:
        cursor.execute("ALTER TABLE deals_deal RENAME COLUMN country TO country_old")
        print("Renamed country to country_old")
    except Exception as e:
        print(f"Error: {e}")
