
import requests

url = "http://127.0.0.1:8001/register"
payload = {
  "email": "dakshayaniramanesh@gmail.com",
  "full_name": "Dakshayani Ramanesh",
  "password": "Shayani_99"
}
headers = {
  "accept": "application/json",
  "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
