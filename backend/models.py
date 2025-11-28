import os
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class PriceLog(Base):
    __tablename__ = "price_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    
    # Bithumb Prices (KRW)
    btc_price = Column(Float, default=0.0)
    eth_price = Column(Float, default=0.0)
    xrp_price = Column(Float, default=0.0)
    sol_price = Column(Float, default=0.0)
    usdt_price = Column(Float, default=0.0)
    doge_price = Column(Float, default=0.0)
    
    # Binance Prices (USDT)
    btc_binance = Column(Float, default=0.0)
    eth_binance = Column(Float, default=0.0)
    xrp_binance = Column(Float, default=0.0)
    sol_binance = Column(Float, default=0.0)
    doge_binance = Column(Float, default=0.0)
    
    # Korbit Prices (KRW)
    btc_korbit = Column(Float, default=0.0)
    eth_korbit = Column(Float, default=0.0)
    xrp_korbit = Column(Float, default=0.0)
    sol_korbit = Column(Float, default=0.0)
    doge_korbit = Column(Float, default=0.0)
    
    # Exchange Rate
    usd_krw_rate = Column(Float, default=0.0)
    
    # Dynamic Market Data (JSON)
    market_data = Column(JSON, default={})

class TradeLog(Base):
    __tablename__ = "trade_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    exchange = Column(String, default="bithumb") # 'bithumb' or 'binance'
    side = Column(String)  # 'bid' (buy) or 'ask' (sell)
    amount_krw = Column(Float) # KRW amount (or USDT amount for Binance)
    amount_btc = Column(Float) # Coin amount traded
    price = Column(Float)      # Execution price
    order_id = Column(String)  # Order UUID

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    exchange = Column(String, default="bithumb") # 'bithumb' or 'binance'
    name = Column(String, unique=True)
    access_key = Column(String)
    secret_key = Column(String)

# Database Setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bithumb_trading.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize database: create tables and add missing columns"""
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate: Add missing columns for existing tables
    # This is a simple migration approach. For production, consider using Alembic.
    from sqlalchemy import inspect, text
    
    inspector = inspect(engine)
    
    # Check and add missing columns to price_logs
    if 'price_logs' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('price_logs')]
        
        # Define required columns with their types
        required_columns = {
            'btc_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'eth_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'xrp_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'sol_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'doge_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'market_data': "JSONB DEFAULT '{}'::jsonb" if not SQLALCHEMY_DATABASE_URL.startswith("sqlite") else "JSON DEFAULT '{}'"
        }
        
        with engine.connect() as conn:
            for col_name, col_def in required_columns.items():
                if col_name not in existing_columns:
                    try:
                        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                            # SQLite doesn't support ALTER TABLE ADD COLUMN with DEFAULT easily
                            conn.execute(text(f"ALTER TABLE price_logs ADD COLUMN {col_name} {col_def}"))
                        else:
                            conn.execute(text(f"ALTER TABLE price_logs ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        print(f"Added missing column: price_logs.{col_name}")
                    except Exception as e:
                        print(f"Warning: Could not add column {col_name}: {e}")
                        conn.rollback()
