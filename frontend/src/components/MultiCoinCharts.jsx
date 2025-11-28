import React, { useEffect, useState, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Globe, Plus, X } from 'lucide-react';

const CoinCard = ({ data, coinKey, coinName, color, onRemove }) => {
    const [chartData, setChartData] = useState([]);
    const [viewWindow, setViewWindow] = useState({ start: 0, end: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMouseX = useRef(0);

    useEffect(() => {
        if (!Array.isArray(data)) return;

        const processed = data
            .map(d => {
                // Handle both legacy and new market_data structure
                let value = 0;
                let binanceValue = 0;
                let korbitValue = 0;

                // Try new market_data first
                if (d.market_data && d.market_data[coinName]) {
                    value = d.market_data[coinName].bithumb || 0;
                    binanceValue = d.market_data[coinName].binance || 0;
                    korbitValue = d.market_data[coinName].korbit || 0;
                } else {
                    // Fallback to legacy columns
                    value = parseFloat(d[coinKey]) || 0;
                    // Legacy binance/korbit mapping was complex, simplifying for dynamic:
                    // If legacy columns exist, use them, otherwise 0
                    // Note: This might miss some legacy data if keys don't match exactly, 
                    // but we are moving to market_data.
                }

                return {
                    time: new Date(d.timestamp).getTime(),
                    value: value,
                    binanceValue: binanceValue,
                    korbitValue: korbitValue,
                    rate: parseFloat(d.usd_krw_rate) || 1300
                };
            })
            .filter(d => d.value > 0)
            .sort((a, b) => a.time - b.time);

        setChartData(processed);

        const initialViewSize = Math.min(processed.length, 50);
        setViewWindow({
            start: Math.max(0, processed.length - initialViewSize),
            end: Math.max(0, processed.length - 1)
        });
    }, [data, coinKey, coinName]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        lastMouseX.current = e.clientX;
    };

    const handleMouseMove = (e) => {
        if (!isDragging || chartData.length === 0) return;

        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;

        const chartWidth = e.currentTarget.clientWidth;
        const currentCount = viewWindow.end - viewWindow.start + 1;
        if (currentCount <= 1) return;

        const pixelsPerIndex = chartWidth / currentCount;
        const moveCount = Math.round(-deltaX / pixelsPerIndex);

        if (moveCount === 0) return;

        let newStart = viewWindow.start + moveCount;
        let newEnd = viewWindow.end + moveCount;

        if (newStart < 0) {
            newStart = 0;
            newEnd = currentCount - 1;
        }
        if (newEnd >= chartData.length) {
            newEnd = chartData.length - 1;
            newStart = newEnd - currentCount + 1;
            if (newStart < 0) newStart = 0;
        }

        setViewWindow({ start: newStart, end: newEnd });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);

    const handleWheel = (e) => {
        e.preventDefault();
        if (chartData.length === 0) return;

        const currentLength = viewWindow.end - viewWindow.start + 1;
        const zoomFactor = 0.1;
        const delta = e.deltaY > 0 ? 1 : -1;

        let newLength = currentLength + (currentLength * zoomFactor * delta);
        newLength = Math.max(5, Math.min(chartData.length, newLength));

        const center = (viewWindow.start + viewWindow.end) / 2;
        let newStart = Math.round(center - (newLength / 2));
        let newEnd = Math.round(center + (newLength / 2));

        if (newStart < 0) {
            newStart = 0;
            newEnd = Math.min(chartData.length - 1, Math.round(newLength) - 1);
        }
        if (newEnd >= chartData.length) {
            newEnd = chartData.length - 1;
            newStart = Math.max(0, newEnd - Math.round(newLength) + 1);
        }

        setViewWindow({ start: newStart, end: newEnd });
    };

    const displayedData = useMemo(() => {
        if (!chartData.length) return [];
        const s = Math.max(0, viewWindow.start);
        const e = Math.min(chartData.length - 1, viewWindow.end);
        return chartData.slice(s, e + 1);
    }, [chartData, viewWindow]);

    const latestRecord = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const latestPrice = latestRecord ? latestRecord.value : 0;
    const startPrice = chartData.length > 0 ? chartData[0].value : 0;

    // Binance & Premium Calc
    const binancePriceUSD = latestRecord ? latestRecord.binanceValue : 0;
    const korbitPriceKRW = latestRecord ? latestRecord.korbitValue : 0;
    const exchangeRate = latestRecord ? latestRecord.rate : 1300;

    const binancePriceKRW = binancePriceUSD * exchangeRate;

    const binancePremium = binancePriceKRW > 0 ? ((latestPrice - binancePriceKRW) / binancePriceKRW) * 100 : 0;
    const korbitPremium = korbitPriceKRW > 0 ? ((latestPrice - korbitPriceKRW) / korbitPriceKRW) * 100 : 0;

    const priceChange = latestPrice - startPrice;
    const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
    const isPositive = priceChange >= 0;

    return (
        <div className="bg-[#1E2329] rounded-lg p-3 border border-[#2B3139] hover:border-[#F0B90B] transition-all duration-200 relative group">
            {/* Remove Button */}
            <button
                onClick={() => onRemove(coinName)}
                className="absolute top-2 right-2 text-[#848E9C] hover:text-[#F6465D] opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between mb-2 pr-6">
                <div className="flex items-center gap-2">
                    <span className="text-[#EAECEF] font-bold text-sm">{coinName}</span>
                    <span className={`text-xs font-semibold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                    </span>
                </div>
                {isPositive ? (
                    <TrendingUp size={16} className="text-[#0ECB81]" />
                ) : (
                    <TrendingDown size={16} className="text-[#F6465D]" />
                )}
            </div>

            {/* Price & Premium */}
            <div className="mb-3">
                <div className="text-[#EAECEF] font-bold text-xl font-mono">
                    {latestPrice > 0 ? latestPrice.toLocaleString() : '---'}
                    <span className="text-[#848E9C] text-xs ml-1">KRW</span>
                </div>

                <div className="mt-2 space-y-1 border-t border-slate-700/50 pt-2">
                    {/* Binance Info */}
                    {binancePriceKRW > 0 && (
                        <div className="flex justify-between items-end text-[11px]">
                            <div className="flex items-center gap-1 text-[#848E9C]">
                                <Globe size={10} />
                                <span>Binance</span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 font-mono mr-2">
                                    ≈ {parseInt(binancePriceKRW).toLocaleString()}
                                </span>
                                <span className={`font-bold ${binancePremium > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {binancePremium > 0 ? '+' : ''}{binancePremium.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Korbit Info */}
                    {korbitPriceKRW > 0 && (
                        <div className="flex justify-between items-end text-[11px]">
                            <div className="flex items-center gap-1 text-[#848E9C]">
                                <Globe size={10} />
                                <span>Korbit</span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 font-mono mr-2">
                                    {parseInt(korbitPriceKRW).toLocaleString()}
                                </span>
                                <span className={`font-bold ${korbitPremium > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {korbitPremium > 0 ? '+' : ''}{korbitPremium.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div
                className="cursor-crosshair select-none"
                style={{ width: '100%', height: '160px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
            >
                {displayedData.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={displayedData}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid stroke="#2B3139" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="time"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(ts) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                tick={{ fill: '#848E9C', fontSize: 10 }}
                                axisLine={{ stroke: '#2B3139' }}
                                tickLine={{ stroke: '#2B3139' }}
                                minTickGap={30}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1E2329',
                                    border: '1px solid #F0B90B',
                                    borderRadius: '6px',
                                    color: '#EAECEF',
                                    fontSize: '11px',
                                    padding: '8px'
                                }}
                                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                                formatter={(value) => [value.toLocaleString() + ' KRW', '']}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-[#848E9C] text-xs">Loading...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MultiCoinCharts = ({ data }) => {
    // Default coins
    const [selectedCoins, setSelectedCoins] = useState([
        { symbol: 'BTC', name: 'Bitcoin', color: '#F0B90B' },
        { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
        { symbol: 'XRP', name: 'XRP', color: '#FFFFFF' },
        { symbol: 'SOL', name: 'Solana', color: '#14F195' },
        { symbol: 'USDT', name: 'Tether', color: '#26A17B' },
        { symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' }
    ]);

    const [availableCoins, setAvailableCoins] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Fetch available coins from backend
        fetch('http://localhost:8000/api/coins')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAvailableCoins(data);
                }
            })
            .catch(err => console.error("Failed to fetch coins:", err));
    }, []);

    const handleAddCoin = (coin) => {
        if (selectedCoins.find(c => c.symbol === coin.symbol)) return;

        // Generate a random color or use a default
        const colors = ['#F0B90B', '#627EEA', '#FFFFFF', '#14F195', '#26A17B', '#C2A633', '#E84142', '#3273F6', '#0ECB81'];
        const color = colors[selectedCoins.length % colors.length];

        setSelectedCoins([...selectedCoins, { ...coin, color }]);
        setIsModalOpen(false);
    };

    const handleRemoveCoin = (symbol) => {
        setSelectedCoins(selectedCoins.filter(c => c.symbol !== symbol));
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[#EAECEF] text-xl font-bold">Market Overview</h2>
                <div className="flex items-center gap-4">
                    <div className="text-[#848E9C] text-xs font-mono">
                        Live • {data?.length || 0} records
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 bg-[#F0B90B] text-black px-3 py-1 rounded text-xs font-bold hover:bg-[#D9A507] transition-colors"
                    >
                        <Plus size={14} /> Add Coin
                    </button>
                </div>
            </div>

            {/* Debug Info - Remove later */}
            <div className="text-[10px] text-slate-500 font-mono mb-2 text-right">
                <span className="block md:hidden">View: Mobile (1 col)</span>
                <span className="hidden md:block lg:hidden">View: Tablet (2 cols)</span>
                <span className="hidden lg:block">View: Desktop (3 cols)</span>
            </div>

            {/* Grid - Responsive: 1 col (mobile), 2 cols (tablet), 3 cols (desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCoins.map(coin => (
                    <CoinCard
                        key={coin.symbol}
                        data={data || []}
                        coinKey={`${coin.symbol.toLowerCase()}_price`} // Fallback key
                        coinName={coin.symbol}
                        color={coin.color}
                        onRemove={() => handleRemoveCoin(coin.symbol)}
                    />
                ))}

                {/* Add Button Card */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#1E2329] rounded-lg p-3 border border-[#2B3139] border-dashed hover:border-[#F0B90B] transition-all duration-200 flex flex-col items-center justify-center h-[260px] group"
                >
                    <div className="bg-[#2B3139] p-3 rounded-full mb-2 group-hover:bg-[#F0B90B] transition-colors">
                        <Plus size={24} className="text-[#848E9C] group-hover:text-black" />
                    </div>
                    <span className="text-[#848E9C] font-bold text-sm group-hover:text-[#F0B90B]">Add Chart</span>
                </button>
            </div>

            {/* Add Coin Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1E2329] rounded-lg border border-[#2B3139] w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-[#2B3139] flex justify-between items-center">
                            <h3 className="text-[#EAECEF] font-bold">Select Coin</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#848E9C] hover:text-[#EAECEF]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                            {availableCoins.map(coin => {
                                const isSelected = selectedCoins.find(c => c.symbol === coin.symbol);
                                return (
                                    <button
                                        key={coin.id}
                                        onClick={() => !isSelected && handleAddCoin(coin)}
                                        disabled={isSelected}
                                        className={`w-full text-left p-3 rounded flex items-center justify-between mb-1 ${isSelected
                                                ? 'opacity-50 cursor-not-allowed bg-[#2B3139]/50'
                                                : 'hover:bg-[#2B3139] cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {coin.image && <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                                            <div>
                                                <div className="text-[#EAECEF] font-bold">{coin.symbol}</div>
                                                <div className="text-[#848E9C] text-xs">{coin.name}</div>
                                            </div>
                                        </div>
                                        {isSelected && <span className="text-[#F0B90B] text-xs">Selected</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiCoinCharts;
