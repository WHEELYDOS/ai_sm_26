import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_prediction():
    # 1. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "debug_user",
        "password": "password123"
    })
    
    if resp.status_code != 200:
        print("Login failed, trying to register...")
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "debug_user",
            "password": "password123",
            "email": "debug_pred@example.com"
        })
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "debug_user",
            "password": "password123"
        })
    
    token = resp.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test High Risk
    print("\nTesting High Risk Case...")
    high_risk_data = {
        "age": 45,
        "systolic_bp": 170,
        "diastolic_bp": 110,
        "blood_sugar": 250,
        "body_temp": 39,
        "heart_rate": 110
    }
    resp = requests.post(
        f"{BASE_URL}/api/predict/pregnancy", 
        json=high_risk_data, 
        headers=headers
    )
    print(f"Status: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), indent=2)}")

    # 3. Test Low Risk
    print("\nTesting Low Risk Case...")
    low_risk_data = {
        "age": 25,
        "systolic_bp": 110,
        "diastolic_bp": 70,
        "blood_sugar": 90,
        "body_temp": 37,
        "heart_rate": 70
    }
    resp = requests.post(
        f"{BASE_URL}/api/predict/pregnancy", 
        json=low_risk_data, 
        headers=headers
    )
    print(f"Status: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), indent=2)}")

if __name__ == "__main__":
    test_prediction()
