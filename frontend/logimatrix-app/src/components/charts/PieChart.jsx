import React from 'react';
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const defaultColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, formatter }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                <p className="text-sm font-medium" style={{ color: data.payload.fill }}>
                    {data.name}
                </p>
                <p className="text-white text-lg font-bold">
                    {formatter ? formatter(data.value) : data.value.toLocaleString()}
                </p>
                <p className="text-slate-400 text-xs">
                    {((data.percent) * 100).toFixed(1)}%
                </p>
            </div>
        );
    }
    return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show label for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

/**
 * Reusable Pie/Donut Chart Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array [{name, value, color?}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.donut - Show as donut chart (default: true)
 * @param {boolean} props.showLabels - Show percentage labels (default: false)
 * @param {Function} props.valueFormatter - Custom value formatter for tooltip
 * @param {string} props.centerLabel - Label to display in donut center
 * @param {string} props.centerValue - Value to display in donut center
 */
const PieChart = ({
    data = [],
    height = 300,
    showLegend = true,
    donut = true,
    showLabels = false,
    valueFormatter,
    centerLabel,
    centerValue,
    colors = defaultColors,
    animate = true
}) => {
    const innerRadius = donut ? '55%' : 0;
    const outerRadius = '80%';

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    dataKey="value"
                    nameKey="name"
                    label={showLabels ? renderCustomLabel : false}
                    labelLine={false}
                    isAnimationActive={animate}
                    animationDuration={800}
                    animationEasing="ease-out"
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color || colors[index % colors.length]}
                            stroke="#0F172A"
                            strokeWidth={2}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={valueFormatter} />} />
                {showLegend && (
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={10}
                        formatter={(value) => (
                            <span className="text-slate-300 text-sm">{value}</span>
                        )}
                    />
                )}
                {/* Center label for donut chart */}
                {donut && (centerLabel || centerValue) && (
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {centerValue && (
                            <tspan
                                x="50%"
                                dy="-0.3em"
                                fill="white"
                                fontSize={24}
                                fontWeight={700}
                            >
                                {centerValue}
                            </tspan>
                        )}
                        {centerLabel && (
                            <tspan
                                x="50%"
                                dy={centerValue ? "1.5em" : "0"}
                                fill="#94A3B8"
                                fontSize={12}
                            >
                                {centerLabel}
                            </tspan>
                        )}
                    </text>
                )}
            </RechartsPieChart>
        </ResponsiveContainer>
    );
};

export default PieChart;
