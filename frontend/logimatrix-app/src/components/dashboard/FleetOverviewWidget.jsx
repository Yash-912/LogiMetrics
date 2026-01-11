import React, { useMemo } from 'react';
import DashboardWidget from './DashboardWidget';
import { PieChart, GaugeChart } from '../charts';
import { fleetData as mockFleetData } from '../../data/dashboardMockData';
import { Truck, Users, Wrench } from 'lucide-react';
import { useFleetAnalytics } from '@/hooks/useDashboard';

/**
 * Fleet Overview Widget
 * Shows vehicle status distribution and utilization
 */
const FleetOverviewWidget = ({ onRefresh }) => {
    const { data: apiData, isLoading, refetch } = useFleetAnalytics();

    const handleRefresh = () => {
        refetch();
        onRefresh && onRefresh();
    };

    const processedData = useMemo(() => {
        if (!apiData || !apiData.analytics) return mockFleetData;

        const { vehicles = { byStatus: [], utilization: 0, total: 0 } } = apiData.analytics || {};

        // Map status to colors
        const getColor = (status) => {
            switch (status.toLowerCase()) {
                case 'in_use': return '#3B82F6';
                case 'available': return '#10B981';
                case 'maintenance': return '#F59E0B';
                default: return '#64748B';
            }
        };

        const getName = (status) => {
            switch (status.toLowerCase()) {
                case 'in_use': return 'On Trip';
                case 'available': return 'Available';
                case 'maintenance': return 'Maintenance';
                default: return status;
            }
        };

        const statusData = vehicles.byStatus.map(s => ({
            name: getName(s.status),
            value: s.count,
            color: getColor(s.status)
        }));

        // If no data, fallback to mock structure to avoid crash
        if (statusData.length === 0) return mockFleetData;

        return {
            status: statusData,
            utilization: {
                current: vehicles.utilization,
                target: 80 // Hardcoded target
            },
            vehicles: {
                total: vehicles.total
            }
        };
    }, [apiData]);

    const finalData = (processedData.status && processedData.status.length > 0)
        ? processedData
        : mockFleetData;

    const totalVehicles = finalData.status.reduce((sum, s) => sum + s.value, 0);
    const activeVehicles = finalData.status.find(s => s.name === 'On Trip')?.value || 0;

    return (
        <DashboardWidget
            title="Fleet Overview"
            subtitle={`${totalVehicles} total vehicles`}
            isLoading={isLoading}
            onRefresh={handleRefresh}
        >
            <div className="grid grid-cols-2 gap-4">
                {/* Status Distribution */}
                <div>
                    <PieChart
                        data={finalData.status}
                        height={120}
                        donut={true}
                        showLegend={false}
                        centerValue={activeVehicles.toString()}
                        centerLabel="Active"
                    />

                    {/* Legend */}
                    <div className="mt-2 grid grid-cols-2 gap-1">
                        {finalData.status.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-xs text-slate-400">{item.name}</span>
                                <span className="text-xs font-medium text-white ml-auto">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Utilization Gauge */}
                <div>
                    <GaugeChart
                        value={finalData.utilization.current}
                        max={100}
                        height={110}
                        label="Utilization"
                        target={finalData.utilization.target}
                        dynamicColor={true}
                        thresholds={{ low: 50, medium: 70 }}
                    />

                    {/* Quick Stats */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                                <Truck className="w-4 h-4" /> On Trip
                            </span>
                            <span className="text-white font-medium">{activeVehicles}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                                <Users className="w-4 h-4" /> Available
                            </span>
                            <span className="text-green-400 font-medium">
                                {finalData.status.find(s => s.name === 'Available')?.value || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                                <Wrench className="w-4 h-4" /> Maintenance
                            </span>
                            <span className="text-amber-400 font-medium">
                                {finalData.status.find(s => s.name === 'Maintenance')?.value || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default FleetOverviewWidget;
