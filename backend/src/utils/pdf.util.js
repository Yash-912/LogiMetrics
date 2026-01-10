/**
 * PDF Utility
 * PDF generation for invoices and reports
 */

const PDFDocument = require('pdfkit');
const logger = require('./logger.util');

/**
 * Generate invoice PDF
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoicePDF(invoice, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc
        .fontSize(20)
        .text(company?.name || 'LogiMetrics', 50, 50)
        .fontSize(10)
        .text(company?.address || '', 50, 75)
        .text(company?.phone || '', 50, 90)
        .text(company?.email || '', 50, 105);

      // Invoice Title
      doc
        .fontSize(20)
        .text('INVOICE', 400, 50, { align: 'right' })
        .fontSize(10)
        .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 75, { align: 'right' })
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 90, { align: 'right' })
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 105, { align: 'right' });

      // Divider
      doc
        .moveTo(50, 130)
        .lineTo(550, 130)
        .stroke();

      // Bill To
      doc
        .fontSize(12)
        .text('Bill To:', 50, 150)
        .fontSize(10)
        .text(invoice.customerName || 'Customer', 50, 170)
        .text(invoice.customerAddress || '', 50, 185)
        .text(invoice.customerEmail || '', 50, 200);

      // Items Header
      const tableTop = 250;
      doc
        .fontSize(10)
        .text('Description', 50, tableTop)
        .text('Qty', 280, tableTop, { width: 50, align: 'center' })
        .text('Rate', 350, tableTop, { width: 80, align: 'right' })
        .text('Amount', 450, tableTop, { width: 80, align: 'right' });

      // Divider
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Items
      let y = tableTop + 30;
      const items = invoice.items || [];
      
      items.forEach((item) => {
        doc
          .text(item.description || 'Service', 50, y, { width: 220 })
          .text(item.quantity?.toString() || '1', 280, y, { width: 50, align: 'center' })
          .text(`₹${(item.rate || 0).toFixed(2)}`, 350, y, { width: 80, align: 'right' })
          .text(`₹${(item.amount || 0).toFixed(2)}`, 450, y, { width: 80, align: 'right' });
        y += 20;
      });

      // Totals
      y += 20;
      doc
        .moveTo(350, y)
        .lineTo(550, y)
        .stroke();

      y += 10;
      doc
        .text('Subtotal:', 350, y, { width: 80, align: 'right' })
        .text(`₹${(invoice.subtotal || 0).toFixed(2)}`, 450, y, { width: 80, align: 'right' });

      if (invoice.taxAmount) {
        y += 20;
        doc
          .text(`Tax (${invoice.taxRate || 18}%):`, 350, y, { width: 80, align: 'right' })
          .text(`₹${invoice.taxAmount.toFixed(2)}`, 450, y, { width: 80, align: 'right' });
      }

      if (invoice.discount) {
        y += 20;
        doc
          .text('Discount:', 350, y, { width: 80, align: 'right' })
          .text(`-₹${invoice.discount.toFixed(2)}`, 450, y, { width: 80, align: 'right' });
      }

      y += 25;
      doc
        .fontSize(12)
        .text('Total:', 350, y, { width: 80, align: 'right' })
        .text(`₹${(invoice.totalAmount || 0).toFixed(2)}`, 450, y, { width: 80, align: 'right' });

      // Payment Status
      y += 40;
      const statusColor = invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange';
      doc
        .fontSize(14)
        .fillColor(statusColor)
        .text(`Status: ${(invoice.status || 'pending').toUpperCase()}`, 50, y)
        .fillColor('black');

      // Footer
      doc
        .fontSize(8)
        .text('Thank you for your business!', 50, 700, { align: 'center' })
        .text('For any queries, please contact support@logimetrics.com', 50, 715, { align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('PDF generation error:', error);
      reject(error);
    }
  });
}

/**
 * Generate report PDF
 * @param {Object} reportData - Report data
 * @param {string} reportTitle - Report title
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateReportPDF(reportData, reportTitle = 'Report') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc
        .fontSize(24)
        .text(reportTitle, { align: 'center' })
        .fontSize(10)
        .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
        .moveDown(2);

      // Content
      if (reportData.summary) {
        doc.fontSize(14).text('Summary', { underline: true }).moveDown(0.5);
        Object.entries(reportData.summary).forEach(([key, value]) => {
          doc.fontSize(10).text(`${formatKey(key)}: ${value}`);
        });
        doc.moveDown();
      }

      if (reportData.data && Array.isArray(reportData.data)) {
        doc.fontSize(14).text('Details', { underline: true }).moveDown(0.5);
        reportData.data.forEach((item, index) => {
          doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(item)}`);
        });
      }

      doc.end();
    } catch (error) {
      logger.error('Report PDF generation error:', error);
      reject(error);
    }
  });
}

/**
 * Generate shipment label PDF
 * @param {Object} shipment - Shipment data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateShipmentLabelPDF(shipment) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: [288, 432], // 4x6 inches in points
        margin: 20 
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Logo/Header
      doc
        .fontSize(16)
        .text('LogiMetrics', { align: 'center' })
        .moveDown(0.5);

      // Tracking Number
      doc
        .fontSize(12)
        .text(`Tracking: ${shipment.trackingNumber}`, { align: 'center' })
        .moveDown();

      // Barcode placeholder (you'd use a barcode library in production)
      doc
        .rect(44, doc.y, 200, 40)
        .stroke()
        .fontSize(8)
        .text('BARCODE', 44, doc.y - 25, { width: 200, align: 'center' })
        .moveDown(2);

      // From
      doc
        .fontSize(10)
        .text('FROM:', { underline: true })
        .fontSize(9)
        .text(shipment.senderName || 'Sender')
        .text(shipment.pickupAddress || 'Pickup Address')
        .moveDown();

      // To
      doc
        .fontSize(10)
        .text('TO:', { underline: true })
        .fontSize(9)
        .text(shipment.receiverName || 'Receiver')
        .text(shipment.deliveryAddress || 'Delivery Address')
        .moveDown();

      // Details
      doc
        .fontSize(8)
        .text(`Weight: ${shipment.weight || 'N/A'} kg`)
        .text(`Type: ${shipment.type || 'Standard'}`)
        .text(`Date: ${new Date().toLocaleDateString()}`);

      doc.end();
    } catch (error) {
      logger.error('Shipment label PDF generation error:', error);
      reject(error);
    }
  });
}

/**
 * Format key for display
 */
function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

module.exports = {
  generateInvoicePDF,
  generateReportPDF,
  generateShipmentLabelPDF
};
