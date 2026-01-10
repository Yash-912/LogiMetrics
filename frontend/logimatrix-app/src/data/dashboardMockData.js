// Dashboard Mock Data
// Comprehensive test data for all dashboard visualizations

// Helper to generate dates
const generateDates = (days, startOffset = 0) => {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i) + startOffset);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
};

const last7Days = generateDates(7);
const last30Days = generateDates(30);
const next7Days = generateDates(7, 1);

// ============ REVENUE DATA ============
export const revenueData = {
    daily: last7Days.map((date, i) => ({
        date,
        revenue: 150000 + Math.floor(Math.random() * 80000),
        target: 180000,
        previousPeriod: 140000 + Math.floor(Math.random() * 60000)
    })),
    monthly: [
        { month: 'Jan', revenue: 4200000, target: 4000000 },
        { month: 'Feb', revenue: 3800000, target: 4000000 },
        { month: 'Mar', revenue: 4500000, target: 4200000 },
        { month: 'Apr', revenue: 4100000, target: 4200000 },
        { month: 'May', revenue: 4800000, target: 4500000 },
        { month: 'Jun', revenue: 5200000, target: 5000000 }
    ],
    summary: {
        total: 4200000,
        change: 12.5,
        target: 5000000,
        achieved: 84
    }
};

// ============ SHIPMENT DATA ============
export const shipmentData = {
    volume: last7Days.map((date, i) => ({
        date,
        delivered: 180 + Math.floor(Math.random() * 50),
        inTransit: 45 + Math.floor(Math.random() * 20),
        pending: 25 + Math.floor(Math.random() * 15),
        cancelled: 5 + Math.floor(Math.random() * 5)
    })),
    statusBreakdown: [
        { name: 'Delivered', value: 8520, color: '#10B981' },
        { name: 'In Transit', value: 142, color: '#3B82F6' },
        { name: 'Pending', value: 89, color: '#F59E0B' },
        { name: 'Cancelled', value: 23, color: '#EF4444' }
    ],
    summary: {
        total: 8774,
        delivered: 8520,
        successRate: 97.1,
        avgDeliveryTime: 2.4 // days
    }
};

// ============ FLEET DATA ============
export const fleetData = {
    status: [
        { name: 'On Trip', value: 18, color: '#3B82F6' },
        { name: 'Available', value: 6, color: '#10B981' },
        { name: 'Maintenance', value: 2, color: '#F59E0B' },
        { name: 'Offline', value: 4, color: '#64748B' }
    ],
    utilization: {
        current: 78,
        target: 85,
        trend: 3.2
    },
    vehicles: [
        { id: 'VH-001', name: 'Tata Ace', status: 'On Trip', driver: 'Raju Kumar', location: { lat: 19.076, lng: 72.877 }, speed: 45, heading: 'Mumbai → Delhi' },
        { id: 'VH-002', name: 'Eicher Pro', status: 'Available', driver: 'Vikram Singh', location: { lat: 12.971, lng: 77.594 }, speed: 0, heading: 'Idle' },
        { id: 'VH-003', name: 'Bolero Pickup', status: 'On Trip', driver: 'Amit Sharma', location: { lat: 28.613, lng: 77.209 }, speed: 52, heading: 'Delhi → Jaipur' },
        { id: 'VH-004', name: 'Ashok Leyland', status: 'On Trip', driver: 'Suresh Patil', location: { lat: 17.385, lng: 78.486 }, speed: 38, heading: 'Hyderabad → Bangalore' },
        { id: 'VH-005', name: 'Tata 407', status: 'Maintenance', driver: null, location: { lat: 13.082, lng: 80.270 }, speed: 0, heading: 'Chennai Depot' },
        { id: 'VH-006', name: 'Eicher 1110', status: 'On Trip', driver: 'Mohan Das', location: { lat: 22.572, lng: 88.363 }, speed: 42, heading: 'Kolkata → Patna' }
    ]
};

// ============ DRIVER DATA ============
export const driverData = {
    performance: [
        { subject: 'Deliveries', A: 95, B: 88, fullMark: 100 },
        { subject: 'On-Time', A: 92, B: 78, fullMark: 100 },
        { subject: 'Safety', A: 98, B: 92, fullMark: 100 },
        { subject: 'Rating', A: 96, B: 85, fullMark: 100 },
        { subject: 'Efficiency', A: 89, B: 82, fullMark: 100 },
        { subject: 'Response', A: 94, B: 79, fullMark: 100 }
    ],
    leaderboard: [
        { id: 'DR-101', name: 'Raju Kumar', deliveries: 342, rating: 4.9, onTime: 98 },
        { id: 'DR-103', name: 'Amit Sharma', deliveries: 328, rating: 4.8, onTime: 96 },
        { id: 'DR-104', name: 'Suresh Patil', deliveries: 315, rating: 4.7, onTime: 94 },
        { id: 'DR-102', name: 'Vikram Singh', deliveries: 298, rating: 4.5, onTime: 91 },
        { id: 'DR-105', name: 'Mohan Das', deliveries: 285, rating: 4.6, onTime: 89 }
    ]
};

