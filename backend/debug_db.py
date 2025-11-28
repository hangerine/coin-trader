from models import SessionLocal, PriceLog
import json

def debug():
    db = SessionLocal()
    try:
        latest = db.query(PriceLog).order_by(PriceLog.id.desc()).first()
        if latest:
            print(f"Latest ID: {latest.id}")
            print(f"Timestamp: {latest.timestamp}")
            print(f"Market Data Type: {type(latest.market_data)}")
            print(f"Market Data: {latest.market_data}")
        else:
            print("No records found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()
