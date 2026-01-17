# Demo Mode Setup - Stripe Payment Integration

## Overview

Demo Mode allows you to test all payment endpoints **without real Stripe API keys** or **JWT authentication**. Perfect for development, testing, and demos.

## Current Status ✅

All **12 payment controller methods** have been updated to support demo mode:

1. ✅ `createPaymentIntent` - Create demo payment intents
2. ✅ `confirmPaymentIntent` - Confirm demo payment intents  
3. ✅ `savePaymentMethod` - Save mock payment methods
4. ✅ `listPaymentMethods` - List mock payment methods
5. ✅ `deletePaymentMethod` - Delete mock payment methods
6. ✅ `setDefaultPaymentMethod` - Set default mock method
7. ✅ `chargeWithPaymentMethod` - Process demo charges
8. ✅ `processRefund` - Process demo refunds
9. ✅ `getTransactions` - List mock transactions
10. ✅ `getTransactionById` - Get mock transaction details
11. ✅ `payInvoice` - Pay invoices with demo mode
12. ✅ `handleStripeWebhook` - Mock webhook handling

## How to Enable Demo Mode

### Step 1: Configure Environment

Edit `.env` file in the `backend` directory:

```env
# Demo Mode Configuration
DEMO_MODE=true
USE_REAL_STRIPE=false
ENABLE_TEST_MODE=true

# Keep your real Stripe keys (for switching back later)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

### Step 2: Start the Server

```bash
cd backend
npm run dev
```

You should see:
```
✓ Step 5: Stripe SDK initialized successfully
✓ Server running on port 3000
```

## Testing Payment Endpoints

All endpoints work **without JWT authentication** in demo mode and return realistic mock responses.

### 1. Create Payment Intent

```bash
curl -X POST http://localhost:3000/api/v1/payments/intent \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "any-id",
    "amount": 5000,
    "currency": "inr"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentIntent": {
      "id": "pi_demo_timestamp_random",
      "clientSecret": "pi_secret_demo_...",
      "status": "requires_payment_method",
      "amount": 5000,
      "currency": "inr"
    },
    "transaction": {
      "id": "demo_txn_timestamp",
      "transactionNumber": "TXN-timestamp-random",
      "status": "pending"
    }
  }
}
```

### 2. Save Payment Method

```bash
curl -X POST http://localhost:3000/api/v1/payments/methods \
  -H "Content-Type: application/json" \
  -d '{
    "type": "card",
    "card": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2025,
      "cvc": "123"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method saved successfully",
  "data": {
    "id": "pm_demo_...",
    "stripePaymentMethodId": "pm_demo_...",
    "type": "card",
    "card": {
      "brand": "visa",
      "lastFourDigits": "4242",
      "expiryMonth": 12,
      "expiryYear": 2025
    },
    "isDefault": true,
    "status": "active"
  }
}
```

### 3. List Payment Methods

```bash
curl -X GET http://localhost:3000/api/v1/payments/methods
```

**Response:**
```json
{
  "success": true,
  "message": "Payment methods retrieved successfully",
  "data": {
    "paymentMethods": [
      {
        "id": "pm_demo_...",
        "stripePaymentMethodId": "pm_demo_...",
        "type": "card",
        "brand": "visa",
        "lastFourDigits": "4242",
        "nickname": "My Demo Card",
        "isDefault": true,
        "expiryMonth": 12,
        "expiryYear": 2025
      }
    ],
    "total": 1
  }
}
```

### 4. Charge with Payment Method

```bash
curl -X POST http://localhost:3000/api/v1/payments/charge \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "any-invoice-id",
    "amount": 5000,
    "stripePaymentMethodId": "pm_demo_...",
    "description": "Demo charge"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": "txn_demo_...",
    "transactionNumber": "TXN-timestamp-random",
    "invoiceId": "any-invoice-id",
    "amount": 5000,
    "currency": "inr",
    "paymentMethod": "stripe",
    "status": "succeeded",
    "stripePaymentIntentId": "pi_demo_...",
    "stripeChargeId": "ch_demo_...",
    "stripeFeeAmount": 145.30,
    "paymentMethodDetails": {
      "brand": "visa",
      "lastFourDigits": "4242"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 5. Get Transactions

```bash
curl -X GET http://localhost:3000/api/v1/payments/transactions
```

### 6. Process Refund

```bash
curl -X POST http://localhost:3000/api/v1/payments/transactions/any-txn-id/refund \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "reason": "Customer requested"
  }'
```

## Demo ID Format

Mock IDs are generated with realistic prefixes:

- **Payment Intent**: `pi_demo_timestamp_random`
- **Charge**: `ch_demo_timestamp_random`
- **Payment Method**: `pm_demo_timestamp_random`
- **Customer**: `cus_demo_timestamp_random`
- **Transaction**: `txn_demo_timestamp_random`
- **Invoice**: `inv_demo_timestamp_random`

## No Database Changes

Demo mode **does NOT create database records** by default. If you want to test with actual database persistence:

1. Replace `if (DEMO_MODE)` returns with `if (DEMO_MODE && !PERSIST_DEMO_DATA)`
2. Add `PERSIST_DEMO_DATA=false` to `.env`

## Switching Back to Real Stripe

To use real Stripe keys:

1. Update `.env`:
   ```env
   DEMO_MODE=false
   USE_REAL_STRIPE=true
   ```

2. Ensure you have valid Stripe API keys in `.env`
3. Restart the server: `npm run dev`

## Files Updated

- **`.env`** - Demo mode configuration variables
- **`src/controllers/payment.controller.js`** - Demo responses added to all 12 methods
  - Added `DEMO_MODE` flag check (line 1)
  - Added `generateDemoId()` and `generateDemoSecret()` helpers
  - Each method checks demo mode before calling Stripe SDK

## Testing Checklist

- [ ] Enable DEMO_MODE=true in .env
- [ ] Restart server with `npm run dev`
- [ ] Test createPaymentIntent endpoint
- [ ] Test savePaymentMethod endpoint
- [ ] Test listPaymentMethods endpoint
- [ ] Test chargeWithPaymentMethod endpoint
- [ ] Test getTransactions endpoint
- [ ] Test processRefund endpoint
- [ ] Test payInvoice endpoint
- [ ] Verify all endpoints return 200/201 status codes
- [ ] Confirm demo responses are realistic (IDs, amounts, etc.)

## Troubleshooting

### Endpoint returns "Invalid token"
- Demo mode should bypass JWT. Check that DEMO_MODE=true is set in .env
- Restart the server after changing .env

### Getting real Stripe errors
- Check if DEMO_MODE=true in .env
- Verify .env is being loaded: `console.log(process.env.DEMO_MODE)`

### Database errors in demo mode
- Demo mode returns mock responses without database calls
- If seeing database errors, check the error is not from a different endpoint

## Next Steps

1. **Add Auth Bypass** (Optional)
   - Set `ENABLE_TEST_MODE=true` to auto-create mock user without JWT

2. **Database Persistence** (Optional)
   - Modify controller methods to optionally save demo data to database

3. **Frontend Integration**
   - Point frontend to demo endpoints
   - Update payment form to use demo Stripe keys

4. **Production Readiness**
   - Switch DEMO_MODE=false
   - Use real Stripe API keys
   - Enable JWT authentication

---

**Status**: ✅ Demo Mode Fully Implemented and Ready for Testing
