const { body, query } = require('express-validator');

/**
 * Validation rules for getting dashboard analytics
 */
const getDashboardValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('period')
    .optional()
    .isIn(['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom'])
    .withMessage('Invalid period')
];

/**
 * Validation rules for getting revenue analytics
 */
const getRevenueAnalyticsValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid groupBy value'),
  
  query('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code')
];

/**
 * Validation rules for getting shipment analytics
 */
const getShipmentAnalyticsValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('status')
    .optional()
    .isIn([
      'pending',
      'confirmed',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned'
    ])
    .withMessage('Invalid status'),
  
  query('type')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'])
    .withMessage('Invalid shipment type'),
  
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'status', 'type'])
    .withMessage('Invalid groupBy value')
];

/**
 * Validation rules for getting fleet analytics
 */
const getFleetAnalyticsValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('vehicleType')
    .optional()
    .isIn(['truck', 'van', 'motorcycle', 'car', 'trailer', 'container'])
    .withMessage('Invalid vehicle type'),
  
  query('status')
    .optional()
    .isIn(['available', 'in_use', 'maintenance', 'inactive', 'retired'])
    .withMessage('Invalid status'),
  
  query('metrics')
    .optional()
    .isIn(['utilization', 'maintenance', 'fuel', 'all'])
    .withMessage('Invalid metrics value')
];

/**
 * Validation rules for getting driver analytics
 */
const getDriverAnalyticsValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  query('metrics')
    .optional()
    .isIn(['performance', 'availability', 'ratings', 'all'])
    .withMessage('Invalid metrics value'),
  
  query('topN')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Top N must be between 1 and 100')
];

/**
 * Validation rules for getting route analytics
 */
const getRouteAnalyticsValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('metrics')
    .optional()
    .isIn(['efficiency', 'distance', 'time', 'all'])
    .withMessage('Invalid metrics value')
];

/**
 * Validation rules for custom report generation
 */
const generateReportValidation = [
  body('reportType')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn([
      'revenue',
      'shipments',
      'fleet',
      'drivers',
      'routes',
      'payments',
      'custom'
    ])
    .withMessage('Invalid report type'),
  
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      return new Date(value) >= new Date(req.body.startDate);
    })
    .withMessage('End date must be after or equal to start date'),
  
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid groupBy value'),
  
  body('metrics')
    .optional()
    .isArray()
    .withMessage('Metrics must be an array'),
  
  body('format')
    .optional()
    .isIn(['json', 'csv', 'excel', 'pdf'])
    .withMessage('Invalid format'),
  
  body('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean value')
];

/**
 * Validation rules for exporting data
 */
const exportDataValidation = [
  body('dataType')
    .notEmpty()
    .withMessage('Data type is required')
    .isIn([
      'shipments',
      'vehicles',
      'drivers',
      'routes',
      'payments',
      'invoices',
      'documents'
    ])
    .withMessage('Invalid data type'),
  
  body('format')
    .notEmpty()
    .withMessage('Export format is required')
    .isIn(['csv', 'excel', 'json', 'pdf'])
    .withMessage('Invalid format'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('columns')
    .optional()
    .isArray()
    .withMessage('Columns must be an array'),
  
  body('includeHeaders')
    .optional()
    .isBoolean()
    .withMessage('Include headers must be a boolean value')
];

/**
 * Validation rules for getting KPI metrics
 */
const getKPIValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('kpis')
    .optional()
    .trim()
    .custom((value) => {
      const validKPIs = [
        'total_revenue',
        'total_shipments',
        'delivery_success_rate',
        'average_delivery_time',
        'fleet_utilization',
        'driver_performance',
        'customer_satisfaction',
        'cost_per_delivery'
      ];
      const requestedKPIs = value.split(',');
      return requestedKPIs.every(kpi => validKPIs.includes(kpi.trim()));
    })
    .withMessage('Invalid KPI requested')
];

/**
 * Validation rules for comparison reports
 */
const getComparisonValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('metric')
    .notEmpty()
    .withMessage('Metric is required')
    .isIn([
      'revenue',
      'shipments',
      'deliveries',
      'performance',
      'costs',
      'efficiency'
    ])
    .withMessage('Invalid metric'),
  
  query('period1Start')
    .notEmpty()
    .withMessage('Period 1 start date is required')
    .isISO8601()
    .withMessage('Period 1 start date must be a valid ISO 8601 date'),
  
  query('period1End')
    .notEmpty()
    .withMessage('Period 1 end date is required')
    .isISO8601()
    .withMessage('Period 1 end date must be a valid ISO 8601 date'),
  
  query('period2Start')
    .notEmpty()
    .withMessage('Period 2 start date is required')
    .isISO8601()
    .withMessage('Period 2 start date must be a valid ISO 8601 date'),
  
  query('period2End')
    .notEmpty()
    .withMessage('Period 2 end date is required')
    .isISO8601()
    .withMessage('Period 2 end date must be a valid ISO 8601 date')
];

/**
 * Validation rules for trend analysis
 */
const getTrendValidation = [
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('metric')
    .notEmpty()
    .withMessage('Metric is required')
    .isIn([
      'revenue',
      'shipments',
      'deliveries',
      'costs',
      'customer_growth',
      'fleet_size'
    ])
    .withMessage('Invalid metric'),
  
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('interval')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Invalid interval'),
  
  query('includeForecast')
    .optional()
    .isBoolean()
    .withMessage('Include forecast must be a boolean value')
];

module.exports = {
  getDashboardValidation,
  getRevenueAnalyticsValidation,
  getShipmentAnalyticsValidation,
  getFleetAnalyticsValidation,
  getDriverAnalyticsValidation,
  getRouteAnalyticsValidation,
  generateReportValidation,
  exportDataValidation,
  getKPIValidation,
  getComparisonValidation,
  getTrendValidation
};
