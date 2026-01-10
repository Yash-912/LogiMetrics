/**
 * Maintenance Jobs
 * Scheduled tasks for vehicle maintenance reminders and license expiry alerts
 */

const { Op } = require('sequelize');
const { Vehicle, Driver, User, Company } = require('../models/postgres');
const notificationService = require('../services/notification.service');
const { sendEmail } = require('../config/email');
const logger = require('../utils/logger.util');

// Alert thresholds in days
const ALERT_THRESHOLDS = {
    URGENT: 7,
    WARNING: 15,
    NOTICE: 30
};

/**
 * Check for vehicle maintenance needs
 */
async function checkVehicleMaintenance() {
    logger.info('[MaintenanceJob] Checking vehicle maintenance needs...');

    try {
        const today = new Date();
        const noticeDate = new Date(Date.now() + ALERT_THRESHOLDS.NOTICE * 24 * 60 * 60 * 1000);

        // Find vehicles needing maintenance
        const vehiclesNeedingMaintenance = await Vehicle.findAll({
            where: {
                status: { [Op.ne]: 'retired' },
                [Op.or]: [
                    // Service date approaching
                    {
                        'maintenance.nextServiceDate': {
                            [Op.lte]: noticeDate
                        }
                    }
                ]
            },
            include: [
                { model: Company, as: 'company', attributes: ['id', 'name'] }
            ]
        });

        logger.info(`[MaintenanceJob] Found ${vehiclesNeedingMaintenance.length} vehicles needing maintenance attention`);

        let alertsSent = 0;

        for (const vehicle of vehiclesNeedingMaintenance) {
            try {
                // Check if needs maintenance based on odometer or date
                const needsMaintenance = vehicle.needsMaintenance();
                const nextServiceDate = vehicle.maintenance?.nextServiceDate;
                const nextServiceOdometer = vehicle.maintenance?.nextServiceOdometer;

                let alertLevel = 'notice';
                let daysUntilDue = null;

                if (nextServiceDate) {
                    daysUntilDue = Math.ceil((new Date(nextServiceDate) - today) / (1000 * 60 * 60 * 24));

                    if (daysUntilDue <= 0) {
                        alertLevel = 'urgent';
                    } else if (daysUntilDue <= ALERT_THRESHOLDS.URGENT) {
                        alertLevel = 'urgent';
                    } else if (daysUntilDue <= ALERT_THRESHOLDS.WARNING) {
                        alertLevel = 'warning';
                    }
                }

                // Check odometer-based maintenance
                const odometerMessage = nextServiceOdometer && vehicle.odometer >= nextServiceOdometer
                    ? ` Odometer: ${vehicle.odometer}km / Due at: ${nextServiceOdometer}km.`
                    : '';

                // Find company admins/fleet managers to notify
                const recipients = await User.findAll({
                    where: {
                        companyId: vehicle.companyId,
                        role: { [Op.in]: ['admin', 'fleet_manager'] },
                        status: 'active'
                    }
                });

                const title = alertLevel === 'urgent'
                    ? '🚨 Urgent: Vehicle Maintenance Overdue'
                    : alertLevel === 'warning'
                        ? '⚠️ Vehicle Maintenance Due Soon'
                        : '📋 Vehicle Maintenance Reminder';

                const message = `Vehicle ${vehicle.registrationNumber} (${vehicle.make} ${vehicle.model}) ${daysUntilDue <= 0
                        ? 'is overdue for maintenance!'
                        : `is due for maintenance in ${daysUntilDue} days.`
                    }${odometerMessage}`;

                for (const user of recipients) {
                    await notificationService.sendNotification(user.id, {
                        type: 'vehicle_maintenance',
                        title,
                        message,
                        channels: alertLevel === 'urgent' ? ['in_app', 'email'] : ['in_app'],
                        data: { vehicleId: vehicle.id, alertLevel }
                    });
                }

                alertsSent++;
            } catch (error) {
                logger.error(`[MaintenanceJob] Failed to send maintenance alert for vehicle ${vehicle.id}:`, error);
            }
        }

        logger.info(`[MaintenanceJob] Sent ${alertsSent} vehicle maintenance alerts`);
    } catch (error) {
        logger.error('[MaintenanceJob] Error checking vehicle maintenance:', error);
        throw error;
    }
}

/**
 * Check for driver license expiry
 */
