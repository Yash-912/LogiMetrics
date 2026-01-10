const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Invoice, Shipment, Company, Transaction } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { generatePDF } = require('../utils/pdf.util');
const { sendEmail } = require('../config/email');
const logger = require('../utils/logger.util');

/**
 * Get all invoices with pagination and filters
 * @route GET /api/invoices
 */
const getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      companyId,
      customerId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.issueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: `%${search}%` } },
        { referenceNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== 'admin' && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Company, as: 'customer', attributes: ['id', 'name', 'email'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Invoices retrieved successfully', invoices, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get invoice by ID
 * @route GET /api/invoices/:id
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'customer' },
        { model: Shipment, as: 'shipments' },
        { model: Transaction, as: 'transactions' }
      ]
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return success(res, 'Invoice retrieved successfully', 200, { invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Get invoice by number
 * @route GET /api/invoices/number/:invoiceNumber
 */
const getInvoiceByNumber = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await Invoice.findOne({
      where: { invoiceNumber },
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'customer' },
        { model: Shipment, as: 'shipments' }
      ]
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return success(res, 'Invoice retrieved successfully', 200, { invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new invoice
 * @route POST /api/invoices
 */
const createInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      customerId,
      shipmentIds,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      totalAmount,
      currency,
      issueDate,
      dueDate,
      notes,
      terms,
      billingAddress,
      shippingAddress
    } = req.body;

    // Generate invoice number
    const lastInvoice = await Invoice.findOne({
      where: { companyId: req.user.companyId },
      order: [['createdAt', 'DESC']]
    });

    const lastNumber = lastInvoice 
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) 
      : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      companyId: req.user.companyId,
      customerId,
      lineItems: lineItems || [],
      subtotal,
      taxRate: taxRate || 0,
      taxAmount: taxAmount || 0,
      discountRate: discountRate || 0,
      discountAmount: discountAmount || 0,
      totalAmount,
      currency: currency || 'USD',
      issueDate: issueDate || new Date(),
      dueDate,
      notes,
      terms,
      billingAddress,
      shippingAddress,
      status: 'draft',
      createdBy: req.user.id
    });

    // Associate shipments if provided
    if (shipmentIds && shipmentIds.length > 0) {
      await Shipment.update(
        { invoiceId: invoice.id },
        { where: { id: { [Op.in]: shipmentIds } } }
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_CREATED',
      resource: 'Invoice',
      resourceId: invoice.id,
      details: { invoiceNumber, totalAmount },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Invoice created: ${invoiceNumber} by ${req.user.email}`);

    const createdInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Company, as: 'customer' },
        { model: Shipment, as: 'shipments' }
      ]
    });

    return success(res, 'Invoice created successfully', 201, { invoice: createdInvoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Update invoice
 * @route PUT /api/invoices/:id
 */
const updateInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Only draft and sent invoices can be updated
    if (!['draft', 'sent'].includes(invoice.status)) {
      throw new AppError(`Cannot update invoice with status: ${invoice.status}`, 400);
    }

    // Remove fields that shouldn't be updated
    delete updateData.invoiceNumber;
    delete updateData.companyId;
    delete updateData.status;

    await invoice.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_UPDATED',
      resource: 'Invoice',
      resourceId: invoice.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const updatedInvoice = await Invoice.findByPk(id, {
      include: [{ model: Company, as: 'customer' }]
    });

    return success(res, 'Invoice updated successfully', 200, { invoice: updatedInvoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete invoice
 * @route DELETE /api/invoices/:id
 */
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Only draft invoices can be deleted
    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be deleted', 400);
    }

    const invoiceNumber = invoice.invoiceNumber;

    // Remove invoice association from shipments
    await Shipment.update(
      { invoiceId: null },
      { where: { invoiceId: id } }
    );

    await invoice.destroy();

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_DELETED',
      resource: 'Invoice',
      resourceId: id,
      details: { invoiceNumber },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Invoice deleted: ${invoiceNumber} by ${req.user.email}`);

    return success(res, 'Invoice deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update invoice status
 * @route PATCH /api/invoices/:id/status
 */
const updateInvoiceStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Validate status transition
    const validTransitions = {
      draft: ['sent', 'cancelled'],
      sent: ['viewed', 'paid', 'partial', 'overdue', 'cancelled'],
      viewed: ['paid', 'partial', 'overdue', 'cancelled'],
      partial: ['paid', 'overdue', 'cancelled'],
      overdue: ['paid', 'partial', 'cancelled', 'written_off']
    };

    if (!validTransitions[invoice.status]?.includes(status)) {
      throw new AppError(`Invalid status transition from ${invoice.status} to ${status}`, 400);
    }

    const previousStatus = invoice.status;
    await invoice.update({ status });

    // Set paid date if status is paid
    if (status === 'paid') {
      await invoice.update({ paidAt: new Date() });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_STATUS_CHANGED',
      resource: 'Invoice',
      resourceId: id,
      details: { previousStatus, newStatus: status, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Invoice status updated successfully', 200, { status });
  } catch (err) {
    next(err);
  }
};

/**
 * Send invoice to customer
 * @route POST /api/invoices/:id/send
 */
const sendInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail, message, ccEmails } = req.body;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'customer' }
      ]
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!['draft', 'sent'].includes(invoice.status)) {
      throw new AppError('Invoice cannot be sent in current status', 400);
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Send email
    const emailTo = recipientEmail || invoice.customer?.email;
    if (!emailTo) {
      throw new AppError('No recipient email provided', 400);
    }

    await sendEmail({
      to: emailTo,
      cc: ccEmails,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.company.name}`,
      template: 'invoice',
      context: {
        invoiceNumber: invoice.invoiceNumber,
        companyName: invoice.company.name,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        message
      },
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

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_SENT',
      resource: 'Invoice',
      resourceId: id,
      details: { sentTo: emailTo },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Invoice ${invoice.invoiceNumber} sent to ${emailTo}`);

    return success(res, 'Invoice sent successfully', 200, { sentTo: emailTo });
  } catch (err) {
    next(err);
  }
};

