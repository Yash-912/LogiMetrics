const express = require("express");
const router = express.Router();
const chatBotController = require("../controllers/chatbot.controller");
const { authenticate } = require("../middleware/auth.middleware");
const chatBotRateLimiter = require("../middleware/chatbot.rateLimit.middleware");

/**
 * ChatBot Routes
 * All routes require authentication
 */

// Protect all chatbot routes with auth
router.use(authenticate);

/**
 * POST /api/chatbot/message
 * Send a message to the chatbot
 */
router.post(
  "/message",
  chatBotRateLimiter,
  chatBotController.sendMessage
);

/**
 * POST /api/chatbot/conversation/new
 * Start a new conversation
 */
router.post("/conversation/new", chatBotController.startNewConversation);

/**
 * GET /api/chatbot/conversations
 * Get all conversations for the user
 */
router.get("/conversations", chatBotController.getConversations);

/**
 * GET /api/chatbot/history/:conversationId
 * Get chat history for a conversation
 */
router.get("/history/:conversationId", chatBotController.getHistory);

/**
 * DELETE /api/chatbot/conversation/:conversationId
 * Archive/delete a conversation
 */
router.delete(
  "/conversation/:conversationId",
  chatBotController.deleteConversation
);

module.exports = router;
