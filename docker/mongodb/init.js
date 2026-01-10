// ============================================================
// LogiMetrics MongoDB Initialization Script
// ============================================================

// Switch to logimetrics database
db = db.getSiblingDB('logimetrics');

// Create application user with read/write access
db.createUser({
    user: 'Yash',
    pwd: 'Yash@Mongo2024',
    roles: [
        { role: 'readWrite', db: 'logimetrics' },
        { role: 'dbAdmin', db: 'logimetrics' }
    ]
});

// Create collections with validators
db.createCollection('tracking_events', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['shipmentId', 'eventType', 'location', 'timestamp'],
            properties: {
                shipmentId: { bsonType: 'string' },
                eventType: { bsonType: 'string' },
                location: {
                    bsonType: 'object',
                    required: ['lat', 'lng'],
                    properties: {
                        lat: { bsonType: 'double' },
                        lng: { bsonType: 'double' }
                    }
                },
                timestamp: { bsonType: 'date' }
            }
        }
    }
});

db.createCollection('driver_locations', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['driverId', 'location', 'timestamp'],
            properties: {
                driverId: { bsonType: 'string' },
                location: {
                    bsonType: 'object',
                    required: ['coordinates'],
                    properties: {
                        type: { enum: ['Point'] },
                        coordinates: {
                            bsonType: 'array',
                            items: { bsonType: 'double' }
                        }
                    }
                },
                timestamp: { bsonType: 'date' }
            }
        }
    }
});

db.createCollection('route_history');
db.createCollection('notifications');
db.createCollection('analytics_events');
db.createCollection('ml_predictions');
db.createCollection('audit_logs');

// Create indexes for tracking_events
db.tracking_events.createIndex({ 'shipmentId': 1 });
db.tracking_events.createIndex({ 'timestamp': -1 });
db.tracking_events.createIndex({ 'eventType': 1 });
db.tracking_events.createIndex({ 'location': '2dsphere' });

// Create indexes for driver_locations
db.driver_locations.createIndex({ 'driverId': 1, 'timestamp': -1 });
db.driver_locations.createIndex({ 'location': '2dsphere' });
db.driver_locations.createIndex({ 'timestamp': -1 }, { expireAfterSeconds: 86400 }); // TTL: 24 hours

// Create indexes for other collections
db.route_history.createIndex({ 'routeId': 1, 'timestamp': -1 });
db.notifications.createIndex({ 'userId': 1, 'read': 1 });
db.notifications.createIndex({ 'createdAt': -1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days
db.analytics_events.createIndex({ 'eventType': 1, 'timestamp': -1 });
db.ml_predictions.createIndex({ 'predictionType': 1, 'timestamp': -1 });
db.audit_logs.createIndex({ 'userId': 1, 'action': 1, 'timestamp': -1 });

// Insert initialization log
db.audit_logs.insertOne({
    action: 'DATABASE_INITIALIZED',
    details: 'LogiMetrics MongoDB initialized successfully',
    timestamp: new Date(),
    initializedBy: 'system'
});

print('LogiMetrics MongoDB initialized successfully for user Yash');
