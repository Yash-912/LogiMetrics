/**
 * Shipments Fixture
 * Mock shipment data for testing
 */

const shipments = {
    pending: {
        id: '550e8400-e29b-41d4-a716-446655440101',
        trackingNumber: 'LM2025010001',
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        customerId: '550e8400-e29b-41d4-a716-446655440012',
        status: 'pending',
        origin: {
            address: '456 Industrial Area, Mumbai, Maharashtra, India 400001',
            lat: 19.0760,
            lng: 72.8777
        },
        destination: {
            address: '789 Market Street, Delhi, Delhi, India 110001',
            lat: 28.7041,
            lng: 77.1025
        },
        weight: 50,
        dimensions: { length: 100, width: 80, height: 60 },
        packageType: 'pallet',
        serviceType: 'standard',
        totalCost: 5000,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
    },

    inTransit: {
        id: '550e8400-e29b-41d4-a716-446655440102',
        trackingNumber: 'LM2025010002',
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        customerId: '550e8400-e29b-41d4-a716-446655440012',
        driverId: '550e8400-e29b-41d4-a716-446655440004',
        vehicleId: '550e8400-e29b-41d4-a716-446655440201',
        status: 'in_transit',
        origin: {
            address: '456 Industrial Area, Mumbai, Maharashtra, India 400001',
            lat: 19.0760,
            lng: 72.8777
        },
        destination: {
            address: '123 Tech Park, Bangalore, Karnataka, India 560001',
            lat: 12.9716,
            lng: 77.5946
        },
        weight: 25,
        dimensions: { length: 50, width: 40, height: 30 },
        packageType: 'box',
        serviceType: 'express',
        totalCost: 3500,
        pickedUpAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date()
    },

    outForDelivery: {
        id: '550e8400-e29b-41d4-a716-446655440103',
        trackingNumber: 'LM2025010003',
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        customerId: '550e8400-e29b-41d4-a716-446655440012',
        driverId: '550e8400-e29b-41d4-a716-446655440004',
        vehicleId: '550e8400-e29b-41d4-a716-446655440201',
        status: 'out_for_delivery',
        origin: {
            address: '456 Industrial Area, Mumbai, Maharashtra, India 400001',
            lat: 19.0760,
            lng: 72.8777
        },
        destination: {
            address: '555 Residential Complex, Pune, Maharashtra, India 411001',
            lat: 18.5204,
            lng: 73.8567
        },
        weight: 10,
        dimensions: { length: 30, width: 20, height: 15 },
        packageType: 'parcel',
        serviceType: 'same_day',
        totalCost: 2000,
        pickedUpAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        updatedAt: new Date()
    },

    delivered: {
        id: '550e8400-e29b-41d4-a716-446655440104',
        trackingNumber: 'LM2025010004',
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        customerId: '550e8400-e29b-41d4-a716-446655440012',
        driverId: '550e8400-e29b-41d4-a716-446655440004',
        vehicleId: '550e8400-e29b-41d4-a716-446655440201',
        status: 'delivered',
        origin: {
            address: '456 Industrial Area, Mumbai, Maharashtra, India 400001',
            lat: 19.0760,
            lng: 72.8777
        },
        destination: {
            address: '789 Market Street, Delhi, Delhi, India 110001',
            lat: 28.7041,
            lng: 77.1025
        },
        weight: 100,
        dimensions: { length: 150, width: 100, height: 80 },
        packageType: 'container',
        serviceType: 'standard',
        totalCost: 15000,
        pickedUpAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        podSignature: 'data:image/png;base64,signature',
        podNotes: 'Received in good condition',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },

    cancelled: {
        id: '550e8400-e29b-41d4-a716-446655440105',
        trackingNumber: 'LM2025010005',
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        customerId: '550e8400-e29b-41d4-a716-446655440012',
        status: 'cancelled',
        origin: {
            address: '456 Industrial Area, Mumbai, Maharashtra, India 400001',
            lat: 19.0760,
            lng: 72.8777
        },
        destination: {
            address: '999 Cancelled Road, Chennai, Tamil Nadu, India 600001',
            lat: 13.0827,
            lng: 80.2707
        },
        weight: 5,
        dimensions: { length: 20, width: 15, height: 10 },
        packageType: 'envelope',
        serviceType: 'standard',
        totalCost: 500,
        cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cancellationReason: 'Customer requested cancellation',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
};

// Valid shipment creation data
const validShipmentData = {
    origin: {
        address: '123 Origin Street, Mumbai, Maharashtra, India 400001',
        lat: 19.0760,
        lng: 72.8777
    },
    destination: {
        address: '456 Destination Road, Bangalore, Karnataka, India 560001',
        lat: 12.9716,
        lng: 77.5946
    },
    weight: 30,
    dimensions: { length: 60, width: 40, height: 35 },
    packageType: 'box',
    serviceType: 'express',
    recipientName: 'Test Recipient',
    recipientPhone: '+919876543299'
};

// Invalid shipment data
const invalidShipmentData = {
    missingOrigin: { destination: validShipmentData.destination, weight: 30 },
    missingDestination: { origin: validShipmentData.origin, weight: 30 },
    negativeWeight: { ...validShipmentData, weight: -10 },
    invalidServiceType: { ...validShipmentData, serviceType: 'invalid_type' }
};

// Status transitions
const validStatusTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['picked_up', 'cancelled'],
    picked_up: ['in_transit'],
    in_transit: ['out_for_delivery', 'delayed'],
    out_for_delivery: ['delivered', 'failed_delivery'],
    delayed: ['in_transit', 'out_for_delivery'],
    failed_delivery: ['out_for_delivery', 'returned']
};

// Helper functions
const getAllShipments = () => Object.values(shipments);
const getShipmentByStatus = (status) => Object.values(shipments).find(s => s.status === status);
const getActiveShipments = () => Object.values(shipments).filter(s => !['delivered', 'cancelled'].includes(s.status));

module.exports = {
    shipments,
    validShipmentData,
    invalidShipmentData,
    validStatusTransitions,
    getAllShipments,
    getShipmentByStatus,
    getActiveShipments
};
