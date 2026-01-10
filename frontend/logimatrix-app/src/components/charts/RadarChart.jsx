import React from 'react';
import {
    Radar,
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip
} from 'recharts';

const defaultColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                <p className="text-white text-sm font-medium mb-1">
                    {payload[0].payload.subject}
                </p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * Reusable Radar Chart Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array [{subject, A: value, B: value, ...}]
 * @param {Array} props.dataKeys - Array of data key configurations [{key, name, color}]
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {number} props.maxValue - Maximum value for scale (default: auto)
 * @param {boolean} props.fillArea - Fill the radar area (default: true)
 */
const RadarChart = ({
    data = [],
    dataKeys = [{ key: 'value', name: 'Value', color: defaultColors[0] }],
    height = 300,
    showLegend = true,
    maxValue,
    fillArea = true,
    animate = true
}) => {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsRadarChart
                cx="50%"
                cy="50%"
                outerRadius="70%"
                data={data}
            >
                <PolarGrid
                    stroke="#334155"
                    strokeDasharray="3 3"
                />
                <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    tickLine={false}
                />
                <PolarRadiusAxis
                    angle={30}
                    domain={[0, maxValue || 'auto']}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickCount={5}
                />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && (
                    <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        iconType="circle"
                        iconSize={8}
                    />
                )}
                {dataKeys.map((dk, idx) => (
                    <Radar
                        key={dk.key}
                        name={dk.name}
                        dataKey={dk.key}
                        stroke={dk.color || defaultColors[idx % defaultColors.length]}
                        fill={dk.color || defaultColors[idx % defaultColors.length]}
                        fillOpacity={fillArea ? 0.3 : 0}
                        strokeWidth={2}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                        dot={{
                            r: 4,
                            fill: dk.color || defaultColors[idx % defaultColors.length],
                            stroke: '#0F172A',
                            strokeWidth: 2
                        }}
                    />
                ))}
            </RechartsRadarChart>
        </ResponsiveContainer>
    );
};

export default RadarChart;
