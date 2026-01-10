const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { companyValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, checkPermission } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/companies
 * @desc    Get all companies with pagination
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authorize(['admin']),
  companyValidator.getCompanies,
  validate,
  companyController.getCompanies
);

/**
 * @route   GET /api/companies/:id
 * @desc    Get company by ID
 * @access  Private (Admin or company member)
 */
router.get(
  '/:id',
  companyValidator.getCompanyById,
  validate,
  companyController.getCompanyById
);

/**
 * @route   POST /api/companies
 * @desc    Create a new company
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize(['admin']),
  companyValidator.createCompany,
  validate,
  companyController.createCompany
);

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company by ID
 * @access  Private (Admin, Company Owner)
 */
router.put(
  '/:id',
  authorize(['admin', 'company_owner']),
  companyValidator.updateCompany,
  validate,
  companyController.updateCompany
);

/**
 * @route   DELETE /api/companies/:id
 * @desc    Delete company by ID
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  companyValidator.getCompanyById,
  validate,
  companyController.deleteCompany
);

/**
 * @route   GET /api/companies/:id/settings
 * @desc    Get company settings
 * @access  Private (Admin, Company Owner, Manager)
 */
router.get(
  '/:id/settings',
  authorize(['admin', 'company_owner', 'manager']),
  companyValidator.getCompanyById,
  validate,
  companyController.getCompanySettings
);

/**
 * @route   PUT /api/companies/:id/settings
 * @desc    Update company settings
 * @access  Private (Admin, Company Owner)
 */
router.put(
  '/:id/settings',
  authorize(['admin', 'company_owner']),
  companyValidator.updateSettings,
  validate,
  companyController.updateCompanySettings
);

/**
 * @route   POST /api/companies/:id/logo
 * @desc    Upload company logo
 * @access  Private (Admin, Company Owner)
 */
router.post(
  '/:id/logo',
  authorize(['admin', 'company_owner']),
  uploadSingle('logo'),
  companyController.uploadLogo
);

/**
 * @route   GET /api/companies/:id/subscription
 * @desc    Get company subscription details
 * @access  Private (Admin, Company Owner)
 */
router.get(
  '/:id/subscription',
  authorize(['admin', 'company_owner']),
  companyValidator.getCompanyById,
  validate,
  companyController.getSubscription
);

/**
 * @route   PUT /api/companies/:id/subscription
 * @desc    Update company subscription
 * @access  Private (Admin)
 */
router.put(
  '/:id/subscription',
  authorize(['admin']),
  companyValidator.updateSubscription,
  validate,
  companyController.updateSubscription
);

/**
 * @route   GET /api/companies/:id/team
 * @desc    Get company team members
 * @access  Private (Admin, Company Owner, Manager)
 */
router.get(
  '/:id/team',
  authorize(['admin', 'company_owner', 'manager']),
  companyValidator.getCompanyById,
  validate,
  companyController.getTeamMembers
);

/**
 * @route   POST /api/companies/:id/team
 * @desc    Add team member to company
 * @access  Private (Admin, Company Owner)
 */
router.post(
  '/:id/team',
  authorize(['admin', 'company_owner']),
  companyValidator.addTeamMember,
  validate,
  companyController.addTeamMember
);

/**
 * @route   DELETE /api/companies/:id/team/:userId
 * @desc    Remove team member from company
 * @access  Private (Admin, Company Owner)
 */
router.delete(
  '/:id/team/:userId',
  authorize(['admin', 'company_owner']),
  companyValidator.removeTeamMember,
  validate,
  companyController.removeTeamMember
);

/**
 * @route   PUT /api/companies/:id/team/:userId/role
 * @desc    Update team member role
 * @access  Private (Admin, Company Owner)
 */
router.put(
  '/:id/team/:userId/role',
  authorize(['admin', 'company_owner']),
  companyValidator.updateMemberRole,
  validate,
  companyController.updateMemberRole
);

module.exports = router;
