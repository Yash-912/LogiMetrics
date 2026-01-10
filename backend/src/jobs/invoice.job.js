/**
 * Invoice Jobs
 * Scheduled tasks for invoice processing, recurring invoices, and payment reminders
 */

const { Op } = require('sequelize');
const { Invoice, Company, User } = require('../models/postgres');
const invoiceService = require('../services/invoice.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger.util');

/**
 * Process recurring invoices
 * Generates new invoices from recurring invoice templates
 */
async function processRecurringInvoices() {
    logger.info('[InvoiceJob] Processing recurring invoices...');

    try {
        // Find all recurring invoice templates that need processing
        const recurringInvoices = await Invoice.findAll({
            where: {
                isRecurring: true,
                status: { [Op.in]: ['paid', 'sent'] },
                nextRecurringDate: {
                    [Op.lte]: new Date()
                }
            },
            include: [
                { model: Company, as: 'company' },
                { model: Company, as: 'customer' }
            ]
        });

        logger.info(`[InvoiceJob] Found ${recurringInvoices.length} recurring invoices to process`);

        let successCount = 0;
        let errorCount = 0;

        for (const templateInvoice of recurringInvoices) {
            try {
                // Create new invoice from template
                const newInvoice = await invoiceService.createRecurringInvoice(
                    templateInvoice.id,
                    null // System generated
                );

                // Calculate next recurring date based on frequency
                const nextDate = calculateNextRecurringDate(
                    new Date(),
                    templateInvoice.recurringFrequency || 'monthly'
                );

                // Update template with next recurring date
                await templateInvoice.update({ nextRecurringDate: nextDate });

                // Send notification to customer
                if (templateInvoice.customer?.email) {
                    await invoiceService.sendInvoiceEmail(
                        newInvoice.id,
                        templateInvoice.customer.email,
                        'Your recurring invoice is ready.'
                    );
                }

                successCount++;
                logger.info(`[InvoiceJob] Created recurring invoice: ${newInvoice.invoiceNumber}`);
            } catch (error) {
                errorCount++;
                logger.error(`[InvoiceJob] Failed to process recurring invoice ${templateInvoice.id}:`, error);
            }
        }

        logger.info(`[InvoiceJob] Recurring invoices processed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
        logger.error('[InvoiceJob] Error processing recurring invoices:', error);
        throw error;
    }
}

/**
 * Calculate next recurring date based on frequency
 */
function calculateNextRecurringDate(fromDate, frequency) {
    const date = new Date(fromDate);

    switch (frequency) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'biweekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            date.setMonth(date.getMonth() + 1);
    }

    return date;
}

/**
 * Send payment reminders for overdue invoices
 */
async function sendPaymentReminders() {
    logger.info('[InvoiceJob] Sending payment reminders...');

    try {
        // Get overdue invoices that haven't been reminded recently
        const overdueInvoices = await invoiceService.getOverdueInvoices();

        // Filter invoices to remind (not reminded in last 3 days)
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const invoicesToRemind = overdueInvoices.filter(invoice => {
            return !invoice.lastReminderSentAt ||
                new Date(invoice.lastReminderSentAt) < threeDaysAgo;
        });

        logger.info(`[InvoiceJob] Found ${invoicesToRemind.length} invoices needing reminders`);

        let sentCount = 0;
        let errorCount = 0;

        for (const invoice of invoicesToRemind) {
            try {
                await invoiceService.sendPaymentReminder(invoice.id);

                // Update last reminder sent date
                await invoice.update({ lastReminderSentAt: new Date() });

                // Send in-app notification
                const customer = await User.findByPk(invoice.customerId);
                if (customer) {
                    await notificationService.sendNotification(customer.id, {
                        type: 'payment_reminder',
                        title: 'Payment Reminder',
                        message: `Invoice ${invoice.invoiceNumber} is overdue. Amount: ${invoice.currency} ${invoice.totalAmount}`,
                        data: { invoiceId: invoice.id }
                    });
                }

                sentCount++;
            } catch (error) {
                errorCount++;
                logger.error(`[InvoiceJob] Failed to send reminder for invoice ${invoice.id}:`, error);
            }
        }

        logger.info(`[InvoiceJob] Payment reminders sent: ${sentCount} success, ${errorCount} errors`);
    } catch (error) {
        logger.error('[InvoiceJob] Error sending payment reminders:', error);
        throw error;
    }
}

/**
 * Update invoice status to overdue if past due date
 */
async function updateOverdueStatus() {
    logger.info('[InvoiceJob] Updating overdue invoice statuses...');

    try {
        // Find invoices that are past due but not yet marked as overdue
        const [updatedCount] = await Invoice.update(
            { status: 'overdue' },
            {
                where: {
                    status: { [Op.in]: ['sent', 'viewed', 'partial'] },
                    dueDate: { [Op.lt]: new Date() }
                }
            }
        );

        logger.info(`[InvoiceJob] Updated ${updatedCount} invoices to overdue status`);

        // Get newly overdue invoices for notifications
        if (updatedCount > 0) {
            const overdueInvoices = await Invoice.findAll({
                where: {
                    status: 'overdue',
                    updatedAt: {
                        [Op.gte]: new Date(Date.now() - 60 * 1000) // Updated in last minute
                    }
                },
                include: [
                    { model: Company, as: 'company', attributes: ['id', 'name'] }
                ]
            });

            // Notify company admins about newly overdue invoices
            for (const invoice of overdueInvoices) {
                try {
                    // Find company users to notify
                    const companyUsers = await User.findAll({
                        where: {
                            companyId: invoice.companyId,
                            role: { [Op.in]: ['admin', 'finance'] }
                        }
                    });

                    for (const user of companyUsers) {
                        await notificationService.createNotification(
                            user.id,
                            'invoice_overdue',
                            'Invoice Overdue',
                            `Invoice ${invoice.invoiceNumber} is now overdue`,
                            { invoiceId: invoice.id }
                        );
                    }
                } catch (error) {
                    logger.error(`[InvoiceJob] Failed to notify for overdue invoice ${invoice.id}:`, error);
                }
            }
        }
    } catch (error) {
        logger.error('[InvoiceJob] Error updating overdue statuses:', error);
        throw error;
    }
}

module.exports = {
    processRecurringInvoices,
    sendPaymentReminders,
    updateOverdueStatus
};
