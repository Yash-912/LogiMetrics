/**
 * API Response Utility
 * Standardized response format
 */

/**
 * Success response
 */
function successResponse(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Error response
 */
function errorResponse(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 */
function validationErrorResponse(res, errors) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.map(err => ({
      field: err.path || err.param,
      message: err.msg || err.message
    })),
    timestamp: new Date().toISOString()
  });
}

/**
 * Paginated response
 */
function paginatedResponse(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Created response
 */
function createdResponse(res, data, message = 'Resource created successfully') {
  return successResponse(res, data, message, 201);
}

/**
 * No content response
 */
function noContentResponse(res) {
  return res.status(204).send();
}

/**
 * Unauthorized response
 */
function unauthorizedResponse(res, message = 'Unauthorized access') {
  return errorResponse(res, message, 401);
}

/**
 * Forbidden response
 */
function forbiddenResponse(res, message = 'Access forbidden') {
  return errorResponse(res, message, 403);
}

/**
 * Not found response
 */
function notFoundResponse(res, resource = 'Resource') {
  return errorResponse(res, `${resource} not found`, 404);
}

/**
 * Conflict response
 */
function conflictResponse(res, message = 'Resource already exists') {
  return errorResponse(res, message, 409);
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse
};
