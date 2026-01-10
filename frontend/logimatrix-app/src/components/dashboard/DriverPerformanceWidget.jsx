import React from 'react';
import DashboardWidget from './DashboardWidget';
import { RadarChart } from '../charts';
import { driverData } from '../../data/dashboardMockData';
import { Award, Star, Clock } from 'lucide-react';

/**
 * Driver Performance Widget
 * Shows radar chart comparison and leaderboard
 */
const DriverPerformanceWidget = ({ data = driverData, onRefresh }) => {
    const { performance, leaderboard } = data;

    return (
        <DashboardWidget
            title="Driver Performance"
            subtitle="Top performers comparison"
            onRefresh={onRefresh}
        >
            <div className="grid grid-cols-2 gap-4">
                {/* Radar Chart */}
                <div>
                    <RadarChart
                        data={performance}
                        dataKeys={[
                            { key: 'A', name: 'Top Driver', color: '#06B6D4' },
                            { key: 'B', name: 'Average', color: '#64748B' }
                        ]}
                        height={220}
                        showLegend={true}
                        maxValue={100}
                        fillArea={true}
                    />
                </div>

                {/* Leaderboard */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Leaderboard
                    </h4>
                    <div className="space-y-2">
                        {leaderboard.slice(0, 5).map((driver, idx) => (
                            <div
                                key={driver.id}
                                className={`flex items-center gap-3 p-2 rounded-lg ${idx === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/30'
                                    }`}
                            >
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-black' :
                                        idx === 1 ? 'bg-slate-400 text-black' :
                                            idx === 2 ? 'bg-amber-700 text-white' :
                                                'bg-slate-700 text-slate-300'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{driver.name}</p>
                                    <p className="text-xs text-slate-400">{driver.deliveries} deliveries</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="text-sm font-medium">{driver.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-400 text-xs">
                                        <Clock className="w-3 h-3" />
                                        {driver.onTime}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default DriverPerformanceWidget;
