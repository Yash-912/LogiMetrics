const { validationResult } = require("express-validator");
const { Op, Sequelize } = require("sequelize");
const {
  PricingRule,
  PricingZone,
  Quote,
  Company,
  Shipment,
  Vehicle,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const { successResponse, errorResponse } = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const {
  calculateDistance,
  calculateFuelCost,
} = require("../utils/calculations.util");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger.util");

/**
 * Get all pricing rules
 * @route GET /api/pricing/rules
 */
const getPricingRules = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      vehicleType,
      search,
      sortBy = "priority",
      sortOrder = "DESC",
    } = req.query;

    const where = {};

    // Company filter
    if (req.user.role !== "admin") {
      where[Op.or] = [{ companyId: req.user.companyId }, { isGlobal: true }];
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (vehicleType) where.vehicleTypes = { [Op.contains]: [vehicleType] };

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const offset = (page - 1) * limit;

    const { rows: rules, count } = await PricingRule.findAndCountAll({
      where,
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
    });

    return successResponse(res, "Pricing rules retrieved", 200, {
      rules,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get pricing rule by ID
 * @route GET /api/pricing/rules/:id
 */
const getPricingRuleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await PricingRule.findByPk(id, {
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    });

    if (!rule) {
      throw new AppError("Pricing rule not found", 404);
    }

    // Authorization check
    if (
      !rule.isGlobal &&
      req.user.role !== "admin" &&
      rule.companyId !== req.user.companyId
    ) {
      throw new AppError("Not authorized to access this pricing rule", 403);
    }

    return successResponse(res, "Pricing rule retrieved", 200, { rule });
  } catch (err) {
    next(err);
  }
};

/**
 * Create pricing rule
 * @route POST /api/pricing/rules
 */
const createPricingRule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      name,
      description,
      type,
      baseRate,
      ratePerMile,
      ratePerKg,
      minimumCharge,
      maximumCharge,
      vehicleTypes,
      weightRanges,
      distanceRanges,
      surcharges,
      discounts,
      priority,
      effectiveFrom,
      effectiveTo,
      conditions,
      isGlobal,
    } = req.body;

    // Only admin can create global rules
    if (isGlobal && req.user.role !== "admin") {
      throw new AppError("Only admin can create global pricing rules", 403);
    }

    const rule = await PricingRule.create({
      name,
      description,
      type,
      baseRate,
      ratePerMile,
      ratePerKg,
      minimumCharge,
      maximumCharge,
      vehicleTypes,
      weightRanges,
      distanceRanges,
      surcharges,
      discounts,
      priority: priority || 0,
      effectiveFrom,
      effectiveTo,
      conditions,
      isGlobal: isGlobal || false,
      companyId: isGlobal ? null : req.user.companyId,
      createdBy: req.user.id,
      status: "active",
    });

    // Invalidate pricing cache
    await invalidatePricingCache(req.user.companyId);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PRICING_RULE_CREATED",
      resource: "PricingRule",
      resourceId: rule.id,
      details: { name, type },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info("Pricing rule created", {
      ruleId: rule.id,
      userId: req.user.id,
    });

    return successResponse(res, "Pricing rule created successfully", 201, {
      rule,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update pricing rule
 * @route PUT /api/pricing/rules/:id
 */
const updatePricingRule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const rule = await PricingRule.findByPk(id);
    if (!rule) {
      throw new AppError("Pricing rule not found", 404);
    }

    // Authorization check
    if (rule.isGlobal && req.user.role !== "admin") {
      throw new AppError("Only admin can update global pricing rules", 403);
    }
    if (
      !rule.isGlobal &&
      req.user.role !== "admin" &&
      rule.companyId !== req.user.companyId
    ) {
      throw new AppError("Not authorized to update this pricing rule", 403);
    }

    // Prevent changing global status by non-admin
    if (updateData.isGlobal !== undefined && req.user.role !== "admin") {
      delete updateData.isGlobal;
    }

    await rule.update({
      ...updateData,
      updatedBy: req.user.id,
    });

    // Invalidate pricing cache
    await invalidatePricingCache(rule.companyId);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PRICING_RULE_UPDATED",
      resource: "PricingRule",
      resourceId: rule.id,
      changes: updateData,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Pricing rule updated successfully", 200, {
      rule,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete pricing rule
 * @route DELETE /api/pricing/rules/:id
 */
const deletePricingRule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await PricingRule.findByPk(id);
    if (!rule) {
      throw new AppError("Pricing rule not found", 404);
    }

    // Authorization check
    if (rule.isGlobal && req.user.role !== "admin") {
      throw new AppError("Only admin can delete global pricing rules", 403);
    }
    if (
      !rule.isGlobal &&
      req.user.role !== "admin" &&
      rule.companyId !== req.user.companyId
    ) {
      throw new AppError("Not authorized to delete this pricing rule", 403);
    }

    await rule.destroy();

    // Invalidate pricing cache
    await invalidatePricingCache(rule.companyId);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PRICING_RULE_DELETED",
      resource: "PricingRule",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Pricing rule deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get pricing zones
 * @route GET /api/pricing/zones
 */
const getPricingZones = async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {};
    if (req.user.role !== "admin") {
      where[Op.or] = [{ companyId: req.user.companyId }, { isGlobal: true }];
    }
    if (status) where.status = status;

    const zones = await PricingZone.findAll({
      where,
      order: [["name", "ASC"]],
    });

    return successResponse(res, "Pricing zones retrieved", 200, { zones });
  } catch (err) {
    next(err);
  }
};

