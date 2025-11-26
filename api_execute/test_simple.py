import jwt
import uuid
import time

# 공식 예제 - 파라미터 없는 경우 테스트
accessKey = "8b41a5f618d0976c44c0e2ba149206fec27d1c5d92b124"
secretKey = "YWJkYjEzMzY4YWJmOTkzOWFkZjAxYmQwOTE2ODMzYjBlNGJiMTA5OTBiZmJjMTdiMTg1Zjk3YjMyNmQ3Nw=="

payload = {
    'access_key': accessKey,
    'nonce': str(uuid.uuid4()),
    'timestamp': round(time.time() * 1000)
}

print("Payload:", payload, "\n")

jwt_token = jwt.encode(payload, secretKey)
authorization_token = 'Bearer {}'.format(jwt_token)

print("Authorization Token:", authorization_token, "\n")

# 실제 API 호출 테스트
import requests

url = "https://api.bithumb.com/v1/info/account"
headers = {
    "Authorization": authorization_token,
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print("Status Code:", response.status_code)
print("Response:", response.text)
