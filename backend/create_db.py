import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

# Connect to 'postgres' database to create new db
try:
    con = psycopg2.connect(
        dbname="postgres",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "root"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432")
    )
    
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = con.cursor()
    
    db_name = "sales_new"
    
    # Check if database exists
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
    exists = cursor.fetchone()
    
    if not exists:
        print(f"Creating database {db_name}...")
        cursor.execute(f"CREATE DATABASE {db_name}")
        print(f"Database {db_name} created successfully.")
    else:
        print(f"Database {db_name} already exists.")
        
    cursor.close()
    con.close()
    
except Exception as e:
    print(f"Error: {e}")