/**
 * Create pricing zone
 * @route POST /api/pricing/zones
 */
const createPricingZone = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      name,
      description,
      type,
      coordinates,
      radiusMiles,
      postalCodes,
      cities,
      states,
      countries,
      multiplier,
      surcharge,
      isGlobal,
    } = req.body;

    // Only admin can create global zones
    if (isGlobal && req.user.role !== "admin") {
      throw new AppError("Only admin can create global pricing zones", 403);
    }

    const zone = await PricingZone.create({
      name,
      description,
      type,
      coordinates,
      radiusMiles,
      postalCodes,
      cities,
      states,
      countries,
      multiplier: multiplier || 1.0,
      surcharge: surcharge || 0,
      isGlobal: isGlobal || false,
      companyId: isGlobal ? null : req.user.companyId,
      createdBy: req.user.id,
      status: "active",
    });

    // Invalidate pricing cache
    await invalidatePricingCache(req.user.companyId);

    return successResponse(res, "Pricing zone created successfully", 201, {
      zone,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Calculate price quote
 * @route POST /api/pricing/calculate
 */
const calculateQuote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      origin,
      destination,
      weight,
      dimensions,
      vehicleType,
      serviceType,
      pickupDate,
      deliveryDate,
      additionalServices,
    } = req.body;

    // Calculate distance
    const distance = await calculateDistance(origin, destination);

    // Get applicable pricing rules
    const rules = await getApplicableRules(
      req.user.companyId,
      vehicleType,
      weight,
      distance.miles
    );

    if (rules.length === 0) {
      throw new AppError("No applicable pricing rules found", 400);
    }

    // Use highest priority rule
    const primaryRule = rules[0];

    // Calculate base price
    let basePrice = primaryRule.baseRate || 0;

    // Add distance-based pricing
    if (primaryRule.ratePerMile && distance.miles) {
      basePrice += primaryRule.ratePerMile * distance.miles;
    }

    // Add weight-based pricing
    if (primaryRule.ratePerKg && weight) {
      basePrice += primaryRule.ratePerKg * weight;
    }

    // Apply weight range adjustments
    if (primaryRule.weightRanges && weight) {
      const weightRange = primaryRule.weightRanges.find(
        (r) => weight >= r.minWeight && weight <= r.maxWeight
      );
      if (weightRange?.multiplier) {
        basePrice *= weightRange.multiplier;
      }
    }

    // Apply distance range adjustments
    if (primaryRule.distanceRanges && distance.miles) {
      const distanceRange = primaryRule.distanceRanges.find(
        (r) =>
          distance.miles >= r.minDistance && distance.miles <= r.maxDistance
      );
      if (distanceRange?.multiplier) {
        basePrice *= distanceRange.multiplier;
      }
    }

    // Calculate surcharges
    let surcharges = [];
    if (primaryRule.surcharges) {
      for (const surcharge of primaryRule.surcharges) {
        if (await isSurchargeApplicable(surcharge, req.body)) {
          const amount =
            surcharge.type === "percentage"
              ? basePrice * (surcharge.value / 100)
              : surcharge.value;
          surcharges.push({
            name: surcharge.name,
            amount,
          });
        }
      }
    }

    // Calculate zone-based adjustments
    const originZone = await findPricingZone(origin, req.user.companyId);
    const destZone = await findPricingZone(destination, req.user.companyId);

    let zoneAdjustment = 0;
    if (originZone) {
      basePrice *= originZone.multiplier;
      zoneAdjustment += originZone.surcharge;
    }
    if (destZone) {
      basePrice *= destZone.multiplier;
      zoneAdjustment += destZone.surcharge;
    }

    // Calculate additional services
    let additionalCost = 0;
    if (additionalServices) {
      for (const service of additionalServices) {
        const serviceCost = await calculateServiceCost(service, basePrice);
        additionalCost += serviceCost;
      }
    }

    // Apply discounts
    let totalDiscount = 0;
    if (primaryRule.discounts) {
      for (const discount of primaryRule.discounts) {
        if (await isDiscountApplicable(discount, req.body, req.user)) {
          const amount =
            discount.type === "percentage"
              ? basePrice * (discount.value / 100)
              : discount.value;
          totalDiscount += amount;
        }
      }
    }

    // Calculate totals
    const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);
    let subtotal = basePrice + surchargeTotal + zoneAdjustment + additionalCost;
    subtotal = Math.max(subtotal - totalDiscount, 0);

    // Apply min/max charges
    if (primaryRule.minimumCharge && subtotal < primaryRule.minimumCharge) {
      subtotal = primaryRule.minimumCharge;
    }
    if (primaryRule.maximumCharge && subtotal > primaryRule.maximumCharge) {
      subtotal = primaryRule.maximumCharge;
    }

    // Calculate tax (configurable)
    const taxRate = 0.0; // Can be configured per zone/company
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const quote = {
      basePrice: Math.round(basePrice * 100) / 100,
      distance: distance.miles,
      surcharges,
      zoneAdjustment: Math.round(zoneAdjustment * 100) / 100,
      additionalServices: Math.round(additionalCost * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: "USD",
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ruleApplied: primaryRule.name,
    };

    return successResponse(res, "Quote calculated", 200, { quote });
  } catch (err) {
    next(err);
  }
};

