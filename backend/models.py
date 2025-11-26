from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class PriceLog(Base):
    __tablename__ = "price_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    btc_price = Column(Float, default=0.0)
    eth_price = Column(Float, default=0.0)
    xrp_price = Column(Float, default=0.0)
    sol_price = Column(Float, default=0.0)
    usdt_price = Column(Float, default=0.0)
    doge_price = Column(Float, default=0.0)
    usd_krw_rate = Column(Float, default=0.0)

class TradeLog(Base):
    __tablename__ = "trade_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    side = Column(String)  # 'bid' (buy) or 'ask' (sell)
    amount_krw = Column(Float) # KRW amount used/gained
    amount_btc = Column(Float) # BTC amount traded
    price = Column(Float)      # Execution price
    order_id = Column(String)  # Order UUID from Bithumb

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    access_key = Column(String)
    secret_key = Column(String)

# Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./bithumb_trading.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
