import pandas as pd
import csv
import io
from datetime import datetime

def test_bofa_csv():
    print("=" * 60)
    print("Testing BoFA CSV: AE INC - Bank of Ameirca (1).csv")
    print("=" * 60)
    
    try:
        with open('AE INC - Bank of Ameirca (1).csv', 'r', encoding='utf-8-sig') as f:
            content = f.read()
            print(f"File size: {len(content)} bytes")
            print(f"First 500 chars:\n{content[:500]}\n")
            
            # Try CSV parsing
            io_string = io.StringIO(content)
            reader = csv.DictReader(io_string)
            data = list(reader)
            print(f"CSV parsed {len(data)} rows")
            if data:
                print(f"First row keys: {list(data[0].keys())}")
                print(f"First row: {data[0]}\n")
    except Exception as e:
        print(f"Error: {e}\n")

def test_idfc_xlsx():
    print("=" * 60)
    print("Testing IDFC XLSX: AE IND - IDFC Bank (1).xlsx")
    print("=" * 60)
    
    try:
        # Header detection
        df_preview = pd.read_excel('AE IND - IDFC Bank (1).xlsx', header=None, nrows=30)
        header_row = 0
        
        for idx, row in df_preview.iterrows():
            row_str = ' '.join(row.astype(str)).lower()
            if 'trans date and time' in row_str and 'transaction details' in row_str:
                header_row = idx
                print(f"Detected header at row {idx}")
                break
        
        # Read data
        df = pd.read_excel('AE IND - IDFC Bank (1).xlsx', header=header_row)
        df = df.where(pd.notnull(df), None)
        records = df.to_dict('records')
        print(f"Read {len(records)} records")
        
        if records:
            print(f"First record keys: {list(records[0].keys())}")
            print(f"First record: {records[0]}")
            
            # Test date parsing
            date_val = records[0].get('Trans Date and Time')
            print(f"\nDate value type: {type(date_val)}")
            print(f"Date value: {date_val}")
            
            if date_val:
                if hasattr(date_val, 'date'):
                    print(f"Has .date() method: {date_val.date()}")
                elif hasattr(date_val, 'to_pydatetime'):
                    print(f"Has .to_pydatetime() method: {date_val.to_pydatetime().date()}")
                else:
                    date_str = str(date_val).strip()
                    print(f"String representation: '{date_str}'")
                    if ' ' in date_str and ':' in date_str:
                        try:
                            parsed = datetime.strptime(date_str.split(' ')[0], '%d/%m/%Y').date()
                            print(f"Parsed date: {parsed}")
                        except Exception as e:
                            print(f"Parse failed: {e}")
        print()
    except Exception as e:
        print(f"Error: {e}\n")

if __name__ == "__main__":
    test_bofa_csv()
    test_idfc_xlsx()
