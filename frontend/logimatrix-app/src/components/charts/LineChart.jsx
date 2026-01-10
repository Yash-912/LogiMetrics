import React from 'react';
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';

const defaultColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

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
 * Reusable Line Chart Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {string} props.xKey - Key for X-axis data
 * @param {Array} props.lines - Array of line configurations [{key, name, color, dashed, strokeWidth}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showGrid - Show grid lines (default: true)
 * @param {boolean} props.showLegend - Show legend (default: false)
 * @param {boolean} props.showDots - Show data points (default: false)
 * @param {Function} props.valueFormatter - Custom value formatter for tooltip
 * @param {number} props.referenceLineY - Y value for horizontal reference line
 */
const LineChart = ({
    data = [],
    xKey = 'name',
    lines = [{ key: 'value', name: 'Value', color: defaultColors[0] }],
    height = 300,
    showGrid = true,
    showLegend = false,
    showDots = false,
    valueFormatter,
    referenceLineY,
    referenceLineLabel,
    animate = true,
    curveType = 'monotone'
}) => {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
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
                        iconType="line"
                    />
                )}
                {referenceLineY !== undefined && (
                    <ReferenceLine
                        y={referenceLineY}
                        stroke="#F59E0B"
                        strokeDasharray="5 5"
                        label={{
                            value: referenceLineLabel || `Target: ${referenceLineY}`,
                            fill: '#F59E0B',
                            fontSize: 11,
                            position: 'right'
                        }}
                    />
                )}
                {lines.map((line, idx) => (
                    <Line
                        key={line.key}
                        type={curveType}
                        dataKey={line.key}
                        name={line.name}
                        stroke={line.color || defaultColors[idx % defaultColors.length]}
                        strokeWidth={line.strokeWidth || 2}
                        strokeDasharray={line.dashed ? '5 5' : undefined}
                        dot={showDots ? {
                            r: 4,
                            fill: line.color || defaultColors[idx % defaultColors.length],
                            stroke: '#0F172A',
                            strokeWidth: 2
                        } : false}
                        activeDot={{
                            r: 6,
                            fill: line.color || defaultColors[idx % defaultColors.length],
                            stroke: '#fff',
                            strokeWidth: 2
                        }}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                ))}
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default LineChart;
