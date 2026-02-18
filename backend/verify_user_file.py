import pandas as pd
import os
from datetime import datetime

def test_parse_user_file(file_path, bank_type):
    print(f"Testing file: {file_path} as {bank_type}")
    if not os.path.exists(file_path):
        print("File not found.")
        return

    try:
        # 1. Header Detection
        df_preview = pd.read_excel(file_path, header=None, nrows=30)
        header_row = 0
        
        if bank_type == 'idfc':
            for idx, row in df_preview.iterrows():
                row_str = ' '.join(row.astype(str)).lower()
                if 'trans date and time' in row_str and 'transaction details' in row_str:
                    header_row = idx
                    print(f"Detected IDFC header at row {idx}")
                    break
        
        # 2. Read Data
        df = pd.read_excel(file_path, header=header_row)
        df = df.where(pd.notnull(df), None)
        records = df.to_dict('records')
        print(f"Read {len(records)} records")
        
        # 3. Parse Rows
        for i, row in enumerate(records[:5]): # Check first 5
            print(f"\nRow {i}: {row}")
            
            # Simulate views.py logic
            tx_date = None
            date_val = row.get('Trans Date and Time')
            
            if date_val:
                if hasattr(date_val, 'date'): 
                    tx_date = date_val.date()
                elif hasattr(date_val, 'to_pydatetime'):
                     tx_date = date_val.to_pydatetime().date()
                else:
                    date_str = str(date_val).strip()
                    if ' ' in date_str and ':' in date_str:
                        try:
                            tx_date = datetime.strptime(date_str.split(' ')[0], '%d/%m/%Y').date()
                        except:
                            pass
            
            print(f"  Parsed Date: {tx_date}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_parse_user_file('AE IND - IDFC Bank (1).xlsx', 'idfc')
