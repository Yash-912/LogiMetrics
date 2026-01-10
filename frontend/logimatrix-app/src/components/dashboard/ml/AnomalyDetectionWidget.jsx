import React, { useState } from 'react';
import DashboardWidget from '../DashboardWidget';
import { HeatmapChart } from '../../charts';
import { anomalyData } from '../../../data/dashboardMockData';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * Anomaly Detection Widget
 * Shows risk heatmap and recent anomaly alerts
 */
const AnomalyDetectionWidget = ({ data = anomalyData, onRefresh }) => {
    const [riskThreshold, setRiskThreshold] = useState(0.3);
    const { riskHeatmap, recentAlerts, summary } = data;

    // Filter alerts based on threshold
    const filteredAlerts = recentAlerts.filter(alert => {
        const severityMap = { high: 0.7, medium: 0.5, low: 0.3 };
        return severityMap[alert.severity] >= riskThreshold;
    });

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'high':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'medium':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'low':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'high':
                return <ShieldAlert className="w-4 h-4" />;
            case 'medium':
                return <Shield className="w-4 h-4" />;
            default:
                return <ShieldCheck className="w-4 h-4" />;
        }
    };

    return (
        <DashboardWidget
            title="Anomaly Detection"
            subtitle="ML-powered fraud & risk monitoring"
            onRefresh={onRefresh}
        >
            {/* Summary Stats */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 p-2 bg-red-500/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-red-400">{summary.highRisk}</p>
                    <p className="text-xs text-slate-400">High Risk</p>
                </div>
                <div className="flex-1 p-2 bg-amber-500/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-amber-400">{summary.mediumRisk}</p>
                    <p className="text-xs text-slate-400">Medium</p>
                </div>
                <div className="flex-1 p-2 bg-green-500/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-green-400">{summary.resolved}</p>
                    <p className="text-xs text-slate-400">Resolved</p>
                </div>
            </div>

            {/* Risk Threshold Slider */}
            <div className="mb-4 p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Risk Threshold</span>
                    <span className="text-xs font-medium text-cyan-400">{(riskThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0.3"
                    max="0.9"
                    step="0.1"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-cyan-500
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>All</span>
                    <span>High Only</span>
                </div>
            </div>

            {/* Risk Heatmap */}
            <div className="mb-4">
                <h4 className="text-xs text-slate-400 mb-2">Risk by Zone & Day</h4>
                <HeatmapChart
                    data={riskHeatmap.data}
                    xLabels={riskHeatmap.xLabels}
                    yLabels={riskHeatmap.yLabels}
                    height={160}
                    showValues={false}
                    colorScale={['#10B981', '#22D3EE', '#3B82F6', '#F59E0B', '#EF4444']}
                    valueFormatter={(v) => (v * 100).toFixed(0) + '%'}
                />
            </div>

            {/* Recent Alerts */}
            <div className="border-t border-slate-800 pt-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Recent Alerts ({filteredAlerts.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {filteredAlerts.length > 0 ? (
                        filteredAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-3 p-2 rounded-lg border ${getSeverityStyles(alert.severity)}`}
                            >
                                {getSeverityIcon(alert.severity)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">{alert.type}</span>
                                        <span className="text-xs text-slate-400">{alert.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 truncate">{alert.message}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">
                            No alerts above threshold
                        </p>
                    )}
                </div>
            </div>
        </DashboardWidget>
    );
};

export default AnomalyDetectionWidget;
