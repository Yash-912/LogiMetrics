import React, { useState } from 'react';
import DashboardWidget from '../DashboardWidget';
import { LineChart } from '../../charts';
import { etaPredictionData } from '../../../data/dashboardMockData';
import { Clock, AlertTriangle, Target, TrendingUp } from 'lucide-react';

/**
 * ETA Prediction Widget
 * Shows predicted vs actual delivery times with confidence bands
 */
const ETAPredictionWidget = ({ data = etaPredictionData, onRefresh }) => {
    const [trafficFactor, setTrafficFactor] = useState(1.0);
    const { predictions, accuracy, lateRisks } = data;

    // Apply traffic factor to predictions
    const adjustedPredictions = predictions.map(p => ({
        ...p,
        predicted: +(p.predicted * trafficFactor).toFixed(2),
        upperBound: +(p.upperBound * trafficFactor).toFixed(2),
        lowerBound: +(p.lowerBound * trafficFactor).toFixed(2)
    }));

    return (
        <DashboardWidget
            title="ETA Predictions"
            subtitle="ML-powered delivery time forecasts"
            onRefresh={onRefresh}
        >
            {/* Accuracy Stats */}
            <div className="flex gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <div>
                        <p className="text-xs text-slate-400">Accuracy</p>
                        <p className="text-sm font-semibold text-white">{accuracy.withinWindow}%</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <div>
                        <p className="text-xs text-slate-400">R² Score</p>
                        <p className="text-sm font-semibold text-white">{accuracy.r2Score}</p>
                    </div>
                </div>
            </div>

            {/* Traffic Factor Slider */}
            <div className="mb-4 p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Traffic Factor Simulation</span>
                    <span className="text-xs font-medium text-cyan-400">{trafficFactor.toFixed(1)}x</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={trafficFactor}
                    onChange={(e) => setTrafficFactor(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-cyan-500
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:shadow-cyan-500/30"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Light</span>
                    <span>Normal</span>
                    <span>Heavy</span>
                </div>
            </div>

            {/* Line Chart */}
            <LineChart
                data={adjustedPredictions}
                xKey="date"
                lines={[
                    { key: 'predicted', name: 'Predicted ETA', color: '#06B6D4' },
                    { key: 'actual', name: 'Actual Time', color: '#10B981', dashed: true }
                ]}
                height={180}
                showGrid={true}
                showLegend={true}
                showDots={true}
                valueFormatter={(v) => `${v.toFixed(1)} hrs`}
            />

            {/* Late Delivery Risks */}
            {lateRisks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Late Delivery Risks
                    </h4>
                    <div className="space-y-2">
                        {lateRisks.slice(0, 2).map((risk) => (
                            <div key={risk.shipmentId} className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                                <div>
                                    <span className="text-xs font-mono text-cyan-400">{risk.shipmentId}</span>
                                    <p className="text-xs text-slate-400">{risk.reason}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-white">{risk.eta}</span>
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full mt-1">
                                        <div
                                            className="h-full bg-amber-500 rounded-full"
                                            style={{ width: `${risk.risk * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </DashboardWidget>
    );
};

export default ETAPredictionWidget;
