const { validationResult } = require("express-validator");
const crypto = require("crypto");
const { Company, Shipment } = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const { successResponse, errorResponse } = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger.util");
const axios = require("axios");

/**
 * Get webhook endpoints
 * @route GET /api/webhooks/endpoints
 */
const getWebhookEndpoints = async (req, res, next) => {
  try {
    const { status, event } = req.query;

    const where = { companyId: req.user.companyId };
    if (status) where.status = status;
    if (event) where.events = { [Op.contains]: [event] };

    const endpoints = await WebhookEndpoint.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return successResponse(res, "Webhook endpoints retrieved", 200, {
      endpoints,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get webhook endpoint by ID
 * @route GET /api/webhooks/endpoints/:id
 */
const getWebhookEndpointById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const endpoint = await WebhookEndpoint.findByPk(id);
    if (!endpoint) {
      throw new AppError("Webhook endpoint not found", 404);
    }

    // Authorization check
    if (
      endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    return successResponse(res, "Webhook endpoint retrieved", 200, {
      endpoint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create webhook endpoint
 * @route POST /api/webhooks/endpoints
 */
const createWebhookEndpoint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { name, url, events, description, headers, retryPolicy } = req.body;

    // Generate signing secret
    const signingSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const endpoint = await WebhookEndpoint.create({
      name,
      url,
      events,
      description,
      headers: headers || {},
      signingSecret,
      retryPolicy: retryPolicy || {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
      },
      companyId: req.user.companyId,
      createdBy: req.user.id,
      status: "active",
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "WEBHOOK_ENDPOINT_CREATED",
      resource: "WebhookEndpoint",
      resourceId: endpoint.id,
      details: { name, url, events },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info("Webhook endpoint created", {
      endpointId: endpoint.id,
      userId: req.user.id,
    });

    return successResponse(res, "Webhook endpoint created successfully", 201, {
      endpoint: {
        ...endpoint.toJSON(),
        signingSecret, // Only returned on creation
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update webhook endpoint
 * @route PUT /api/webhooks/endpoints/:id
 */
const updateWebhookEndpoint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { name, url, events, description, headers, retryPolicy, status } =
      req.body;

    const endpoint = await WebhookEndpoint.findByPk(id);
    if (!endpoint) {
      throw new AppError("Webhook endpoint not found", 404);
    }

    // Authorization check
    if (
      endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    await endpoint.update({
      name,
      url,
      events,
      description,
      headers,
      retryPolicy,
      status,
      updatedBy: req.user.id,
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "WEBHOOK_ENDPOINT_UPDATED",
      resource: "WebhookEndpoint",
      resourceId: endpoint.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Webhook endpoint updated successfully", 200, {
      endpoint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete webhook endpoint
 * @route DELETE /api/webhooks/endpoints/:id
 */
const deleteWebhookEndpoint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const endpoint = await WebhookEndpoint.findByPk(id);
    if (!endpoint) {
      throw new AppError("Webhook endpoint not found", 404);
    }

    // Authorization check
    if (
      endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    await endpoint.destroy();

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "WEBHOOK_ENDPOINT_DELETED",
      resource: "WebhookEndpoint",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Webhook endpoint deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Rotate webhook signing secret
 * @route POST /api/webhooks/endpoints/:id/rotate-secret
 */
const rotateSigningSecret = async (req, res, next) => {
  try {
    const { id } = req.params;

    const endpoint = await WebhookEndpoint.findByPk(id);
    if (!endpoint) {
      throw new AppError("Webhook endpoint not found", 404);
    }

    // Authorization check
    if (
      endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    const newSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    await endpoint.update({ signingSecret: newSecret });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "WEBHOOK_SECRET_ROTATED",
      resource: "WebhookEndpoint",
      resourceId: endpoint.id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Signing secret rotated successfully", 200, {
      signingSecret: newSecret,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Test webhook endpoint
 * @route POST /api/webhooks/endpoints/:id/test
 */
const testWebhookEndpoint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const endpoint = await WebhookEndpoint.findByPk(id);
    if (!endpoint) {
      throw new AppError("Webhook endpoint not found", 404);
    }

    // Authorization check
    if (
      endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    // Send test webhook
    const testPayload = {
      id: `test_${Date.now()}`,
      type: "test.webhook",
      data: {
        message: "This is a test webhook delivery",
        timestamp: new Date().toISOString(),
      },
      created: Date.now(),
    };

    const result = await deliverWebhook(endpoint, testPayload, true);

    return successResponse(res, "Test webhook sent", 200, {
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get webhook delivery history
 * @route GET /api/webhooks/deliveries
 */
const getWebhookDeliveries = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      endpointId,
      event,
      status,
      startDate,
      endDate,
    } = req.query;

    const where = {};

    // Get company's endpoints
    const companyEndpoints = await WebhookEndpoint.findAll({
      where: { companyId: req.user.companyId },
      attributes: ["id"],
    });
    where.endpointId = { [Op.in]: companyEndpoints.map((e) => e.id) };

    if (endpointId) where.endpointId = endpointId;
    if (event) where.event = event;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { rows: deliveries, count } = await WebhookDelivery.findAndCountAll({
      where,
      include: [
        {
          model: WebhookEndpoint,
          as: "endpoint",
          attributes: ["id", "name", "url"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return successResponse(res, "Webhook deliveries retrieved", 200, {
      deliveries,
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
 * Retry webhook delivery
 * @route POST /api/webhooks/deliveries/:id/retry
 */
const retryWebhookDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const delivery = await WebhookDelivery.findByPk(id, {
      include: [{ model: WebhookEndpoint, as: "endpoint" }],
    });

    if (!delivery) {
      throw new AppError("Webhook delivery not found", 404);
    }

    // Authorization check
    if (
      delivery.endpoint.companyId !== req.user.companyId &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Not authorized", 403);
    }

    // Retry delivery
    const result = await deliverWebhook(
      delivery.endpoint,
      delivery.payload,
      false,
      delivery.id
    );

    // Update delivery record
    await delivery.update({
      attempts: delivery.attempts + 1,
      lastAttemptAt: new Date(),
      status: result.success ? "delivered" : "failed",
      lastResponse: {
        statusCode: result.statusCode,
        body: result.body,
        error: result.error,
      },
    });

    return successResponse(
      res,
      result.success
        ? "Webhook delivered successfully"
        : "Webhook delivery failed",
      200,
      {
        success: result.success,
        statusCode: result.statusCode,
        attempts: delivery.attempts + 1,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get available webhook events
 * @route GET /api/webhooks/events
 */
const getAvailableEvents = async (req, res, next) => {
  try {
    const events = [
      {
        category: "shipment",
        events: [
          {
            name: "shipment.created",
            description: "Triggered when a new shipment is created",
          },
          {
            name: "shipment.updated",
            description: "Triggered when a shipment is updated",
          },
          {
            name: "shipment.status_changed",
            description: "Triggered when shipment status changes",
          },
          {
            name: "shipment.picked_up",
            description: "Triggered when shipment is picked up",
          },
          {
            name: "shipment.in_transit",
            description: "Triggered when shipment is in transit",
          },
          {
            name: "shipment.out_for_delivery",
            description: "Triggered when shipment is out for delivery",
          },
          {
            name: "shipment.delivered",
            description: "Triggered when shipment is delivered",
          },
          {
            name: "shipment.cancelled",
            description: "Triggered when shipment is cancelled",
          },
          {
            name: "shipment.exception",
            description: "Triggered when shipment has an exception",
          },
        ],
      },
      {
        category: "tracking",
        events: [
          {
            name: "tracking.location_update",
            description: "Triggered on location update",
          },
          {
            name: "tracking.geofence_enter",
            description: "Triggered when entering a geofence",
          },
          {
            name: "tracking.geofence_exit",
            description: "Triggered when exiting a geofence",
          },
          {
            name: "tracking.eta_changed",
            description: "Triggered when ETA changes significantly",
          },
        ],
      },
      {
        category: "invoice",
        events: [
          {
            name: "invoice.created",
            description: "Triggered when an invoice is created",
          },
          {
            name: "invoice.sent",
            description: "Triggered when an invoice is sent",
          },
          {
            name: "invoice.paid",
            description: "Triggered when an invoice is paid",
          },
          {
            name: "invoice.overdue",
            description: "Triggered when an invoice becomes overdue",
          },
        ],
      },
      {
        category: "payment",
        events: [
          {
            name: "payment.succeeded",
            description: "Triggered when a payment succeeds",
          },
          {
            name: "payment.failed",
            description: "Triggered when a payment fails",
          },
          {
            name: "payment.refunded",
            description: "Triggered when a payment is refunded",
          },
        ],
      },
      {
        category: "driver",
        events: [
          {
            name: "driver.status_changed",
            description: "Triggered when driver status changes",
          },
          {
            name: "driver.assigned",
            description: "Triggered when driver is assigned to shipment",
          },
        ],
      },
      {
        category: "vehicle",
        events: [
          {
            name: "vehicle.status_changed",
            description: "Triggered when vehicle status changes",
          },
          {
            name: "vehicle.maintenance_due",
            description: "Triggered when vehicle maintenance is due",
          },
        ],
      },
    ];

    return successResponse(res, "Available events retrieved", 200, { events });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle incoming webhook from external service (Stripe)
 * @route POST /api/webhooks/stripe
 */
const handleStripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify webhook signature
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", {
        error: err.message,
      });
      throw new AppError("Webhook signature verification failed", 400);
    }

    // Process event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        logger.info("Unhandled Stripe event type", { type: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle incoming webhook from external service (Twilio)
 * @route POST /api/webhooks/twilio
 */
const handleTwilioWebhook = async (req, res, next) => {
  try {
    const { MessageSid, MessageStatus, To, From, Body } = req.body;

    logger.info("Twilio webhook received", { MessageSid, MessageStatus });

    // Process SMS status updates
    if (MessageStatus) {
      // TODO: Update notification delivery status in MongoDB
      logger.info("SMS delivery status update:", { MessageSid, MessageStatus });
    }

    return res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
};

// Helper function to deliver webhook
const deliverWebhook = async (
  endpoint,
  payload,
  isTest = false,
  existingDeliveryId = null
) => {
  const startTime = Date.now();

  // Generate signature
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(
    timestamp,
    payloadString,
    endpoint.signingSecret
  );

  try {
    const response = await axios.post(endpoint.url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-ID": payload.id,
        ...endpoint.headers,
      },
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });

    const responseTime = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    // Record delivery (unless it's a retry of existing delivery)
    if (!existingDeliveryId && !isTest) {
      await WebhookDelivery.create({
        endpointId: endpoint.id,
        event: payload.type,
        payload,
        status: success ? "delivered" : "failed",
        attempts: 1,
        lastAttemptAt: new Date(),
        lastResponse: {
          statusCode: response.status,
          body:
            typeof response.data === "object"
              ? response.data
              : response.data?.substring(0, 1000),
        },
        responseTime,
      });
    }

    // Update endpoint stats
    await endpoint.increment(success ? "successCount" : "failureCount");
    await endpoint.update({ lastDeliveryAt: new Date() });

    return {
      success,
      statusCode: response.status,
      body: response.data,
      responseTime,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Record failed delivery
    if (!existingDeliveryId && !isTest) {
      await WebhookDelivery.create({
        endpointId: endpoint.id,
        event: payload.type,
        payload,
        status: "failed",
        attempts: 1,
        lastAttemptAt: new Date(),
        lastResponse: { error: err.message },
        responseTime,
      });
    }

    await endpoint.increment("failureCount");

    return {
      success: false,
      statusCode: null,
      error: err.message,
      responseTime,
    };
  }
};

// Generate webhook signature
const generateWebhookSignature = (timestamp, payload, secret) => {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(signedPayload);
  return `v1=${hmac.digest("hex")}`;
};

// Event handlers for external webhooks
const handlePaymentSuccess = async (paymentIntent) => {
  logger.info("Payment succeeded", { paymentIntentId: paymentIntent.id });
  // Update payment/transaction records
};

const handlePaymentFailure = async (paymentIntent) => {
  logger.warn("Payment failed", { paymentIntentId: paymentIntent.id });
  // Update payment/transaction records and notify user
};

const handleInvoicePaid = async (invoice) => {
  logger.info("Invoice paid via Stripe", { invoiceId: invoice.id });
  // Update invoice status
};

const handleSubscriptionUpdated = async (subscription) => {
  logger.info("Subscription updated", { subscriptionId: subscription.id });
  // Update company subscription status
};

// Exported function to trigger webhooks from other parts of the application
const triggerWebhook = async (companyId, event, data) => {
  try {
    const endpoints = await WebhookEndpoint.findAll({
      where: {
        companyId,
        status: "active",
        events: { [Op.contains]: [event] },
      },
    });

    const payload = {
      id: `evt_${crypto.randomBytes(16).toString("hex")}`,
      type: event,
      data,
      created: Date.now(),
    };

    // Deliver to all matching endpoints
    const results = await Promise.allSettled(
      endpoints.map((endpoint) => deliverWebhook(endpoint, payload))
    );

    logger.info("Webhooks triggered", {
      event,
      endpointCount: endpoints.length,
      results: results.map((r) => r.status),
    });

    return results;
  } catch (err) {
    logger.error("Failed to trigger webhooks", { event, error: err.message });
    throw err;
  }
};

module.exports = {
  getWebhookEndpoints,
  getWebhookEndpointById,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  rotateSigningSecret,
  testWebhookEndpoint,
  getWebhookDeliveries,
  retryWebhookDelivery,
  getAvailableEvents,
  handleStripeWebhook,
  handleTwilioWebhook,
  triggerWebhook,
};
