import time
import hashlib
import uuid
import jwt
import requests
from urllib.parse import urlencode

BASE_URL = "https://api.bithumb.com"

def generate_jwt_token(api_key, secret_key, params=None):
    if params:
        query = urlencode(params).encode()
        hash_obj = hashlib.sha512()
        hash_obj.update(query)
        query_hash = hash_obj.hexdigest()
        payload = {
            'access_key': api_key,
            'nonce': str(uuid.uuid4()),
            'timestamp': round(time.time() * 1000),
            'query_hash': query_hash,
            'query_hash_alg': 'SHA512',
        }
    else:
        payload = {
            'access_key': api_key,
            'nonce': str(uuid.uuid4()),
            'timestamp': round(time.time() * 1000),
        }
    
    jwt_token = jwt.encode(payload, secret_key)
    return 'Bearer {}'.format(jwt_token)

def api_request(endpoint, params, api_key, secret_key, method="POST"):
    url = f"{BASE_URL}{endpoint}"
    authorization_token = generate_jwt_token(api_key, secret_key, params)
    headers = {
        "Authorization": authorization_token,
        "Content-Type": "application/json; charset=utf-8"
    }
    
    try:
        if method == "POST":
            response = requests.post(url, json=params, headers=headers)
        else:
            response = requests.get(url, params=params, headers=headers)
        return response.json()
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_balance(api_key, secret_key, coin="BTC"):
    endpoint = "/v1/accounts"
    return api_request(endpoint, None, api_key, secret_key, method="GET")

def place_order(api_key, secret_key, order_currency, payment_currency, units, order_type="bid"):
    endpoint = "/v1/orders"
    market = f"{payment_currency}-{order_currency}"
    
    if order_type == "bid":
        ord_type = "price"
        price = str(units)
        volume = None
    else:
        ord_type = "market"
        volume = str(units)
        price = None

    params = {
        "market": market,
        "side": order_type,
        "ord_type": ord_type
    }
    if volume: params["volume"] = volume
    if price: params["price"] = price

    return api_request(endpoint, params, api_key, secret_key, method="POST")
