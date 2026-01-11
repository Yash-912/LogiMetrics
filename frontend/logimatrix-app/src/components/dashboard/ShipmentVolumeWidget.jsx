import React, { useMemo } from 'react';
import DashboardWidget from './DashboardWidget';
import { BarChart } from '../charts';
import { shipmentData as mockShipmentData } from '../../data/dashboardMockData';
import { Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useShipmentAnalytics } from '@/hooks/useDashboard';

/**
 * Shipment Volume Widget
 * Shows shipment counts by status with stacked bar chart
 */
const ShipmentVolumeWidget = ({ onRefresh }) => {
    // Fetch last 7 days by default
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const { data: apiData, isLoading, refetch } = useShipmentAnalytics({
        startDate,
        endDate,
        groupBy: 'day'
    });

    const handleRefresh = () => {
        refetch();
        onRefresh && onRefresh();
    };

    const processedData = useMemo(() => {
        if (!apiData || !apiData.analytics) return mockShipmentData;

        const { overTime = [], byStatus = [] } = apiData.analytics || {};

        // Transform byStatus to summary and statusBreakdown
        const statusMap = byStatus.reduce((acc, curr) => {
            acc[curr.status] = curr.count;
            return acc;
        }, {});

        const total = byStatus.reduce((sum, item) => sum + item.count, 0);
        const delivered = statusMap['delivered'] || 0;

        // Transform overTime for chart
        // API currently returns total count per day. 
        // For stacked chart simulation, we'll put everything in 'delivered' or 'active' roughly
        // or just show total. Let's map to 'total' key.
        const volume = overTime.map(item => ({
            date: item.period,
            total: item.count,
            // Mock distribution for visual if needed, but better to be accurate:
            // delivered: 0, inTransit: 0, pending: 0, cancelled: 0
        }));

        return {
            volume,
            statusBreakdown: byStatus.map(s => ({ name: s.status, value: s.count })),
            summary: {
                total,
                delivered,
                successRate: total > 0 ? Math.round((delivered / total) * 100) : 0
            }
        };

    }, [apiData]);

    const finalData = (processedData.volume && processedData.volume.length > 0)
        ? processedData
        : mockShipmentData;

    const StatusStat = ({ icon: Icon, label, value, color }) => (
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-white">{value.toLocaleString()}</p>
            </div>
        </div>
    );

    return (
        <DashboardWidget
            title="Shipment Volume"
            subtitle={`${finalData.summary.total.toLocaleString()} total shipments`}
            isLoading={isLoading}
            onRefresh={handleRefresh}
        >
            {/* Quick Stats Row */}
            <div className="flex justify-between mb-4 pb-4 border-b border-slate-800">
                <StatusStat
                    icon={CheckCircle}
                    label="Delivered"
                    value={finalData.summary.delivered}
                    color="bg-green-500/20 text-green-400"
                />
                <StatusStat
                    icon={Clock}
                    label="Active"
                    value={(finalData.summary.total - finalData.summary.delivered)}
                    color="bg-blue-500/20 text-blue-400"
                />
                <StatusStat
                    icon={Package}
                    label="Pending"
                    value={finalData.statusBreakdown.find(s => s.name === 'pending')?.value || 0}
                    color="bg-amber-500/20 text-amber-400"
                />
            </div>

            {/* Success Rate Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">Delivery Success Rate</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg">
                    {finalData.summary.successRate}%
                </span>
            </div>

            {/* Stacked Bar Chart */}
            <BarChart
                data={finalData.volume}
                xKey="date"
                bars={[
                    // Since we only have 'total' from simple aggregation, we show one bar
                    { key: 'total', name: 'Total Volume', color: '#3B82F6' }
                ]}
                height={200}
                stacked={false}
                showGrid={true}
                showLegend={true}
            />
        </DashboardWidget>
    );
};

export default ShipmentVolumeWidget;