async function checkLicenseExpiry() {
    logger.info('[MaintenanceJob] Checking driver license expiry...');

    try {
        const noticeDate = new Date(Date.now() + ALERT_THRESHOLDS.NOTICE * 24 * 60 * 60 * 1000);

        // Find drivers with licenses expiring soon
        const driversWithExpiringLicense = await Driver.findAll({
            where: {
                status: { [Op.ne]: 'inactive' },
                licenseExpiry: {
                    [Op.lte]: noticeDate
                }
            },
            include: [
                { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
                { model: Company, as: 'company', attributes: ['id', 'name'] }
            ]
        });

        logger.info(`[MaintenanceJob] Found ${driversWithExpiringLicense.length} drivers with expiring licenses`);

        let alertsSent = 0;

        for (const driver of driversWithExpiringLicense) {
            try {
                const today = new Date();
                const expiryDate = new Date(driver.licenseExpiry);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                let alertLevel = 'notice';
                if (daysUntilExpiry <= 0) {
                    alertLevel = 'expired';
                } else if (daysUntilExpiry <= ALERT_THRESHOLDS.URGENT) {
                    alertLevel = 'urgent';
                } else if (daysUntilExpiry <= ALERT_THRESHOLDS.WARNING) {
                    alertLevel = 'warning';
                }

                const title = alertLevel === 'expired'
                    ? '🚫 Driver License Expired'
                    : alertLevel === 'urgent'
                        ? '🚨 Driver License Expiring Soon'
                        : '📋 Driver License Expiry Reminder';

                const driverName = driver.user
                    ? `${driver.user.firstName} ${driver.user.lastName}`
                    : `Driver ${driver.licenseNumber}`;

                const message = daysUntilExpiry <= 0
                    ? `${driverName}'s driver license has expired on ${expiryDate.toLocaleDateString()}.`
                    : `${driverName}'s driver license expires in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()}).`;

                // Notify driver
                if (driver.user) {
                    await notificationService.sendNotification(driver.user.id, {
                        type: 'license_expiry',
                        title,
                        message,
                        channels: alertLevel === 'expired' || alertLevel === 'urgent'
                            ? ['in_app', 'email', 'sms']
                            : ['in_app'],
                        data: { driverId: driver.id, alertLevel, expiryDate: driver.licenseExpiry }
                    });
                }

                // Notify company admins
                const admins = await User.findAll({
                    where: {
                        companyId: driver.companyId,
                        role: { [Op.in]: ['admin', 'fleet_manager'] },
                        status: 'active'
                    }
                });

                for (const admin of admins) {
                    await notificationService.createNotification(
                        admin.id,
                        'license_expiry',
                        title,
                        message,
                        { driverId: driver.id, alertLevel }
                    );
                }

                // If license expired, update driver status
                if (alertLevel === 'expired' && driver.status !== 'inactive') {
                    await driver.update({ status: 'inactive' });
                    logger.warn(`[MaintenanceJob] Deactivated driver ${driver.id} due to expired license`);
                }

                alertsSent++;
            } catch (error) {
                logger.error(`[MaintenanceJob] Failed to send license expiry alert for driver ${driver.id}:`, error);
            }
        }

        logger.info(`[MaintenanceJob] Sent ${alertsSent} license expiry alerts`);
    } catch (error) {
        logger.error('[MaintenanceJob] Error checking license expiry:', error);
        throw error;
    }
}

/**
 * Check for vehicle document expiry (insurance, permits, etc.)
 */
async function checkDocumentExpiry() {
    logger.info('[MaintenanceJob] Checking vehicle document expiry...');

    try {
        const documentTypes = ['insurance', 'fitness', 'permit', 'puc', 'registration'];
        const noticeDate = new Date(Date.now() + ALERT_THRESHOLDS.NOTICE * 24 * 60 * 60 * 1000);
        const today = new Date();

        // Get all active vehicles
        const vehicles = await Vehicle.findAll({
            where: { status: { [Op.ne]: 'retired' } },
            include: [
                { model: Company, as: 'company', attributes: ['id', 'name'] }
            ]
        });

        let alertsSent = 0;

        for (const vehicle of vehicles) {
            try {
                const documentStatus = vehicle.getDocumentStatus();
                const { expired, warnings } = documentStatus;

                if (expired.length === 0 && warnings.length === 0) continue;

                // Get recipients
                const recipients = await User.findAll({
                    where: {
                        companyId: vehicle.companyId,
                        role: { [Op.in]: ['admin', 'fleet_manager'] },
                        status: 'active'
                    }
                });

                // Send alerts for expired documents
                for (const docType of expired) {
                    const title = `🚫 Vehicle ${docType.toUpperCase()} Expired`;
                    const message = `Vehicle ${vehicle.registrationNumber}'s ${docType} has expired. Please renew immediately.`;

                    for (const user of recipients) {
                        await notificationService.sendNotification(user.id, {
                            type: 'document_expiry',
                            title,
                            message,
                            channels: ['in_app', 'email'],
                            data: { vehicleId: vehicle.id, documentType: docType, alertLevel: 'expired' }
                        });
                    }
                    alertsSent++;
                }

                // Send alerts for documents expiring soon
                for (const warning of warnings) {
                    if (warning.daysUntilExpiry > ALERT_THRESHOLDS.NOTICE) continue;

                    const alertLevel = warning.daysUntilExpiry <= ALERT_THRESHOLDS.URGENT
                        ? 'urgent'
                        : 'warning';

                    const title = alertLevel === 'urgent'
                        ? `⚠️ Vehicle ${warning.docType.toUpperCase()} Expiring Soon`
                        : `📋 Vehicle ${warning.docType.toUpperCase()} Expiry Reminder`;

                    const message = `Vehicle ${vehicle.registrationNumber}'s ${warning.docType} expires in ${warning.daysUntilExpiry} days.`;

                    for (const user of recipients) {
                        await notificationService.createNotification(
                            user.id,
                            'document_expiry',
                            title,
                            message,
                            { vehicleId: vehicle.id, documentType: warning.docType, alertLevel }
                        );
                    }
                    alertsSent++;
                }
            } catch (error) {
                logger.error(`[MaintenanceJob] Failed to check documents for vehicle ${vehicle.id}:`, error);
            }
        }

        logger.info(`[MaintenanceJob] Sent ${alertsSent} document expiry alerts`);
    } catch (error) {
        logger.error('[MaintenanceJob] Error checking document expiry:', error);
        throw error;
    }
}

module.exports = {
    checkVehicleMaintenance,
    checkLicenseExpiry,
    checkDocumentExpiry
};
