import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';

const TradeForm = ({ keys, onTrade, showToast }) => {
    const [selectedKey, setSelectedKey] = useState('');
    const [amount, setAmount] = useState(10000);
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(null);
    const [prices, setPrices] = useState(null);
    const [selectedCoin, setSelectedCoin] = useState('BTC');
    const [side, setSide] = useState('bid'); // 'bid' for buy, 'ask' for sell

    useEffect(() => {
        if (keys.length > 0 && !selectedKey) {
            setSelectedKey(keys[0].id);
        }
    }, [keys]);

    useEffect(() => {
        if (selectedKey) {
            fetchBalance();
        }
        fetchPrices();
        const interval = setInterval(fetchPrices, 5000);
        return () => clearInterval(interval);
    }, [selectedKey]);

    const fetchBalance = async () => {
        if (!selectedKey) return;
        try {
            const res = await api.getBalance(selectedKey);
            if (res.data.status === 'success' && Array.isArray(res.data.data)) {
                setBalance(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    };

    const fetchPrices = async () => {
        try {
            const res = await api.getPrices();
            setPrices(res.data);
        } catch (error) {
            console.error('Failed to fetch prices:', error);
        }
    };

    const getBalanceForCurrency = (currency) => {
        if (!balance) return 0;
        const account = balance.find(b => b.currency === currency);
        return account ? parseFloat(account.balance) : 0;
    };

    const getCoinPrice = (coin) => {
        if (!prices) return 0;
        if (coin === 'BTC') return prices.btc_price;
        if (coin === 'USDT') return prices.usdt_price;
        return 0;
    };

    const calculateCoinAmount = () => {
        const price = getCoinPrice(selectedCoin);
        if (!price || !amount) return 0;
        return amount / price;
    };

    const getAvailableCoins = () => {
        if (!balance) return [];
        return balance
            .filter(b => b.currency !== 'KRW' && parseFloat(b.balance) > 0)
            .map(b => ({
                currency: b.currency,
                balance: parseFloat(b.balance),
                value: parseFloat(b.balance) * getCoinPrice(b.currency)
            }));
    };

    const handleTrade = async () => {
        if (!selectedKey) return showToast('Select an API Key', 'error');
        setLoading(true);
        try {
            await api.trade({
                key_id: selectedKey,
                side,
                amount: parseFloat(amount),
                coin: selectedCoin
            });
            onTrade();
            fetchBalance(); // Refresh balance after trade
            showToast(`Trade executed: ${side.toUpperCase()} ${selectedCoin}`, 'success');
        } catch (error) {
            showToast('Trade Failed: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const krwBalance = getBalanceForCurrency('KRW');
    const coinAmount = calculateCoinAmount();
    const availableCoins = getAvailableCoins();

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg space-y-6">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                Execute Trade
            </h2>

            {/* API Key Selection */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">API Key</label>
                <select
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                >
                    {keys.map(k => (
                        <option key={k.id} value={k.id}>{k.name} ({k.access_key_masked})</option>
                    ))}
                </select>
            </div>

            {/* Balance Display */}
            {balance && (
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet size={16} className="text-emerald-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Account Balance</h3>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">KRW</span>
                            <span className="text-sm font-mono text-white">
                                {krwBalance.toLocaleString()} KRW
                            </span>
                        </div>

                        {availableCoins.map(coin => (
                            <div key={coin.currency} className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">{coin.currency}</span>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-white">
                                        {coin.balance.toFixed(8)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        ≈ {coin.value.toLocaleString()} KRW
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trade Type Selection */}
            <div>
                <label className="block text-sm text-slate-400 mb-2">Trade Type</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setSide('bid')}
                        className={`py-2 px-4 rounded-lg font-medium transition-colors ${side === 'bid'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setSide('ask')}
                        className={`py-2 px-4 rounded-lg font-medium transition-colors ${side === 'ask'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                    >
                        SELL
                    </button>
                </div>
            </div>

            {/* Coin Selection (for both buy and sell) */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">
                    {side === 'bid' ? 'Coin to Buy' : 'Coin to Sell'}
                </label>
                <select
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    value={selectedCoin}
                    onChange={(e) => setSelectedCoin(e.target.value)}
                >
                    {side === 'bid' ? (
                        // For buying, show all available coins
                        <>
                            <option value="BTC">BTC (Bitcoin)</option>
                            <option value="USDT">USDT (Tether)</option>
                        </>
                    ) : (
                        // For selling, only show coins with balance
                        availableCoins.length > 0 ? (
                            availableCoins.map(coin => (
                                <option key={coin.currency} value={coin.currency}>
                                    {coin.currency} (Balance: {coin.balance.toFixed(8)})
                                </option>
                            ))
                        ) : (
                            <option value="">No coins available to sell</option>
                        )
                    )}
                </select>
            </div>

            {/* Amount Input */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">
                    Amount (KRW)
                </label>
                <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="5000"
                    step="1000"
                />
                {coinAmount > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                        ≈ {coinAmount.toFixed(8)} {selectedCoin}
                    </div>
                )}
            </div>

            {/* Execute Button */}
            <button
                onClick={handleTrade}
                disabled={loading || !selectedKey || (side === 'ask' && availableCoins.length === 0)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${side === 'bid'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
            >
                {side === 'bid' ? (
                    <>
                        <ArrowUpCircle size={20} />
                        BUY {selectedCoin}
                    </>
                ) : (
                    <>
                        <ArrowDownCircle size={20} />
                        SELL {selectedCoin}
                    </>
                )}
            </button>
        </div>
    );
};

export default TradeForm;
