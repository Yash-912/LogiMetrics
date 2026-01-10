/**
 * Route Service
 * Handles route calculation, optimization, and waypoint management
 */

const { Op, Sequelize } = require("sequelize");
const {
  Route,
  Waypoint,
  Shipment,
  Driver,
  Vehicle,
  Company,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const {
  getDirections,
  getDistanceMatrix,
  getMapboxRoute,
  calculateETA,
} = require("../config/maps");
const { calculateDistance } = require("../utils/calculations.util");
const logger = require("../utils/logger.util");

/**
 * Get all routes with pagination and filters
 */
async function getRoutes({
  page = 1,
  limit = 10,
  search,
  status,
  companyId,
  driverId,
  startDate,
  endDate,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }

  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (driverId) where.driverId = driverId;

  if (startDate && endDate) {
    where.scheduledStartTime = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  const { count, rows } = await Route.findAndCountAll({
    where,
    include: [
      {
        model: Driver,
        as: "driver",
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: Vehicle,
        as: "vehicle",
        attributes: ["id", "registrationNumber"],
      },
      { model: Waypoint, as: "waypoints" },
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit,
    offset,
  });

  return {
    routes: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get route by ID
 */
async function getRouteById(routeId) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: Company, as: "company" },
      { model: Driver, as: "driver" },
      { model: Vehicle, as: "vehicle" },
      { model: Waypoint, as: "waypoints", order: [["sequence", "ASC"]] },
      { model: Shipment, as: "shipments" },
    ],
  });

  if (!route) {
    throw new Error("Route not found");
  }

  return route;
}

/**
 * Create a new route
 */
async function createRoute(routeData, createdBy) {
  const {
    companyId,
    name,
    description,
    startLocation,
    endLocation,
    waypoints,
    driverId,
    vehicleId,
    scheduledStartTime,
    scheduledEndTime,
    type,
    priority,
  } = routeData;

  // Calculate distance and duration using Maps API
  let distance, duration, polyline;
  try {
    const directions = await getDirections(
      `${startLocation.latitude},${startLocation.longitude}`,
      `${endLocation.latitude},${endLocation.longitude}`,
      waypoints?.map((w) => `${w.latitude},${w.longitude}`) || []
    );
    distance = directions.distance;
    duration = directions.duration;
    polyline = directions.polyline;
  } catch (error) {
    logger.warn("Failed to calculate route:", error);
    distance = null;
    duration = null;
  }

  // Create route
  const route = await Route.create({
    companyId,
    name,
    description,
    startAddress: startLocation.address,
    startLatitude: startLocation.latitude,
    startLongitude: startLocation.longitude,
    endAddress: endLocation.address,
    endLatitude: endLocation.latitude,
    endLongitude: endLocation.longitude,
    distance,
    estimatedDuration: duration,
    polyline,
    driverId,
    vehicleId,
    scheduledStartTime,
    scheduledEndTime,
    type: type || "delivery",
    priority: priority || "normal",
    status: "planned",
    createdBy,
  });

  // Create waypoints
  if (waypoints && waypoints.length > 0) {
    await Waypoint.bulkCreate(
      waypoints.map((wp, index) => ({
        routeId: route.id,
        sequence: wp.sequence || index + 1,
        address: wp.address,
        latitude: wp.latitude,
        longitude: wp.longitude,
        estimatedArrival: wp.estimatedArrival,
        notes: wp.notes,
        type: wp.type || "delivery",
      }))
    );
  }

  // Log the action
  await logRouteAction(createdBy, "create", route.id, { name });

  return getRouteById(route.id);
}

/**
 * Update route
 */
async function updateRoute(routeId, updateData, updatedBy) {
  const route = await Route.findByPk(routeId);

  if (!route) {
    throw new Error("Route not found");
  }

  // Prevent updating active routes
  if (route.status === "active") {
    throw new Error("Cannot update an active route");
  }

  await route.update(updateData);

  // Log the action
  await logRouteAction(updatedBy, "update", routeId, {
    fields: Object.keys(updateData),
  });

  return route;
}

/**
 * Delete route
 */
