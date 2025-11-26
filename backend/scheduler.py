from apscheduler.schedulers.background import BackgroundScheduler
import requests
from models import SessionLocal, PriceLog
from datetime import datetime

scheduler = BackgroundScheduler()

def fetch_market_data():
    """Fetch multiple coin prices and USD/KRW rate and save to DB."""
    db = SessionLocal()
    try:
        # Coins to fetch
        coins = ['BTC', 'ETH', 'XRP', 'SOL', 'USDT', 'DOGE']
        prices = {}
        
        # Fetch prices for all coins
        for coin in coins:
            try:
                response = requests.get(f"https://api.bithumb.com/public/ticker/{coin}_KRW")
                data = response.json()
                if data.get("status") == "0000":
                    prices[coin.lower()] = float(data["data"]["closing_price"])
                else:
                    prices[coin.lower()] = 0.0
            except Exception as e:
                print(f"Error fetching {coin} price: {e}")
                prices[coin.lower()] = 0.0

        # Fetch USD/KRW Rate
        usd_krw_rate = 0.0
        try:
            response = requests.get("https://api.frankfurter.app/latest?from=USD&to=KRW")
            data = response.json()
            if "rates" in data and "KRW" in data["rates"]:
                usd_krw_rate = float(data["rates"]["KRW"])
        except Exception as e:
            print(f"Error fetching Exchange rate: {e}")

        # Save to DB
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
            # print(f"Logged: BTC={prices['btc']}, ETH={prices['eth']}, XRP={prices['xrp']}, SOL={prices['sol']}, USDT={prices['usdt']}, DOGE={prices['doge']}, USD/KRW={usd_krw_rate}")

    except Exception as e:
        print(f"Scheduler Error: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(fetch_market_data, 'interval', seconds=10)
    scheduler.start()
