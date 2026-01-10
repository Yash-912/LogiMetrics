/**
 * Socket.io Configuration
 * Real-time communication for tracking and notifications
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger.util');

let io = null;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Allow anonymous connections for public tracking
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      logger.warn('Socket authentication failed:', error.message);
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}${socket.user ? ` (User: ${socket.user.id})` : ' (Anonymous)'}`);

    // Join user to their personal room for notifications
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      if (socket.user.companyId) {
        socket.join(`company:${socket.user.companyId}`);
      }
    }

    // Join shipment tracking room
    socket.on('join:tracking', (trackingId) => {
      socket.join(`tracking:${trackingId}`);
      logger.info(`Socket ${socket.id} joined tracking room: ${trackingId}`);
    });

    // Leave shipment tracking room
    socket.on('leave:tracking', (trackingId) => {
      socket.leave(`tracking:${trackingId}`);
      logger.info(`Socket ${socket.id} left tracking room: ${trackingId}`);
    });

    // Join vehicle tracking room
    socket.on('join:vehicle', (vehicleId) => {
      if (socket.user) {
        socket.join(`vehicle:${vehicleId}`);
        logger.info(`Socket ${socket.id} joined vehicle room: ${vehicleId}`);
      }
    });

    // Leave vehicle tracking room
    socket.on('leave:vehicle', (vehicleId) => {
      socket.leave(`vehicle:${vehicleId}`);
      logger.info(`Socket ${socket.id} left vehicle room: ${vehicleId}`);
    });

    // Driver location update
    socket.on('driver:location', (data) => {
      if (socket.user && socket.user.role === 'driver') {
        // Broadcast to tracking rooms
        if (data.shipmentId) {
          io.to(`tracking:${data.shipmentId}`).emit('location:update', {
            shipmentId: data.shipmentId,
            coordinates: data.coordinates,
            speed: data.speed,
            heading: data.heading,
            timestamp: new Date().toISOString()
          });
        }
        if (data.vehicleId) {
          io.to(`vehicle:${data.vehicleId}`).emit('vehicle:location', {
            vehicleId: data.vehicleId,
            coordinates: data.coordinates,
            speed: data.speed,
            heading: data.heading,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Helper functions for emitting events
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToCompany(companyId, event, data) {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
}

function emitToTracking(trackingId, event, data) {
  if (io) {
    io.to(`tracking:${trackingId}`).emit(event, data);
  }
}

function emitToVehicle(vehicleId, event, data) {
  if (io) {
    io.to(`vehicle:${vehicleId}`).emit(event, data);
  }
}

function broadcastAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToCompany,
  emitToTracking,
  emitToVehicle,
  broadcastAll
};
