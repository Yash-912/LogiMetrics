/**
 * Invoice Service
 * Handles invoice generation, PDF creation, and email delivery
 */

const { Op } = require('sequelize');
const { Invoice, Shipment, Company, Transaction } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { generatePDF } = require('../utils/pdf.util');
const { sendEmail, emailTemplates } = require('../config/email');
const logger = require('../utils/logger.util');

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(companyId) {
    const lastInvoice = await Invoice.findOne({
        where: { companyId },
        order: [['createdAt', 'DESC']]
    });

    const lastNumber = lastInvoice
        ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''))
        : 0;

    return `INV-${String(lastNumber + 1).padStart(6, '0')}`;
}

/**
 * Calculate invoice totals
 */
function calculateInvoiceTotals(lineItems, taxRate = 0, discountRate = 0) {
    const subtotal = lineItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return sum + itemTotal;
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100
    };
}

/**
 * Create invoice from data
 */
async function createInvoice(data, userId) {
    const invoiceNumber = await generateInvoiceNumber(data.companyId);

    const totals = calculateInvoiceTotals(
        data.lineItems || [],
        data.taxRate,
        data.discountRate
    );

    const invoice = await Invoice.create({
        invoiceNumber,
        companyId: data.companyId,
        customerId: data.customerId,
        lineItems: data.lineItems || [],
        ...totals,
        currency: data.currency || 'USD',
        issueDate: data.issueDate || new Date(),
        dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: data.notes,
        terms: data.terms,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        status: 'draft',
        createdBy: userId
    });

    // Associate shipments if provided
    if (data.shipmentIds && data.shipmentIds.length > 0) {
        await Shipment.update(
            { invoiceId: invoice.id },
            { where: { id: { [Op.in]: data.shipmentIds } } }
        );
    }

    logger.info(`Invoice created: ${invoiceNumber}`);
    return invoice;
}

/**
 * Generate invoice from shipments
 */
async function generateFromShipments(shipmentIds, customerId, companyId, userId, options = {}) {
    const shipments = await Shipment.findAll({
        where: { id: { [Op.in]: shipmentIds }, invoiceId: null }
    });

    if (shipments.length === 0) {
        throw new Error('No uninvoiced shipments found');
    }

    // Generate line items from shipments
    const lineItems = shipments.map(shipment => ({
        id: shipment.id,
        description: `Shipment ${shipment.trackingNumber}`,
        quantity: 1,
        unitPrice: shipment.totalCost || 0,
        taxRate: 0,
        discount: 0,
        total: shipment.totalCost || 0
    }));

    const invoice = await createInvoice({
        companyId,
        customerId,
        lineItems,
        shipmentIds,
        dueDate: options.dueDate,
        notes: options.notes
    }, userId);

    logger.info(`Invoice generated from ${shipments.length} shipments: ${invoice.invoiceNumber}`);
    return invoice;
}

/**
 * Generate invoice PDF
 */
async function generateInvoicePDF(invoiceId) {
    const invoice = await Invoice.findByPk(invoiceId, {
        include: [
            { model: Company, as: 'company' },
            { model: Company, as: 'customer' },
            { model: Shipment, as: 'shipments' }
        ]
    });

    if (!invoice) {
        throw new Error('Invoice not found');
    }

    const pdfData = {
        title: `Invoice ${invoice.invoiceNumber}`,
        company: {
            name: invoice.company?.name,
            address: invoice.company?.address,
            phone: invoice.company?.phone,
            email: invoice.company?.email
        },
        customer: {
            name: invoice.customer?.name,
            address: invoice.billingAddress || invoice.customer?.address,
            email: invoice.customer?.email
        },
        invoice: {
            number: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            status: invoice.status
        },
        lineItems: invoice.lineItems,
        totals: {
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            discountRate: invoice.discountRate,
            discountAmount: invoice.discountAmount,
            totalAmount: invoice.totalAmount
        },
        currency: invoice.currency,
        notes: invoice.notes,
        terms: invoice.terms
    };

    const pdfBuffer = await generatePDF('invoice', pdfData);
    return pdfBuffer;
}

/**
 * Send invoice via email
 */
