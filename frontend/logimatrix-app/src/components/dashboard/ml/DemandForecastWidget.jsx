import React, { useState } from 'react';
import DashboardWidget from '../DashboardWidget';
import { AreaChart, BarChart } from '../../charts';
import { demandForecastData } from '../../../data/dashboardMockData';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

/**
 * Demand Forecast Widget
 * Shows ML-powered demand predictions with confidence bands
 */
const DemandForecastWidget = ({ data = demandForecastData, onRefresh }) => {
    const [forecastDays, setForecastDays] = useState(7);
    const [confidenceLevel, setConfidenceLevel] = useState(90);

    const { historical, forecast, seasonality, peakAlerts } = data;

    // Combine historical and forecast data
    const combinedData = [
        ...historical.map(d => ({ ...d, forecast: null })),
        ...forecast.slice(0, forecastDays).map(d => ({
            ...d,
            actual: null,
            // Adjust bounds based on confidence
            upperBound: d.predicted + (d.upperBound - d.predicted) * (confidenceLevel / 100),
            lowerBound: d.predicted - (d.predicted - d.lowerBound) * (confidenceLevel / 100)
        }))
    ];

    return (
        <DashboardWidget
            title="Demand Forecast"
            subtitle="AI-powered shipment volume prediction"
            onRefresh={onRefresh}
        >
            {/* Control Sliders */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Forecast Horizon</span>
                        <span className="text-xs font-medium text-cyan-400">{forecastDays} days</span>
                    </div>
                    <input
                        type="range"
                        min="7"
                        max="30"
                        step="7"
                        value={forecastDays}
                        onChange={(e) => setForecastDays(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:bg-cyan-500
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Confidence Level</span>
                        <span className="text-xs font-medium text-purple-400">{confidenceLevel}%</span>
                    </div>
                    <input
                        type="range"
                        min="80"
                        max="99"
                        step="1"
                        value={confidenceLevel}
                        onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:bg-purple-500
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>
            </div>

            {/* Forecast Chart */}
            <AreaChart
                data={combinedData}
                xKey="date"
                areas={[
                    { key: 'actual', name: 'Historical', color: '#10B981' },
                    { key: 'predicted', name: 'Forecast', color: '#8B5CF6', gradient: { start: '#8B5CF6', end: '#3B82F6' } }
                ]}
                height={200}
                showGrid={true}
                showLegend={true}
            />

            {/* Peak Alerts */}
            {peakAlerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Peak Demand Alerts
                    </h4>
                    <div className="flex gap-2">
                        {peakAlerts.map((alert, idx) => (
                            <div key={idx} className="flex-1 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-amber-400" />
                                    <span className="text-xs text-white">{alert.date}</span>
                                </div>
                                <p className="text-lg font-bold text-amber-400 mt-1">{alert.expected}</p>
                                <p className="text-xs text-slate-400">{alert.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weekly Seasonality Mini Chart */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs text-slate-400 mb-2">Weekly Pattern</h4>
                <BarChart
                    data={seasonality.weekly}
                    xKey="day"
                    bars={[{ key: 'demand', name: 'Demand', color: '#06B6D4' }]}
                    height={80}
                    showGrid={false}
                    showLegend={false}
                    barRadius={2}
                />
            </div>
        </DashboardWidget>
    );
};

export default DemandForecastWidget;
