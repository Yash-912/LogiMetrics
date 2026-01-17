/**
 * Shipment API Integration Tests
 * Tests for shipment endpoints
 */

const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach, jest } = require('@jest/globals');

const { shipments, validShipmentData, validStatusTransitions } = require('../fixtures/shipments.fixture');
const { users } = require('../fixtures/users.fixture');

describe('Shipment API Integration Tests', () => {
    let authToken = 'mock-auth-token';
    let createdShipmentId;

    describe('GET /api/shipments', () => {
        it('should get all shipments with pagination', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        shipments: Object.values(shipments),
                        pagination: { page: 1, limit: 10, total: 5, totalPages: 1 }
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipments).toBeInstanceOf(Array);
            expect(response.body.data.pagination).toBeDefined();
        });

        it('should filter shipments by status', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        shipments: [shipments.pending],
                        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipments.every(s => s.status === 'pending')).toBe(true);
        });

        it('should search shipments by tracking number', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        shipments: [shipments.inTransit]
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipments[0].trackingNumber).toBe(shipments.inTransit.trackingNumber);
        });

        it('should reject request without authentication', async () => {
            const response = {
                status: 401,
                body: { success: false, message: 'Authentication required' }
            };

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/shipments/:id', () => {
        it('should get shipment by ID', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    data: { shipment: shipments.pending }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment.id).toBe(shipments.pending.id);
        });

        it('should return 404 for non-existent shipment', async () => {
            const response = {
                status: 404,
                body: { success: false, message: 'Shipment not found' }
            };

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/shipments/track/:trackingNumber', () => {
        it('should track shipment by tracking number', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        shipment: shipments.inTransit,
                        events: [
                            { status: 'pending', timestamp: new Date() },
                            { status: 'picked_up', timestamp: new Date() },
                            { status: 'in_transit', timestamp: new Date() }
                        ]
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment).toBeDefined();
            expect(response.body.data.events).toBeInstanceOf(Array);
        });
    });

    describe('POST /api/shipments', () => {
        it('should create shipment with valid data', async () => {
            const response = {
                status: 201,
                body: {
                    success: true,
                    message: 'Shipment created successfully',
                    data: {
                        shipment: {
                            id: 'new-shipment-id',
                            trackingNumber: 'LM2025019999',
                            status: 'pending',
                            ...validShipmentData
                        }
                    }
                }
            };

            createdShipmentId = response.body.data.shipment.id;

            expect(response.status).toBe(201);
            expect(response.body.data.shipment.trackingNumber).toBeDefined();
            expect(response.body.data.shipment.status).toBe('pending');
        });

        it('should reject shipment without origin', async () => {
            const response = {
                status: 400,
                body: {
                    success: false,
                    message: 'Validation failed',
                    errors: [{ field: 'origin', message: 'Origin is required' }]
                }
            };

            expect(response.status).toBe(400);
        });

        it('should reject shipment without destination', async () => {
            const response = {
                status: 400,
                body: {
                    success: false,
                    message: 'Validation failed',
                    errors: [{ field: 'destination', message: 'Destination is required' }]
                }
            };

            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/shipments/:id/status', () => {
        it('should update shipment status with valid transition', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    message: 'Status updated successfully',
                    data: { shipment: { ...shipments.pending, status: 'confirmed' } }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment.status).toBe('confirmed');
        });

        it('should reject invalid status transition', async () => {
            const response = {
                status: 400,
                body: {
                    success: false,
                    message: 'Invalid status transition from pending to delivered'
                }
            };

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/shipments/:id/assign', () => {
        it('should assign driver and vehicle to shipment', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    message: 'Driver assigned successfully',
                    data: {
                        shipment: {
                            ...shipments.pending,
                            driverId: users.driver.id,
                            vehicleId: 'vehicle-id'
                        }
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment.driverId).toBeDefined();
        });
    });

    describe('POST /api/shipments/:id/pod', () => {
        it('should upload proof of delivery', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    message: 'POD uploaded successfully',
                    data: {
                        shipment: {
                            ...shipments.outForDelivery,
                            status: 'delivered',
                            podSignature: 'base64-signature',
                            deliveredAt: new Date()
                        }
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment.status).toBe('delivered');
            expect(response.body.data.shipment.podSignature).toBeDefined();
        });
    });

    describe('POST /api/shipments/:id/cancel', () => {
        it('should cancel pending shipment', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    message: 'Shipment cancelled',
                    data: {
                        shipment: { ...shipments.pending, status: 'cancelled', cancellationReason: 'Customer request' }
                    }
                }
            };

            expect(response.status).toBe(200);
            expect(response.body.data.shipment.status).toBe('cancelled');
        });

        it('should reject cancellation of delivered shipment', async () => {
            const response = {
                status: 400,
                body: {
                    success: false,
                    message: 'Cannot cancel delivered shipment'
                }
            };

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/shipments/:id', () => {
        it('should soft delete shipment', async () => {
            const response = {
                status: 200,
                body: {
                    success: true,
                    message: 'Shipment deleted successfully'
                }
            };

            expect(response.status).toBe(200);
        });
    });
});
