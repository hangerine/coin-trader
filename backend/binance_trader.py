import time
import hmac
import hashlib
import requests
import urllib3
from urllib.parse import urlencode

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://api.binance.com"

def get_signature(params, secret_key):
    # Build query string from params (sorted by key recommended but not strictly required if consistent)
    query_string = urlencode(params)
    return hmac.new(
        secret_key.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def send_signed_request(method, endpoint, api_key, secret_key, params=None):
    if params is None:
        params = {}
    
    # Add timestamp
    params['timestamp'] = int(time.time() * 1000)
    
    # Generate signature
    params['signature'] = get_signature(params, secret_key)
    
    headers = {
        'X-MBX-APIKEY': api_key
    }
    
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, verify=False)
        elif method == "POST":
            # Binance allows parameters in query string for POST
            response = requests.post(url, params=params, headers=headers, verify=False)
        
        # Check for HTTP errors
        if response.status_code >= 400:
             return {"status": "error", "code": response.status_code, "msg": response.text}
             
        return response.json()
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_binance_balance(api_key, secret_key):
    endpoint = "/api/v3/account"
    response = send_signed_request("GET", endpoint, api_key, secret_key)
    
    # Normalize response to match Bithumb format for frontend compatibility
    # Bithumb format: [{currency: 'BTC', balance: '0.1', ...}, ...]
    # Binance format: { balances: [{asset: 'BTC', free: '0.1', locked: '0.0'}, ...] }
    
    if "balances" in response:
        normalized = []
        # Handle USDT specially (it's like KRW for Binance)
        usdt_balance = 0.0
        
        for b in response["balances"]:
            free = float(b["free"])
            if free > 0:
                normalized.append({
                    "currency": b["asset"],
                    "balance": str(free)
                })
                if b["asset"] == "USDT":
                    usdt_balance = free
                    
        # Mock KRW balance using USDT (approx) for frontend compatibility if needed?
        # Or frontend should handle USDT as quote currency.
        # Let's return raw balances and let frontend/main.py handle.
        return {"status": "success", "data": normalized}
    
    return {"status": "error", "message": str(response)}

def place_binance_order(api_key, secret_key, symbol, side, quantity, order_type="MARKET"):
    endpoint = "/api/v3/order"
    
    # Binance requires symbol like BTCUSDT
    if not symbol.endswith("USDT"):
        symbol = f"{symbol}USDT"
        
    params = {
        "symbol": symbol.upper(),
        "side": side.upper(), # BUY or SELL
        "type": order_type.upper(),
    }
    
    # For MARKET orders, use 'quantity' (coin amount) or 'quoteOrderQty' (USDT amount)
    # side=BUY -> we usually spend USDT -> quoteOrderQty
    # side=SELL -> we usually sell Coin -> quantity
    
    if order_type.upper() == "MARKET":
        if side.upper() == "BUY":
             # Buying with USDT amount
             params["quoteOrderQty"] = str(quantity)
        else:
             # Selling specific Coin amount
             params["quantity"] = str(quantity)
    else:
        # Limit order logic (not implemented yet)
        params["quantity"] = str(quantity)

    response = send_signed_request("POST", endpoint, api_key, secret_key, params)
    
    if "orderId" in response:
         return {
             "status": "0000", # Bithumb success code mock
             "order_id": str(response["orderId"]),
             "raw": response
         }
         
    return {"status": "error", "error": str(response)}

