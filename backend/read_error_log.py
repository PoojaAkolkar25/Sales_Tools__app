
import os

def read_log():
    log_path = 'backend/error.log'
    if not os.path.exists(log_path):
        print(f"Log file not found: {log_path}")
        return

    content = ""
    try:
        with open(log_path, 'r', encoding='utf-16le') as f:
            content = f.read()
    except Exception:
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading log: {e}")
            return

    print("=== LOG CONTENT START ===")
    print(content)
    print("=== LOG CONTENT END ===")

if __name__ == '__main__':
    read_log()
