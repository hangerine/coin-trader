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

## 📝 License

This project is licensed under the MIT License.