/**
 * Download invoice PDF
 * @route GET /api/invoices/:id/pdf
 */
const downloadInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'customer' },
        { model: Shipment, as: 'shipments' }
      ]
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Preview invoice PDF
 * @route GET /api/invoices/:id/preview
 */
const previewInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'customer' },
        { model: Shipment, as: 'shipments' }
      ]
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Mark invoice as viewed
 * @route POST /api/invoices/:id/view
 */
const markAsViewed = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'sent') {
      await invoice.update({ status: 'viewed', viewedAt: new Date() });
    }

    return success(res, 'Invoice marked as viewed', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Add line item to invoice
 * @route POST /api/invoices/:id/items
 */
const addLineItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { description, quantity, unitPrice, taxRate, discount } = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!['draft', 'sent'].includes(invoice.status)) {
      throw new AppError('Cannot modify invoice in current status', 400);
    }

    const lineItems = invoice.lineItems || [];
    const newItem = {
      id: Date.now().toString(),
      description,
      quantity,
      unitPrice,
      taxRate: taxRate || 0,
      discount: discount || 0,
      total: quantity * unitPrice * (1 - (discount || 0) / 100)
    };

    lineItems.push(newItem);

    // Recalculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const discountAmount = subtotal * (invoice.discountRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    await invoice.update({
      lineItems,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount
    });

    return success(res, 'Line item added successfully', 200, { 
      lineItem: newItem,
      invoice: await Invoice.findByPk(id)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove line item from invoice
 * @route DELETE /api/invoices/:id/items/:itemId
 */
const removeLineItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!['draft', 'sent'].includes(invoice.status)) {
      throw new AppError('Cannot modify invoice in current status', 400);
    }

    const lineItems = invoice.lineItems.filter(item => item.id !== itemId);

    // Recalculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const discountAmount = subtotal * (invoice.discountRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    await invoice.update({
      lineItems,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount
    });

    return success(res, 'Line item removed successfully', 200, { 
      invoice: await Invoice.findByPk(id)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Duplicate invoice
 * @route POST /api/invoices/:id/duplicate
 */
const duplicateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const originalInvoice = await Invoice.findByPk(id);
    if (!originalInvoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Generate new invoice number
    const lastInvoice = await Invoice.findOne({
      where: { companyId: req.user.companyId },
      order: [['createdAt', 'DESC']]
    });

    const lastNumber = lastInvoice 
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) 
      : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;

    const newInvoice = await Invoice.create({
      invoiceNumber,
      companyId: originalInvoice.companyId,
      customerId: originalInvoice.customerId,
      lineItems: originalInvoice.lineItems,
      subtotal: originalInvoice.subtotal,
      taxRate: originalInvoice.taxRate,
      taxAmount: originalInvoice.taxAmount,
      discountRate: originalInvoice.discountRate,
      discountAmount: originalInvoice.discountAmount,
      totalAmount: originalInvoice.totalAmount,
      currency: originalInvoice.currency,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      notes: originalInvoice.notes,
      terms: originalInvoice.terms,
      billingAddress: originalInvoice.billingAddress,
      shippingAddress: originalInvoice.shippingAddress,
      status: 'draft',
      createdBy: req.user.id
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_DUPLICATED',
      resource: 'Invoice',
      resourceId: newInvoice.id,
      details: { originalInvoiceId: id, newInvoiceNumber: invoiceNumber },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Invoice duplicated successfully', 201, { invoice: newInvoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate invoice from shipments
 * @route POST /api/invoices/generate
 */
const generateFromShipments = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { shipmentIds, customerId, dueDate, notes } = req.body;

    // Get shipments
    const shipments = await Shipment.findAll({
      where: { id: { [Op.in]: shipmentIds }, invoiceId: null }
    });

    if (shipments.length === 0) {
      throw new AppError('No uninvoiced shipments found', 400);
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

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    // Generate invoice number
    const lastInvoice = await Invoice.findOne({
      where: { companyId: req.user.companyId },
      order: [['createdAt', 'DESC']]
    });

    const lastNumber = lastInvoice 
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) 
      : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      companyId: req.user.companyId,
      customerId,
      lineItems,
      subtotal,
      totalAmount: subtotal,
      currency: 'USD',
      issueDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes,
      status: 'draft',
      createdBy: req.user.id
    });

    // Associate shipments with invoice
    await Shipment.update(
      { invoiceId: invoice.id },
      { where: { id: { [Op.in]: shipmentIds } } }
    );

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_GENERATED',
      resource: 'Invoice',
      resourceId: invoice.id,
      details: { invoiceNumber, shipmentCount: shipments.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Invoice generated: ${invoiceNumber} from ${shipments.length} shipments`);

    return success(res, 'Invoice generated successfully', 201, { invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to generate invoice PDF
 */
const generateInvoicePDF = async (invoice) => {
  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    company: {
      name: invoice.company?.name,
      address: invoice.company?.address,
      email: invoice.company?.email,
      phone: invoice.company?.phone
    },
    customer: {
      name: invoice.customer?.name,
      address: invoice.billingAddress || invoice.customer?.address,
      email: invoice.customer?.email
    },
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    discountRate: invoice.discountRate,
    discountAmount: invoice.discountAmount,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    notes: invoice.notes,
    terms: invoice.terms
  };

  return generatePDF('invoice', pdfData);
};

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  sendInvoice,
  downloadInvoicePDF,
  previewInvoicePDF,
  markAsViewed,
  addLineItem,
  removeLineItem,
  duplicateInvoice,
  generateFromShipments
};
