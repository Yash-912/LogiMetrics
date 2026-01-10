import React, { useState } from 'react';
import DashboardWidget from './DashboardWidget';
import { AreaChart } from '../charts';
import { revenueData } from '../../data/dashboardMockData';
import { TrendingUp, Target } from 'lucide-react';

/**
 * Revenue Widget
 * Shows revenue trends with area chart and summary stats
 */
const RevenueWidget = ({ data = revenueData, onRefresh }) => {
    const [timeRange, setTimeRange] = useState('daily');

    const chartData = timeRange === 'daily' ? data.daily : data.monthly;
    const xKey = timeRange === 'daily' ? 'date' : 'month';

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
        return `₹${value}`;
    };

    const TimeRangeButton = ({ value, label }) => (
        <button
            onClick={() => setTimeRange(value)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${timeRange === value
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            {label}
        </button>
    );

    return (
        <DashboardWidget
            title="Revenue Trends"
            subtitle={`Total: ${formatCurrency(data.summary.total)}`}
            onRefresh={onRefresh}
            headerActions={
                <div className="flex gap-1">
                    <TimeRangeButton value="daily" label="7D" />
                    <TimeRangeButton value="monthly" label="6M" />
                </div>
            }
        >
            {/* Summary Stats */}
            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <div>
                        <p className="text-xs text-slate-400">Growth</p>
                        <p className={`text-sm font-semibold ${data.summary.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.summary.change >= 0 ? '+' : ''}{data.summary.change}%
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <Target className="w-4 h-4 text-amber-400" />
                    <div>
                        <p className="text-xs text-slate-400">Target</p>
                        <p className="text-sm font-semibold text-white">{data.summary.achieved}%</p>
                    </div>
                </div>
            </div>

            {/* Area Chart */}
            <AreaChart
                data={chartData}
                xKey={xKey}
                areas={[
                    {
                        key: 'revenue',
                        name: 'Revenue',
                        color: '#06B6D4',
                        gradient: { start: '#06B6D4', end: '#3B82F6' }
                    },
                    ...(timeRange === 'daily' ? [{
                        key: 'previousPeriod',
                        name: 'Previous',
                        color: '#64748B'
                    }] : [])
                ]}
                height={220}
                showGrid={true}
                showLegend={timeRange === 'daily'}
                valueFormatter={formatCurrency}
            />
        </DashboardWidget>
    );
};

export default RevenueWidget;
