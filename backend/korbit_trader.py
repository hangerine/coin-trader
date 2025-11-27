import time
import hmac
import hashlib
import requests
import urllib3
from urllib.parse import urlencode
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://api.korbit.co.kr"

def get_signature(query_string, secret_key):
    return hmac.new(
        secret_key.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def get_korbit_balance(api_key, secret_key):
    endpoint = "/v2/balance"
    
    params = {
        'timestamp': int(time.time() * 1000)
    }
    
    # 1. Sort and Encode
    query_string = urlencode(sorted(params.items()))
    
    # 2. Sign
    signature = get_signature(query_string, secret_key)
    
    # 3. Append Signature to Query String
    final_query = f"{query_string}&signature={signature}"
    
    url = f"{BASE_URL}{endpoint}?{final_query}"
    
    headers = {
        "X-KAPI-KEY": api_key,
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        # Pass None to params since we appended it to url manually
        response = requests.get(url, headers=headers, verify=False, timeout=5)
        
        if response.status_code != 200:
            logger.error(f"Korbit API Error: {response.status_code} {response.text}")
            return {"status": "error", "message": f"API Error {response.status_code}"}
            
        data = response.json()
        
        items = []
        if "data" in data:
            items = data["data"]
        elif isinstance(data, list):
            items = data
        
        normalized = []
        for item in items:
            try:
                currency = item.get("currency", "").upper()
                balance = float(item.get("balance", 0))
                available = float(item.get("available", 0))
                trade_in_use = float(item.get("tradeInUse", 0))
                withdrawal_in_use = float(item.get("withdrawalInUse", 0))
                locked = trade_in_use + withdrawal_in_use
                
                if balance > 0 or currency == "KRW":
                    normalized.append({
                        "currency": currency,
                        "balance": str(balance),
                        "available": str(available),
                        "locked": str(locked)
                    })
            except (ValueError, TypeError) as e:
                continue
                
        return {"status": "success", "data": normalized}
        
    except Exception as e:
        logger.error(f"Korbit Balance Exception: {e}")
        return {"status": "error", "message": str(e)}

def place_korbit_order(api_key, secret_key, symbol, side, price, qty, order_type="limit"):
    endpoint = "/v2/orders"
    url = f"{BASE_URL}{endpoint}"
    
    # Symbol format: btc_krw
    symbol = symbol.lower()
    if "-" in symbol: 
        symbol = symbol.replace("-", "_")
    
    params = {
        "symbol": symbol,
        "side": side.lower(),
        "qty": "{:.6f}".format(float(qty)).rstrip('0').rstrip('.'), # Prevent scientific notation (e.g. 1e-5)
        "orderType": order_type,
        "timestamp": int(time.time() * 1000)
    }
    
    if order_type == "limit":
        params["price"] = str(price)
        params["timeInForce"] = "gtc"
    
    # 1. Sort and Encode
    query_string = urlencode(sorted(params.items()))
    
    # 2. Sign
    signature = get_signature(query_string, secret_key)
    
    # 3. Create Body
    final_body = f"{query_string}&signature={signature}"
    
    headers = {
        "X-KAPI-KEY": api_key,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        response = requests.post(url, data=final_body, headers=headers, verify=False, timeout=5)
        return response.json()
    except Exception as e:
        logger.error(f"Korbit Order Error: {e}")
        return {"status": "error", "message": str(e)}
