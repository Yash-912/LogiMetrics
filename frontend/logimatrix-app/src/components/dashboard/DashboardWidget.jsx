import React from 'react';
import { MoreVertical, RefreshCw, Download, Maximize2 } from 'lucide-react';

/**
 * Base Dashboard Widget Container
 * Provides consistent styling, header, and actions for all dashboard widgets
 */
const DashboardWidget = ({
    title,
    subtitle,
    children,
    className = '',
    headerActions,
    onRefresh,
    onExpand,
    onExport,
    loading = false,
    error = null,
    noPadding = false,
    fullHeight = false
}) => {
    return (
        <div
            className={`
                bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl
                transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/5
                flex flex-col
                ${fullHeight ? 'h-full' : ''}
                ${className}
            `}
        >
            {/* Header */}
            {(title || headerActions) && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
                    <div>
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                        {subtitle && (
                            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                        {onExport && (
                            <button
                                onClick={onExport}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Export"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                        {onExpand && (
                            <button
                                onClick={onExpand}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Expand"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 min-h-0 ${noPadding ? '' : 'p-5'}`}>
                {loading && !children ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-slate-400">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <p className="text-red-400 text-sm">{error}</p>
                            {onRefresh && (
                                <button
                                    onClick={onRefresh}
                                    className="mt-3 text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                    Try again
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default DashboardWidget;
