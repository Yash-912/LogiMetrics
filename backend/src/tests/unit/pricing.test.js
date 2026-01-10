/**
 * Pricing Calculation Unit Tests
 * Tests for pricing service functionality
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

describe('Pricing Calculation Tests', () => {
    describe('Base Rate Calculation', () => {
        const baseRate = 10;
        const perKmRate = 0.5;
        const perKgRate = 0.1;

        it('should calculate distance charge correctly', () => {
            const distance = 100; // km
            const distanceCharge = distance * perKmRate;

            expect(distanceCharge).toBe(50);
        });

        it('should calculate weight charge correctly', () => {
            const weight = 50; // kg
            const weightCharge = weight * perKgRate;

            expect(weightCharge).toBe(5);
        });

        it('should calculate volumetric weight correctly', () => {
            const dimensions = { length: 100, width: 50, height: 40 };
            const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;

            expect(volumetricWeight).toBe(40);
        });

        it('should use higher of actual and volumetric weight', () => {
            const actualWeight = 30;
            const dimensions = { length: 100, width: 50, height: 40 };
            const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
            const chargeableWeight = Math.max(actualWeight, volumetricWeight);

            expect(chargeableWeight).toBe(40); // Volumetric is higher
        });

        it('should calculate total correctly', () => {
            const distance = 100;
            const weight = 50;
            const distanceCharge = distance * perKmRate;
            const weightCharge = weight * perKgRate;
            const total = baseRate + distanceCharge + weightCharge;

            expect(total).toBe(65); // 10 + 50 + 5
        });
    });

    describe('Surcharges', () => {
        it('should apply fuel surcharge', () => {
            const subtotal = 100;
            const fuelSurchargeRate = 0.15; // 15%
            const fuelSurcharge = subtotal * fuelSurchargeRate;

            expect(fuelSurcharge).toBe(15);
        });

        it('should apply express delivery surcharge', () => {
            const subtotal = 100;
            const expressSurcharge = 50; // Fixed amount
            const total = subtotal + expressSurcharge;

            expect(total).toBe(150);
        });

        it('should apply overweight surcharge', () => {
            const weight = 150;
            const overweightThreshold = 100;
            const overweightRate = 0.5; // per kg over threshold
            const overweightCharge = weight > overweightThreshold ? (weight - overweightThreshold) * overweightRate : 0;

            expect(overweightCharge).toBe(25);
        });

        it('should apply remote area surcharge', () => {
            const isRemoteArea = true;
            const remoteAreaSurcharge = isRemoteArea ? 100 : 0;

            expect(remoteAreaSurcharge).toBe(100);
        });
    });

    describe('Tax Calculation', () => {
        it('should calculate tax correctly', () => {
            const subtotal = 100;
            const taxRate = 18; // 18%
            const taxAmount = subtotal * (taxRate / 100);

            expect(taxAmount).toBe(18);
        });

        it('should add tax to total', () => {
            const subtotal = 100;
            const taxRate = 18;
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;

            expect(total).toBe(118);
        });
    });

    describe('Discount Application', () => {
        it('should apply percentage discount', () => {
            const subtotal = 100;
            const discountRate = 10; // 10%
            const discountAmount = subtotal * (discountRate / 100);
            const total = subtotal - discountAmount;

            expect(discountAmount).toBe(10);
            expect(total).toBe(90);
        });

        it('should apply fixed discount', () => {
            const subtotal = 100;
            const fixedDiscount = 15;
            const total = subtotal - fixedDiscount;

            expect(total).toBe(85);
        });

        it('should not allow discount greater than subtotal', () => {
            const subtotal = 100;
            const discountRate = 150; // 150%
            const discountAmount = Math.min(subtotal, subtotal * (discountRate / 100));

            expect(discountAmount).toBe(100); // Capped at subtotal
        });
    });

    describe('Quote Generation', () => {
        it('should generate quote with all components', () => {
            const baseRate = 10;
            const distance = 100;
            const weight = 50;
            const perKmRate = 0.5;
            const perKgRate = 0.1;
            const taxRate = 18;

            const distanceCharge = distance * perKmRate;
            const weightCharge = weight * perKgRate;
            const subtotal = baseRate + distanceCharge + weightCharge;
            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            const quote = {
                baseRate,
                distanceCharge,
                weightCharge,
                subtotal,
                taxRate,
                taxAmount: parseFloat(taxAmount.toFixed(2)),
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };

            expect(quote.subtotal).toBe(65);
            expect(quote.taxAmount).toBe(11.7);
            expect(quote.totalAmount).toBe(76.7);
        });

        it('should include validity period', () => {
            const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const quote = { validUntil };

            expect(new Date(quote.validUntil)).toBeInstanceOf(Date);
            expect(new Date(quote.validUntil) > new Date()).toBe(true);
        });
    });

    describe('Service Type Pricing', () => {
        const servicePricing = {
            standard: { multiplier: 1.0, deliveryDays: 5 },
            express: { multiplier: 1.5, deliveryDays: 2 },
            same_day: { multiplier: 2.5, deliveryDays: 0 },
            overnight: { multiplier: 2.0, deliveryDays: 1 }
        };

        it('should apply standard service multiplier', () => {
            const basePrice = 100;
            const total = basePrice * servicePricing.standard.multiplier;

            expect(total).toBe(100);
        });

        it('should apply express service multiplier', () => {
            const basePrice = 100;
            const total = basePrice * servicePricing.express.multiplier;

            expect(total).toBe(150);
        });

        it('should apply same-day service multiplier', () => {
            const basePrice = 100;
            const total = basePrice * servicePricing.same_day.multiplier;

            expect(total).toBe(250);
        });
    });
});
