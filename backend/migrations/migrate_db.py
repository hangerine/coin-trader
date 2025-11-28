import sqlite3
import psycopg2
import os
from datetime import datetime

# SQLite Backup File Path
SQLITE_DB_PATH = "bithumb_trading.db" 

# Postgres Connection Params
# If running from local machine targeting Docker: localhost:5432
# If running inside Docker: db:5432
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DB = os.getenv("PG_DB", "bithumb_trading")
PG_USER = os.getenv("PG_USER", "bithumb")
PG_PASS = os.getenv("PG_PASS", "bithumb_pass")

def migrate():
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Backup file not found: {SQLITE_DB_PATH}")
        return

    print(f"Connecting to SQLite backup ({SQLITE_DB_PATH})...")
    try:
        sq_conn = sqlite3.connect(SQLITE_DB_PATH)
        sq_cursor = sq_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to SQLite DB: {e}")
        return

    print(f"Connecting to PostgreSQL ({PG_HOST}:{PG_PORT})...")
    try:
        pg_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            database=PG_DB,
            user=PG_USER,
            password=PG_PASS
        )
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to Postgres: {e}")
        print("Make sure Docker containers are running and port 5432 is exposed.")
        return

    try:
        # 1. API Keys
        print("Migrating API Keys...")
        try:
            sq_cursor.execute("SELECT name, access_key, secret_key FROM api_keys")
            keys = sq_cursor.fetchall()
            for k in keys:
                # Check existence
                pg_cursor.execute("SELECT id FROM api_keys WHERE name = %s", (k[0],))
                if not pg_cursor.fetchone():
                    pg_cursor.execute(
                        "INSERT INTO api_keys (exchange, name, access_key, secret_key) VALUES (%s, %s, %s, %s)",
                        ('bithumb', k[0], k[1], k[2])
                    )
        except sqlite3.OperationalError:
            print("No api_keys table found in backup, skipping.")

        # 2. Trade Logs
        print("Migrating Trade Logs...")
        try:
            sq_cursor.execute("SELECT timestamp, side, amount_krw, amount_btc, price, order_id FROM trade_logs")
            trades = sq_cursor.fetchall()
            for t in trades:
                pg_cursor.execute(
                    """
                    INSERT INTO trade_logs 
                    (timestamp, exchange, side, amount_krw, amount_btc, price, order_id) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (t[0], 'bithumb', t[1], t[2], t[3], t[4], t[5])
                )
        except sqlite3.OperationalError:
             print("No trade_logs table found in backup, skipping.")

        # 3. Price Logs
        print("Migrating Price Logs...")
        try:
            sq_cursor.execute("SELECT timestamp, btc_price, eth_price, xrp_price, sol_price, usdt_price, doge_price, usd_krw_rate FROM price_logs")
            prices = sq_cursor.fetchall()
            
            batch_size = 1000
            batch = []
            total = 0
            for p in prices:
                # New columns: btc_binance... set to 0
                batch.append((
                    p[0], p[1], p[2], p[3], p[4], p[5], p[6], 
                    0, 0, 0, 0, 0, # Binance columns
                    p[7]
                ))
                
                if len(batch) >= batch_size:
                    args_str = ','.join(pg_cursor.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", x).decode('utf-8') for x in batch)
                    pg_cursor.execute("INSERT INTO price_logs (timestamp, btc_price, eth_price, xrp_price, sol_price, usdt_price, doge_price, btc_binance, eth_binance, xrp_binance, sol_binance, doge_binance, usd_krw_rate) VALUES " + args_str)
                    total += len(batch)
                    batch = []
                    print(f"Inserted {total} price logs...")

            if batch:
                args_str = ','.join(pg_cursor.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", x).decode('utf-8') for x in batch)
                pg_cursor.execute("INSERT INTO price_logs (timestamp, btc_price, eth_price, xrp_price, sol_price, usdt_price, doge_price, btc_binance, eth_binance, xrp_binance, sol_binance, doge_binance, usd_krw_rate) VALUES " + args_str)
                total += len(batch)
                print(f"Inserted {total} price logs total.")

        except sqlite3.OperationalError:
             print("No price_logs table found in backup, skipping.")

        pg_conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        pg_conn.rollback()
    finally:
        sq_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()

