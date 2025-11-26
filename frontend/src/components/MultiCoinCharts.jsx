import React, { useEffect, useState, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CoinCard = ({ data, coinKey, coinName, color }) => {
    const [chartData, setChartData] = useState([]);
    const [viewWindow, setViewWindow] = useState({ start: 0, end: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMouseX = useRef(0);
    const chartRef = useRef(null);

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
        
        // 초기에는 최근 50개 데이터 보여주기 (없으면 전체)
        const initialViewSize = Math.min(processed.length, 50);
        setViewWindow({
            start: Math.max(0, processed.length - initialViewSize),
            end: Math.max(0, processed.length - 1)
        });
    }, [data, coinKey]);

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

        // 픽셀당 인덱스 이동량 계산 (감도 조절)
        const pixelsPerIndex = chartWidth / currentCount;
        const moveCount = Math.round(-deltaX / pixelsPerIndex);

        if (moveCount === 0) return;

        let newStart = viewWindow.start + moveCount;
        let newEnd = viewWindow.end + moveCount;

        // 왼쪽 경계 체크
        if (newStart < 0) {
            newStart = 0;
            newEnd = currentCount - 1;
        }
        // 오른쪽 경계 체크
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
        const zoomFactor = 0.1; // 10% 씩 줌
        const delta = e.deltaY > 0 ? 1 : -1; // 양수면 축소(범위증가), 음수면 확대(범위감소)
        
        let newLength = currentLength + (currentLength * zoomFactor * delta);
        // 최소 5개, 최대 전체 데이터
        newLength = Math.max(5, Math.min(chartData.length, newLength));

        const center = (viewWindow.start + viewWindow.end) / 2;
        let newStart = Math.round(center - (newLength / 2));
        let newEnd = Math.round(center + (newLength / 2));

        // 범위 보정
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
            <div 
                className="cursor-crosshair select-none"
                style={{ width: '100%', height: '200px' }}
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
