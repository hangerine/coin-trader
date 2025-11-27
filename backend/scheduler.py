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
        # 1. Fetch USD/KRW exchange rate
        usd_krw_rate = 1300.0
        try:
            response = requests.get("https://api.frankfurter.app/latest?from=USD&to=KRW", verify=False, timeout=5)
            data = response.json()
            if "rates" in data and "KRW" in data["rates"]:
                usd_krw_rate = data["rates"]["KRW"]
        except Exception as e:
            logger.warning(f"Error fetching Exchange rate: {e}")

        # 2. Fetch Bithumb prices (KRW)
        coins = ['BTC', 'ETH', 'XRP', 'SOL', 'USDT', 'DOGE']
        bithumb_prices = {}
        
        for coin in coins:
            try:
                response = requests.get(f"https://api.bithumb.com/public/ticker/{coin}_KRW", verify=False, timeout=3)
                data = response.json()
                if data.get("status") == "0000":
                    bithumb_prices[coin.lower()] = float(data["data"]["closing_price"])
                else:
                    bithumb_prices[coin.lower()] = 0.0
            except Exception as e:
                logger.error(f"Error fetching Bithumb {coin} price: {e}")
                bithumb_prices[coin.lower()] = 0.0
        
        if usd_krw_rate == 1300.0 and bithumb_prices.get('usdt', 0) > 1000:
            usd_krw_rate = bithumb_prices['usdt']

        # 3. Fetch Binance prices (USDT)
        binance_prices = {}
        try:
            response = requests.get("https://api.binance.com/api/v3/ticker/price", verify=False, timeout=5)
            data = response.json()
            
            binance_map = {item['symbol']: float(item['price']) for item in data if item['symbol'].endswith('USDT')}
            
            target_coins = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE'] 
            for coin in target_coins:
                symbol = f"{coin}USDT"
                binance_prices[coin.lower()] = binance_map.get(symbol, 0.0)
                
        except Exception as e:
            logger.error(f"Error fetching Binance prices: {e}")

        # 4. Fetch Korbit prices (KRW)
        korbit_prices = {}
        try:
            response = requests.get("https://api.korbit.co.kr/v1/ticker/detailed/all", verify=False, timeout=5)
            data = response.json()
            # data format: { "btc_krw": { "last": "...", ... }, ... }
            
            target_coins = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE']
            for coin in target_coins:
                key = f"{coin.lower()}_krw"
                if key in data:
                    korbit_prices[coin.lower()] = float(data[key].get('last', 0))
                else:
                    korbit_prices[coin.lower()] = 0.0
        except Exception as e:
            logger.error(f"Error fetching Korbit prices: {e}")

        # 5. Log to Database
        if bithumb_prices.get('btc', 0) > 0 or binance_prices.get('btc', 0) > 0:
            log = PriceLog(
                # Bithumb
                btc_price=bithumb_prices.get('btc', 0),
                eth_price=bithumb_prices.get('eth', 0),
                xrp_price=bithumb_prices.get('xrp', 0),
                sol_price=bithumb_prices.get('sol', 0),
                usdt_price=bithumb_prices.get('usdt', 0),
                doge_price=bithumb_prices.get('doge', 0),
                
                # Binance
                btc_binance=binance_prices.get('btc', 0),
                eth_binance=binance_prices.get('eth', 0),
                xrp_binance=binance_prices.get('xrp', 0),
                sol_binance=binance_prices.get('sol', 0),
                doge_binance=binance_prices.get('doge', 0),
                
                # Korbit
                btc_korbit=korbit_prices.get('btc', 0),
                eth_korbit=korbit_prices.get('eth', 0),
                xrp_korbit=korbit_prices.get('xrp', 0),
                sol_korbit=korbit_prices.get('sol', 0),
                doge_korbit=korbit_prices.get('doge', 0),
                
                usd_krw_rate=usd_krw_rate,
                timestamp=datetime.now()
            )
            db.add(log)
            db.commit()
            
            logger.info(f"Logged Prices. BTC: Bit={bithumb_prices.get('btc')} Bin={binance_prices.get('btc')} Kor={korbit_prices.get('btc')}")
            
    except Exception as e:
        logger.error(f"Error in fetch_market_data: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(fetch_market_data, 'interval', seconds=5)
    scheduler.start()
