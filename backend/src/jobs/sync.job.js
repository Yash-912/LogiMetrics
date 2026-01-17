/**
 * Sync Jobs
 * Scheduled tasks for external system synchronization, payment reconciliation, and health checks
 */

const { Op } = require("sequelize");
const { Transaction, Invoice, Company, Shipment } = require("../models/mongodb");
const { getRedisClient, setCache } = require("../config/redis");
const logger = require("../utils/logger.util");

// External service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const EXTERNAL_API_TIMEOUT = 30000; // 30 seconds

/**
 * Sync with external logistics systems
 */
async function syncExternalSystems() {
  logger.info("[SyncJob] Syncing with external systems...");

  try {
    const results = {
      success: [],
      errors: [],
    };

    // Get companies with external integrations
    const companies = await Company.findAll({
      where: {
        status: "active",
        "settings.integrations": { [Op.ne]: null },
      },
    });

    for (const company of companies) {
      const integrations = company.settings?.integrations || {};

      // Sync with each configured integration
      for (const [integrationName, config] of Object.entries(integrations)) {
        if (!config?.enabled) continue;

        try {
          switch (integrationName) {
            case "erp":
              await syncERPSystem(company.id, config);
              break;
            case "tms":
              await syncTMSSystem(company.id, config);
              break;
            case "wms":
              await syncWMSSystem(company.id, config);
              break;
            default:
              logger.debug(`[SyncJob] Unknown integration: ${integrationName}`);
          }
          results.success.push(`${company.id}:${integrationName}`);
        } catch (error) {
          results.errors.push({
            company: company.id,
            integration: integrationName,
            error: error.message,
          });
          logger.error(
            `[SyncJob] Failed to sync ${integrationName} for company ${company.id}:`,
            error
          );
        }
      }
    }

    logger.info(
      `[SyncJob] External sync complete. Success: ${results.success.length}, Errors: ${results.errors.length}`
    );
  } catch (error) {
    logger.error("[SyncJob] Error syncing external systems:", error);
    throw error;
  }
}

/**
 * Sync with ERP system (placeholder)
 */
async function syncERPSystem(companyId, config) {
  // Implementation would integrate with company's ERP API
  logger.debug(`[SyncJob] Syncing ERP for company ${companyId}`);
  // Placeholder: In production, this would call the ERP API
}

/**
 * Sync with TMS (Transportation Management System)
 */
async function syncTMSSystem(companyId, config) {
  logger.debug(`[SyncJob] Syncing TMS for company ${companyId}`);
  // Placeholder: In production, this would call the TMS API
}

/**
 * Sync with WMS (Warehouse Management System)
 */
async function syncWMSSystem(companyId, config) {
  logger.debug(`[SyncJob] Syncing WMS for company ${companyId}`);
  // Placeholder: In production, this would call the WMS API
}

/**
 * Reconcile payments with payment gateways
 */
