import requests

data = {
    "username": "testuser_99x",
    "email": "test@test.com",
    "password": "Password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "app_user",
    "mobile": "1234567890",
    "department": "IT",
    "region": "North",
    "reporting_to": None,
    "employee_id": ""
}

headers = {}
# Need an auth token? The user is doing this from admin panel, 
# let's try with basic auth or without auth first to see if it's 401 or 400.
res = requests.post("http://localhost:8000/api/auth/users/", json=data)
print("Status:", res.status_code)
print("Response:", res.text)
