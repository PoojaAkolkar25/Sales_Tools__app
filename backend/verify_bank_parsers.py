import pandas as pd
import io
import os
from datetime import datetime, date

def create_mock_idfc():
    # IDFC: Header at row 18 (index 17) approx
    data = {
        'Trans Date and Time': ['04/12/2025 10:30:28', '04/12/2025 13:07:21'],
        'Value Date': ['04/12/2025', '04/12/2025'],
        'Transaction Details': ['CMS_IFT IDFC Accounts Payable', '54794670/Automationedge Technologies'],
        'Ref/Cheque No': ['', ''],
        'Debit': [0, 1100000],
        'Credit': [1000000, 0],
        'Balance': [1279.10, 1279.10]
    }
    df = pd.DataFrame(data)
    # create a larger df with empty rows at top
    full_df = pd.DataFrame([[''] * 7] * 20)
    # Set headers at row 17 (0-indexed) -> Row 18 in Excel
    # The image shows data starting around row 19, so header is likely row 18.
    # Let's put header at row 17
    full_df.iloc[17] = data.keys()
    
    # Fill data
    for i, row in df.iterrows():
        full_df.iloc[18 + i] = row.values
        
    full_df.to_excel('mock_idfc.xlsx', index=False, header=False)
    print("Created mock_idfc.xlsx")

def create_mock_icici():
    # ICICI: Header at row 16 approx (index 15)
    data = {
        'S.N.': [1, 2],
        'Tran. Id': ['S98778738', 'S99122281'],
        'Value Date': ['16/Dec/2025', '16/Dec/2025'],
        'Transaction Date': ['16/Dec/2025', '16/Dec/2025'],
        'Transaction Posted Date': ['16/12/2025 01:31:45 AM', '16/12/2025 03:35:22 AM'],
        'Cheque. No./Ref. No.': ['NEFT-SCB', 'NEFT-HSB'],
        'Transaction Remarks': ['Transfer 1', 'Transfer 2'],
        'Withdrawal Amt (INR)': [1000, 0],
        'Deposit Amt (INR)': [0, 5000],
        'Balance (INR)': [50000, 55000]
    }
    df = pd.DataFrame(data)
    full_df = pd.DataFrame([[''] * 10] * 20)
    full_df.iloc[15] = data.keys()
    for i, row in df.iterrows():
        full_df.iloc[16 + i] = row.values
        
    full_df.to_excel('mock_icici.xlsx', index=False, header=False)
    print("Created mock_icici.xlsx")

def create_mock_bofa():
    # BoA: Header at row 8 (index 7)
    data = {
        'Date': ['12-01-2025', '12-02-2025'],
        'Description': ['HOMEASSIST', 'LUCENT HOME'],
        'Amount': [100, -200],
        'Running Bal.': [5000, 4800]
    }
    df = pd.DataFrame(data)
    full_df = pd.DataFrame([[''] * 4] * 15)
    full_df.iloc[7] = data.keys()
    for i, row in df.iterrows():
        full_df.iloc[8 + i] = row.values
        
    full_df.to_excel('mock_bofa.xlsx', index=False, header=False)
    print("Created mock_bofa.xlsx")

def parse_excel(file_path, bank_type):
    print(f"\nParsing {file_path} as {bank_type}...")
    try:
        # Read first 30 rows to find header
        df_preview = pd.read_excel(file_path, header=None, nrows=30)
        
        header_row = 0
        
        # header detection keywords
        if bank_type == 'idfc':
             for idx, row in df_preview.iterrows():
                row_str = ' '.join(row.astype(str)).lower()
                if 'trans date and time' in row_str and 'transaction details' in row_str:
                    header_row = idx
                    break
        elif bank_type == 'icici':
            for idx, row in df_preview.iterrows():
                row_str = ' '.join(row.astype(str)).lower()
                if 'tran. id' in row_str or 'transaction posted date' in row_str:
                    header_row = idx
                    break
        elif bank_type == 'bofa':
             for idx, row in df_preview.iterrows():
                row_str = ' '.join(row.astype(str)).lower()
                if 'running bal.' in row_str or 'beginning balance' in row_str:
                    header_row = idx
                    break
                    
        print(f"Detected header at row: {header_row}")
        
        df = pd.read_excel(file_path, header=header_row)
        df = df.where(pd.notnull(df), None)
        records = df.to_dict('records')
        
        print(f"Found {len(records)} records.")
        if records:
            print("Sample Record Keys:", records[0].keys())
            print("First Record:", records[0])
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_mock_idfc()
    create_mock_icici()
    create_mock_bofa()
    
    parse_excel('mock_idfc.xlsx', 'idfc')
    parse_excel('mock_icici.xlsx', 'icici')
    parse_excel('mock_bofa.xlsx', 'bofa')
