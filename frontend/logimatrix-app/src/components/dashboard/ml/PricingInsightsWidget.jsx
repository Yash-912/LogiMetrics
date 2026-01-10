import React, { useState } from 'react';
import DashboardWidget from '../DashboardWidget';
import { GaugeChart, LineChart, BarChart } from '../../charts';
import { pricingData } from '../../../data/dashboardMockData';
import { DollarSign, TrendingUp, MapPin } from 'lucide-react';

/**
 * Pricing Insights Widget
 * Shows dynamic pricing surge multiplier and zone-wise rates
 */
const PricingInsightsWidget = ({ data = pricingData, onRefresh }) => {
    const [demandSurge, setDemandSurge] = useState(100);
    const { currentSurge, zones, elasticity, hourlyTrend } = data;

    // Simulate surge based on demand slider
    const simulatedSurge = currentSurge * (demandSurge / 100);

    const getDemandColor = (demand) => {
        switch (demand) {
            case 'Very High': return 'text-red-400';
            case 'High': return 'text-amber-400';
            case 'Medium': return 'text-blue-400';
            case 'Normal': return 'text-green-400';
            default: return 'text-slate-400';
        }
    };

    return (
        <DashboardWidget
            title="Dynamic Pricing"
            subtitle="ML-optimized pricing intelligence"
            onRefresh={onRefresh}
        >
            <div className="grid grid-cols-2 gap-4">
                {/* Surge Gauge */}
                <div>
                    <GaugeChart
                        value={simulatedSurge * 100}
                        max={200}
                        min={50}
                        height={150}
                        label="Surge Multiplier"
                        unit="x"
                        dynamicColor={true}
                        thresholds={{ low: 80, medium: 120 }}
                    />

                    {/* Demand Simulation Slider */}
                    <div className="mt-2 p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">Demand Simulation</span>
                            <span className="text-xs font-medium text-purple-400">{demandSurge}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="200"
                            step="10"
                            value={demandSurge}
                            onChange={(e) => setDemandSurge(parseInt(e.target.value))}
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

                {/* Zone Rates */}
                <div>
                    <h4 className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Zone Pricing
                    </h4>
                    <div className="space-y-2">
                        {zones.map((zone) => (
                            <div key={zone.zone} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                                <span className="text-sm text-white">{zone.zone}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${getDemandColor(zone.demand)}`}>{zone.demand}</span>
                                    <span className="text-sm font-bold text-cyan-400">{zone.multiplier}x</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly Trend */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs text-slate-400 mb-2">Hourly Surge Pattern</h4>
                <LineChart
                    data={hourlyTrend}
                    xKey="hour"
                    lines={[{ key: 'multiplier', name: 'Surge', color: '#8B5CF6' }]}
                    height={100}
                    showGrid={false}
                    showDots={true}
                    valueFormatter={(v) => `${v.toFixed(1)}x`}
                />
            </div>

            {/* Price Elasticity */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Price Elasticity
                </h4>
                <LineChart
                    data={elasticity}
                    xKey="price"
                    lines={[{ key: 'demand', name: 'Demand %', color: '#06B6D4' }]}
                    height={80}
                    showGrid={false}
                    valueFormatter={(v) => `${v}%`}
                />
            </div>
        </DashboardWidget>
    );
};

export default PricingInsightsWidget;
