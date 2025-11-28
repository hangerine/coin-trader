from apscheduler.schedulers.background import BackgroundScheduler
import requests
import urllib3
import logging
from models import SessionLocal, PriceLog
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

scheduler = BackgroundScheduler()

# Cache for top 30 coins
top_coins_cache = []
last_cache_update = datetime.min

def get_top_30_coins():
    global top_coins_cache, last_cache_update
    
    # Update cache every hour
    if (datetime.now() - last_cache_update).total_seconds() < 3600 and top_coins_cache:
        return top_coins_cache

    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 30,
            "page": 1,
            "sparkline": "false"
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Store symbol and name
            top_coins_cache = [
                {"symbol": coin["symbol"].upper(), "name": coin["name"], "id": coin["id"]} 
                for coin in data
            ]
            last_cache_update = datetime.now()
            logger.info(f"Updated top 30 coins cache: {[c['symbol'] for c in top_coins_cache]}")
            return top_coins_cache
        else:
            logger.error(f"Failed to fetch top coins from CoinGecko: {response.status_code}")
            return top_coins_cache # Return old cache if failed
    except Exception as e:
        logger.error(f"Error fetching top coins: {e}")
        return top_coins_cache

def fetch_market_data():
    db = SessionLocal()
    try:
        # 1. Fetch USD/KRW exchange rate
        usd_krw_rate = 1300.0
        try:
            response = requests.get("https://api.frankfurter.app/latest?from=USD&to=KRW", verify=False, timeout=5)
            data = response.json()
            if "rates" in data and "KRW" in data["rates"]:
                usd_krw_rate = data["rates"]["KRW"]
        except Exception as e:
            logger.warning(f"Error fetching Exchange rate: {e}")

        # 2. Get Top 30 Coins
        top_coins = get_top_30_coins()
        if not top_coins:
            # Fallback to default if cache is empty
            top_coins = [
                {"symbol": "BTC", "name": "Bitcoin"}, {"symbol": "ETH", "name": "Ethereum"},
                {"symbol": "XRP", "name": "XRP"}, {"symbol": "SOL", "name": "Solana"},
                {"symbol": "USDT", "name": "Tether"}, {"symbol": "DOGE", "name": "Dogecoin"}
            ]

        market_data = {}
        
        # 3. Fetch Bithumb prices (KRW)
        for coin in top_coins:
            symbol = coin['symbol']
            try:
                response = requests.get(f"https://api.bithumb.com/public/ticker/{symbol}_KRW", verify=False, timeout=2)
                data = response.json()
                price = 0.0
                if data.get("status") == "0000":
                    price = float(data["data"]["closing_price"])
                
                if symbol not in market_data:
                    market_data[symbol] = {}
                market_data[symbol]['bithumb'] = price
                market_data[symbol]['bithumb_krw'] = price # Explicit KRW value
            except Exception as e:
                # logger.error(f"Error fetching Bithumb {symbol} price: {e}")
                if symbol not in market_data: market_data[symbol] = {}
                market_data[symbol]['bithumb'] = 0.0

        # Update USD/KRW if USDT is available on Bithumb
        if usd_krw_rate == 1300.0 and market_data.get('USDT', {}).get('bithumb', 0) > 1000:
            usd_krw_rate = market_data['USDT']['bithumb']

        # 4. Fetch Binance prices (USDT)
        try:
            response = requests.get("https://api.binance.com/api/v3/ticker/price", verify=False, timeout=5)
            data = response.json()
            binance_map = {item['symbol']: float(item['price']) for item in data if item['symbol'].endswith('USDT')}
            
            for coin in top_coins:
                symbol = coin['symbol']
                binance_symbol = f"{symbol}USDT"
                price = binance_map.get(binance_symbol, 0.0)
                
                if symbol not in market_data: market_data[symbol] = {}
                market_data[symbol]['binance'] = price
                market_data[symbol]['binance_usdt'] = price
                
        except Exception as e:
            logger.error(f"Error fetching Binance prices: {e}")

        # 5. Fetch Korbit prices (KRW)
        try:
            response = requests.get("https://api.korbit.co.kr/v1/ticker/detailed/all", verify=False, timeout=5)
            data = response.json()
            
            for coin in top_coins:
                symbol = coin['symbol']
                key = f"{symbol.lower()}_krw"
                price = 0.0
                if key in data:
                    price = float(data[key].get('last', 0))
                
                if symbol not in market_data: market_data[symbol] = {}
                market_data[symbol]['korbit'] = price
                market_data[symbol]['korbit_krw'] = price
                
        except Exception as e:
            logger.error(f"Error fetching Korbit prices: {e}")

        # 6. Log to Database
        # Maintain backward compatibility for fixed columns
        bithumb_btc = market_data.get('BTC', {}).get('bithumb', 0)
        
        if bithumb_btc > 0 or market_data.get('BTC', {}).get('binance', 0) > 0:
            log = PriceLog(
                # Legacy Bithumb
                btc_price=market_data.get('BTC', {}).get('bithumb', 0),
                eth_price=market_data.get('ETH', {}).get('bithumb', 0),
                xrp_price=market_data.get('XRP', {}).get('bithumb', 0),
                sol_price=market_data.get('SOL', {}).get('bithumb', 0),
                usdt_price=market_data.get('USDT', {}).get('bithumb', 0),
                doge_price=market_data.get('DOGE', {}).get('bithumb', 0),
                
                # Legacy Binance
                btc_binance=market_data.get('BTC', {}).get('binance', 0),
                eth_binance=market_data.get('ETH', {}).get('binance', 0),
                xrp_binance=market_data.get('XRP', {}).get('binance', 0),
                sol_binance=market_data.get('SOL', {}).get('binance', 0),
                doge_binance=market_data.get('DOGE', {}).get('binance', 0),
                
                # Legacy Korbit
                btc_korbit=market_data.get('BTC', {}).get('korbit', 0),
                eth_korbit=market_data.get('ETH', {}).get('korbit', 0),
                xrp_korbit=market_data.get('XRP', {}).get('korbit', 0),
                sol_korbit=market_data.get('SOL', {}).get('korbit', 0),
                doge_korbit=market_data.get('DOGE', {}).get('korbit', 0),
                
                usd_krw_rate=usd_krw_rate,
                market_data=market_data, # New JSON data
                timestamp=datetime.now()
            )
            db.add(log)
            db.commit()
            
            logger.info(f"Logged Prices for {len(market_data)} coins.")
            
    except Exception as e:
        logger.error(f"Error in fetch_market_data: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(fetch_market_data, 'interval', seconds=5)
    scheduler.start()
