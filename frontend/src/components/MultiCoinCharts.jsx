import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CoinCard = ({ data, coinKey, coinName, color }) => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (!Array.isArray(data)) return;

        const processed = data
            .map(d => ({
                time: new Date(d.timestamp).getTime(),
                value: parseFloat(d[coinKey]) || 0
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => a.time - b.time);

        setChartData(processed);
    }, [data, coinKey]);

    const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const startPrice = chartData.length > 0 ? chartData[0].value : 0;
    const priceChange = latestPrice - startPrice;
    const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
    const isPositive = priceChange >= 0;

    return (
        <div className="bg-[#1E2329] rounded-lg p-3 border border-[#2B3139] hover:border-[#F0B90B] transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
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

            {/* Price */}
            <div className="mb-3">
                <div className="text-[#EAECEF] font-bold text-xl font-mono">
                    {latestPrice > 0 ? latestPrice.toLocaleString() : '---'}
                </div>
                <div className="text-[#848E9C] text-xs">KRW</div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: '80px' }}>
                {chartData.length >= 2 ? (
                    <LineChart
                        width={400}
                        height={80}
                        data={chartData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                        <XAxis dataKey="time" hide />
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
                            isAnimationActive={true}
                            animationDuration={500}
                        />
                    </LineChart>
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
    const coins = [
        { key: 'btc_price', name: 'BTC', color: '#F0B90B' },
        { key: 'eth_price', name: 'ETH', color: '#627EEA' },
        { key: 'xrp_price', name: 'XRP', color: '#FFFFFF' },
        { key: 'sol_price', name: 'SOL', color: '#14F195' },
        { key: 'usdt_price', name: 'USDT', color: '#26A17B' },
        { key: 'doge_price', name: 'DOGE', color: '#C2A633' }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[#EAECEF] text-xl font-bold">Market Overview</h2>
                <div className="text-[#848E9C] text-xs font-mono">
                    Live • {data?.length || 0} records
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
                {coins.map(coin => (
                    <CoinCard
                        key={coin.key}
                        data={data || []}
                        coinKey={coin.key}
                        coinName={coin.name}
                        color={coin.color}
                    />
                ))}
            </div>
        </div>
    );
};

export default MultiCoinCharts;
