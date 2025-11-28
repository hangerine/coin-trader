import psycopg2
import os

# Postgres Connection Params
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DB = os.getenv("PG_DB", "bithumb_trading")
PG_USER = os.getenv("PG_USER", "bithumb")
PG_PASS = os.getenv("PG_PASS", "bithumb_pass")

def add_column():
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
        
        print("Adding market_data column to price_logs table...")
        try:
            cursor.execute("ALTER TABLE price_logs ADD COLUMN market_data JSONB DEFAULT '{}'")
            conn.commit()
            print("Column added successfully.")
        except psycopg2.errors.DuplicateColumn:
            print("Column already exists.")
            conn.rollback()
        except Exception as e:
            print(f"Error adding column: {e}")
            conn.rollback()
            
    except Exception as e:
        print(f"Failed to connect to Postgres: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    add_column()
