import React, { useState, useEffect } from 'react';
import { api } from './api';
import MultiCoinCharts from './components/MultiCoinCharts';
import TradeForm from './components/TradeForm';
import KeyManager from './components/KeyManager';
import Toast from './components/Toast';
import Login from './components/Login';
import SettingsModal from './components/SettingsModal';
import ConfirmationModal from './components/ConfirmationModal';
import PhoneSetupModal from './components/PhoneSetupModal';
import { Activity, LogOut, Settings, User } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPhoneSetupOpen, setIsPhoneSetupOpen] = useState(false);
  const [marketHistory, setMarketHistory] = useState([]);
  const [trades, setTrades] = useState([]);
  const [keys, setKeys] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [usdtPrice, setUsdtPrice] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    try {
      const [historyRes, tradesRes, currentRes] = await Promise.all([
        api.getMarketHistory(),
        api.getTrades(),
        api.getMarketCurrent()
      ]);
      setMarketHistory(historyRes.data);
      setTrades(tradesRes.data);
      setCurrentPrice(currentRes.data.btc_price);
      setExchangeRate(currentRes.data.usd_krw_rate);
      setUsdtPrice(currentRes.data.usdt_price);
    } catch (error) {
      console.error("Failed to fetch market data", error);
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await api.getKeys();
      setKeys(res.data);
    } catch (error) {
      console.error("Failed to fetch keys", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
      fetchData();
      api.getMe().then(res => {
        setUser(res.data);
        if (!res.data.phone_number) {
          setIsPhoneSetupOpen(true);
        }
      }).catch(console.error);
      const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (token) => {
    setIsAuthenticated(true);
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setKeys([]);
    setUser(null);
    setIsLogoutModalOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-slate-50 p-6 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-center gap-4 md:gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
          <Activity className="text-emerald-400" size={32} />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Bithumb Trader Pro
            </h1>
            <p className="text-slate-400 text-sm">Automated Trading Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:ml-auto">
          {user && (
            <div className="flex items-center gap-2 mr-2 md:mr-4 bg-[#1E2329] px-3 py-1.5 rounded-lg border border-[#2B3139]">
              <User size={16} className="text-emerald-400" />
              <span className="text-sm text-slate-300">{user.email}</span>
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleLogoutClick}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm w-full md:w-auto">
          <div className="bg-[#1E2329] px-4 py-2 rounded-lg border border-[#2B3139] flex justify-between md:block">
            <span className="text-[#848E9C] block text-xs">BTC Price</span>
            <span className="font-mono text-[#F0B90B] text-lg">
              {currentPrice ? currentPrice.toLocaleString() : '---'} KRW
            </span>
          </div>
          <div className="bg-[#1E2329] px-4 py-2 rounded-lg border border-[#2B3139] flex justify-between md:block">
            <span className="text-[#848E9C] block text-xs">USDT Price</span>
            <span className="font-mono text-[#0ECB81] text-lg">
              {usdtPrice ? usdtPrice.toLocaleString() : '---'} KRW
            </span>
          </div>
          <div className="bg-[#1E2329] px-4 py-2 rounded-lg border border-[#2B3139] flex justify-between md:block">
            <span className="text-[#848E9C] block text-xs">USD/KRW</span>
            <span className="font-mono text-[#EAECEF] text-lg">
              {exchangeRate ? exchangeRate.toLocaleString() : '---'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-6">
          <MultiCoinCharts data={marketHistory} />

          <div className="bg-[#1E2329] rounded-xl p-6 border border-[#2B3139]">
            <h2 className="text-lg font-semibold mb-4 text-[#EAECEF]">Recent Trades</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              <table className="w-full text-sm text-left relative">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Exchange</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(t => {
                    const exchange = (t.exchange || 'bithumb').toLowerCase();
                    let badgeStyle = "bg-slate-500/20 text-slate-400";
                    if (exchange === 'bithumb') badgeStyle = "bg-orange-500/20 text-orange-400";
                    else if (exchange === 'binance') badgeStyle = "bg-yellow-500/20 text-yellow-400";
                    else if (exchange === 'korbit') badgeStyle = "bg-blue-500/20 text-blue-400";

                    const isBinance = exchange === 'binance';
                    const currency = isBinance ? 'USDT' : 'KRW';
                    const totalValue = isBinance ? t.amount_krw : Math.round(t.amount_krw);

                    return (
                      <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${badgeStyle}`}>
                            {exchange}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-medium ${t.side === 'bid' ? 'text-red-400' : 'text-blue-400'}`}>
                          {t.side.toUpperCase()}
                        </td>
                        <td className="px-4 py-3">{t.price.toLocaleString()}</td>
                        <td className="px-4 py-3">{t.amount_btc.toFixed(6)}</td>
                        <td className="px-4 py-3">{totalValue.toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></td>
                      </tr>
                    );
                  })}
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                        No trades recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyManager keys={keys} onUpdate={fetchKeys} showToast={showToast} />
          <TradeForm keys={keys} onTrade={fetchData} showToast={showToast} />
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onLogout={confirmLogout}
        />
      )}

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        confirmStyle="danger"
      />

      <PhoneSetupModal
        isOpen={isPhoneSetupOpen}
        onComplete={(phone) => {
          setUser({ ...user, phone_number: phone });
          setIsPhoneSetupOpen(false);
        }}
      />
    </div>
  );
}

export default App;