async function deleteRoute(routeId, deletedBy) {
  const route = await Route.findByPk(routeId);

  if (!route) {
    throw new Error("Route not found");
  }

  if (route.status === "active") {
    throw new Error("Cannot delete an active route");
  }

  // Delete waypoints
  await Waypoint.destroy({ where: { routeId } });

  // Soft delete route
  await route.update({
    status: "deleted",
    deletedAt: new Date(),
  });

  // Log the action
  await logRouteAction(deletedBy, "delete", routeId, {});

  return { message: "Route deleted successfully" };
}

/**
 * Update route status
 */
async function updateRouteStatus(routeId, status, notes, updatedBy) {
  const route = await Route.findByPk(routeId);

  if (!route) {
    throw new Error("Route not found");
  }

  const validStatuses = ["planned", "active", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  const updateData = { status };

  if (status === "active") {
    updateData.actualStartTime = new Date();
  } else if (status === "completed") {
    updateData.actualEndTime = new Date();
  }

  await route.update(updateData);

  // Log the action
  await logRouteAction(updatedBy, "status_change", routeId, { status, notes });

  return route;
}

/**
 * Add waypoint to route
 */
async function addWaypoint(routeId, waypointData, addedBy) {
  const route = await Route.findByPk(routeId, {
    include: [{ model: Waypoint, as: "waypoints" }],
  });

  if (!route) {
    throw new Error("Route not found");
  }

  // Get next sequence number
  const maxSequence = route.waypoints.reduce(
    (max, wp) => Math.max(max, wp.sequence),
    0
  );

  const waypoint = await Waypoint.create({
    routeId,
    sequence: waypointData.sequence || maxSequence + 1,
    address: waypointData.address,
    latitude: waypointData.latitude,
    longitude: waypointData.longitude,
    estimatedArrival: waypointData.estimatedArrival,
    notes: waypointData.notes,
    type: waypointData.type || "delivery",
  });

  // Recalculate route metrics
  await recalculateRouteMetrics(routeId);

  // Log the action
  await logRouteAction(addedBy, "add_waypoint", routeId, {
    waypointId: waypoint.id,
  });

  return waypoint;
}

/**
 * Update waypoint
 */
async function updateWaypoint(routeId, waypointId, updateData, updatedBy) {
  const waypoint = await Waypoint.findOne({
    where: { id: waypointId, routeId },
  });

  if (!waypoint) {
    throw new Error("Waypoint not found");
  }

  await waypoint.update(updateData);

  // Recalculate route metrics if location changed
  if (updateData.latitude || updateData.longitude) {
    await recalculateRouteMetrics(routeId);
  }

  // Log the action
  await logRouteAction(updatedBy, "update_waypoint", routeId, { waypointId });

  return waypoint;
}

/**
 * Remove waypoint
 */
async function removeWaypoint(routeId, waypointId, removedBy) {
  const waypoint = await Waypoint.findOne({
    where: { id: waypointId, routeId },
  });

  if (!waypoint) {
    throw new Error("Waypoint not found");
  }

  await waypoint.destroy();

  // Recalculate route metrics
  await recalculateRouteMetrics(routeId);

  // Log the action
  await logRouteAction(removedBy, "remove_waypoint", routeId, { waypointId });

  return { message: "Waypoint removed successfully" };
}

/**
 * Reorder waypoints
 */
async function reorderWaypoints(routeId, waypointOrder, reorderedBy) {
  const route = await Route.findByPk(routeId);

  if (!route) {
    throw new Error("Route not found");
  }

  // Update sequence for each waypoint
  for (const item of waypointOrder) {
    await Waypoint.update(
      { sequence: item.sequence },
      { where: { id: item.id, routeId } }
    );
  }

  // Recalculate route metrics
  await recalculateRouteMetrics(routeId);

  // Log the action
  await logRouteAction(reorderedBy, "reorder_waypoints", routeId, {});

  return getRouteById(routeId);
}

/**
 * Optimize route order using AI/algorithms
 */
async function optimizeRoute(routeId, options, optimizedBy) {
  const route = await Route.findByPk(routeId, {
    include: [{ model: Waypoint, as: "waypoints" }],
  });

  if (!route) {
    throw new Error("Route not found");
  }

  // Build coordinates for optimization
  const coordinates = [
    { lat: route.startLatitude, lng: route.startLongitude },
    ...route.waypoints.map((wp) => ({ lat: wp.latitude, lng: wp.longitude })),
    { lat: route.endLatitude, lng: route.endLongitude },
  ];

  try {
    // Use Mapbox for route optimization
    const optimizedRoute = await getMapboxRoute(coordinates, "driving-traffic");

    // Get optimized directions from Google Maps
    const waypointCoords = route.waypoints.map(
      (wp) => `${wp.latitude},${wp.longitude}`
    );
    const directions = await getDirections(
      `${route.startLatitude},${route.startLongitude}`,
      `${route.endLatitude},${route.endLongitude}`,
      waypointCoords
    );

    // Update waypoint order based on optimization
    if (directions.waypointOrder) {
      const sortedWaypoints = directions.waypointOrder.map((idx, newIdx) => ({
        id: route.waypoints[idx].id,
        sequence: newIdx + 1,
      }));

      for (const item of sortedWaypoints) {
        await Waypoint.update(
          { sequence: item.sequence },
          { where: { id: item.id } }
        );
      }
    }

    // Update route with new metrics
    await route.update({
      distance: directions.distance,
      estimatedDuration: directions.duration,
      polyline: directions.polyline,
      optimizedAt: new Date(),
    });

    // Log the action
    await logRouteAction(optimizedBy, "optimize", routeId, { options });

    return getRouteById(routeId);
  } catch (error) {
    logger.error("Route optimization failed:", error);
    throw new Error("Failed to optimize route");
  }
}

/**
 * Get directions for a route
 */
async function getRouteDirections(routeId) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: Waypoint, as: "waypoints", order: [["sequence", "ASC"]] },
    ],
  });

  if (!route) {
    throw new Error("Route not found");
  }

  const waypointCoords = route.waypoints.map(
    (wp) => `${wp.latitude},${wp.longitude}`
  );

  const directions = await getDirections(
    `${route.startLatitude},${route.startLongitude}`,
    `${route.endLatitude},${route.endLongitude}`,
    waypointCoords
  );

  return directions;
}

