import React from 'react';
import {
    ScatterChart as RechartsScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ZAxis,
    ReferenceLine
} from 'recharts';

const defaultColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

const CustomTooltip = ({ active, payload, xLabel, yLabel, formatter }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                {data.name && (
                    <p className="text-white text-sm font-medium mb-2">{data.name}</p>
                )}
                <p className="text-slate-300 text-xs">
                    {xLabel || 'X'}: {formatter ? formatter(data.x) : data.x.toLocaleString()}
                </p>
                <p className="text-slate-300 text-xs">
                    {yLabel || 'Y'}: {formatter ? formatter(data.y) : data.y.toLocaleString()}
                </p>
                {data.z !== undefined && (
                    <p className="text-slate-300 text-xs">
                        Size: {data.z.toLocaleString()}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

/**
 * Reusable Scatter Plot Component
 * @param {Object} props
 * @param {Array} props.data - Array of datasets [{name, data: [{x, y, z?, name?}], color}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {string} props.xLabel - X-axis label
 * @param {string} props.yLabel - Y-axis label
 * @param {boolean} props.showGrid - Show grid lines (default: true)
 * @param {boolean} props.showLegend - Show legend (default: false)
 * @param {boolean} props.showReferenceLines - Show average reference lines (default: false)
 * @param {Array} props.xDomain - X-axis domain [min, max]
 * @param {Array} props.yDomain - Y-axis domain [min, max]
 * @param {Function} props.valueFormatter - Custom value formatter
 */
const ScatterPlot = ({
    data = [],
    height = 300,
    xLabel,
    yLabel,
    showGrid = true,
    showLegend = false,
    showReferenceLines = false,
    xDomain,
    yDomain,
    valueFormatter,
    animate = true
}) => {
    // Calculate averages for reference lines
    let avgX = 0, avgY = 0, totalPoints = 0;
    if (showReferenceLines) {
        data.forEach(dataset => {
            dataset.data.forEach(point => {
                avgX += point.x;
                avgY += point.y;
                totalPoints++;
            });
        });
        avgX = avgX / totalPoints;
        avgY = avgY / totalPoints;
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
            >
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                    />
                )}
                <XAxis
                    type="number"
                    dataKey="x"
                    name={xLabel}
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    domain={xDomain || ['auto', 'auto']}
                    label={xLabel ? {
                        value: xLabel,
                        position: 'bottom',
                        fill: '#94A3B8',
                        fontSize: 11
                    } : undefined}
                />
                <YAxis
                    type="number"
                    dataKey="y"
                    name={yLabel}
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    domain={yDomain || ['auto', 'auto']}
                    label={yLabel ? {
                        value: yLabel,
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#94A3B8',
                        fontSize: 11
                    } : undefined}
                />
                <ZAxis
                    type="number"
                    dataKey="z"
                    range={[50, 400]}
                />
                <Tooltip
                    content={
                        <CustomTooltip
                            xLabel={xLabel}
                            yLabel={yLabel}
                            formatter={valueFormatter}
                        />
                    }
                    cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                />
                {showLegend && (
                    <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        iconType="circle"
                    />
                )}
                {showReferenceLines && (
                    <>
                        <ReferenceLine
                            x={avgX}
                            stroke="#475569"
                            strokeDasharray="5 5"
                            label={{
                                value: `Avg: ${avgX.toFixed(1)}`,
                                fill: '#64748B',
                                fontSize: 10,
                                position: 'top'
                            }}
                        />
                        <ReferenceLine
                            y={avgY}
                            stroke="#475569"
                            strokeDasharray="5 5"
                            label={{
                                value: `Avg: ${avgY.toFixed(1)}`,
                                fill: '#64748B',
                                fontSize: 10,
                                position: 'right'
                            }}
                        />
                    </>
                )}
                {data.map((dataset, idx) => (
                    <Scatter
                        key={dataset.name || idx}
                        name={dataset.name || `Series ${idx + 1}`}
                        data={dataset.data}
                        fill={dataset.color || defaultColors[idx % defaultColors.length]}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                ))}
            </RechartsScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlot;
