# ChatBot Integration Guide

## Setup Instructions

### 1. Get Hugging Face API Token

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Navigate to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy your token

### 2. Configure Backend

**Step 1:** Add environment variables to `.env`:

```bash
HUGGING_FACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx
HF_MODEL=openchat/openchat_3.5
CHATBOT_RATE_LIMIT_MAX=20
```

**Step 2:** Install dependencies (if needed):

```bash
# Already in package.json, but verify:
npm install axios
npm install rate-limit-redis
npm install mongoose
```

**Step 3:** The chatbot service is already integrated:
- Routes: `/src/routes/chatbot.routes.js`
- Controller: `/src/controllers/chatbot.controller.js`
- Service: `/src/services/chatbot.service.js`
- Model: `/src/models/mongodb/ChatHistory.js`

### 3. Add to Frontend

**Step 1:** Install required packages:

```bash
cd frontend/logimatrix-app
npm install react-markdown
npm install react-toastify
```

**Step 2:** Import and use ChatBot widget in your main layout:

```jsx
// In your main App.jsx or Layout component
import ChatBotWidget from './components/ChatBotWidget';

function App() {
  const { user, token } = useAuth(); // Your auth context

  return (
    <div>
      {/* Your existing content */}
      <ChatBotWidget
        userId={user?.id}
        companyId={user?.companyId}
        token={token}
      />
    </div>
  );
}
```

### 4. API Endpoints

#### Start New Conversation
```
POST /api/chatbot/conversation/new
Headers: Authorization: Bearer <token>
Response: { conversationId: "conv_xxx" }
```

#### Send Message
```
POST /api/chatbot/message
Headers: Authorization: Bearer <token>
Body: {
  "message": "What are my active shipments?",
  "conversationId": "conv_xxx"
}
Response: {
  "success": true,
  "message": "AI response...",
  "intent": "query_shipment",
  "processingTime": 1523
}
```

#### Get Chat History
```
GET /api/chatbot/history/:conversationId
Headers: Authorization: Bearer <token>
```

#### Get All Conversations
```
GET /api/chatbot/conversations?limit=20&skip=0
Headers: Authorization: Bearer <token>
```

#### Delete Conversation
```
DELETE /api/chatbot/conversation/:conversationId
Headers: Authorization: Bearer <token>
```

### 5. Features Implemented

✅ **Intent Detection** - Automatically identifies: shipment, driver, vehicle, invoice, route queries
✅ **Light RAG** - Fetches relevant data from MongoDB based on intent
✅ **Chat History** - Stores all conversations per user/company
✅ **Rate Limiting** - 20 messages/minute per user (configurable)
✅ **Error Handling** - Graceful fallbacks if API fails
✅ **Markdown Support** - AI responses rendered with formatting
✅ **User Context** - Company-scoped, role-aware responses
✅ **Processing Time Display** - Shows AI response latency
✅ **Floating Widget** - Non-intrusive bottom-right chat button
✅ **Conversation Management** - Create, view, archive conversations

### 6. Testing

**Test in Backend:**
```bash
# Test chatbot with curl
curl -X POST http://localhost:3000/api/chatbot/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are my active shipments?",
    "conversationId": "test_conv_123"
  }'
```

**Test in Frontend:**
1. Navigate to any page with the ChatBot widget
2. Click the chat icon (bottom-right)
3. Send a message like "Show me active shipments"
4. Wait for AI response

### 7. Customization

**Change Intent Detection Keywords:**
Edit `src/services/chatbot.service.js` → `detectIntent()` method

**Modify System Prompt:**
Edit `src/services/chatbot.service.js` → `buildPrompt()` method

**Adjust Rate Limiting:**
Edit `src/middleware/chatbot.rateLimit.middleware.js` → `max` parameter

**Add More Data Access:**
Edit `src/services/chatbot.service.js` → `fetchContextData()` method

### 8. Cost Optimization

**Hugging Face Inference API Pricing:**
- Free tier: Limited requests/day
- Pro: $9/month for unlimited inference
- Based on token usage

**Tips to Reduce Costs:**
1. ✅ Done: Light RAG (not full vector DB)
2. ✅ Done: Rate limiting (prevent abuse)
3. Consider: Shorter conversation history window (currently 10 messages)
4. Consider: Cache common queries using Redis

### 9. Troubleshooting

**Issue: Rate limit exceeded**
- Check `CHATBOT_RATE_LIMIT_MAX` in .env
- Redis connection must be active

**Issue: Model timeout**
- Increase timeout: `CHATBOT_TIMEOUT=40000`
- Check HF API status page

**Issue: No data context**
- Verify MongoDB collections are indexed
- Check user/company permissions in models

**Issue: CORS errors**
- Ensure `FRONTEND_URL` in .env matches your frontend domain

### 10. Production Checklist

- [ ] Set strong rate limit (reduce to 10/minute)
- [ ] Enable conversation encryption for sensitive data
- [ ] Set up monitoring for API failures
- [ ] Implement conversation archival after 30 days
- [ ] Add analytics for chatbot usage
- [ ] Set up audit logging for data access via chatbot
- [ ] Test with production data sample
- [ ] Configure Hugging Face API quotas

---

**Need help?** Check the implementation files:
- Backend service: `backend/src/services/chatbot.service.js`
- Frontend widget: `frontend/logimatrix-app/src/components/ChatBotWidget.jsx`
- API routes: `backend/src/routes/chatbot.routes.js`
