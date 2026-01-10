/**
 * Pricing Service
 * Dynamic pricing calculation and quote generation
 */

const { Op } = require('sequelize');
const { PricingRule, Company, Shipment } = require('../models/postgres');
const { getCache, setCache } = require('../config/redis');
const { getDistanceMatrix } = require('../config/maps');
const logger = require('../utils/logger.util');

/**
 * Get applicable pricing rules for a company
 */
async function getPricingRules(companyId, filters = {}) {
    const where = { companyId, isActive: true };
    if (filters.type) where.type = filters.type;
    if (filters.zone) where.zone = filters.zone;

    const rules = await PricingRule.findAll({
        where,
        order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    return rules;
}

/**
 * Calculate shipping rate
 */
async function calculateRate(options) {
    const { companyId, origin, destination, weight, dimensions, serviceType = 'standard', vehicleType } = options;

    // Get distance
    let distance = options.distance;
    if (!distance && origin && destination) {
        try {
            const matrix = await getDistanceMatrix([origin], [destination]);
            distance = matrix[0]?.destinations[0]?.distance?.value / 1000; // km
        } catch (err) {
            logger.warn('Distance calculation failed, using default:', err.message);
            distance = 100; // Default distance
        }
    }

    // Get applicable rules
    const rules = await getPricingRules(companyId, { type: serviceType });

    if (rules.length === 0) {
        // Use default pricing
        return calculateDefaultRate(distance, weight, dimensions);
    }

    // Apply rules in priority order
    let baseRate = 0;
    let perKmRate = 0;
    let perKgRate = 0;
    let surcharges = [];

    for (const rule of rules) {
        if (rule.ruleType === 'base') baseRate = rule.value;
        else if (rule.ruleType === 'per_km') perKmRate = rule.value;
        else if (rule.ruleType === 'per_kg') perKgRate = rule.value;
        else if (rule.ruleType === 'surcharge') {
            if (checkSurchargeCondition(rule, options)) {
                surcharges.push({ name: rule.name, amount: rule.value });
            }
        }
    }

    // Calculate volumetric weight
    const volumetricWeight = dimensions
        ? (dimensions.length * dimensions.width * dimensions.height) / 5000
        : 0;
    const chargeableWeight = Math.max(weight || 0, volumetricWeight);

    // Calculate total
    const distanceCharge = (distance || 0) * perKmRate;
    const weightCharge = chargeableWeight * perKgRate;
    const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);
    const subtotal = baseRate + distanceCharge + weightCharge + surchargeTotal;

    return {
        baseRate,
        distanceCharge,
        weightCharge,
        surcharges,
        subtotal,
        distance,
        chargeableWeight,
        currency: 'USD'
    };
}

/**
 * Default rate calculation
 */
function calculateDefaultRate(distance, weight, dimensions) {
    const baseRate = 10;
    const perKmRate = 0.5;
    const perKgRate = 0.1;

    const volumetricWeight = dimensions
        ? (dimensions.length * dimensions.width * dimensions.height) / 5000
        : 0;
    const chargeableWeight = Math.max(weight || 0, volumetricWeight);

    const distanceCharge = (distance || 0) * perKmRate;
    const weightCharge = chargeableWeight * perKgRate;
    const subtotal = baseRate + distanceCharge + weightCharge;

    return { baseRate, distanceCharge, weightCharge, surcharges: [], subtotal, distance, chargeableWeight, currency: 'USD' };
}

/**
 * Check surcharge condition
 */
function checkSurchargeCondition(rule, options) {
    if (!rule.conditions) return true;
    const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;

    if (conditions.minWeight && (options.weight || 0) < conditions.minWeight) return false;
    if (conditions.maxWeight && (options.weight || 0) > conditions.maxWeight) return false;
    if (conditions.vehicleType && options.vehicleType !== conditions.vehicleType) return false;
    if (conditions.zone && options.zone !== conditions.zone) return false;

    return true;
}

/**
 * Generate quote
 */
async function generateQuote(options) {
    const rate = await calculateRate(options);

    // Apply tax
    const taxRate = options.taxRate || 0;
    const taxAmount = rate.subtotal * (taxRate / 100);
    const totalAmount = rate.subtotal + taxAmount;

    const quote = {
        quoteId: `QT${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        ...rate,
        taxRate,
        taxAmount,
        totalAmount,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        origin: options.origin,
        destination: options.destination,
        serviceType: options.serviceType || 'standard'
    };

    // Cache quote for 24 hours
    await setCache(`quote:${quote.quoteId}`, quote, 86400);

    logger.info(`Quote generated: ${quote.quoteId}`);
    return quote;
}

/**
 * Get quote by ID
 */
async function getQuote(quoteId) {
    const quote = await getCache(`quote:${quoteId}`);
    if (!quote) throw new Error('Quote not found or expired');
    return quote;
}

/**
 * Convert quote to shipment
 */
async function convertQuoteToShipment(quoteId, userId) {
    const quote = await getQuote(quoteId);
    if (new Date(quote.validUntil) < new Date()) {
        throw new Error('Quote has expired');
    }

    // Return quote data for shipment creation
    return {
        origin: quote.origin,
        destination: quote.destination,
        totalCost: quote.totalAmount,
        costBreakdown: {
            baseRate: quote.baseRate,
            distanceCharge: quote.distanceCharge,
            weightCharge: quote.weightCharge,
            surcharges: quote.surcharges,
            taxAmount: quote.taxAmount
        },
        quoteId: quote.quoteId
    };
}

/**
 * Create pricing rule
 */
async function createPricingRule(data, userId) {
    const rule = await PricingRule.create({
        ...data,
        createdBy: userId,
        isActive: true
    });

    logger.info(`Pricing rule created: ${rule.name}`);
    return rule;
}

/**
 * Update pricing rule
 */
async function updatePricingRule(ruleId, data) {
    const rule = await PricingRule.findByPk(ruleId);
    if (!rule) throw new Error('Pricing rule not found');

    await rule.update(data);
    logger.info(`Pricing rule updated: ${rule.name}`);
    return rule;
}

/**
 * Delete pricing rule
 */
async function deletePricingRule(ruleId) {
    const rule = await PricingRule.findByPk(ruleId);
    if (!rule) throw new Error('Pricing rule not found');

    await rule.destroy();
    logger.info(`Pricing rule deleted: ${ruleId}`);
    return true;
}

/**
 * Get pricing zones
 */
async function getPricingZones(companyId) {
    const rules = await PricingRule.findAll({
        where: { companyId, isActive: true, zone: { [Op.ne]: null } },
        attributes: ['zone'],
        group: ['zone'],
        raw: true
    });

    return rules.map(r => r.zone);
}

/**
 * Bulk update pricing rules
 */
async function bulkUpdateRules(companyId, updates) {
    const results = await Promise.allSettled(
        updates.map(update =>
            PricingRule.update(
                { value: update.value },
                { where: { id: update.id, companyId } }
            )
        )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    logger.info(`Bulk pricing update: ${successful}/${updates.length} successful`);

    return { successful, total: updates.length };
}

module.exports = {
    getPricingRules,
    calculateRate,
    generateQuote,
    getQuote,
    convertQuoteToShipment,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    getPricingZones,
    bulkUpdateRules
};
