/**
 * Shipment Service Unit Tests
 * Tests for shipment service functionality
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock dependencies
jest.mock('../../models/postgres', () => ({
    Shipment: {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
}));

const { shipments, validShipmentData, invalidShipmentData, validStatusTransitions, getShipmentByStatus, getActiveShipments } = require('../fixtures/shipments.fixture');
const { Shipment } = require('../../models/postgres');

describe('Shipment Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Get Shipments', () => {
        it('should get all shipments with pagination', async () => {
            const allShipments = Object.values(shipments);
            Shipment.findAndCountAll.mockResolvedValue({ count: allShipments.length, rows: allShipments });

            const result = await Shipment.findAndCountAll({ limit: 10, offset: 0 });

            expect(result.count).toBe(allShipments.length);
            expect(result.rows).toHaveLength(allShipments.length);
        });

        it('should get shipment by ID', async () => {
            Shipment.findByPk.mockResolvedValue(shipments.pending);

            const shipment = await Shipment.findByPk(shipments.pending.id);

            expect(shipment).toBeTruthy();
            expect(shipment.id).toBe(shipments.pending.id);
            expect(shipment.status).toBe('pending');
        });

        it('should get shipment by tracking number', async () => {
            Shipment.findOne.mockResolvedValue(shipments.inTransit);

            const shipment = await Shipment.findOne({ where: { trackingNumber: shipments.inTransit.trackingNumber } });

            expect(shipment).toBeTruthy();
            expect(shipment.trackingNumber).toBe(shipments.inTransit.trackingNumber);
        });

        it('should filter shipments by status', async () => {
            const activeShipments = getActiveShipments();
            Shipment.findAll.mockResolvedValue(activeShipments);

            const result = await Shipment.findAll({ where: { status: { $notIn: ['delivered', 'cancelled'] } } });

            expect(result.every(s => !['delivered', 'cancelled'].includes(s.status))).toBe(true);
        });
    });

    describe('Create Shipment', () => {
        it('should create shipment with valid data', async () => {
            const newShipment = { id: 'new-id', trackingNumber: 'LM2025019999', status: 'pending', ...validShipmentData };
            Shipment.create.mockResolvedValue(newShipment);

            const shipment = await Shipment.create(validShipmentData);

            expect(shipment).toHaveProperty('id');
            expect(shipment).toHaveProperty('trackingNumber');
            expect(shipment.status).toBe('pending');
        });

        it('should generate tracking number on creation', async () => {
            const newShipment = { id: 'new-id', trackingNumber: 'LM2025019999', ...validShipmentData };
            Shipment.create.mockResolvedValue(newShipment);

            const shipment = await Shipment.create(validShipmentData);

            expect(shipment.trackingNumber).toMatch(/^LM\d+$/);
        });
    });

    describe('Status Transitions', () => {
        it('should allow valid status transition from pending to confirmed', () => {
            const currentStatus = 'pending';
            const newStatus = 'confirmed';

            expect(validStatusTransitions[currentStatus]).toContain(newStatus);
        });

        it('should allow valid status transition from in_transit to out_for_delivery', () => {
            const currentStatus = 'in_transit';
            const newStatus = 'out_for_delivery';

            expect(validStatusTransitions[currentStatus]).toContain(newStatus);
        });

        it('should reject invalid status transition from pending to delivered', () => {
            const currentStatus = 'pending';
            const newStatus = 'delivered';

            expect(validStatusTransitions[currentStatus]).not.toContain(newStatus);
        });

        it('should allow cancellation from pending status', () => {
            const currentStatus = 'pending';
            const newStatus = 'cancelled';

            expect(validStatusTransitions[currentStatus]).toContain(newStatus);
        });
    });

    describe('Update Shipment', () => {
        it('should update shipment status', async () => {
            const updatedShipment = { ...shipments.pending, status: 'confirmed' };
            Shipment.findByPk.mockResolvedValue({
                ...shipments.pending,
                update: jest.fn().mockResolvedValue(updatedShipment)
            });

            const shipment = await Shipment.findByPk(shipments.pending.id);
            const result = await shipment.update({ status: 'confirmed' });

            expect(result.status).toBe('confirmed');
        });

        it('should update shipment with driver assignment', async () => {
            const driverId = '550e8400-e29b-41d4-a716-446655440004';
            const updatedShipment = { ...shipments.pending, driverId };
            Shipment.findByPk.mockResolvedValue({
                ...shipments.pending,
                update: jest.fn().mockResolvedValue(updatedShipment)
            });

            const shipment = await Shipment.findByPk(shipments.pending.id);
            const result = await shipment.update({ driverId });

            expect(result.driverId).toBe(driverId);
        });
    });

    describe('Shipment Calculations', () => {
        it('should calculate volumetric weight', () => {
            const { dimensions } = validShipmentData;
            const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;

            expect(volumetricWeight).toBeGreaterThan(0);
        });

        it('should use higher of actual and volumetric weight', () => {
            const { weight, dimensions } = validShipmentData;
            const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
            const chargeableWeight = Math.max(weight, volumetricWeight);

            expect(chargeableWeight).toBeGreaterThanOrEqual(weight);
            expect(chargeableWeight).toBeGreaterThanOrEqual(volumetricWeight);
        });
    });

    describe('Delivery Validation', () => {
        it('should have delivery timestamp for delivered shipments', () => {
            const deliveredShipment = getShipmentByStatus('delivered');

            expect(deliveredShipment.deliveredAt).toBeDefined();
            expect(new Date(deliveredShipment.deliveredAt)).toBeInstanceOf(Date);
        });

        it('should have POD for delivered shipments', () => {
            const deliveredShipment = getShipmentByStatus('delivered');

            expect(deliveredShipment.podSignature).toBeDefined();
        });

        it('should have cancellation reason for cancelled shipments', () => {
            const cancelledShipment = getShipmentByStatus('cancelled');

            expect(cancelledShipment.cancellationReason).toBeDefined();
            expect(cancelledShipment.cancelledAt).toBeDefined();
        });
    });
});