/**
 * Clone a route
 */
async function cloneRoute(routeId, newName, clonedBy) {
  const sourceRoute = await Route.findByPk(routeId, {
    include: [{ model: Waypoint, as: "waypoints" }],
  });

  if (!sourceRoute) {
    throw new Error("Route not found");
  }

  const routeData = sourceRoute.toJSON();
  delete routeData.id;
  delete routeData.createdAt;
  delete routeData.updatedAt;

  const newRoute = await Route.create({
    ...routeData,
    name: newName || `${sourceRoute.name} (Copy)`,
    status: "planned",
    createdBy: clonedBy,
  });

  // Clone waypoints
  if (sourceRoute.waypoints.length > 0) {
    await Waypoint.bulkCreate(
      sourceRoute.waypoints.map((wp) => ({
        routeId: newRoute.id,
        sequence: wp.sequence,
        address: wp.address,
        latitude: wp.latitude,
        longitude: wp.longitude,
        estimatedArrival: wp.estimatedArrival,
        notes: wp.notes,
        type: wp.type,
      }))
    );
  }

  // Log the action
  await logRouteAction(clonedBy, "clone", newRoute.id, {
    sourceRouteId: routeId,
  });

  return getRouteById(newRoute.id);
}

/**
 * Recalculate route metrics
 */
async function recalculateRouteMetrics(routeId) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: Waypoint, as: "waypoints", order: [["sequence", "ASC"]] },
    ],
  });

  if (!route) return;

  try {
    const waypointCoords = route.waypoints.map(
      (wp) => `${wp.latitude},${wp.longitude}`
    );

    const directions = await getDirections(
      `${route.startLatitude},${route.startLongitude}`,
      `${route.endLatitude},${route.endLongitude}`,
      waypointCoords
    );

    await route.update({
      distance: directions.distance,
      estimatedDuration: directions.duration,
      polyline: directions.polyline,
    });
  } catch (error) {
    logger.error("Failed to recalculate route metrics:", error);
  }
}

// Helper functions

async function logRouteAction(actorId, action, routeId, metadata) {
  try {
    await AuditLog.create({
      userId: actorId,
      action: `route:${action}`,
      resource: "route",
      resourceId: routeId,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to log route action:", error);
  }
}

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
  optimizeRoute,
  getRouteDirections,
  cloneRoute,
  recalculateRouteMetrics,
};
