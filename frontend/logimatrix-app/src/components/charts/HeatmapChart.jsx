import React from 'react';

const defaultColorScale = [
    '#10B981', // Green - Low risk
    '#22D3EE', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444'  // Red - High risk
];

/**
 * Get color based on value
 */
const getColor = (value, min, max, colorScale) => {
    const range = max - min;
    const normalized = (value - min) / range;
    const index = Math.min(
        Math.floor(normalized * colorScale.length),
        colorScale.length - 1
    );
    return colorScale[index];
};

/**
 * Reusable Heatmap Chart Component
 * @param {Object} props
 * @param {Array} props.data - 2D array of values or array of {x, y, value} objects
 * @param {Array} props.xLabels - Labels for X axis
 * @param {Array} props.yLabels - Labels for Y axis
 * @param {number} props.height - Chart height (default: 300)
 * @param {number} props.min - Minimum value for color scale (default: auto)
 * @param {number} props.max - Maximum value for color scale (default: auto)
 * @param {Array} props.colorScale - Array of colors from low to high
 * @param {boolean} props.showValues - Show values in cells (default: true)
 * @param {Function} props.onCellClick - Callback for cell click
 * @param {Function} props.valueFormatter - Custom value formatter
 */
const HeatmapChart = ({
    data = [],
    xLabels = [],
    yLabels = [],
    height = 300,
    min: propMin,
    max: propMax,
    colorScale = defaultColorScale,
    showValues = true,
    onCellClick,
    valueFormatter = (v) => v.toFixed(1),
    cellPadding = 2
}) => {
    // Handle both 2D array and [{x, y, value}] formats
    let gridData;
    if (Array.isArray(data[0])) {
        gridData = data;
    } else {
        // Convert [{x, y, value}] to 2D array
        const rows = yLabels.length || Math.max(...data.map(d => d.y)) + 1;
        const cols = xLabels.length || Math.max(...data.map(d => d.x)) + 1;
        gridData = Array(rows).fill(null).map(() => Array(cols).fill(0));
        data.forEach(d => {
            if (gridData[d.y] !== undefined) {
                gridData[d.y][d.x] = d.value;
            }
        });
    }

    // Calculate min/max
    const allValues = gridData.flat();
    const min = propMin ?? Math.min(...allValues);
    const max = propMax ?? Math.max(...allValues);

    const numRows = gridData.length;
    const numCols = gridData[0]?.length || 0;

    return (
        <div className="w-full" style={{ height }}>
            <div className="flex h-full">
                {/* Y-axis labels */}
                {yLabels.length > 0 && (
                    <div className="flex flex-col justify-around pr-2 text-right">
                        {yLabels.map((label, idx) => (
                            <div
                                key={idx}
                                className="text-xs text-slate-400 truncate"
                                style={{ height: (height - 30) / numRows }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                )}

                {/* Heatmap grid */}
                <div className="flex-1 flex flex-col">
                    <div
                        className="flex-1 grid gap-0.5"
                        style={{
                            gridTemplateColumns: `repeat(${numCols}, 1fr)`,
                            gridTemplateRows: `repeat(${numRows}, 1fr)`
                        }}
                    >
                        {gridData.map((row, rowIdx) =>
                            row.map((value, colIdx) => {
                                const bgColor = getColor(value, min, max, colorScale);
                                const textColor = value > (min + max) / 2 ? '#fff' : '#1E293B';

                                return (
                                    <div
                                        key={`${rowIdx}-${colIdx}`}
                                        className="flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105 hover:z-10 cursor-pointer"
                                        style={{
                                            backgroundColor: bgColor,
                                            margin: cellPadding
                                        }}
                                        onClick={() => onCellClick?.({ row: rowIdx, col: colIdx, value })}
                                        title={`${yLabels[rowIdx] || rowIdx}, ${xLabels[colIdx] || colIdx}: ${valueFormatter(value)}`}
                                    >
                                        {showValues && (
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: textColor }}
                                            >
                                                {valueFormatter(value)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* X-axis labels */}
                    {xLabels.length > 0 && (
                        <div
                            className="grid gap-0.5 mt-2"
                            style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
                        >
                            {xLabels.map((label, idx) => (
                                <div
                                    key={idx}
                                    className="text-xs text-slate-400 text-center truncate px-1"
                                >
                                    {label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Color scale legend */}
            <div className="flex items-center justify-center mt-3 gap-2">
                <span className="text-xs text-slate-500">Low</span>
                <div className="flex h-2 rounded-full overflow-hidden">
                    {colorScale.map((color, idx) => (
                        <div
                            key={idx}
                            className="w-6 h-full"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
                <span className="text-xs text-slate-500">High</span>
            </div>
        </div>
    );
};

export default HeatmapChart;
