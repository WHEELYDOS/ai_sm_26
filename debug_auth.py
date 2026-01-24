import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def debug():
    # 1. Register/Login
    username = "debug_user"
    password = "password123"
    
    print(f"Logging in as {username}...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": username,
        "password": password
    })
    
    if resp.status_code == 401:
        print("User might not exist, registering...")
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "password": password,
            "email": "debug@example.com"
        })
        print(f"Register status: {resp.status_code}")
        if resp.status_code != 201 and resp.status_code != 409:
             print(resp.text)
        
        # Login again
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": username,
            "password": password
        })
        
    print(f"Login Response: {resp.status_code}")
    if resp.status_code != 200:
        print(resp.text)
        # Try to register if login failed differently
        return

    data = resp.json()
    token = data.get('access_token')
    print(f"Token: {token[:20]}...")
    
    # Decode token (brute force base64)
    try:
        payload_part = token.split('.')[1]
        # Pad base64
        payload_part += '=' * (-len(payload_part) % 4)
        import base64
        payload = json.loads(base64.urlsafe_b64decode(payload_part).decode())
        print(f"Token Payload: {json.dumps(payload, indent=2)}")
    except Exception as e:
        print(f"Failed to decode token locally: {e}")

    # 2. Call Sync Latest
    print("\nCalling /api/sync/latest...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/sync/latest", headers=headers)
    
    print(f"Sync Status: {resp.status_code}")
    print(f"Response Body: {resp.text}")

if __name__ == "__main__":
    debug()
