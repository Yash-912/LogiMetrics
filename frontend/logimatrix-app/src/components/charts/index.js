// Chart Components Library
// Reusable chart components for the admin dashboard

export { default as AreaChart } from './AreaChart';
export { default as BarChart } from './BarChart';
export { default as LineChart } from './LineChart';
export { default as PieChart } from './PieChart';
export { default as GaugeChart } from './GaugeChart';
export { default as RadarChart } from './RadarChart';
export { default as HeatmapChart } from './HeatmapChart';
export { default as ScatterPlot } from './ScatterPlot';

// Color utilities
export const chartColors = {
    primary: '#06B6D4',
    secondary: '#3B82F6',
    purple: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    slate: '#64748B',

    // Chart palette for multiple series
    palette: ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],

    // Status colors
    status: {
        active: '#10B981',
        inactive: '#64748B',
        warning: '#F59E0B',
        error: '#EF4444',
        pending: '#3B82F6'
    }
};

// Common chart configurations
export const chartConfig = {
    animation: {
        duration: 800,
        easing: 'ease-out'
    },
    grid: {
        stroke: '#334155',
        strokeDasharray: '3 3'
    },
    axis: {
        stroke: '#64748B',
        fontSize: 12
    },
    tooltip: {
        background: '#1E293B',
        border: '#334155',
        text: '#F1F5F9'
    }
};
