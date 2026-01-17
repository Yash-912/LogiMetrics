import React, { useMemo } from 'react';
import DashboardWidget from './DashboardWidget';
import { RadarChart } from '../charts';
import { driverData as mockDriverData } from '../../data/dashboardMockData';
import { Award, Star, Clock } from 'lucide-react';
import { useDriverAnalytics } from '@/hooks/useDashboard';

/**
 * Driver Performance Widget
 * Shows radar chart comparison and leaderboard
 */
const DriverPerformanceWidget = ({ onRefresh }) => {
    const { data: apiData, isLoading, refetch } = useDriverAnalytics();

    const handleRefresh = () => {
        refetch();
        onRefresh && onRefresh();
    };

    const processedData = useMemo(() => {
        if (!apiData || !apiData.analytics) return mockDriverData;

        const { topPerformers = [], onTimeRates = [], avgRating = 0 } = apiData.analytics || {};

        // Transform into leaderboard
        // topPerformers has { driver: {firstName, lastName}, deliveries }
        // onTimeRates has { driverId, rate }

        const leaderboardData = topPerformers.map((p, idx) => {
            const onTimeData = onTimeRates.find(r => r.driverId === p.driverId);
            return {
                id: p.driverId,
                name: `${p.driver.firstName} ${p.driver.lastName}`,
                deliveries: p.deliveries,
                rating: 0, // Not available in shipment aggregation, need driver table lookup if critical
                onTime: onTimeData ? onTimeData.rate : 0
            };
        });

        // If leaderboard empty, return mock
        if (leaderboardData.length === 0) return mockDriverData;

        return {
            performance: mockDriverData.performance, // Mock radar chart data for now as we don't have detailed score metrics
            leaderboard: leaderboardData
        };
    }, [apiData]);

    const finalData = (processedData.leaderboard && processedData.leaderboard.length > 0)
        ? processedData
        : mockDriverData;

    return (
        <DashboardWidget
            title="Driver Performance"
            subtitle="Top performers comparison"
            isLoading={isLoading}
            onRefresh={handleRefresh}
        >
            <div className="grid grid-cols-2 gap-4">
                {/* Radar Chart */}
                <div>
                    <RadarChart
                        data={finalData.performance}
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
                        {finalData.leaderboard.slice(0, 5).map((driver, idx) => (
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
                                        <span className="text-sm font-medium">{driver.rating || '-'}</span>
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