async function sendInvoiceEmail(invoiceId, recipientEmail, message, ccEmails = []) {
    const invoice = await Invoice.findByPk(invoiceId, {
        include: [
            { model: Company, as: 'company' },
            { model: Company, as: 'customer' }
        ]
    });

    if (!invoice) {
        throw new Error('Invoice not found');
    }

    const emailTo = recipientEmail || invoice.customer?.email;
    if (!emailTo) {
        throw new Error('No recipient email provided');
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceId);

    // Send email
    await sendEmail({
        to: emailTo,
        cc: ccEmails,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.company?.name}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1 style="color: #2563eb;">Invoice ${invoice.invoiceNumber}</h1>
        <p>Dear Customer,</p>
        ${message ? `<p>${message}</p>` : ''}
        <p>Please find your invoice attached.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> ${invoice.currency} ${invoice.totalAmount}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>${invoice.company?.name}</p>
      </div>
    `,
        attachments: [{
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
    });

    // Update invoice status
    if (invoice.status === 'draft') {
        await invoice.update({ status: 'sent', sentAt: new Date() });
    }

    logger.info(`Invoice ${invoice.invoiceNumber} sent to ${emailTo}`);
    return { sentTo: emailTo };
}

/**
 * Create recurring invoice from template
 */
async function createRecurringInvoice(templateInvoiceId, userId) {
    const templateInvoice = await Invoice.findByPk(templateInvoiceId);
    if (!templateInvoice) {
        throw new Error('Template invoice not found');
    }

    const invoiceNumber = await generateInvoiceNumber(templateInvoice.companyId);

    const newInvoice = await Invoice.create({
        invoiceNumber,
        companyId: templateInvoice.companyId,
        customerId: templateInvoice.customerId,
        lineItems: templateInvoice.lineItems,
        subtotal: templateInvoice.subtotal,
        taxRate: templateInvoice.taxRate,
        taxAmount: templateInvoice.taxAmount,
        discountRate: templateInvoice.discountRate,
        discountAmount: templateInvoice.discountAmount,
        totalAmount: templateInvoice.totalAmount,
        currency: templateInvoice.currency,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: templateInvoice.notes,
        terms: templateInvoice.terms,
        billingAddress: templateInvoice.billingAddress,
        shippingAddress: templateInvoice.shippingAddress,
        status: 'draft',
        createdBy: userId,
        isRecurring: true,
        parentInvoiceId: templateInvoiceId
    });

    logger.info(`Recurring invoice created: ${invoiceNumber} from template ${templateInvoice.invoiceNumber}`);
    return newInvoice;
}

/**
 * Get overdue invoices
 */
async function getOverdueInvoices(companyId = null) {
    const where = {
        status: { [Op.in]: ['sent', 'viewed', 'partial'] },
        dueDate: { [Op.lt]: new Date() }
    };

    if (companyId) {
        where.companyId = companyId;
    }

    const invoices = await Invoice.findAll({
        where,
        include: [
            { model: Company, as: 'customer', attributes: ['id', 'name', 'email'] }
        ],
        order: [['dueDate', 'ASC']]
    });

    return invoices;
}

/**
 * Send payment reminder
 */
async function sendPaymentReminder(invoiceId) {
    const invoice = await Invoice.findByPk(invoiceId, {
        include: [
            { model: Company, as: 'company' },
            { model: Company, as: 'customer' }
        ]
    });

    if (!invoice || !invoice.customer?.email) {
        throw new Error('Invoice or customer email not found');
    }

    const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));

    await sendEmail({
        to: invoice.customer.email,
        subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1 style="color: #dc2626;">Payment Reminder</h1>
        <p>Dear ${invoice.customer.name},</p>
        <p>This is a reminder that invoice ${invoice.invoiceNumber} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due today'}.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Amount Due:</strong> ${invoice.currency} ${invoice.totalAmount}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <p>Please make the payment at your earliest convenience to avoid any late fees.</p>
        <p>Best regards,<br>${invoice.company?.name}</p>
      </div>
    `
    });

    logger.info(`Payment reminder sent for invoice ${invoice.invoiceNumber}`);
    return true;
}

/**
 * Mark invoice as paid
 */
async function markAsPaid(invoiceId, paymentDetails = {}) {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
        throw new Error('Invoice not found');
    }

    await invoice.update({
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: paymentDetails.paymentMethod,
        paymentReference: paymentDetails.reference
    });

    logger.info(`Invoice ${invoice.invoiceNumber} marked as paid`);
    return invoice;
}

/**
 * Get invoice statistics
 */
async function getInvoiceStats(companyId, startDate, endDate) {
    const where = { companyId };
    if (startDate && endDate) {
        where.issueDate = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const [totalInvoiced, paidAmount, pendingAmount, overdueCount] = await Promise.all([
        Invoice.sum('totalAmount', { where }),
        Invoice.sum('totalAmount', { where: { ...where, status: 'paid' } }),
        Invoice.sum('totalAmount', {
            where: { ...where, status: { [Op.in]: ['sent', 'viewed', 'partial'] } }
        }),
        Invoice.count({
            where: {
                ...where,
                status: { [Op.in]: ['sent', 'viewed', 'partial'] },
                dueDate: { [Op.lt]: new Date() }
            }
        })
    ]);

    return {
        totalInvoiced: totalInvoiced || 0,
        paidAmount: paidAmount || 0,
        pendingAmount: pendingAmount || 0,
        overdueCount
    };
}

module.exports = {
    generateInvoiceNumber,
    calculateInvoiceTotals,
    createInvoice,
    generateFromShipments,
    generateInvoicePDF,
    sendInvoiceEmail,
    createRecurringInvoice,
    getOverdueInvoices,
    sendPaymentReminder,
    markAsPaid,
    getInvoiceStats
};
