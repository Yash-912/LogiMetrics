import React from 'react';
import {
    RadialBarChart,
    RadialBar,
    ResponsiveContainer,
    PolarAngleAxis
} from 'recharts';

const defaultColors = {
    low: '#EF4444',      // Red for low values
    medium: '#F59E0B',    // Amber for medium
    high: '#10B981',      // Green for high
    primary: '#06B6D4'    // Cyan default
};

/**
 * Get color based on value percentage
 */
const getColorByValue = (value, max, thresholds = { low: 30, medium: 60 }) => {
    const percentage = (value / max) * 100;
    if (percentage < thresholds.low) return defaultColors.low;
    if (percentage < thresholds.medium) return defaultColors.medium;
    return defaultColors.high;
};

/**
 * Reusable Gauge Chart Component
 * @param {Object} props
 * @param {number} props.value - Current value
 * @param {number} props.max - Maximum value (default: 100)
 * @param {number} props.min - Minimum value (default: 0)
 * @param {number} props.height - Chart height (default: 200)
 * @param {string} props.label - Label below the value
 * @param {string} props.color - Fixed color (overrides dynamic coloring)
 * @param {boolean} props.dynamicColor - Use value-based coloring (default: true)
 * @param {Object} props.thresholds - Thresholds for dynamic coloring {low, medium}
 * @param {string} props.unit - Unit suffix (e.g., '%', 'km/h')
 * @param {number} props.target - Optional target value to show
 */
const GaugeChart = ({
    value = 0,
    max = 100,
    min = 0,
    height = 200,
    label,
    color,
    dynamicColor = true,
    thresholds = { low: 30, medium: 60 },
    unit = '%',
    target,
    animate = true
}) => {
    const normalizedValue = Math.min(Math.max(value, min), max);
    const fillColor = color || (dynamicColor ? getColorByValue(normalizedValue, max, thresholds) : defaultColors.primary);

    const data = [
        {
            name: 'value',
            value: normalizedValue,
            fill: fillColor
        }
    ];

    // Background track
    const backgroundData = [
        {
            name: 'background',
            value: max,
            fill: '#1E293B'
        }
    ];

    return (
        <div className="relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    data={backgroundData}
                >
                    <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        background={false}
                    />
                </RadialBarChart>
            </ResponsiveContainer>

            {/* Foreground gauge */}
            <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="100%"
                        startAngle={180}
                        endAngle={0}
                        data={data}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[min, max]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            isAnimationActive={animate}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            {/* Center value display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: height * 0.15 }}>
                <div className="text-3xl font-bold text-white">
                    {normalizedValue.toLocaleString()}{unit}
                </div>
                {label && (
                    <div className="text-sm text-slate-400 mt-1">{label}</div>
                )}
                {target !== undefined && (
                    <div className="text-xs text-slate-500 mt-1">
                        Target: {target}{unit}
                    </div>
                )}
            </div>

            {/* Min/Max labels */}
            <div className="absolute bottom-2 left-4 text-xs text-slate-500">
                {min}{unit}
            </div>
            <div className="absolute bottom-2 right-4 text-xs text-slate-500">
                {max}{unit}
            </div>
        </div>
    );
};

export default GaugeChart;
