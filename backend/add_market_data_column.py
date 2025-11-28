#!/usr/bin/env python3
"""
Add market_data column to price_logs table in PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://bithumb:bithumb_pass@db:5432/bithumb_trading")

# Override host if PG_HOST is set (for running inside container)
if "PG_HOST" in os.environ:
    # Replace 'db' with the PG_HOST value
    if "db:5432" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("db:5432", f"{os.environ['PG_HOST']}:5432")

print(f"Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column already exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='price_logs' AND column_name='market_data'
        """)
        result = conn.execute(check_query)
        exists = result.fetchone() is not None
        
        if exists:
            print("Column 'market_data' already exists. Skipping.")
        else:
            # Add the column
            alter_query = text("""
                ALTER TABLE price_logs 
                ADD COLUMN market_data JSON DEFAULT '{}'::json
            """)
            conn.execute(alter_query)
            conn.commit()
            print("Successfully added 'market_data' column to price_logs table.")
            
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

