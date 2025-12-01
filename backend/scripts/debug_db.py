"""
Database Debug Script

This script helps debug the database by showing the latest price log entry.
Use this when you need to verify database connectivity or check the latest market data.
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SessionLocal, PriceLog
import json

def debug():
    """Print the latest price log entry for debugging"""
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
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug()
