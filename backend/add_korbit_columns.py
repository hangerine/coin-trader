import psycopg2
import os

# Postgres Connection Params
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DB = os.getenv("PG_DB", "bithumb_trading")
PG_USER = os.getenv("PG_USER", "bithumb")
PG_PASS = os.getenv("PG_PASS", "bithumb_pass")

def add_columns():
    print(f"Connecting to PostgreSQL ({PG_HOST}:{PG_PORT})...")
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            database=PG_DB,
            user=PG_USER,
            password=PG_PASS
        )
        cursor = conn.cursor()
        
        columns = [
            "btc_korbit", "eth_korbit", "xrp_korbit", "sol_korbit", "doge_korbit"
        ]
        
        for col in columns:
            try:
                print(f"Adding column {col}...")
                cursor.execute(f"ALTER TABLE price_logs ADD COLUMN {col} FLOAT DEFAULT 0.0")
                conn.commit()
            except psycopg2.errors.DuplicateColumn:
                print(f"Column {col} already exists, skipping.")
                conn.rollback()
            except Exception as e:
                print(f"Error adding column {col}: {e}")
                conn.rollback()
                
        print("Schema update completed!")
        conn.close()
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    add_columns()

