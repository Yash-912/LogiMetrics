/**
 * Company Service
 * Handles company operations and subscription management
 */

const { Op } = require("sequelize");
const {
  Company,
  User,
  Subscription,
  CompanySetting,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const { uploadToS3, deleteFromS3 } = require("../utils/fileUpload.util");
const { sendEmail, emailTemplates } = require("../config/email");
const logger = require("../utils/logger.util");

/**
 * Get all companies with pagination and filters
 */
async function getCompanies({
  page = 1,
  limit = 10,
  search,
  status,
  industry,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (industry) {
    where.industry = industry;
  }

  const { count, rows } = await Company.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit,
    offset,
  });

  return {
    companies: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get company by ID
 */
async function getCompanyById(companyId, includeStats = false) {
  const company = await Company.findByPk(companyId, {
    include: includeStats
      ? [{ model: User, as: "users", attributes: ["id"] }]
      : [],
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const result = company.toJSON();

  if (includeStats) {
    result.stats = {
      totalUsers: result.users?.length || 0,
    };
    delete result.users;
  }

  return result;
}

/**
 * Create a new company
 */
async function createCompany(companyData, createdBy) {
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    industry,
    website,
    taxId,
  } = companyData;

  // Check if company with same email exists
  const existingCompany = await Company.findOne({ where: { email } });
  if (existingCompany) {
    throw new Error("Company with this email already exists");
  }

  // Create company
  const company = await Company.create({
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    industry,
    website,
    taxId,
    status: "active",
    createdBy,
  });

  // Create default settings
  await createDefaultSettings(company.id);

  // Log the action
  await logCompanyAction(createdBy, "create", company.id, { name });

  return company;
}

/**
 * Update company
 */
async function updateCompany(companyId, updateData, updatedBy) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  await company.update(updateData);

  // Log the action
  await logCompanyAction(updatedBy, "update", companyId, {
    fields: Object.keys(updateData),
  });

  return company;
}

/**
 * Delete company (soft delete)
 */
async function deleteCompany(companyId, deletedBy) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  // Check if company has active users
  const activeUsers = await User.count({
    where: { companyId, status: "active" },
  });

  if (activeUsers > 0) {
    throw new Error(
      "Cannot delete company with active users. Please deactivate all users first."
    );
  }

  await company.update({
    status: "deleted",
    deletedAt: new Date(),
  });

  // Log the action
  await logCompanyAction(deletedBy, "delete", companyId, {});

  return { message: "Company deleted successfully" };
}

/**
 * Update company status
 */
async function updateCompanyStatus(companyId, status, reason, updatedBy) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  const validStatuses = ["active", "inactive", "suspended", "pending"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await company.update({
    status,
    statusReason: reason,
    statusUpdatedAt: new Date(),
  });

  // Notify company admin
  const admins = await User.findAll({
    where: { companyId, role: { [Op.in]: ["admin", "owner"] } },
  });

  for (const admin of admins) {
    try {
      await sendEmail({
        to: admin.email,
        subject: `Company Status Update - ${company.name}`,
        html: `<p>Your company status has been changed to: <strong>${status}</strong></p>${
          reason ? `<p>Reason: ${reason}</p>` : ""
        }`,
      });
    } catch (error) {
      logger.error("Failed to send status notification:", error);
    }
  }

  // Log the action
  await logCompanyAction(updatedBy, "status_change", companyId, {
    status,
    reason,
  });

  return company;
}

/**
 * Upload company logo
 */
async function uploadLogo(companyId, file, uploadedBy) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  // Delete old logo if exists
  if (company.logo) {
    try {
      await deleteFromS3(company.logo);
    } catch (error) {
      logger.error("Failed to delete old logo:", error);
    }
  }

  // Upload new logo
  const logoUrl = await uploadToS3(file, `companies/${companyId}/logo`);

  await company.update({ logo: logoUrl });

  // Log the action
  await logCompanyAction(uploadedBy, "logo_upload", companyId, {});

  return { logoUrl };
}

/**
 * Get company settings
 */
async function getCompanySettings(companyId) {
  let settings = await CompanySetting.findOne({ where: { companyId } });

  if (!settings) {
    settings = await createDefaultSettings(companyId);
  }

  return settings;
}

/**
 * Update company settings
 */
async function updateCompanySettings(companyId, settingsData, updatedBy) {
  let settings = await CompanySetting.findOne({ where: { companyId } });

  if (!settings) {
    settings = await CompanySetting.create({
      companyId,
      ...settingsData,
    });
  } else {
    await settings.update(settingsData);
  }

  // Log the action
  await logCompanyAction(updatedBy, "settings_update", companyId, {
    fields: Object.keys(settingsData),
  });

  return settings;
}

/**
 * Get company subscription
 */
