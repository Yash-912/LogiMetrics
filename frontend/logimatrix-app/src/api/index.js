/**
 * API Services Index
 * Central export for all API services
 */

export { default as api, setTokens, clearTokens, getAccessToken } from './axios';
export { default as authApi } from './auth.api';
export { default as shipmentApi } from './shipment.api';
export { default as vehicleApi } from './vehicle.api';
export { default as driverApi } from './driver.api';
export { default as userApi } from './user.api';
export { default as analyticsApi } from './analytics.api';
export { default as invoiceApi } from './invoice.api';
export { default as companyApi } from './company.api';
export { default as routeApi } from './route.api';
export { default as trackingApi } from './tracking.api';
export { default as adminApi } from './admin.api';
export { default as locationApi } from './location.api';
export { default as transactionApi } from './transaction.api';

// Re-export individual functions for convenience
export * from './auth.api';
export * from './shipment.api';
export * from './vehicle.api';
export * from './driver.api';
export * from './user.api';
export * from './analytics.api';
export * from './invoice.api';
export * from './company.api';
export * from './route.api';
export * from './tracking.api';
export * from './admin.api';
export * from './location.api';
export * from './transaction.api';
