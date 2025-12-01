from apscheduler.schedulers.background import BackgroundScheduler
import requests
import urllib3
import logging
from models import SessionLocal, PriceLog
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

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
    import time
    start_time = time.time()
    step_times = {}
    step_start = time.time()
    
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
        step_times['exchange_rate'] = time.time() - step_start
        
        # 2. Get Top 30 Coins
        step_start = time.time()
        top_coins = get_top_30_coins()
        step_times['get_coins'] = time.time() - step_start
        if not top_coins:
            # Fallback to default if cache is empty
            top_coins = [
                {"symbol": "BTC", "name": "Bitcoin"}, {"symbol": "ETH", "name": "Ethereum"},
                {"symbol": "XRP", "name": "XRP"}, {"symbol": "SOL", "name": "Solana"},
                {"symbol": "USDT", "name": "Tether"}, {"symbol": "DOGE", "name": "Dogecoin"}
            ]

        market_data = {}
        
        # 3. Fetch Bithumb prices (KRW) - Parallel execution for better performance
        def fetch_bithumb_price(symbol):
            """Fetch price for a single symbol from Bithumb"""
            try:
                # Reduced timeout from 2s to 1s for faster failure handling
                response = requests.get(f"https://api.bithumb.com/public/ticker/{symbol}_KRW", verify=False, timeout=1)
                data = response.json()
                price = 0.0
                if data.get("status") == "0000":
                    price = float(data["data"]["closing_price"])
                return symbol, price
            except requests.exceptions.Timeout:
                # Timeout is expected for some coins, return 0.0
                return symbol, 0.0
            except Exception as e:
                # logger.error(f"Error fetching Bithumb {symbol} price: {e}")
                return symbol, 0.0
        
        # Use ThreadPoolExecutor to fetch prices in parallel
        # Increased max_workers to 30 to fetch all coins simultaneously
        step_start = time.time()
        with ThreadPoolExecutor(max_workers=30) as executor:
            futures = {executor.submit(fetch_bithumb_price, coin['symbol']): coin['symbol'] for coin in top_coins}
            for future in as_completed(futures):
                symbol, price = future.result()
                if symbol not in market_data:
                    market_data[symbol] = {}
                market_data[symbol]['bithumb'] = price
                market_data[symbol]['bithumb_krw'] = price
        step_times['bithumb_prices'] = time.time() - step_start

        # Update USD/KRW if USDT is available on Bithumb
        if usd_krw_rate == 1300.0 and market_data.get('USDT', {}).get('bithumb', 0) > 1000:
            usd_krw_rate = market_data['USDT']['bithumb']

        # 4. Fetch Binance prices (USDT) - with optimized timeout and single retry
        step_start = time.time()
        binance_map = {}
        # Binance API can be slow, use longer timeout but only retry once
        max_retries = 1  # Reduced from 2 to 1 to avoid long delays
        for attempt in range(max_retries + 1):  # +1 because we want max_retries retries (0, 1 = 2 attempts total)
            try:
                # Increased timeout to 5s as Binance API can be slow
                response = requests.get("https://api.binance.com/api/v3/ticker/price", verify=False, timeout=5)
                data = response.json()
                binance_map = {item['symbol']: float(item['price']) for item in data if item['symbol'].endswith('USDT')}
                break  # Success, exit retry loop
            except requests.exceptions.Timeout:
                if attempt < max_retries:
                    logger.warning(f"Binance API timeout (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                    continue
                else:
                    logger.warning(f"Binance API timeout after {max_retries + 1} attempts, continuing without Binance data")
                    # Continue without Binance data rather than blocking
            except Exception as e:
                logger.error(f"Error fetching Binance prices: {e}")
                break  # Don't retry on other errors
        
        # Process results even if some requests failed
        for coin in top_coins:
            symbol = coin['symbol']
            binance_symbol = f"{symbol}USDT"
            price = binance_map.get(binance_symbol, 0.0)
            
            if symbol not in market_data: market_data[symbol] = {}
            market_data[symbol]['binance'] = price
            market_data[symbol]['binance_usdt'] = price
        
        step_times['binance_prices'] = time.time() - step_start

        # 5. Fetch Korbit prices (KRW) - with optimized timeout and single retry
        step_start = time.time()
        korbit_data = {}
        max_retries = 1  # Reduced from 2 to 1 to avoid long delays
        for attempt in range(max_retries + 1):  # +1 because we want max_retries retries
            try:
                # Keep timeout at 3s as Korbit is usually faster
                response = requests.get("https://api.korbit.co.kr/v1/ticker/detailed/all", verify=False, timeout=3)
                korbit_data = response.json()
                break  # Success, exit retry loop
            except requests.exceptions.Timeout:
                if attempt < max_retries:
                    logger.warning(f"Korbit API timeout (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                    continue
                else:
                    logger.warning(f"Korbit API timeout after {max_retries + 1} attempts, continuing without Korbit data")
                    # Continue without Korbit data rather than blocking
            except Exception as e:
                logger.error(f"Error fetching Korbit prices: {e}")
                break  # Don't retry on other errors
        
        # Process results even if some requests failed
        for coin in top_coins:
            symbol = coin['symbol']
            key = f"{symbol.lower()}_krw"
            price = 0.0
            if key in korbit_data:
                price = float(korbit_data[key].get('last', 0))
            
            if symbol not in market_data: market_data[symbol] = {}
            market_data[symbol]['korbit'] = price
            market_data[symbol]['korbit_krw'] = price
        
        step_times['korbit_prices'] = time.time() - step_start

        # 6. Log to Database
        step_start = time.time()
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
            step_times['db_save'] = time.time() - step_start
            
            execution_time = time.time() - start_time
            logger.info(f"Logged Prices for {len(market_data)} coins. (Total: {execution_time:.2f}s)")
            logger.info(f"  Breakdown: ExchangeRate={step_times.get('exchange_rate', 0):.2f}s, "
                       f"GetCoins={step_times.get('get_coins', 0):.2f}s, "
                       f"Bithumb={step_times.get('bithumb_prices', 0):.2f}s, "
                       f"Binance={step_times.get('binance_prices', 0):.2f}s, "
                       f"Korbit={step_times.get('korbit_prices', 0):.2f}s, "
                       f"DBSave={step_times.get('db_save', 0):.2f}s")
            
            # Warn if execution takes longer than 80% of interval (20s * 0.8 = 16s)
            # Current interval is 20s, execution typically takes ~12-13s
            if execution_time > 16:
                logger.warning(f"fetch_market_data took {execution_time:.2f}s, which exceeds 80% of the 20s interval. Consider optimizing or increasing the interval.")
            
    except Exception as e:
        logger.error(f"Error in fetch_market_data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def start_scheduler():
    # Add job with max_instances=1 to prevent overlapping executions
    # coalesce=True: If multiple executions are missed, only run once when scheduler catches up
    # misfire_grace_time: Allow job to run even if it's slightly late
    # Note: Execution takes ~13-14 seconds (Bithumb: ~1.8s, Binance: ~7-8s, Korbit: ~3s)
    # Using 20 seconds to provide buffer for network delays and retries
    scheduler.add_job(
        fetch_market_data, 
        'interval', 
        seconds=20,  # Set to 20s based on actual execution time (~13-14s)
        max_instances=1,  # Only allow one instance to run at a time
        coalesce=True,    # If multiple executions are missed, only run once
        misfire_grace_time=30  # Allow job to run if it's up to 30 seconds late
    )
    scheduler.start()
    logger.info("Scheduler started: fetch_market_data will run every 20 seconds")