/**
 * Save quote
 * @route POST /api/pricing/quotes
 */
const saveQuote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      quoteData,
      origin,
      destination,
      weight,
      vehicleType,
      serviceType,
      customerEmail,
      customerName,
      notes,
    } = req.body;

    const quote = await Quote.create({
      companyId: req.user.companyId,
      createdBy: req.user.id,
      quoteNumber: `Q-${Date.now()}`,
      origin,
      destination,
      weight,
      vehicleType,
      serviceType,
      customerEmail,
      customerName,
      notes,
      ...quoteData,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "QUOTE_CREATED",
      resource: "Quote",
      resourceId: quote.id,
      details: { quoteNumber: quote.quoteNumber },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Quote saved successfully", 201, { quote });
  } catch (err) {
    next(err);
  }
};

/**
 * Get quotes
 * @route GET /api/pricing/quotes
 */
const getQuotes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = { companyId: req.user.companyId };
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { rows: quotes, count } = await Quote.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
    });

    return successResponse(res, "Quotes retrieved", 200, {
      quotes,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Convert quote to shipment
 * @route POST /api/pricing/quotes/:id/convert
 */
const convertQuoteToShipment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      throw new AppError("Quote not found", 404);
    }

    if (quote.companyId !== req.user.companyId) {
      throw new AppError("Not authorized", 403);
    }

    if (quote.status !== "pending" && quote.status !== "accepted") {
      throw new AppError("Quote cannot be converted", 400);
    }

    if (new Date(quote.expiresAt) < new Date()) {
      throw new AppError("Quote has expired", 400);
    }

    // Create shipment from quote
    const shipment = await Shipment.create({
      companyId: quote.companyId,
      origin: quote.origin,
      destination: quote.destination,
      weight: quote.weight,
      vehicleType: quote.vehicleType,
      serviceType: quote.serviceType,
      price: quote.total,
      quoteId: quote.id,
      status: "pending",
      createdBy: req.user.id,
    });

    // Update quote status
    await quote.update({
      status: "converted",
      convertedToShipmentId: shipment.id,
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "QUOTE_CONVERTED",
      resource: "Quote",
      resourceId: quote.id,
      details: { shipmentId: shipment.id },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Quote converted to shipment", 200, {
      quote,
      shipment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fuel surcharge rates
 * @route GET /api/pricing/fuel-surcharge
 */
const getFuelSurcharge = async (req, res, next) => {
  try {
    // Get current fuel price and calculate surcharge
    const baseFuelPrice = 3.5; // Base price when surcharge = 0
    const currentFuelPrice = await getCurrentFuelPrice();

    const surchargePercentage = Math.max(
      0,
      ((currentFuelPrice - baseFuelPrice) / baseFuelPrice) * 100
    );

    return successResponse(res, "Fuel surcharge retrieved", 200, {
      baseFuelPrice,
      currentFuelPrice,
      surchargePercentage: Math.round(surchargePercentage * 100) / 100,
      effectiveDate: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

// Helper functions
const getApplicableRules = async (companyId, vehicleType, weight, distance) => {
  const where = {
    status: "active",
    [Op.or]: [{ companyId }, { isGlobal: true }],
    [Op.and]: [
      {
        [Op.or]: [
          { effectiveFrom: null },
          { effectiveFrom: { [Op.lte]: new Date() } },
        ],
      },
      {
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gte]: new Date() } },
        ],
      },
    ],
  };

  if (vehicleType) {
    where[Op.or].push({
      vehicleTypes: { [Op.contains]: [vehicleType] },
    });
  }

  return PricingRule.findAll({
    where,
    order: [
      ["priority", "DESC"],
      ["isGlobal", "ASC"],
    ],
  });
};

const findPricingZone = async (location, companyId) => {
  // Simplified zone lookup - would use geospatial queries in production
  return null;
};

const isSurchargeApplicable = async (surcharge, shipmentData) => {
  // Check surcharge conditions
  if (!surcharge.conditions) return true;
  // Implement condition checking logic
  return true;
};

const isDiscountApplicable = async (discount, shipmentData, user) => {
  // Check discount conditions
  if (!discount.conditions) return true;
  // Implement condition checking logic
  return true;
};

const calculateServiceCost = async (service, basePrice) => {
  // Calculate additional service costs
  return 0;
};

const invalidatePricingCache = async (companyId) => {
  try {
    const keys = await redisClient.keys(`pricing:${companyId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    logger.error("Failed to invalidate pricing cache", err);
  }
};

const getCurrentFuelPrice = async () => {
  // Would fetch from external API or database
  return 4.25; // Placeholder
};

module.exports = {
  getPricingRules,
  getPricingRuleById,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  getPricingZones,
  createPricingZone,
  calculateQuote,
  saveQuote,
  getQuotes,
  convertQuoteToShipment,
  getFuelSurcharge,
};