async function getSubscription(companyId) {
  const subscription = await Subscription.findOne({
    where: { companyId, status: { [Op.in]: ["active", "trialing"] } },
  });

  return subscription;
}

/**
 * Update subscription
 */
async function updateSubscription(companyId, subscriptionData, updatedBy) {
  const { plan, billingCycle, paymentMethodId } = subscriptionData;

  let subscription = await Subscription.findOne({
    where: { companyId },
  });

  if (!subscription) {
    subscription = await Subscription.create({
      companyId,
      plan,
      billingCycle,
      paymentMethodId,
      status: "active",
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: calculatePeriodEnd(billingCycle),
    });
  } else {
    await subscription.update({
      plan,
      billingCycle,
      paymentMethodId,
    });
  }

  // Log the action
  await logCompanyAction(updatedBy, "subscription_update", companyId, {
    plan,
    billingCycle,
  });

  return subscription;
}

/**
 * Cancel subscription
 */
async function cancelSubscription(companyId, reason, cancelledBy) {
  const subscription = await Subscription.findOne({
    where: { companyId, status: "active" },
  });

  if (!subscription) {
    throw new Error("No active subscription found");
  }

  await subscription.update({
    status: "cancelled",
    cancelledAt: new Date(),
    cancellationReason: reason,
    cancelAtPeriodEnd: true,
  });

  // Log the action
  await logCompanyAction(cancelledBy, "subscription_cancel", companyId, {
    reason,
  });

  return subscription;
}

/**
 * Get company team members
 */
async function getTeamMembers(
  companyId,
  { page = 1, limit = 20, role, status }
) {
  const offset = (page - 1) * limit;
  const where = { companyId };

  if (role) where.role = role;
  if (status) where.status = status;

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["password", "passwordResetToken", "emailVerificationToken"],
    },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    members: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Invite team member
 */
async function inviteTeamMember(
  companyId,
  { email, role, firstName, lastName },
  invitedBy
) {
  // Check if user already exists
  let user = await User.findOne({ where: { email } });

  if (user && user.companyId === companyId) {
    throw new Error("User is already a member of this company");
  }

  if (user) {
    // Add existing user to company
    await user.update({ companyId, role });
  } else {
    // Create invitation token
    const inviteToken = require("crypto").randomBytes(32).toString("hex");
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    user = await User.create({
      email,
      firstName,
      lastName,
      companyId,
      role,
      status: "pending",
      inviteToken,
      inviteExpiry,
      invitedBy,
    });

    // Send invitation email
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
    const company = await Company.findByPk(companyId);

    await sendEmail({
      to: email,
      subject: `You've been invited to join ${company.name} on LogiMetrics`,
      html: `
        <p>Hello ${firstName},</p>
        <p>You've been invited to join <strong>${company.name}</strong> on LogiMetrics.</p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
        <p>This invitation expires in 7 days.</p>
      `,
    });
  }

  // Log the action
  await logCompanyAction(invitedBy, "invite_member", companyId, {
    email,
    role,
  });

  return user;
}

/**
 * Remove team member
 */
async function removeTeamMember(companyId, userId, removedBy) {
  const user = await User.findOne({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new Error("User not found in this company");
  }

  if (userId === removedBy) {
    throw new Error("Cannot remove yourself from the company");
  }

  await user.update({
    companyId: null,
    status: "inactive",
  });

  // Log the action
  await logCompanyAction(removedBy, "remove_member", companyId, { userId });

  return { message: "Team member removed successfully" };
}

/**
 * Get company statistics
 */
async function getCompanyStats(companyId) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  const [totalUsers, activeUsers] = await Promise.all([
    User.count({ where: { companyId } }),
    User.count({ where: { companyId, status: "active" } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    createdAt: company.createdAt,
    subscriptionPlan: company.subscriptionPlan || "free",
  };
}

// Helper functions

async function createDefaultSettings(companyId) {
  return CompanySetting.create({
    companyId,
    timezone: "UTC",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    distanceUnit: "km",
    weightUnit: "kg",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    branding: {
      primaryColor: "#2563eb",
      secondaryColor: "#1e40af",
    },
  });
}

function calculatePeriodEnd(billingCycle) {
  const now = new Date();
  if (billingCycle === "monthly") {
    return new Date(now.setMonth(now.getMonth() + 1));
  } else if (billingCycle === "yearly") {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
  return now;
}

async function logCompanyAction(actorId, action, companyId, metadata) {
  try {
    await AuditLog.create({
      userId: actorId,
      action: `company:${action}`,
      resource: "company",
      resourceId: companyId,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to log company action:", error);
  }
}

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyStatus,
  uploadLogo,
  getCompanySettings,
  updateCompanySettings,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  getCompanyStats,
};
