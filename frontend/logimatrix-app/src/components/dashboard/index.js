/**
 * Dashboard Components Index
 * Central export for all dashboard widgets
 */

// Core Dashboard Widgets
export { default as KPICard } from './KPICard';
export { default as FleetOverviewWidget } from './FleetOverviewWidget';
export { default as RevenueWidget } from './RevenueWidget';
export { default as ShipmentVolumeWidget } from './ShipmentVolumeWidget';
export { default as DriverPerformanceWidget } from './DriverPerformanceWidget';
export { default as LiveFleetTrackingWidget } from './LiveFleetTrackingWidget';
export { default as DashboardWidget } from './DashboardWidget';

// ML Insights Widgets
export { default as ETAPredictionWidget } from './ml/ETAPredictionWidget';
export { default as DemandForecastWidget } from './ml/DemandForecastWidget';
export { default as AnomalyDetectionWidget } from './ml/AnomalyDetectionWidget';
export { default as PricingInsightsWidget } from './ml/PricingInsightsWidget';
