/**
 * Invoice Model
 * PostgreSQL table for invoices
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { generateInvoiceNumber } = require('../../utils/validation.util');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  shipmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'shipments',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  billingAddress: {
    type: DataTypes.JSONB,
    defaultValue: {
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      gstin: ''
    }
  },
  items: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of line items'
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  taxDetails: {
    type: DataTypes.JSONB,
    defaultValue: {
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0
    }
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.JSONB,
    defaultValue: {
      type: 'fixed', // fixed or percentage
      value: 0,
      amount: 0,
      code: null
    }
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'),
    defaultValue: 'draft'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  documentUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to generated PDF'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['invoiceNumber'], unique: true },
    { fields: ['companyId'] },
    { fields: ['shipmentId'] },
    { fields: ['customerId'] },
    { fields: ['status'] },
    { fields: ['dueDate'] }
  ],
  hooks: {
    beforeCreate: (invoice) => {
      if (!invoice.invoiceNumber) {
        invoice.invoiceNumber = generateInvoiceNumber();
      }
    }
  }
});

// Instance methods
Invoice.prototype.isPaid = function() {
  return this.status === 'paid';
};

Invoice.prototype.isOverdue = function() {
  return this.status === 'pending' && new Date(this.dueDate) < new Date();
};

Invoice.prototype.calculateTotals = function() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  let discountAmount = 0;
  if (this.discount.type === 'percentage') {
    discountAmount = subtotal * (this.discount.value / 100);
  } else {
    discountAmount = this.discount.value;
  }
  
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Object.values(this.taxDetails).reduce((sum, tax) => sum + tax, 0);
  const total = taxableAmount + taxAmount;
  
  this.subtotal = subtotal;
  this.discount.amount = discountAmount;
  this.taxAmount = taxAmount;
  this.total = total;
  
  return this;
};

module.exports = Invoice;
