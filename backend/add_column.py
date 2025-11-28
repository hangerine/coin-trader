import sqlite3
import os

DB_PATH = "bithumb_trading.db"

def add_column():
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Adding market_data column to price_logs table...")
        cursor.execute("ALTER TABLE price_logs ADD COLUMN market_data JSON DEFAULT '{}'")
        conn.commit()
        print("Column added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column already exists.")
        else:
            print(f"Error adding column: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
