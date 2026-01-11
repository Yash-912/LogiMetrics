import React, { useState, useMemo } from 'react';
import DashboardWidget from './DashboardWidget';
import { AreaChart } from '../charts';
import { revenueData as mockRevenueData } from '../../data/dashboardMockData';
import { TrendingUp, Target } from 'lucide-react';
import { useRevenueAnalytics } from '@/hooks/useDashboard';

/**
 * Revenue Widget
 * Shows revenue trends with area chart and summary stats
 */
const RevenueWidget = ({ onRefresh }) => {
    const [timeRange, setTimeRange] = useState('daily');

    // Mapped timeRange to groupBy API param
    const groupBy = timeRange === 'daily' ? 'day' : 'month';
    const startDate = timeRange === 'daily'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const { data: apiData, isLoading, refetch } = useRevenueAnalytics({
        startDate,
        endDate,
        groupBy
    });

    const handleRefresh = () => {
        refetch();
        onRefresh && onRefresh();
    };

    // Transform API data or use mock if loading/empty
    const processedData = useMemo(() => {
        if (!apiData || !apiData.analytics) return mockRevenueData;

        const { overTime = [], summary = { totalRevenue: 0 } } = apiData.analytics || {};

        // Transform overTime data for chart
        const chartData = overTime.map(item => ({
            [timeRange === 'daily' ? 'date' : 'month']: item.period,
            revenue: item.revenue,
            // previousPeriod: item.previousRevenue // API doesn't return this yet for simple overTime query
        }));

        return {
            chartData,
            summary: {
                total: summary.totalRevenue,
                change: 0, // Need previous period comparison logic in API for this
                achieved: 0 // Target logic needed
            }
        };
    }, [apiData, timeRange]);

    // Use mock data fallback if API returns empty array (new installation)
    const finalData = (processedData.chartData && processedData.chartData.length > 0)
        ? processedData
        : {
            chartData: timeRange === 'daily' ? mockRevenueData.daily : mockRevenueData.monthly,
            summary: mockRevenueData.summary
        };

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
            subtitle={`Total: ${formatCurrency(finalData.summary.total)}`}
            isLoading={isLoading}
            onRefresh={handleRefresh}
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
                        <p className={`text-sm font-semibold ${finalData.summary.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {finalData.summary.change >= 0 ? '+' : ''}{finalData.summary.change}%
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <Target className="w-4 h-4 text-amber-400" />
                    <div>
                        <p className="text-xs text-slate-400">Target</p>
                        <p className="text-sm font-semibold text-white">{finalData.summary.achieved}%</p>
                    </div>
                </div>
            </div>

            {/* Area Chart */}
            <AreaChart
                data={finalData.chartData}
                xKey={xKey}
                areas={[
                    {
                        key: 'revenue',
                        name: 'Revenue',
                        color: '#06B6D4',
                        gradient: { start: '#06B6D4', end: '#3B82F6' }
                    },
                    // Only show previous if data exists
                    ...(finalData.chartData[0]?.previousPeriod ? [{
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
