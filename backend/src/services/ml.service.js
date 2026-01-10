/**
 * ML Service
 * ML microservice integration for predictions
 */

const axios = require('axios');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger.util');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * Call ML service endpoint
 */
async function callMLService(endpoint, data, options = {}) {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}${endpoint}`, data, {
            timeout: options.timeout || 30000,
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        logger.error(`ML service error (${endpoint}):`, error.message);
        throw new Error(`ML service unavailable: ${error.message}`);
    }
}

/**
 * Predict delivery ETA
 */
async function predictETA(shipmentData) {
    const cacheKey = `ml:eta:${shipmentData.origin}_${shipmentData.destination}_${shipmentData.vehicleType}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await callMLService('/predict/eta', {
        origin: shipmentData.origin,
        destination: shipmentData.destination,
        distance: shipmentData.distance,
        vehicleType: shipmentData.vehicleType,
        departureTime: shipmentData.departureTime || new Date().toISOString(),
        weather: shipmentData.weather,
        trafficCondition: shipmentData.trafficCondition
    });

    await setCache(cacheKey, result, 1800); // 30 min cache
    logger.info(`ETA prediction: ${result.eta_hours} hours`);
    return result;
}

/**
 * Forecast demand
 */
async function forecastDemand(params) {
    const result = await callMLService('/predict/demand', {
        companyId: params.companyId,
        zone: params.zone,
        period: params.period || 'week',
        historicalData: params.historicalData
    });

    logger.info(`Demand forecast generated for ${params.zone || 'all zones'}`);
    return result;
}

/**
 * Optimize route using AI
 */
async function optimizeRouteAI(routeData) {
    const result = await callMLService('/optimize/route', {
        origin: routeData.origin,
        destination: routeData.destination,
        stops: routeData.stops,
        vehicleCapacity: routeData.vehicleCapacity,
        timeWindows: routeData.timeWindows,
        priorities: routeData.priorities
    });

    logger.info(`AI route optimization: ${result.optimizedStops?.length || 0} stops`);
    return result;
}

/**
 * Detect anomalies in transactions
 */
async function detectAnomalies(transactionData) {
    const result = await callMLService('/detect/anomaly', {
        transactions: transactionData,
        threshold: 0.8
    });

    if (result.anomalies?.length > 0) {
        logger.warn(`Anomalies detected: ${result.anomalies.length}`);
    }
    return result;
}

/**
 * Get dynamic pricing recommendation
 */
async function getPricingRecommendation(params) {
    const result = await callMLService('/recommend/pricing', {
        route: params.route,
        demand: params.demand,
        competition: params.competition,
        costs: params.costs,
        historicalPrices: params.historicalPrices
    });

    return result;
}

/**
 * Predict vehicle maintenance
 */
async function predictMaintenance(vehicleData) {
    const result = await callMLService('/predict/maintenance', {
        vehicleId: vehicleData.vehicleId,
        mileage: vehicleData.mileage,
        lastMaintenance: vehicleData.lastMaintenance,
        telemetryData: vehicleData.telemetryData
    });

    return result;
}

/**
 * Get driver performance score
 */
async function getDriverPerformanceScore(driverData) {
    const result = await callMLService('/score/driver', {
        driverId: driverData.driverId,
        deliveries: driverData.deliveries,
        onTimeRate: driverData.onTimeRate,
        ratings: driverData.ratings,
        incidents: driverData.incidents
    });

    return result;
}

/**
 * Cluster customers by location
 */
async function clusterCustomers(customers) {
    const result = await callMLService('/cluster/customers', { customers });
    return result;
}

/**
 * Check ML service health
 */
async function checkMLServiceHealth() {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
        return { status: 'healthy', ...response.data };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

module.exports = {
    callMLService,
    predictETA,
    forecastDemand,
    optimizeRouteAI,
    detectAnomalies,
    getPricingRecommendation,
    predictMaintenance,
    getDriverPerformanceScore,
    clusterCustomers,
    checkMLServiceHealth
};
