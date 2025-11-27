from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from models import Base, engine, SessionLocal, PriceLog, TradeLog, APIKey, init_db
from scheduler import start_scheduler
from trader import place_order, get_balance

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Bithumb Trading API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS
origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check endpoint (used by container/ops to verify service availability)
@app.get("/api/health")
def health():
    return {"status": "ok"}

# Pydantic Models
class TradeRequest(BaseModel):
    key_id: int
    side: str # 'bid' or 'ask'
    amount: float # KRW for bid, Coin amount for ask
    coin: str = "BTC"

class KeyCreate(BaseModel):
    name: str
    access_key: str
    secret_key: str

class KeyResponse(BaseModel):
    id: int
    name: str
    access_key_masked: str

    class Config:
        orm_mode = True

# Startup Event
@app.on_event("startup")
def on_startup():
    init_db()
    start_scheduler()
    logger.info("Database initialized and Scheduler started.")

# Endpoints

@app.get("/api/market/current")
def get_current_market(db: Session = Depends(get_db)):
    # Use primary key ordering to avoid issues when system clock drifts
    latest = db.query(PriceLog).order_by(PriceLog.id.desc()).first()
    if not latest:
        return {"btc_price": 0, "usd_krw_rate": 0, "timestamp": None}
    return latest

@app.get("/api/market/history")
def get_market_history(limit: int = 100, db: Session = Depends(get_db)):
    # Get last N records by insertion order to avoid timestamp ordering issues
    history = db.query(PriceLog).order_by(PriceLog.id.desc()).limit(limit).all()
    return list(reversed(history)) # Return in chronological order

@app.get("/api/trades")
def get_trades(db: Session = Depends(get_db)):
    trades = db.query(TradeLog).order_by(TradeLog.timestamp.desc()).limit(50).all()
    return trades

@app.post("/api/trade")
def execute_trade(request: TradeRequest, db: Session = Depends(get_db)):
    # Get API Key
    key = db.query(APIKey).filter(APIKey.id == request.key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")

    # Execute Trade
    try:
        trade_units = request.amount
        
        # Get Current Price for Volume Calculation (Sell) or Logging
        latest_price = db.query(PriceLog).order_by(PriceLog.timestamp.desc()).first()
        
        # Map coin to price field
        price_map = {
            "BTC": latest_price.btc_price if latest_price else 0,
            "ETH": latest_price.eth_price if latest_price else 0,
            "XRP": latest_price.xrp_price if latest_price else 0,
            "SOL": latest_price.sol_price if latest_price else 0,
            "USDT": latest_price.usdt_price if latest_price else 0,
            "DOGE": latest_price.doge_price if latest_price else 0,
        }
        current_price = price_map.get(request.coin.upper(), 0)

        if request.side == 'ask':
            if current_price <= 0:
                 raise HTTPException(status_code=400, detail=f"Current price for {request.coin} not found")
            
            # Convert KRW amount to Coin Volume for Market Sell
            # e.g. 5000 KRW / 100,000,000 KRW/BTC = 0.00005 BTC
            trade_units = request.amount / current_price
            # Bithumb requires specific precision (usually 4 decimal places for major coins)
            trade_units = float("{:.4f}".format(trade_units)) 
            
            logger.info(f"SELL Calculation: {request.amount} KRW / {current_price} Price = {trade_units} Units")

            if trade_units <= 0:
                min_krw = current_price * 0.0001
                raise HTTPException(
                    status_code=400, 
                    detail=f"Order amount too small ({trade_units} units). Minimum 0.0001 units required (approx. {int(min_krw)} KRW)."
                )

        # For 'bid' (buy), trade_units is KRW amount. For 'ask' (sell), it is Coin volume.
        response = place_order(
            key.access_key, 
            key.secret_key, 
            request.coin, 
            "KRW", 
            trade_units, 
            request.side
        )
        
        if "status" in response and response["status"] != "0000":
             raise Exception(f"Bithumb API Error: {response}")
        
        if "error" in response:
             raise Exception(f"Bithumb API Error: {response['error']}")

        # Log Trade
        exec_price = current_price
        
        trade_log = TradeLog(
            side=request.side,
            amount_krw=request.amount if request.side == 'bid' else request.amount, # Approx KRW value
            amount_btc=trade_units if request.side == 'ask' else request.amount / exec_price if exec_price > 0 else 0, # Approx Coin amount
            price=exec_price,
            order_id=response.get("order_id", "unknown"),
            timestamp=datetime.now()
        )
        db.add(trade_log)
        db.commit()
        
        return {"status": "success", "data": response}

    except Exception as e:
        logger.error(f"Trade failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/keys", response_model=List[KeyResponse])
def get_keys(db: Session = Depends(get_db)):
    keys = db.query(APIKey).all()
    return [
        KeyResponse(
            id=k.id, 
            name=k.name, 
            access_key_masked=f"{k.access_key[:4]}...{k.access_key[-4:]}"
        ) for k in keys
    ]

@app.post("/api/keys")
def add_key(key: KeyCreate, db: Session = Depends(get_db)):
    # Simple check if exists
    existing = db.query(APIKey).filter(APIKey.name == key.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Key name already exists")
    
    new_key = APIKey(name=key.name, access_key=key.access_key, secret_key=key.secret_key)
    db.add(new_key)
    db.commit()
    return {"status": "success", "id": new_key.id}

@app.delete("/api/keys/{key_id}")
def delete_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(key)
    db.commit()
    return {"status": "success"}

@app.get("/api/balance/{key_id}")
def get_key_balance(key_id: int, db: Session = Depends(get_db)):
    """Get balance for a specific API key"""
    key = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    try:
        balance = get_balance(key.access_key, key.secret_key)
        return {"status": "success", "data": balance}
    except Exception as e:
        logger.error(f"Failed to get balance: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/prices")
def get_current_prices(db: Session = Depends(get_db)):
    """Get current prices for BTC, USDT and exchange rate"""
    latest = db.query(PriceLog).order_by(PriceLog.id.desc()).first()
    if not latest:
        return {
            "btc_price": 0,
            "usdt_price": 0,
            "usd_krw_rate": 0,
            "timestamp": None
        }
    
    return {
        "btc_price": latest.btc_price,
        "usdt_price": latest.usdt_price,
        "usd_krw_rate": latest.usd_krw_rate,
        "timestamp": latest.timestamp
    }
