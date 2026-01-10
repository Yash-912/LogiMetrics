/**
 * AuditLog Model
 * MongoDB collection for system audit logs
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true
  },
  userEmail: {
    type: String
  },
  userRole: {
    type: String
  },
  companyId: {
    type: String,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'login_failed',
      'password_change',
      'password_reset',
      'create',
      'read',
      'update',
      'delete',
      'export',
      'import',
      'approve',
      'reject',
      'assign',
      'payment',
      'refund',
      'api_access',
      'settings_change',
      'permission_change',
      'system_event'
    ]
  },
  resource: {
    type: String,
    required: true,
    comment: 'The type of resource affected (user, shipment, vehicle, etc.)'
  },
  resourceId: {
    type: String,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  requestPath: {
    type: String
  },
  statusCode: {
    type: Number
  },
  responseTime: {
    type: Number,
    comment: 'Response time in milliseconds'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });

// TTL index - keep audit logs for 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods
auditLogSchema.statics.log = async function(data) {
  const log = new this(data);
  return log.save();
};

auditLogSchema.statics.getUserActivity = async function(userId, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.getResourceHistory = async function(resource, resourceId) {
  return this.find({ resource, resourceId })
    .sort({ timestamp: -1 });
};

auditLogSchema.statics.getSecurityEvents = async function(companyId, days = 7) {
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    companyId,
    action: { $in: ['login', 'logout', 'login_failed', 'password_change', 'password_reset', 'permission_change'] },
    timestamp: { $gte: startTime }
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getActivitySummary = async function(companyId, days = 30) {
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.aggregate([
    {
      $match: {
        companyId,
        timestamp: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          resource: '$resource'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
