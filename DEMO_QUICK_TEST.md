# 🎯 Quick Start - Demo Mode Stripe Testing

## ⚡ 30-Second Setup

1. **Check `.env` already has:**
   ```env
   DEMO_MODE=true
   USE_REAL_STRIPE=false
   ENABLE_TEST_MODE=true
   ```
   ✅ **Already configured!**

2. **Start server:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Test endpoint (no JWT token needed!):**
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
       },
       "nickname": "My Card"
     }'
   ```

## ✅ All 12 Payment Endpoints Ready

| Endpoint | Method | Demo Status |
|----------|--------|-------------|
| Create Intent | POST `/api/v1/payments/intent` | ✅ Mock |
| Confirm Intent | POST `/api/v1/payments/confirm-intent` | ✅ Mock |
| Save Method | POST `/api/v1/payments/methods` | ✅ Mock |
| List Methods | GET `/api/v1/payments/methods` | ✅ Mock (2 cards) |
| Delete Method | DELETE `/api/v1/payments/methods/:id` | ✅ Mock |
| Set Default | PATCH `/api/v1/payments/methods/:id/default` | ✅ Mock |
| Charge Card | POST `/api/v1/payments/charge` | ✅ Mock |
| Refund | POST `/api/v1/payments/transactions/:id/refund` | ✅ Mock |
| Get Transactions | GET `/api/v1/payments/transactions` | ✅ Mock (2 txns) |
| Get Transaction | GET `/api/v1/payments/transactions/:id` | ✅ Mock |
| Pay Invoice | POST `/api/v1/payments/invoice/:id/pay` | ✅ Mock |
| Webhook | POST `/api/v1/payments/webhook` | ✅ Mock |

## 🧪 Recommended Test Flow

```bash
# 1. Save a payment method
POST /api/v1/payments/methods
{
  "type": "card",
  "card": {"number": "4242424242424242", "exp_month": 12, "exp_year": 2025, "cvc": "123"}
}

# 2. List payment methods
GET /api/v1/payments/methods

# 3. Create payment intent
POST /api/v1/payments/intent
{
  "invoiceId": "test-invoice-123",
  "amount": 5000,
  "currency": "inr"
}

# 4. Confirm payment intent
POST /api/v1/payments/confirm-intent
{
  "paymentIntentId": "pi_demo_xxx",
  "paymentMethodId": "pm_demo_xxx"
}

# 5. Charge with method
POST /api/v1/payments/charge
{
  "invoiceId": "test-invoice-123",
  "amount": 5000,
  "stripePaymentMethodId": "pm_demo_xxx"
}

# 6. List transactions
GET /api/v1/payments/transactions

# 7. Get transaction details
GET /api/v1/payments/transactions/txn_demo_xxx

# 8. Process refund
POST /api/v1/payments/transactions/txn_demo_xxx/refund
{
  "amount": 2500,
  "reason": "Customer requested"
}
```

## 📊 Demo Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Action completed",
  "data": {
    // Mock IDs with realistic prefixes
    "id": "pi_demo_1705305600000_abc123",
    "status": "succeeded",
    // Other realistic fields
  }
}
```

## 🔄 Switch to Real Stripe Later

When ready for production:

```env
DEMO_MODE=false
USE_REAL_STRIPE=true
```

Restart: `npm run dev`

All endpoints will use real Stripe API keys.

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Getting "Invalid token" | Restart server - DEMO_MODE should bypass JWT |
| Getting Stripe errors | Check DEMO_MODE=true in .env |
| No response from endpoints | Verify server running: `npm run dev` |
| Mock IDs look wrong | IDs include timestamp - this is correct! |

## 📝 Documentation

- **Full Guide**: [DEMO_MODE_SETUP.md](./DEMO_MODE_SETUP.md)
- **Stripe API**: [src/services/stripeService.js](./backend/src/services/stripeService.js)
- **Payment Controller**: [src/controllers/payment.controller.js](./backend/src/controllers/payment.controller.js)

---

**Status**: ✅ Demo Mode Active - All endpoints returning mock responses
