import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-lg text-sm">
                <p className="text-slate-400 mb-1">{format(new Date(label), 'HH:mm:ss')}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {entry.value.toLocaleString()}
                        {entry.payload.side && (
                            <span className="block text-xs text-white mt-1">
                                {entry.payload.side.toUpperCase()} {entry.payload.amount_btc?.toFixed(6)} BTC
                                <br />
                                Total: {Math.round(entry.payload.amount_krw).toLocaleString()} KRW
                            </span>
                        )}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const PriceChart = ({ data, trades }) => {
    // Merge trades into data for visualization if needed, or just overlay scatter
    // For simplicity, we'll plot trades as a separate scatter series on the same axis
    // But Recharts scatter needs x/y. X is timestamp.

    const tradePoints = trades.map(t => ({
        timestamp: new Date(t.timestamp).getTime(),
        price: t.price,
        side: t.side,
        amount_btc: t.amount_btc,
        amount_krw: t.amount_krw,
        fill: t.side === 'bid' ? '#ef4444' : '#3b82f6' // Red for Buy, Blue for Sell
    }));

    const chartData = data.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp).getTime(),
    }));

    return (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">BTC/KRW Price & Trades</h2>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['auto', 'auto']}
                            tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
                            stroke="#94a3b8"
                        />
                        <YAxis
                            yAxisId="left"
                            domain={['auto', 'auto']}
                            stroke="#94a3b8"
                            tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="btc_price"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="Price"
                            animationDuration={500}
                        />
                        <Scatter
                            yAxisId="left"
                            data={tradePoints}
                            fill="#8884d8"
                            shape="circle"
                            name="Trade"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PriceChart;
