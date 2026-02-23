import urllib.request
import json
import sys

url = 'http://localhost:8000/api/finance/invoices/5/download_pdf/'
try:
    urllib.request.urlopen(url)
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
    else:
        print(e)
