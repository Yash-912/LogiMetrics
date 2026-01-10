import React from 'react';
import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const defaultColors = {
    primary: '#06B6D4',
    secondary: '#3B82F6',
    gradient: {
        start: '#06B6D4',
        end: '#3B82F6'
    }
};

const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                <p className="text-slate-400 text-xs mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                        {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * Reusable Area Chart Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {string} props.xKey - Key for X-axis data
 * @param {Array} props.areas - Array of area configurations [{key, name, color, gradient}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showGrid - Show grid lines (default: true)
 * @param {boolean} props.showLegend - Show legend (default: false)
 * @param {Function} props.valueFormatter - Custom value formatter for tooltip
 * @param {boolean} props.stacked - Stack areas (default: false)
 */
const AreaChart = ({
    data = [],
    xKey = 'name',
    areas = [{ key: 'value', name: 'Value', color: defaultColors.primary }],
    height = 300,
    showGrid = true,
    showLegend = false,
    valueFormatter,
    stacked = false,
    animate = true
}) => {
    const gradientId = `areaGradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
                <defs>
                    {areas.map((area, idx) => (
                        <linearGradient
                            key={`gradient-${idx}`}
                            id={`${gradientId}-${idx}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor={area.gradient?.start || area.color}
                                stopOpacity={0.4}
                            />
                            <stop
                                offset="95%"
                                stopColor={area.gradient?.end || area.color}
                                stopOpacity={0.05}
                            />
                        </linearGradient>
                    ))}
                </defs>
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                        vertical={false}
                    />
                )}
                <XAxis
                    dataKey={xKey}
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                    content={<CustomTooltip formatter={valueFormatter} />}
                    cursor={{ stroke: '#475569', strokeDasharray: '5 5' }}
                />
                {showLegend && (
                    <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        iconType="circle"
                    />
                )}
                {areas.map((area, idx) => (
                    <Area
                        key={area.key}
                        type="monotone"
                        dataKey={area.key}
                        name={area.name}
                        stroke={area.color}
                        strokeWidth={2}
                        fill={`url(#${gradientId}-${idx})`}
                        stackId={stacked ? 'stack' : undefined}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                ))}
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
};

export default AreaChart;
