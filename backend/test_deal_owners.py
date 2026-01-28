import requests

# Test the deal-owners endpoint
url = "http://localhost:8000/api/deal-owners/"

# First, let's try to get a token (assuming there's an admin user)
login_url = "http://localhost:8000/api/auth/login/"
login_data = {"username": "admin", "password": "admin123"}

try:
    # Try to login
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        token = response.json().get('token')
        print(f"Login successful. Token: {token[:20]}...")
        
        # Now test the deal-owners endpoint
        headers = {"Authorization": f"Token {token}"}
        owners_response = requests.get(url, headers=headers)
        print(f"\nDeal Owners Response Status: {owners_response.status_code}")
        print(f"Response: {owners_response.json()}")
    else:
        print(f"Login failed: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
