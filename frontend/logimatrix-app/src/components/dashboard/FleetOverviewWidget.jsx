import React from 'react';
import DashboardWidget from './DashboardWidget';
import { PieChart, GaugeChart } from '../charts';
import { fleetData } from '../../data/dashboardMockData';
import { Truck, Users, Wrench } from 'lucide-react';

/**
 * Fleet Overview Widget
 * Shows vehicle status distribution and utilization
 */
const FleetOverviewWidget = ({ data = fleetData, onRefresh }) => {
    const { status, utilization, vehicles } = data;

    const totalVehicles = status.reduce((sum, s) => sum + s.value, 0);
    const activeVehicles = status.find(s => s.name === 'On Trip')?.value || 0;

    return (
        <DashboardWidget
            title="Fleet Overview"
            subtitle={`${totalVehicles} total vehicles`}
            onRefresh={onRefresh}
        >
            <div className="grid grid-cols-2 gap-4">
                {/* Status Distribution */}
                <div>
                    <PieChart
                        data={status}
                        height={180}
                        donut={true}
                        showLegend={false}
                        centerValue={activeVehicles.toString()}
                        centerLabel="Active"
                    />

                    {/* Legend */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {status.map((item) => (
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
                        value={utilization.current}
                        max={100}
                        height={160}
                        label="Utilization"
                        target={utilization.target}
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
                                {status.find(s => s.name === 'Available')?.value || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                                <Wrench className="w-4 h-4" /> Maintenance
                            </span>
                            <span className="text-amber-400 font-medium">
                                {status.find(s => s.name === 'Maintenance')?.value || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default FleetOverviewWidget;
