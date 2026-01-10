/**
 * Utility Functions Unit Tests
 * Tests for utility helper functions
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

describe('Utility Function Tests', () => {
    describe('Date/Time Utilities', () => {
        it('should format date correctly', () => {
            const date = new Date('2025-01-15T10:30:00Z');
            const formatted = date.toISOString().split('T')[0];

            expect(formatted).toBe('2025-01-15');
        });

        it('should calculate days between dates', () => {
            const startDate = new Date('2025-01-01');
            const endDate = new Date('2025-01-15');
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(14);
        });

        it('should check if date is in past', () => {
            const pastDate = new Date('2020-01-01');
            const isPast = pastDate < new Date();

            expect(isPast).toBe(true);
        });

        it('should check if date is in future', () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const isFuture = futureDate > new Date();

            expect(isFuture).toBe(true);
        });

        it('should add days to date', () => {
            const date = new Date('2025-01-01');
            const daysToAdd = 30;
            const newDate = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            expect(newDate.toISOString().split('T')[0]).toBe('2025-01-31');
        });
    });

    describe('Validation Utilities', () => {
        it('should validate email format', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            expect(emailRegex.test('test@example.com')).toBe(true);
            expect(emailRegex.test('invalid-email')).toBe(false);
            expect(emailRegex.test('test@')).toBe(false);
            expect(emailRegex.test('@example.com')).toBe(false);
        });

        it('should validate phone number format', () => {
            const phoneRegex = /^\+?[1-9]\d{9,14}$/;

            expect(phoneRegex.test('+919876543210')).toBe(true);
            expect(phoneRegex.test('9876543210')).toBe(true);
            expect(phoneRegex.test('123')).toBe(false);
        });

        it('should validate password strength', () => {
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            expect(strongPasswordRegex.test('Test@123')).toBe(true);
            expect(strongPasswordRegex.test('weakpass')).toBe(false);
            expect(strongPasswordRegex.test('12345678')).toBe(false);
        });

        it('should validate UUID format', () => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            expect(uuidRegex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
            expect(uuidRegex.test('invalid-uuid')).toBe(false);
        });
    });

    describe('String Utilities', () => {
        it('should capitalize first letter', () => {
            const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

            expect(capitalize('hello')).toBe('Hello');
            expect(capitalize('WORLD')).toBe('World');
        });

        it('should slugify string', () => {
            const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

            expect(slugify('Hello World')).toBe('hello-world');
            expect(slugify('Test String 123')).toBe('test-string-123');
        });

        it('should truncate string', () => {
            const truncate = (str, length) => str.length > length ? str.slice(0, length) + '...' : str;

            expect(truncate('Hello World', 5)).toBe('Hello...');
            expect(truncate('Hi', 5)).toBe('Hi');
        });

        it('should generate random string', () => {
            const generateRandomString = (length) => Math.random().toString(36).substr(2, length);
            const random = generateRandomString(10);

            expect(random.length).toBeLessThanOrEqual(10);
            expect(typeof random).toBe('string');
        });
    });

    describe('Number Utilities', () => {
        it('should round to decimal places', () => {
            const round = (num, decimals) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

            expect(round(3.14159, 2)).toBe(3.14);
            expect(round(10.555, 2)).toBe(10.56);
        });

        it('should format currency', () => {
            const formatCurrency = (amount, currency = 'USD') => {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
            };

            expect(formatCurrency(1234.56)).toBe('$1,234.56');
        });

        it('should calculate percentage', () => {
            const calculatePercentage = (value, total) => ((value / total) * 100).toFixed(1);

            expect(calculatePercentage(25, 100)).toBe('25.0');
            expect(calculatePercentage(1, 3)).toBe('33.3');
        });
    });

    describe('Distance Calculations', () => {
        it('should calculate haversine distance', () => {
            const haversineDistance = (lat1, lng1, lat2, lng2) => {
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            // Mumbai to Delhi (~1150 km)
            const distance = haversineDistance(19.0760, 72.8777, 28.7041, 77.1025);
            expect(distance).toBeGreaterThan(1100);
            expect(distance).toBeLessThan(1200);
        });

        it('should check if point is within radius', () => {
            const isWithinRadius = (point, center, radiusKm) => {
                const R = 6371;
                const dLat = (point.lat - center.lat) * Math.PI / 180;
                const dLng = (point.lng - center.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(center.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return distance <= radiusKm;
            };

            const center = { lat: 19.0760, lng: 72.8777 }; // Mumbai
            const nearbyPoint = { lat: 19.0800, lng: 72.8800 }; // ~1km away
            const farPoint = { lat: 28.7041, lng: 77.1025 }; // Delhi

            expect(isWithinRadius(nearbyPoint, center, 5)).toBe(true);
            expect(isWithinRadius(farPoint, center, 5)).toBe(false);
        });
    });

    describe('Array Utilities', () => {
        it('should paginate array', () => {
            const paginate = (array, page, limit) => {
                const start = (page - 1) * limit;
                return array.slice(start, start + limit);
            };

            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            expect(paginate(items, 1, 3)).toEqual([1, 2, 3]);
            expect(paginate(items, 2, 3)).toEqual([4, 5, 6]);
            expect(paginate(items, 4, 3)).toEqual([10]);
        });

        it('should group by key', () => {
            const groupBy = (array, key) => array.reduce((acc, item) => {
                (acc[item[key]] = acc[item[key]] || []).push(item);
                return acc;
            }, {});

            const items = [
                { status: 'active', name: 'A' },
                { status: 'active', name: 'B' },
                { status: 'inactive', name: 'C' }
            ];

            const grouped = groupBy(items, 'status');
            expect(grouped.active).toHaveLength(2);
            expect(grouped.inactive).toHaveLength(1);
        });
    });
});
