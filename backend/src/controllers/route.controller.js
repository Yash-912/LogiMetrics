const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Route, Shipment, Driver, Vehicle, Waypoint } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { calculateDistance, optimizeRoute, estimateDeliveryTime } = require('../utils/calculations.util');
const { getMapsClient } = require('../config/maps');
const logger = require('../utils/logger.util');

/**
 * Get all routes with pagination and filters
 * @route GET /api/routes
 */
const getRoutes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      driverId,
      vehicleId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (driverId) where.driverId = driverId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate && endDate) {
      where.scheduledDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { routeNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== 'admin' && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const { count, rows: routes } = await Route.findAndCountAll({
      where,
      include: [
        { model: Driver, as: 'driver', attributes: ['id', 'firstName', 'lastName'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'licensePlate', 'type'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Routes retrieved successfully', routes, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get route by ID
 * @route GET /api/routes/:id
 */
const getRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await Route.findByPk(id, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Vehicle, as: 'vehicle' },
        { model: Shipment, as: 'shipments' },
        { model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }
      ]
    });

    if (!route) {
      throw new AppError('Route not found', 404);
    }

    return success(res, 'Route retrieved successfully', 200, { route });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new route
 * @route POST /api/routes
 */
const createRoute = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      name,
      scheduledDate,
      driverId,
      vehicleId,
      startAddress,
      startLatitude,
      startLongitude,
      endAddress,
      endLatitude,
      endLongitude,
      shipmentIds,
      waypoints,
      notes,
      priority
    } = req.body;

    // Generate route number
    const routeNumber = `RT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate total distance and estimated duration
    let totalDistance = 0;
    let estimatedDuration = 0;

    if (startLatitude && startLongitude && endLatitude && endLongitude) {
      totalDistance = calculateDistance(startLatitude, startLongitude, endLatitude, endLongitude);
      estimatedDuration = estimateDeliveryTime(totalDistance, 'standard');
    }

    const route = await Route.create({
      routeNumber,
      name,
      scheduledDate,
      driverId,
      vehicleId,
      companyId: req.user.companyId,
      startAddress,
      startLatitude,
      startLongitude,
      endAddress,
      endLatitude,
      endLongitude,
      totalDistance,
      estimatedDuration,
      notes,
      priority: priority || 'normal',
      status: 'planned',
      createdBy: req.user.id
    });

    // Add waypoints if provided
    if (waypoints && waypoints.length > 0) {
      const waypointRecords = waypoints.map((wp, index) => ({
        routeId: route.id,
        sequence: index + 1,
        address: wp.address,
        latitude: wp.latitude,
        longitude: wp.longitude,
        type: wp.type || 'stop',
        estimatedArrival: wp.estimatedArrival,
        notes: wp.notes
      }));

      await Waypoint.bulkCreate(waypointRecords);
    }

    // Associate shipments with route
    if (shipmentIds && shipmentIds.length > 0) {
      await Shipment.update(
        { routeId: route.id },
        { where: { id: { [Op.in]: shipmentIds } } }
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_CREATED',
      resource: 'Route',
      resourceId: route.id,
      details: { routeNumber, shipmentCount: shipmentIds?.length || 0 },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Route created: ${routeNumber} by ${req.user.email}`);

    // Fetch complete route with associations
    const createdRoute = await Route.findByPk(route.id, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Vehicle, as: 'vehicle' },
        { model: Shipment, as: 'shipments' },
        { model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }
      ]
    });

    return success(res, 'Route created successfully', 201, { route: createdRoute });
  } catch (err) {
    next(err);
  }
};

/**
 * Update route
 * @route PUT /api/routes/:id
 */
