import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const TradeForm = ({ keys, onTrade, showToast }) => {
    const [selectedKey, setSelectedKey] = useState('');
    const [amount, setAmount] = useState(10000);
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(null);
    const [prices, setPrices] = useState(null);
    const [selectedCoin, setSelectedCoin] = useState('BTC');
    const [side, setSide] = useState('bid'); // 'bid' for buy, 'ask' for sell
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        if (keys.length > 0 && !selectedKey) {
            setSelectedKey(keys[0].id);
        }
    }, [keys]);

    useEffect(() => {
        if (selectedKey) {
            setBalance(null); // Reset balance on key change to prevent stale data
            fetchBalance();
        }
        fetchPrices();
        const interval = setInterval(fetchPrices, 5000);
        return () => clearInterval(interval);
    }, [selectedKey]);

    const selectedKeyObj = keys.find(k => k.id == selectedKey);
    const exchange = selectedKeyObj ? (selectedKeyObj.exchange || 'bithumb') : 'bithumb';
    const fiatCurrency = exchange === 'binance' ? 'USDT' : 'KRW';

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

        if (exchange === 'binance') {
            if (!prices.binance) return 0;
            return prices.binance[coin.toLowerCase()] || 0;
        } else {
            // Bithumb
            const key = `${coin.toLowerCase()}_price`;
            return prices[key] || 0;
        }
    };

    const calculateCoinAmount = () => {
        const price = getCoinPrice(selectedCoin);
        if (!price || !amount) return 0;
        return amount / price;
    };

    const getAvailableCoins = () => {
        if (!balance) return [];

        // Filter out the fiat currency (KRW or USDT) to show coin balances
        return balance
            .filter(b => b.currency !== fiatCurrency && parseFloat(b.balance) > 0)
            .map(b => ({
                currency: b.currency,
                balance: parseFloat(b.balance),
                value: parseFloat(b.balance) * getCoinPrice(b.currency)
            }));
    };

    const handleTradeClick = () => {
        if (!selectedKey) return showToast('Select an API Key', 'error');

        const actionText = side === 'bid' ? '매수(BUY)' : '매도(SELL)';
        const message = `거래소: ${exchange.toUpperCase()}\n종목: ${selectedCoin}\n금액: ${parseFloat(amount).toLocaleString()} ${fiatCurrency}\n\n정말 주문하시겠습니까?`;

        setConfirmModal({
            isOpen: true,
            title: `${actionText} 확인`,
            message,
            type: side
        });
    };

    const executeTrade = async () => {
        setLoading(true);
        try {
            await api.trade({
                key_id: selectedKey,
                side,
                amount: parseFloat(amount),
                coin: selectedCoin
            });
            onTrade();
            fetchBalance(); // Immediate refresh

            // Delayed refresh for exchange latency
            setTimeout(() => {
                fetchBalance();
            }, 2000);

            showToast(`Trade executed: ${side.toUpperCase()} ${selectedCoin}`, 'success');
        } catch (error) {
            showToast('Trade Failed: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fiatBalance = getBalanceForCurrency(fiatCurrency);
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
                        <option key={k.id} value={k.id}>
                            {k.exchange ? k.exchange.toUpperCase() : 'BITHUMB'} - {k.api_key_masked}
                        </option>
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
                            <span className="text-sm text-slate-400">{fiatCurrency}</span>
                            <span className="text-sm font-mono text-white">
                                {fiatBalance.toLocaleString()} {fiatCurrency}
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
                                        ≈ {coin.value.toLocaleString()} {fiatCurrency}
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
                            <option value="BTC">BTC</option>
                            <option value="ETH">ETH</option>
                            <option value="XRP">XRP</option>
                            <option value="SOL">SOL</option>
                            <option value="DOGE">DOGE</option>
                            {/* Binance supports USDT pairs for all above. Bithumb supports KRW pairs. */}
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
                    Amount ({fiatCurrency})
                </label>
                <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={exchange === 'binance' ? "10" : "5000"}
                    step={exchange === 'binance' ? "10" : "1000"}
                />
                {coinAmount > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                        ≈ {coinAmount.toFixed(8)} {selectedCoin}
                    </div>
                )}
            </div>

            {/* Execute Button */}
            <button
                onClick={handleTradeClick}
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeTrade}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
};

export default TradeForm;
