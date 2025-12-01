import time
import hashlib
import uuid
import jwt
import requests
import urllib3
import logging
from urllib.parse import urlencode

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Logging setup
logger = logging.getLogger(__name__)

BASE_URL = "https://api.bithumb.com"

def generate_jwt_token(api_key, api_secret, params=None):
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
    
    jwt_token = jwt.encode(payload, api_secret)
    return 'Bearer {}'.format(jwt_token)

def api_request(endpoint, params, api_key, api_secret, method="POST"):
    url = f"{BASE_URL}{endpoint}"
    authorization_token = generate_jwt_token(api_key, api_secret, params)
    headers = {
        "Authorization": authorization_token,
        "Content-Type": "application/json; charset=utf-8"
    }
    
    try:
        logger.info(f"Bithumb API Request: {method} {endpoint}, params={params}")
        
        if method == "POST":
            response = requests.post(url, json=params, headers=headers, verify=False, timeout=10)
        else:
            response = requests.get(url, params=params, headers=headers, verify=False, timeout=10)
        
        logger.info(f"Bithumb API Response Status: {response.status_code}")
        logger.info(f"Bithumb API Response Headers: {dict(response.headers)}")
        
        # Check HTTP status code
        if response.status_code != 200:
            error_text = response.text[:500]  # Limit error text length
            logger.error(f"Bithumb API Error {response.status_code}: {error_text}")
            try:
                error_json = response.json()
                return {"status": "error", "message": error_json.get("message", error_text), "code": response.status_code}
            except:
                return {"status": "error", "message": f"HTTP {response.status_code}: {error_text}", "code": response.status_code}
        
        # Parse JSON response
        try:
            result = response.json()
            logger.info(f"Bithumb API Response: {str(result)[:200]}")  # Log first 200 chars
            return result
        except ValueError as e:
            logger.error(f"Bithumb API JSON Parse Error: {e}, Response text: {response.text[:500]}")
            return {"status": "error", "message": f"Invalid JSON response: {str(e)}"}
            
    except requests.exceptions.Timeout:
        logger.error(f"Bithumb API Timeout: {endpoint}")
        return {"status": "error", "message": "Request timeout"}
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Bithumb API Connection Error: {e}")
        return {"status": "error", "message": f"Connection error: {str(e)}"}
    except Exception as e:
        logger.error(f"Bithumb API Exception: {type(e).__name__}: {e}")
        return {"status": "error", "message": str(e)}

def get_balance(api_key, api_secret, coin="BTC"):
    """Get account balance - Bithumb API 2.0"""
    endpoint = "/v1/accounts"
    result = api_request(endpoint, None, api_key, api_secret, method="GET")
    
    # Check for error response
    if isinstance(result, dict) and result.get("status") == "error":
        logger.error(f"Bithumb get_balance error: {result.get('message')}")
        return result
    
    # Transform response to match expected format
    if isinstance(result, list):
        # Bithumb API 2.0 returns array of accounts
        balances = []
        for account in result:
            balances.append({
                "currency": account.get("currency", ""),
                "balance": account.get("balance", "0")
            })
        logger.info(f"Bithumb balance retrieved: {len(balances)} currencies")
        return {"status": "success", "data": balances}
    
    # If result is a dict but not an error, check for common Bithumb error formats
    if isinstance(result, dict):
        # Check for Bithumb API error format
        if "status" in result and result.get("status") != "0000":
            error_msg = result.get("message", "Unknown error")
            logger.error(f"Bithumb API error response: {result}")
            return {"status": "error", "message": error_msg}
        
        # If it's already in the expected format, return as is
        if "data" in result or "status" in result:
            return result
    
    # Unknown response format
    logger.warning(f"Unexpected Bithumb balance response format: {type(result)} - {result}")
    return {"status": "error", "message": f"Unexpected response format: {type(result)}"}

def place_order(api_key, api_secret, order_currency, payment_currency, units, order_type="bid"):
    """Place order - Bithumb API 2.0"""
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

    return api_request(endpoint, params, api_key, api_secret, method="POST")