const updateRoute = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    // Prevent updates to completed or in-progress routes
    if (['completed', 'in_progress'].includes(route.status)) {
      throw new AppError(`Cannot update ${route.status} route`, 400);
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.routeNumber;
    delete updateData.companyId;
    delete updateData.status;

    await route.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_UPDATED',
      resource: 'Route',
      resourceId: route.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Route updated: ${route.routeNumber} by ${req.user.email}`);

    const updatedRoute = await Route.findByPk(id, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Vehicle, as: 'vehicle' },
        { model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }
      ]
    });

    return success(res, 'Route updated successfully', 200, { route: updatedRoute });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete route
 * @route DELETE /api/routes/:id
 */
const deleteRoute = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    // Can only delete planned routes
    if (route.status !== 'planned') {
      throw new AppError('Only planned routes can be deleted', 400);
    }

    const routeNumber = route.routeNumber;

    // Remove route association from shipments
    await Shipment.update(
      { routeId: null },
      { where: { routeId: id } }
    );

    // Delete waypoints
    await Waypoint.destroy({ where: { routeId: id } });

    // Delete route
    await route.destroy();

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_DELETED',
      resource: 'Route',
      resourceId: id,
      details: { routeNumber },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Route deleted: ${routeNumber} by ${req.user.email}`);

    return success(res, 'Route deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update route status
 * @route PATCH /api/routes/:id/status
 */
const updateRouteStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    // Validate status transition
    const validTransitions = {
      planned: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'delayed'],
      delayed: ['in_progress', 'completed']
    };

    if (!validTransitions[route.status]?.includes(status)) {
      throw new AppError(`Invalid status transition from ${route.status} to ${status}`, 400);
    }

    const updateData = { status };

    // Set timestamps based on status
    switch (status) {
      case 'in_progress':
        updateData.startedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        break;
    }

    await route.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_STATUS_CHANGED',
      resource: 'Route',
      resourceId: id,
      details: { previousStatus: route.status, newStatus: status, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Route ${route.routeNumber} status changed to ${status}`);

    return success(res, 'Route status updated successfully', 200, { status });
  } catch (err) {
    next(err);
  }
};

/**
 * Add waypoint to route
 * @route POST /api/routes/:id/waypoints
 */
const addWaypoint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { address, latitude, longitude, type, estimatedArrival, notes, sequence } = req.body;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    if (route.status !== 'planned') {
      throw new AppError('Can only add waypoints to planned routes', 400);
    }

    // Get current max sequence
    const maxSequence = await Waypoint.max('sequence', { where: { routeId: id } }) || 0;

    const waypoint = await Waypoint.create({
      routeId: id,
      sequence: sequence || maxSequence + 1,
      address,
      latitude,
      longitude,
      type: type || 'stop',
      estimatedArrival,
      notes,
      status: 'pending'
    });

    // Recalculate route distance
    await recalculateRouteMetrics(id);

    return success(res, 'Waypoint added successfully', 201, { waypoint });
  } catch (err) {
    next(err);
  }
};

/**
 * Update waypoint
 * @route PUT /api/routes/:id/waypoints/:waypointId
 */
const updateWaypoint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id, waypointId } = req.params;
    const updateData = req.body;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const waypoint = await Waypoint.findOne({
      where: { id: waypointId, routeId: id }
    });

    if (!waypoint) {
      throw new AppError('Waypoint not found', 404);
    }

    await waypoint.update(updateData);

    // Recalculate route metrics if location changed
    if (updateData.latitude || updateData.longitude) {
      await recalculateRouteMetrics(id);
    }

    return success(res, 'Waypoint updated successfully', 200, { waypoint });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove waypoint from route
 * @route DELETE /api/routes/:id/waypoints/:waypointId
 */
const removeWaypoint = async (req, res, next) => {
  try {
    const { id, waypointId } = req.params;

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    if (route.status !== 'planned') {
      throw new AppError('Can only remove waypoints from planned routes', 400);
    }

    const waypoint = await Waypoint.findOne({
      where: { id: waypointId, routeId: id }
    });

    if (!waypoint) {
      throw new AppError('Waypoint not found', 404);
    }

    await waypoint.destroy();

    // Resequence remaining waypoints
    const remainingWaypoints = await Waypoint.findAll({
      where: { routeId: id },
      order: [['sequence', 'ASC']]
    });

    for (let i = 0; i < remainingWaypoints.length; i++) {
      await remainingWaypoints[i].update({ sequence: i + 1 });
    }

    // Recalculate route metrics
    await recalculateRouteMetrics(id);

    return success(res, 'Waypoint removed successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder waypoints
 * @route PUT /api/routes/:id/waypoints/reorder
 */
const reorderWaypoints = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { waypointOrder } = req.body; // Array of waypoint IDs in new order

    const route = await Route.findByPk(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    if (route.status !== 'planned') {
      throw new AppError('Can only reorder waypoints for planned routes', 400);
    }

    // Update sequence for each waypoint
    for (let i = 0; i < waypointOrder.length; i++) {
      await Waypoint.update(
        { sequence: i + 1 },
        { where: { id: waypointOrder[i], routeId: id } }
      );
    }

    // Recalculate route metrics
    await recalculateRouteMetrics(id);

    const waypoints = await Waypoint.findAll({
      where: { routeId: id },
      order: [['sequence', 'ASC']]
    });

    return success(res, 'Waypoints reordered successfully', 200, { waypoints });
  } catch (err) {
    next(err);
  }
};

/**
 * Optimize route
 * @route POST /api/routes/:id/optimize
 */
const optimizeRouteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { optimizationType = 'distance' } = req.body; // 'distance' or 'time'

    const route = await Route.findByPk(id, {
      include: [{ model: Waypoint, as: 'waypoints' }]
    });

    if (!route) {
      throw new AppError('Route not found', 404);
    }

    if (route.status !== 'planned') {
      throw new AppError('Can only optimize planned routes', 400);
    }

    if (!route.waypoints || route.waypoints.length < 2) {
      throw new AppError('Route needs at least 2 waypoints to optimize', 400);
    }

    // Get optimized order using external maps API or local algorithm
    const waypoints = route.waypoints.map(wp => ({
      id: wp.id,
      latitude: wp.latitude,
      longitude: wp.longitude
    }));

    const optimizedOrder = await optimizeRoute(waypoints, {
      startPoint: { latitude: route.startLatitude, longitude: route.startLongitude },
      endPoint: { latitude: route.endLatitude, longitude: route.endLongitude },
      optimizationType
    });

    // Update waypoint sequences
    for (let i = 0; i < optimizedOrder.length; i++) {
      await Waypoint.update(
        { sequence: i + 1, estimatedArrival: optimizedOrder[i].estimatedArrival },
        { where: { id: optimizedOrder[i].id } }
      );
    }

    // Recalculate route metrics
    await recalculateRouteMetrics(id);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_OPTIMIZED',
      resource: 'Route',
      resourceId: id,
      details: { optimizationType },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const optimizedRoute = await Route.findByPk(id, {
      include: [
        { model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }
      ]
    });

    return success(res, 'Route optimized successfully', 200, { route: optimizedRoute });
  } catch (err) {
    next(err);
  }
};

/**
 * Get route directions
 * @route GET /api/routes/:id/directions
 */
const getDirections = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await Route.findByPk(id, {
      include: [
        { model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }
      ]
    });

    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const mapsClient = getMapsClient();
    
    // Build waypoints array for directions API
    const waypoints = route.waypoints.map(wp => ({
      latitude: wp.latitude,
      longitude: wp.longitude
    }));

    const directions = await mapsClient.getDirections({
      origin: { latitude: route.startLatitude, longitude: route.startLongitude },
      destination: { latitude: route.endLatitude, longitude: route.endLongitude },
      waypoints
    });

    return success(res, 'Route directions retrieved successfully', 200, { directions });
  } catch (err) {
    next(err);
  }
};

/**
 * Clone route
 * @route POST /api/routes/:id/clone
 */
const cloneRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledDate, name } = req.body;

    const originalRoute = await Route.findByPk(id, {
      include: [{ model: Waypoint, as: 'waypoints' }]
    });

    if (!originalRoute) {
      throw new AppError('Route not found', 404);
    }

    // Generate new route number
    const routeNumber = `RT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Clone route
    const clonedRoute = await Route.create({
      routeNumber,
      name: name || `${originalRoute.name} (Copy)`,
      scheduledDate: scheduledDate || originalRoute.scheduledDate,
      companyId: req.user.companyId,
      startAddress: originalRoute.startAddress,
      startLatitude: originalRoute.startLatitude,
      startLongitude: originalRoute.startLongitude,
      endAddress: originalRoute.endAddress,
      endLatitude: originalRoute.endLatitude,
      endLongitude: originalRoute.endLongitude,
      totalDistance: originalRoute.totalDistance,
      estimatedDuration: originalRoute.estimatedDuration,
      notes: originalRoute.notes,
      priority: originalRoute.priority,
      status: 'planned',
      createdBy: req.user.id
    });

    // Clone waypoints
    if (originalRoute.waypoints && originalRoute.waypoints.length > 0) {
      const waypointRecords = originalRoute.waypoints.map(wp => ({
        routeId: clonedRoute.id,
        sequence: wp.sequence,
        address: wp.address,
        latitude: wp.latitude,
        longitude: wp.longitude,
        type: wp.type,
        estimatedArrival: wp.estimatedArrival,
        notes: wp.notes
      }));

      await Waypoint.bulkCreate(waypointRecords);
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'ROUTE_CLONED',
      resource: 'Route',
      resourceId: clonedRoute.id,
      details: { originalRouteId: id, newRouteNumber: routeNumber },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const fullClonedRoute = await Route.findByPk(clonedRoute.id, {
      include: [{ model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }]
    });

    return success(res, 'Route cloned successfully', 201, { route: fullClonedRoute });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to recalculate route metrics
 */
const recalculateRouteMetrics = async (routeId) => {
  const route = await Route.findByPk(routeId, {
    include: [{ model: Waypoint, as: 'waypoints', order: [['sequence', 'ASC']] }]
  });

  if (!route) return;

  let totalDistance = 0;
  let previousPoint = { latitude: route.startLatitude, longitude: route.startLongitude };

  for (const waypoint of route.waypoints) {
    totalDistance += calculateDistance(
      previousPoint.latitude, previousPoint.longitude,
      waypoint.latitude, waypoint.longitude
    );
    previousPoint = { latitude: waypoint.latitude, longitude: waypoint.longitude };
  }

  // Add distance to end point
  totalDistance += calculateDistance(
    previousPoint.latitude, previousPoint.longitude,
    route.endLatitude, route.endLongitude
  );

  const estimatedDuration = estimateDeliveryTime(totalDistance, 'standard');

  await route.update({ totalDistance, estimatedDuration });
};

module.exports = {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  updateRouteStatus,
  addWaypoint,
  updateWaypoint,
  removeWaypoint,
  reorderWaypoints,
  optimizeRouteOrder,
  getDirections,
  cloneRoute
};
