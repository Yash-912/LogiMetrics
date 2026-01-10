import React from 'react';
import DashboardWidget from './DashboardWidget';
import { BarChart } from '../charts';
import { shipmentData } from '../../data/dashboardMockData';
import { Package, CheckCircle, Clock, XCircle } from 'lucide-react';

/**
 * Shipment Volume Widget
 * Shows shipment counts by status with stacked bar chart
 */
const ShipmentVolumeWidget = ({ data = shipmentData, onRefresh }) => {
    const { volume, statusBreakdown, summary } = data;

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
            subtitle={`${summary.total.toLocaleString()} total shipments`}
            onRefresh={onRefresh}
        >
            {/* Quick Stats Row */}
            <div className="flex justify-between mb-4 pb-4 border-b border-slate-800">
                <StatusStat
                    icon={CheckCircle}
                    label="Delivered"
                    value={summary.delivered}
                    color="bg-green-500/20 text-green-400"
                />
                <StatusStat
                    icon={Clock}
                    label="In Transit"
                    value={statusBreakdown.find(s => s.name === 'In Transit')?.value || 0}
                    color="bg-blue-500/20 text-blue-400"
                />
                <StatusStat
                    icon={Package}
                    label="Pending"
                    value={statusBreakdown.find(s => s.name === 'Pending')?.value || 0}
                    color="bg-amber-500/20 text-amber-400"
                />
            </div>

            {/* Success Rate Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">Delivery Success Rate</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg">
                    {summary.successRate}%
                </span>
            </div>

            {/* Stacked Bar Chart */}
            <BarChart
                data={volume}
                xKey="date"
                bars={[
                    { key: 'delivered', name: 'Delivered', color: '#10B981' },
                    { key: 'inTransit', name: 'In Transit', color: '#3B82F6' },
                    { key: 'pending', name: 'Pending', color: '#F59E0B' },
                    { key: 'cancelled', name: 'Cancelled', color: '#EF4444' }
                ]}
                height={200}
                stacked={true}
                showGrid={true}
                showLegend={true}
            />
        </DashboardWidget>
    );
};

export default ShipmentVolumeWidget;
