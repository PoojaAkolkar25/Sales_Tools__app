from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'finance_companyprofile'")
        columns = [row[0] for row in cursor.fetchall()]
        print("Columns in finance_companyprofile:", columns)
except Exception as e:
    print("Error:", e)
