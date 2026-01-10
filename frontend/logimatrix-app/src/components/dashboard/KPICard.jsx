import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
    AreaChart,
    Area,
    ResponsiveContainer
} from 'recharts';

/**
 * Enhanced KPI Card with sparkline trend
 */
const KPICard = ({
    icon: Icon,
    label,
    value,
    trend,
    trendLabel = 'vs last month',
    color = 'cyan',
    sparklineData = [],
    onClick
}) => {
    const colorMap = {
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', stroke: '#3B82F6' },
        cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', stroke: '#06B6D4' },
        purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', stroke: '#8B5CF6' },
        green: { bg: 'bg-green-500/20', text: 'text-green-400', stroke: '#10B981' },
        orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', stroke: '#F59E0B' },
        red: { bg: 'bg-red-500/20', text: 'text-red-400', stroke: '#EF4444' }
    };

    const colors = colorMap[color] || colorMap.cyan;
    const isPositive = trend >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
        <div
            onClick={onClick}
            className={`
                relative overflow-hidden
                bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-5
                transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/5
                ${onClick ? 'cursor-pointer' : ''}
            `}
        >
            {/* Sparkline background */}
            {sparklineData.length > 0 && (
                <div className="absolute inset-0 opacity-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparklineData}>
                            <defs>
                                <linearGradient id={`sparkline-${label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="transparent"
                                fill={`url(#sparkline-${label})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">{value}</h3>
                    <div className={`flex items-center text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        <TrendIcon className="w-3 h-3 mr-1" />
                        <span>{Math.abs(trend)}% {trendLabel}</span>
                    </div>
                </div>
                {Icon && (
                    <div className={`p-3 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default KPICard;
