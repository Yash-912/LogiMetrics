const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Company, User, Role, Subscription } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { uploadToS3, deleteFromS3 } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');

/**
 * Get all companies with pagination and filters
 * @route GET /api/companies
 */
const getCompanies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { registrationNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: companies } = await Company.findAndCountAll({
      where,
      include: [
        { model: Subscription, as: 'subscription', attributes: ['id', 'plan', 'status', 'expiresAt'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Companies retrieved successfully', companies, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get company by ID
 * @route GET /api/companies/:id
 */
const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      include: [
        { model: Subscription, as: 'subscription' },
        { model: User, as: 'users', attributes: ['id', 'email', 'firstName', 'lastName', 'status'] }
      ]
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return success(res, 'Company retrieved successfully', 200, { company });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new company
 * @route POST /api/companies
 */
const createCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      name,
      type,
      email,
      phone,
      registrationNumber,
      taxId,
      website,
      address,
      city,
      state,
      country,
      postalCode,
      timezone,
      currency,
      settings
    } = req.body;

    // Check if company with same registration number exists
    if (registrationNumber) {
      const existingCompany = await Company.findOne({ where: { registrationNumber } });
      if (existingCompany) {
        throw new AppError('Company with this registration number already exists', 409);
      }
    }

    // Check if company with same email exists
    const existingEmail = await Company.findOne({ where: { email } });
    if (existingEmail) {
      throw new AppError('Company with this email already exists', 409);
    }

    const company = await Company.create({
      name,
      type,
      email,
      phone,
      registrationNumber,
      taxId,
      website,
      address,
      city,
      state,
      country,
      postalCode,
      timezone: timezone || 'UTC',
      currency: currency || 'USD',
      settings: settings || {},
      status: 'active',
      ownerId: req.user.id
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_CREATED',
      resource: 'Company',
      resourceId: company.id,
      details: { name: company.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Company created: ${company.name} by ${req.user.email}`);

    return success(res, 'Company created successfully', 201, { company });
  } catch (err) {
    next(err);
  }
};

/**
 * Update company
 * @route PUT /api/companies/:id
 */
const updateCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check registration number uniqueness
    if (updateData.registrationNumber && updateData.registrationNumber !== company.registrationNumber) {
      const existingCompany = await Company.findOne({ 
        where: { registrationNumber: updateData.registrationNumber } 
      });
      if (existingCompany) {
        throw new AppError('Registration number is already in use', 409);
      }
    }

    await company.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_UPDATED',
      resource: 'Company',
      resourceId: company.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Company updated: ${company.name} by ${req.user.email}`);

    const updatedCompany = await Company.findByPk(id, {
      include: [{ model: Subscription, as: 'subscription' }]
    });

    return success(res, 'Company updated successfully', 200, { company: updatedCompany });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete company (soft delete)
 * @route DELETE /api/companies/:id
 */
const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check if company has active users
    const activeUsers = await User.count({ 
      where: { companyId: id, status: 'active' } 
    });
    if (activeUsers > 0) {
      throw new AppError('Cannot delete company with active users. Please deactivate all users first.', 400);
    }

    await company.update({ status: 'inactive', deletedAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_DELETED',
      resource: 'Company',
      resourceId: id,
      details: { name: company.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Company deleted: ${company.name} by ${req.user.email}`);

    return success(res, 'Company deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get company settings
 * @route GET /api/companies/:id/settings
 */
const getCompanySettings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      attributes: ['id', 'name', 'settings', 'timezone', 'currency']
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return success(res, 'Company settings retrieved successfully', 200, { 
      settings: company.settings,
      timezone: company.timezone,
      currency: company.currency
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update company settings
 * @route PUT /api/companies/:id/settings
 */
const updateCompanySettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { settings, timezone, currency } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const updateData = {};
    if (settings) updateData.settings = { ...company.settings, ...settings };
    if (timezone) updateData.timezone = timezone;
    if (currency) updateData.currency = currency;

    await company.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_SETTINGS_UPDATED',
      resource: 'Company',
      resourceId: company.id,
      details: { updatedSettings: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Company settings updated successfully', 200, { 
      settings: company.settings,
      timezone: company.timezone,
      currency: company.currency
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload company logo
 * @route POST /api/companies/:id/logo
 */
const uploadLogo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Delete old logo if exists
    if (company.logoUrl) {
      try {
        await deleteFromS3(company.logoUrl);
      } catch (deleteErr) {
        logger.warn(`Failed to delete old logo: ${deleteErr.message}`);
      }
    }

    // Upload new logo
    const logoUrl = await uploadToS3(req.file, `companies/${id}/logo`);

    await company.update({ logoUrl });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_LOGO_UPLOADED',
      resource: 'Company',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Company logo uploaded successfully', 200, { logoUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * Get company subscription
 * @route GET /api/companies/:id/subscription
 */
const getSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      include: [{ model: Subscription, as: 'subscription' }]
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return success(res, 'Subscription retrieved successfully', 200, { 
      subscription: company.subscription 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update company subscription
 * @route PUT /api/companies/:id/subscription
 */
const updateSubscription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { plan, billingCycle } = req.body;

    const company = await Company.findByPk(id, {
      include: [{ model: Subscription, as: 'subscription' }]
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (!company.subscription) {
      // Create new subscription
      const subscription = await Subscription.create({
        companyId: id,
        plan,
        billingCycle: billingCycle || 'monthly',
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
      });

      return success(res, 'Subscription created successfully', 201, { subscription });
    }

    // Update existing subscription
    await company.subscription.update({ plan, billingCycle });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'SUBSCRIPTION_UPDATED',
      resource: 'Company',
      resourceId: id,
      details: { plan, billingCycle },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Subscription updated successfully', 200, { 
      subscription: company.subscription 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get company team members
 * @route GET /api/companies/:id/members
 */
const getTeamMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status, role } = req.query;

    const offset = (page - 1) * limit;
    const where = { companyId: id };

    if (status) where.status = status;
    if (role) where.roleId = role;

    const { count, rows: members } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'userRole', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Team members retrieved successfully', members, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add team member
 * @route POST /api/companies/:id/members
 */
const addTeamMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { userId, roleId } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId) {
      throw new AppError('User is already assigned to a company', 400);
    }

    await user.update({ companyId: id, roleId });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'TEAM_MEMBER_ADDED',
      resource: 'Company',
      resourceId: id,
      details: { memberId: userId, email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Team member added: ${user.email} to company ${company.name}`);

    return success(res, 'Team member added successfully', 200, { member: user });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove team member
 * @route DELETE /api/companies/:id/members/:userId
 */
const removeTeamMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== id) {
      throw new AppError('User is not a member of this company', 400);
    }

    // Check if user is company owner
    if (company.ownerId === userId) {
      throw new AppError('Cannot remove company owner from team', 400);
    }

    await user.update({ companyId: null });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'TEAM_MEMBER_REMOVED',
      resource: 'Company',
      resourceId: id,
      details: { memberId: userId, email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Team member removed: ${user.email} from company ${company.name}`);

    return success(res, 'Team member removed successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update member role
 * @route PATCH /api/companies/:id/members/:userId/role
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id, userId } = req.params;
    const { roleId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== id) {
      throw new AppError('User is not a member of this company', 400);
    }

    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new AppError('Role not found', 404);
    }

    await user.update({ roleId });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'MEMBER_ROLE_UPDATED',
      resource: 'Company',
      resourceId: id,
      details: { memberId: userId, newRole: role.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Member role updated successfully', 200, { 
      userId, 
      role: { id: role.id, name: role.name } 
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanySettings,
  updateCompanySettings,
  uploadLogo,
  getSubscription,
  updateSubscription,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole
};
