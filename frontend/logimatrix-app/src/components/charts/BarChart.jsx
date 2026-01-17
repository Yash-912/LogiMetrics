import React from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';

const defaultColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

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
 * Reusable Bar Chart Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {string} props.xKey - Key for X-axis data
 * @param {Array} props.bars - Array of bar configurations [{key, name, color}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showGrid - Show grid lines (default: true)
 * @param {boolean} props.showLegend - Show legend (default: false)
 * @param {boolean} props.stacked - Stack bars (default: false)
 * @param {boolean} props.horizontal - Horizontal bars (default: false)
 * @param {Function} props.valueFormatter - Custom value formatter for tooltip
 */
const BarChart = ({
    data = [],
    xKey = 'name',
    bars = [{ key: 'value', name: 'Value', color: defaultColors[0] }],
    height = 300,
    showGrid = true,
    showLegend = false,
    stacked = false,
    horizontal = false,
    valueFormatter,
    barRadius = 4,
    animate = true,
    colorByValue = false
}) => {
    const ChartComponent = RechartsBarChart;
    const layout = horizontal ? 'vertical' : 'horizontal';

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ChartComponent
                data={data}
                layout={layout}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                        vertical={!horizontal}
                        horizontal={horizontal}
                    />
                )}
                {horizontal ? (
                    <>
                        <XAxis
                            type="number"
                            stroke="#64748B"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            dataKey={xKey}
                            type="category"
                            stroke="#64748B"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                        />
                    </>
                ) : (
                    <>
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
                    </>
                )}
                <Tooltip
                    content={<CustomTooltip formatter={valueFormatter} />}
                    cursor={{ fill: '#1E293B', opacity: 0.5 }}
                />
                {showLegend && (
                    <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        iconType="circle"
                    />
                )}
                {bars.map((bar, barIdx) => (
                    <Bar
                        key={bar.key}
                        dataKey={bar.key}
                        name={bar.name}
                        fill={bar.color || defaultColors[barIdx % defaultColors.length]}
                        stackId={stacked ? 'stack' : undefined}
                        radius={[barRadius, barRadius, 0, 0]}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {colorByValue && data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={defaultColors[index % defaultColors.length]}
                            />
                        ))}
                    </Bar>
                ))}
            </ChartComponent>
        </ResponsiveContainer>
    );
};

export default BarChart;
