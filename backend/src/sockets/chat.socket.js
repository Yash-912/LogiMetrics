/**
 * Chat Socket Handler
 * Real-time driver-dispatcher communication
 */

const { ChatMessage, ChatRoom } = require('../models/mongodb');
const logger = require('../utils/logger.util');

/**
 * Initialize chat socket handlers for a connection
 */
function initialize(io, socket) {
    // Join chat room
    socket.on('chat:join', async (roomId) => {
        try {
            if (!socket.user) {
                socket.emit('chat:error', { message: 'Authentication required' });
                return;
            }

            socket.join(`chat:${roomId}`);
            logger.debug(`Socket ${socket.id} joined chat room ${roomId}`);

            // Get recent messages
            const messages = await ChatMessage.find({ roomId })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('senderId', 'firstName lastName avatar');

            socket.emit('chat:history', { roomId, messages: messages.reverse() });

            // Notify room of join
            socket.to(`chat:${roomId}`).emit('chat:user:joined', {
                userId: socket.user.id,
                userName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Chat join error:', error);
            socket.emit('chat:error', { message: 'Failed to join chat' });
        }
    });

    // Leave chat room
    socket.on('chat:leave', (roomId) => {
        socket.leave(`chat:${roomId}`);

        if (socket.user) {
            socket.to(`chat:${roomId}`).emit('chat:user:left', {
                userId: socket.user.id,
                timestamp: new Date()
            });
        }

        logger.debug(`Socket ${socket.id} left chat room ${roomId}`);
    });

    // Send message
    socket.on('chat:message', async (data) => {
        try {
            if (!socket.user) {
                socket.emit('chat:error', { message: 'Authentication required' });
                return;
            }

            const { roomId, content, type = 'text', attachments = [] } = data;

            if (!content && attachments.length === 0) {
                socket.emit('chat:error', { message: 'Message content is required' });
                return;
            }

            // Save message to database
            const message = await ChatMessage.create({
                roomId,
                senderId: socket.user.id,
                senderName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
                senderRole: socket.user.role,
                content,
                type,
                attachments,
                createdAt: new Date()
            });

            // Broadcast to room
            io.to(`chat:${roomId}`).emit('chat:message:new', {
                id: message._id,
                roomId,
                senderId: socket.user.id,
                senderName: message.senderName,
                senderRole: message.senderRole,
                content,
                type,
                attachments,
                createdAt: message.createdAt
            });

            // Update room's last message
            await ChatRoom.findByIdAndUpdate(roomId, {
                lastMessage: content,
                lastMessageAt: new Date(),
                lastMessageBy: socket.user.id
            });
        } catch (error) {
            logger.error('Chat message error:', error);
            socket.emit('chat:error', { message: 'Failed to send message' });
        }
    });

    // Typing indicator
    socket.on('chat:typing:start', (roomId) => {
        if (socket.user) {
            socket.to(`chat:${roomId}`).emit('chat:typing', {
                userId: socket.user.id,
                userName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
                isTyping: true
            });
        }
    });

    socket.on('chat:typing:stop', (roomId) => {
        if (socket.user) {
            socket.to(`chat:${roomId}`).emit('chat:typing', {
                userId: socket.user.id,
                userName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
                isTyping: false
            });
        }
    });

    // Mark messages as read
    socket.on('chat:read', async (data) => {
        try {
            if (!socket.user) return;

            const { roomId, messageIds } = data;

            await ChatMessage.updateMany(
                { _id: { $in: messageIds }, roomId },
                { $addToSet: { readBy: socket.user.id } }
            );

            socket.to(`chat:${roomId}`).emit('chat:messages:read', {
                userId: socket.user.id,
                messageIds,
                readAt: new Date()
            });
        } catch (error) {
            logger.error('Chat read error:', error);
        }
    });

    // Create or get direct chat room
    socket.on('chat:direct:create', async (targetUserId) => {
        try {
            if (!socket.user) {
                socket.emit('chat:error', { message: 'Authentication required' });
                return;
            }

            // Find existing direct room or create new one
            let room = await ChatRoom.findOne({
                type: 'direct',
                participants: { $all: [socket.user.id, targetUserId] }
            });

            if (!room) {
                room = await ChatRoom.create({
                    type: 'direct',
                    participants: [socket.user.id, targetUserId],
                    createdBy: socket.user.id,
                    createdAt: new Date()
                });
            }

            socket.emit('chat:room:created', { roomId: room._id, type: 'direct' });
        } catch (error) {
            logger.error('Create direct chat error:', error);
            socket.emit('chat:error', { message: 'Failed to create chat' });
        }
    });

    // Get user's chat rooms
    socket.on('chat:rooms:get', async () => {
        try {
            if (!socket.user) {
                socket.emit('chat:rooms', { rooms: [] });
                return;
            }

            const rooms = await ChatRoom.find({
                participants: socket.user.id
            })
                .sort({ lastMessageAt: -1 })
                .limit(20);

            socket.emit('chat:rooms', { rooms });
        } catch (error) {
            logger.error('Get chat rooms error:', error);
        }
    });

    // Send location in chat
    socket.on('chat:location', async (data) => {
        try {
            if (!socket.user) return;

            const { roomId, latitude, longitude, address } = data;

            const message = await ChatMessage.create({
                roomId,
                senderId: socket.user.id,
                senderName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
                senderRole: socket.user.role,
                type: 'location',
                content: address || 'Shared location',
                metadata: { latitude, longitude },
                createdAt: new Date()
            });

            io.to(`chat:${roomId}`).emit('chat:message:new', {
                id: message._id,
                roomId,
                senderId: socket.user.id,
                senderName: message.senderName,
                type: 'location',
                content: address,
                metadata: { latitude, longitude },
                createdAt: message.createdAt
            });
        } catch (error) {
            logger.error('Chat location error:', error);
        }
    });
}

// Emit functions for external use

/**
 * Send message to a chat room
 */
function sendToRoom(io, roomId, message) {
    io.to(`chat:${roomId}`).emit('chat:message:new', message);
}

/**
 * Send system message to room
 */
function sendSystemMessage(io, roomId, content) {
    io.to(`chat:${roomId}`).emit('chat:message:system', {
        type: 'system',
        content,
        createdAt: new Date()
    });
}

/**
 * Notify room about shipment update
 */
function notifyShipmentUpdate(io, roomId, shipment) {
    io.to(`chat:${roomId}`).emit('chat:shipment:update', {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        status: shipment.status,
        timestamp: new Date()
    });
}

module.exports = {
    initialize,
    sendToRoom,
    sendSystemMessage,
    notifyShipmentUpdate
};