async function reconcilePayments() {
  logger.info("[SyncJob] Reconciling payments...");

  try {
    // Get transactions from the last 7 days that are pending or processing
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingTransactions = await Transaction.findAll({
      where: {
        status: { [Op.in]: ["pending", "processing"] },
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      include: [{ model: Invoice, as: "invoice" }],
    });

    logger.info(
      `[SyncJob] Found ${pendingTransactions.length} pending transactions to reconcile`
    );

    let reconciledCount = 0;
    let errorCount = 0;

    for (const transaction of pendingTransactions) {
      try {
        // Check transaction status with payment gateway
        const gatewayStatus = await checkPaymentGatewayStatus(transaction);

        if (gatewayStatus.status !== transaction.status) {
          // Update transaction status
          await transaction.update({
            status: gatewayStatus.status,
            gatewayResponse: gatewayStatus.response,
            reconcileAt: new Date(),
          });

          // Update invoice if payment completed
          if (gatewayStatus.status === "completed" && transaction.invoice) {
            await transaction.invoice.update({
              status: "paid",
              paidAt: new Date(),
              paidAmount: transaction.amount,
            });
          }

          reconciledCount++;
          logger.debug(
            `[SyncJob] Reconciled transaction ${transaction.id}: ${gatewayStatus.status}`
          );
        }
      } catch (error) {
        errorCount++;
        logger.error(
          `[SyncJob] Failed to reconcile transaction ${transaction.id}:`,
          error
        );
      }
    }

    // Also check for any webhook failures
    await checkMissedWebhooks();

    logger.info(
      `[SyncJob] Payment reconciliation complete. Reconciled: ${reconciledCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error("[SyncJob] Error reconciling payments:", error);
    throw error;
  }
}

/**
 * Check payment gateway status (placeholder - would call Razorpay/Stripe APIs)
 */
async function checkPaymentGatewayStatus(transaction) {
  // This would call the actual payment gateway API
  // Razorpay: razorpay.payments.fetch(paymentId)
  // Stripe: stripe.paymentIntents.retrieve(paymentIntentId)

  logger.debug(
    `[SyncJob] Checking gateway status for transaction ${transaction.id}`
  );

  // Placeholder return
  return {
    status: transaction.status,
    response: null,
  };
}

/**
 * Check for missed webhooks
 */
async function checkMissedWebhooks() {
  // Find transactions that were created but never received webhook
  const oldPendingTransactions = await Transaction.findAll({
    where: {
      status: "processing",
      createdAt: { [Op.lt]: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2 hours ago
    },
  });

  if (oldPendingTransactions.length > 0) {
    logger.warn(
      `[SyncJob] Found ${oldPendingTransactions.length} transactions without webhook response`
    );
  }
}

/**
 * Sync ML predictions from ML service
 */
async function syncMLPredictions() {
  logger.info("[SyncJob] Syncing ML predictions...");

  if (!ML_SERVICE_URL) {
    logger.debug("[SyncJob] ML service URL not configured, skipping");
    return;
  }

  try {
    // Get active shipments for ETA prediction updates
    const activeShipments = await Shipment.findAll({
      where: {
        status: { [Op.in]: ["pending", "picked_up", "in_transit"] },
      },
      limit: 100, // Process in batches
      order: [["createdAt", "DESC"]],
    });

    if (activeShipments.length === 0) {
      logger.debug("[SyncJob] No active shipments for ML predictions");
      return;
    }

    // Batch request to ML service for ETA predictions
    try {
      const shipmentData = activeShipments.map((s) => ({
        id: s.id,
        origin: s.origin,
        destination: s.destination,
        vehicleType: s.vehicleType,
        distance: s.distance,
        weight: s.weight,
      }));

      // Call ML service (placeholder - would use axios/fetch)
      const predictions = await callMLService("/predict/eta", {
        shipments: shipmentData,
      });

      // Update shipments with predictions
      if (predictions?.results) {
        for (const prediction of predictions.results) {
          await Shipment.update(
            {
              estimatedDelivery: prediction.eta,
              mlPrediction: prediction,
            },
            { where: { id: prediction.shipmentId } }
          );
        }

        // Cache predictions
        const redis = getRedisClient();
        if (redis && redis.isOpen) {
          await setCache("ml:eta:predictions", predictions.results, 3600); // 1 hour TTL
        }
      }

      logger.info(
        `[SyncJob] Updated ML predictions for ${
          predictions?.results?.length || 0
        } shipments`
      );
    } catch (mlError) {
      logger.error("[SyncJob] ML service call failed:", mlError);
    }
  } catch (error) {
    logger.error("[SyncJob] Error syncing ML predictions:", error);
    throw error;
  }
}

/**
 * Call ML service (placeholder)
 */
async function callMLService(endpoint, data) {
  // Implementation would use axios/fetch to call ML service
  logger.debug(`[SyncJob] Calling ML service: ${endpoint}`);

  // Placeholder return
  return { results: [] };
}

/**
 * System health check
 */
async function healthCheck() {
  logger.info("[SyncJob] Running system health check...");

  try {
    const health = {
      timestamp: new Date().toISOString(),
      services: {},
      issues: [],
    };

    // Check PostgreSQL
    try {
      const { sequelize } = require("../config/database");
      await sequelize.authenticate();
      health.services.postgresql = "healthy";
    } catch (error) {
      health.services.postgresql = "unhealthy";
      health.issues.push({ service: "postgresql", error: error.message });
    }

    // Check MongoDB
    try {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState === 1) {
        health.services.mongodb = "healthy";
      } else {
        health.services.mongodb = "unhealthy";
        health.issues.push({
          service: "mongodb",
          error: "Connection not ready",
        });
      }
    } catch (error) {
      health.services.mongodb = "unhealthy";
      health.issues.push({ service: "mongodb", error: error.message });
    }

    // Check Redis
    try {
      const redis = getRedisClient();
      if (redis && redis.isOpen) {
        await redis.ping();
        health.services.redis = "healthy";
      } else {
        health.services.redis = "unhealthy";
        health.issues.push({ service: "redis", error: "Connection not open" });
      }
    } catch (error) {
      health.services.redis = "unhealthy";
      health.issues.push({ service: "redis", error: error.message });
    }

    // Check ML service
    if (ML_SERVICE_URL) {
      try {
        // Placeholder: would call ML service health endpoint
        health.services.mlService = "healthy";
      } catch (error) {
        health.services.mlService = "unhealthy";
        health.issues.push({ service: "mlService", error: error.message });
      }
    }

    // Check disk space (simplified)
    try {
      const fs = require("fs").promises;
      const stats = await fs.stat(process.cwd());
      health.services.filesystem = "healthy";
    } catch (error) {
      health.services.filesystem = "unhealthy";
      health.issues.push({ service: "filesystem", error: error.message });
    }

    // Store health status
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      await setCache("system:health", health, 600); // 10 min TTL
    }

    // Alert if issues found
    if (health.issues.length > 0) {
      logger.warn("[SyncJob] Health check found issues:", health.issues);

      // In production, this would send alerts via email/SMS/PagerDuty
      // await sendAlertToOps(health.issues);
    } else {
      logger.info("[SyncJob] Health check passed - all services healthy");
    }

    return health;
  } catch (error) {
    logger.error("[SyncJob] Error during health check:", error);
    throw error;
  }
}

module.exports = {
  syncExternalSystems,
  reconcilePayments,
  syncMLPredictions,
  healthCheck,
};
