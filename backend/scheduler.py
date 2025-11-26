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

def fetch_market_data():
    db = SessionLocal()
    try:
        # Fetch USD/KRW exchange rate
        usd_krw_rate = 1300.0  # Default fallback
        try:
            response = requests.get("https://api.frankfurter.app/latest?from=USD&to=KRW", verify=False)
            data = response.json()
            if "rates" in data and "KRW" in data["rates"]:
                usd_krw_rate = data["rates"]["KRW"]
        except Exception as e:
            print(f"Error fetching Exchange rate: {e}")

        # Fetch prices for multiple coins
        coins = ['BTC', 'ETH', 'XRP', 'SOL', 'USDT', 'DOGE']
        prices = {}
        
        # Fetch prices for all coins
        for coin in coins:
            try:
                response = requests.get(f"https://api.bithumb.com/public/ticker/{coin}_KRW", verify=False)
                data = response.json()
                if data.get("status") == "0000":
                    prices[coin.lower()] = float(data["data"]["closing_price"])
                else:
                    prices[coin.lower()] = 0.0
            except Exception as e:
                print(f"Error fetching {coin} price: {e}")
                prices[coin.lower()] = 0.0

        # Only log if we have at least BTC price
        if prices.get('btc', 0) > 0:
            log = PriceLog(
                btc_price=prices.get('btc', 0),
                eth_price=prices.get('eth', 0),
                xrp_price=prices.get('xrp', 0),
                sol_price=prices.get('sol', 0),
                usdt_price=prices.get('usdt', 0),
                doge_price=prices.get('doge', 0),
                usd_krw_rate=usd_krw_rate,
                timestamp=datetime.now()
            )
            db.add(log)
            db.commit()
            logger.info(f"Logged prices: BTC={prices.get('btc')}, ETH={prices.get('eth')}, XRP={prices.get('xrp')}, SOL={prices.get('sol')}, USDT={prices.get('usdt')}, DOGE={prices.get('doge')}, USD/KRW={usd_krw_rate}")
    except Exception as e:
        logger.error(f"Error in fetch_market_data: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(fetch_market_data, 'interval', seconds=10)
    scheduler.start()
