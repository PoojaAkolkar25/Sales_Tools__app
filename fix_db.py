import sqlite3
import os

db_path = 'backend/db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'deals_%'")
for row in cursor.fetchall():
    print(row[0])
conn.close()
