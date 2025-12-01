# Bithumb Trader Pro

Bithumb Trader Pro is a comprehensive cryptocurrency trading and monitoring dashboard designed to help traders analyze market trends and execute trades efficiently. It provides real-time price monitoring for the top 30 cryptocurrencies by market cap across multiple exchanges (Bithumb, Binance, Korbit) and allows for automated trade execution.

## 🚀 Features

-   **Multi-Exchange Monitoring**: Real-time price tracking and comparison across Bithumb (KRW), Binance (USDT), and Korbit (KRW).
-   **Top 30 Coin Support**: Automatically fetches and updates the top 30 coins by market cap using CoinGecko API.
-   **Dynamic Grid Layout**: Fully customizable dashboard. Users can add or remove coin charts dynamically to focus on specific assets.
-   **Premium Analysis**: Real-time "Kimchi Premium" calculation (price difference between Korean and Global exchanges).
-   **Trade Execution**: Direct interface to execute Buy/Sell orders on Bithumb, Binance, and Korbit.
-   **API Key Management**: Securely manage API keys for multiple exchanges.
-   **Dockerized**: Fully containerized application for easy deployment using Docker Compose.

## 🛠 Technology Stack

### Frontend
-   **React**: UI Library
-   **Vite**: Build tool
-   **TailwindCSS**: Styling
-   **Recharts**: Interactive charting
-   **Lucide React**: Icons

### Backend
-   **FastAPI**: High-performance Python web framework
-   **SQLAlchemy**: ORM for database interactions
-   **APScheduler**: Background tasks for price scraping
-   **PostgreSQL**: Primary database (Production/Docker)
-   **SQLite**: Local development database

## 🐳 Running with Docker (Recommended)

The easiest way to run the application is using Docker Compose.

### Prerequisites
-   Docker Desktop installed and running.

### Steps
1.  Clone the repository:
    ```bash
    git clone https://github.com/hangerine/coin-trader.git
    cd coin-trader
    ```

2.  Start the application:
    ```bash
    docker-compose up -d --build
    ```

3.  Access the application:
    -   **Frontend (Dashboard)**: [http://localhost:5173](http://localhost:5173)
    -   **Backend API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

## 🔧 Manual Development Setup

If you prefer to run the services locally without Docker:

### Backend
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the server:
    ```bash
    python run.py
    ```

### Frontend
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## 🛠️ Utility Scripts

The `backend/scripts/` folder contains utility scripts for database management and administration. These scripts are not part of the main application and should be run manually when needed.

### Available Scripts

#### `create_admin.py` - Create Admin User

**When to use:**
- First time setup: Create an initial admin user to access the application
- After database reset: Recreate admin user if the database was cleared
- Testing: Create test admin accounts

**How to use:**

**With Docker:**
```bash
# Execute inside the backend container
docker-compose exec backend python scripts/create_admin.py
```

**Without Docker (Local):**
```bash
cd backend
python scripts/create_admin.py
```

**What it does:**
- Creates a default admin user with:
  - Email: `admin@bithumb.com`
  - Password: `admin_password_123!`
- ⚠️ **Important**: Change the default password immediately after first login!
- If the admin user already exists, it will skip creation

---

#### `debug_db.py` - Database Debug Tool

**When to use:**
- Database connectivity issues: Verify that the application can connect to the database
- Data verification: Check if price data is being stored correctly
- Troubleshooting: Inspect the latest market data entry format
- Development: Quick check of database state

**How to use:**

**With Docker:**
```bash
# Execute inside the backend container
docker-compose exec backend python scripts/debug_db.py
```

**Without Docker (Local):**
```bash
cd backend
python scripts/debug_db.py
```

**What it does:**
- Displays the latest `PriceLog` entry from the database
- Shows:
  - Latest record ID
  - Timestamp
  - Market data type and content
- Helps identify if the scheduler is working and storing data correctly

---

### Notes

- All scripts automatically handle database connection using the same configuration as the main application
- Scripts will use the database specified in `DATABASE_URL` environment variable (or default SQLite for local development)
- Make sure the backend dependencies are installed before running scripts
- For Docker: Ensure containers are running before executing scripts

## 📝 License

This project is licensed under the MIT License.