// ============ ML: ETA PREDICTIONS ============
export const etaPredictionData = {
    predictions: last7Days.map((date, i) => ({
        date,
        predicted: 2.2 + (Math.random() * 0.6 - 0.3),
        actual: 2.4 + (Math.random() * 0.8 - 0.4),
        upperBound: 2.8 + (Math.random() * 0.3),
        lowerBound: 1.8 + (Math.random() * 0.2)
    })),
    accuracy: {
        mape: 8.5, // Mean Absolute Percentage Error
        r2Score: 0.87,
        withinWindow: 92 // % predictions within ±30min
    },
    lateRisks: [
        { shipmentId: 'SH-2024-156', eta: '14:30', risk: 0.72, reason: 'Heavy traffic on NH48' },
        { shipmentId: 'SH-2024-189', eta: '16:45', risk: 0.58, reason: 'Weather delay' },
        { shipmentId: 'SH-2024-201', eta: '11:00', risk: 0.45, reason: 'Route congestion' }
    ]
};

// ============ ML: DEMAND FORECAST ============
export const demandForecastData = {
    historical: last7Days.map((date, i) => ({
        date,
        actual: 180 + Math.floor(Math.random() * 60),
        type: 'historical'
    })),
    forecast: next7Days.map((date, i) => ({
        date,
        predicted: 200 + Math.floor(Math.random() * 50),
        upperBound: 240 + Math.floor(Math.random() * 30),
        lowerBound: 160 + Math.floor(Math.random() * 20),
        type: 'forecast'
    })),
    seasonality: {
        daily: [
            { hour: '6AM', demand: 20 },
            { hour: '9AM', demand: 85 },
            { hour: '12PM', demand: 65 },
            { hour: '3PM', demand: 90 },
            { hour: '6PM', demand: 70 },
            { hour: '9PM', demand: 35 }
        ],
        weekly: [
            { day: 'Mon', demand: 180 },
            { day: 'Tue', demand: 195 },
            { day: 'Wed', demand: 210 },
            { day: 'Thu', demand: 225 },
            { day: 'Fri', demand: 250 },
            { day: 'Sat', demand: 175 },
            { day: 'Sun', demand: 120 }
        ]
    },
    peakAlerts: [
        { date: 'Jan 15', expected: 320, reason: 'Republic Day Sale' },
        { date: 'Jan 26', expected: 280, reason: 'Republic Day' }
    ]
};

// ============ ML: ANOMALY DETECTION ============
export const anomalyData = {
    riskHeatmap: {
        xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        yLabels: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
        data: [
            [0.2, 0.3, 0.1, 0.4, 0.2, 0.1, 0.1],
            [0.1, 0.2, 0.6, 0.3, 0.1, 0.2, 0.1],
            [0.3, 0.1, 0.2, 0.1, 0.5, 0.1, 0.2],
            [0.1, 0.4, 0.1, 0.2, 0.1, 0.3, 0.1],
            [0.2, 0.1, 0.3, 0.1, 0.2, 0.1, 0.4]
        ]
    },
    recentAlerts: [
        { id: 'AN-001', type: 'Pricing', severity: 'high', message: 'Unusual discount pattern detected', time: '2 min ago' },
        { id: 'AN-002', type: 'Route', severity: 'medium', message: 'Unexpected route deviation VH-003', time: '15 min ago' },
        { id: 'AN-003', type: 'Transaction', severity: 'low', message: 'High value shipment flagged', time: '1 hr ago' }
    ],
    summary: {
        totalToday: 3,
        highRisk: 1,
        mediumRisk: 1,
        lowRisk: 1,
        resolved: 5
    }
};

// ============ ML: DYNAMIC PRICING ============
export const pricingData = {
    currentSurge: 1.35,
    zones: [
        { zone: 'Mumbai', multiplier: 1.4, demand: 'High' },
        { zone: 'Delhi', multiplier: 1.2, demand: 'Medium' },
        { zone: 'Bangalore', multiplier: 1.5, demand: 'Very High' },
        { zone: 'Chennai', multiplier: 1.1, demand: 'Normal' },
        { zone: 'Kolkata', multiplier: 1.0, demand: 'Low' }
    ],
    elasticity: [
        { price: 80, demand: 100 },
        { price: 90, demand: 92 },
        { price: 100, demand: 85 },
        { price: 110, demand: 75 },
        { price: 120, demand: 62 },
        { price: 130, demand: 48 },
        { price: 140, demand: 35 }
    ],
    hourlyTrend: [
        { hour: '6AM', multiplier: 0.9 },
        { hour: '9AM', multiplier: 1.3 },
        { hour: '12PM', multiplier: 1.1 },
        { hour: '3PM', multiplier: 1.4 },
        { hour: '6PM', multiplier: 1.5 },
        { hour: '9PM', multiplier: 1.2 }
    ]
};

// ============ KPI SUMMARY ============
export const kpiSummary = [
    { id: 'revenue', label: 'Total Revenue', value: '₹4.2M', trend: 12.5, icon: 'Activity', color: 'blue' },
    { id: 'trips', label: 'Active Trips', value: '142', trend: 8.2, icon: 'Truck', color: 'cyan' },
    { id: 'delivered', label: 'Delivered', value: '8,520', trend: -2.4, icon: 'Package', color: 'purple' },
    { id: 'fleet', label: 'Fleet Utilization', value: '78%', trend: 3.2, icon: 'Gauge', color: 'green' },
    { id: 'anomalies', label: 'Anomaly Alerts', value: '3', trend: -40, icon: 'AlertTriangle', color: 'orange' }
];

// ============ LIVE TRACKING MOCK DATA ============
export const liveTrackingData = {
    vehicles: fleetData.vehicles,
    updateInterval: 5000, // ms
    bounds: {
        north: 30,
        south: 8,
        east: 92,
        west: 68
    }
};

// Export combined data
export default {
    revenueData,
    shipmentData,
    fleetData,
    driverData,
    etaPredictionData,
    demandForecastData,
    anomalyData,
    pricingData,
    kpiSummary,
    liveTrackingData
};
