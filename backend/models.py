import os
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, nullable=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    api_keys = relationship("APIKey", back_populates="owner")

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exchange = Column(String)  # 'bithumb', 'binance', 'korbit'
    api_key = Column(String)
    api_secret = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    
    owner = relationship("User", back_populates="api_keys")

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
    """
    Initialize database: create tables and automatically migrate schema changes.
    This function runs on application startup and ensures all required tables and columns exist.
    """
    # Create all tables defined in models
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate: Add missing columns and handle schema changes for existing tables
    # This is a simple migration approach. For production, consider using Alembic.
    from sqlalchemy import inspect, text
    
    inspector = inspect(engine)
    
    # Migrate price_logs table
    if 'price_logs' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('price_logs')]
        
        # Define required columns with their types
        required_columns = {
            'btc_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'eth_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'xrp_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'sol_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'doge_korbit': 'DOUBLE PRECISION DEFAULT 0.0',
            'btc_binance': 'DOUBLE PRECISION DEFAULT 0.0',
            'eth_binance': 'DOUBLE PRECISION DEFAULT 0.0',
            'xrp_binance': 'DOUBLE PRECISION DEFAULT 0.0',
            'sol_binance': 'DOUBLE PRECISION DEFAULT 0.0',
            'doge_binance': 'DOUBLE PRECISION DEFAULT 0.0',
            'market_data': "JSONB DEFAULT '{}'::jsonb" if not SQLALCHEMY_DATABASE_URL.startswith("sqlite") else "JSON DEFAULT '{}'"
        }
        
        with engine.connect() as conn:
            for col_name, col_def in required_columns.items():
                if col_name not in existing_columns:
                    try:
                        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                            conn.execute(text(f"ALTER TABLE price_logs ADD COLUMN {col_name} {col_def}"))
                        else:
                            conn.execute(text(f"ALTER TABLE price_logs ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        print(f"✓ Added missing column: price_logs.{col_name}")
                    except Exception as e:
                        print(f"⚠ Warning: Could not add column {col_name}: {e}")
                        conn.rollback()
    
    # Migrate users table
    if 'users' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('users')]
        
        with engine.connect() as conn:
            # Add phone_number column if it doesn't exist
            if 'phone_number' not in existing_columns:
                try:
                    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                        conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
                    else:
                        conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
                    conn.commit()
                    print("✓ Added missing column: users.phone_number")
                except Exception as e:
                    print(f"⚠ Warning: Could not add column users.phone_number: {e}")
                    conn.rollback()
    
    # Migrate api_keys table
    if 'api_keys' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('api_keys')]
        
        with engine.connect() as conn:
            # Add user_id column if it doesn't exist
            if 'user_id' not in existing_columns:
                try:
                    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                        conn.execute(text("ALTER TABLE api_keys ADD COLUMN user_id INTEGER"))
                    else:
                        conn.execute(text("ALTER TABLE api_keys ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
                    print("✓ Added missing column: api_keys.user_id")
                    
                    # Try to set default user_id for existing records (if users table exists)
                    if 'users' in inspector.get_table_names():
                        try:
                            user_result = conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).first()
                            if user_result:
                                user_id = user_result[0]
                                conn.execute(text(f"UPDATE api_keys SET user_id = {user_id} WHERE user_id IS NULL"))
                                conn.commit()
                                print(f"✓ Set default user_id={user_id} for existing API keys")
                        except Exception as e:
                            print(f"⚠ Warning: Could not set default user_id: {e}")
                except Exception as e:
                    print(f"⚠ Warning: Could not add column api_keys.user_id: {e}")
                    conn.rollback()
            
            # Rename access_key to api_key if needed
            if 'access_key' in existing_columns and 'api_key' not in existing_columns:
                try:
                    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                        # SQLite doesn't support RENAME COLUMN directly, need to recreate table
                        print("⚠ SQLite doesn't support column rename. Please manually migrate access_key to api_key.")
                    else:
                        conn.execute(text("ALTER TABLE api_keys RENAME COLUMN access_key TO api_key"))
                        conn.commit()
                        print("✓ Renamed column: api_keys.access_key → api_key")
                except Exception as e:
                    print(f"⚠ Warning: Could not rename access_key to api_key: {e}")
                    conn.rollback()
            
            # Rename secret_key to api_secret if needed
            if 'secret_key' in existing_columns and 'api_secret' not in existing_columns:
                try:
                    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                        print("⚠ SQLite doesn't support column rename. Please manually migrate secret_key to api_secret.")
                    else:
                        conn.execute(text("ALTER TABLE api_keys RENAME COLUMN secret_key TO api_secret"))
                        conn.commit()
                        print("✓ Renamed column: api_keys.secret_key → api_secret")
                except Exception as e:
                    print(f"⚠ Warning: Could not rename secret_key to api_secret: {e}")
                    conn.rollback()
            
            # Add created_at column if it doesn't exist
            if 'created_at' not in existing_columns:
                try:
                    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                        conn.execute(text("ALTER TABLE api_keys ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    else:
                        conn.execute(text("ALTER TABLE api_keys ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                    conn.commit()
                    print("✓ Added missing column: api_keys.created_at")
                except Exception as e:
                    print(f"⚠ Warning: Could not add column api_keys.created_at: {e}")
                    conn.rollback()
    
    print("✓ Database initialization and migration completed.")
