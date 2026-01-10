const chatBotService = require("../services/chatbot.service");
const ChatHistory = require("../models/mongodb/ChatHistory");
const logger = require("../config/logger");

/**
 * ChatBot Controller
 * Handles all chatbot API endpoints
 */

/**
 * POST /api/chatbot/message
 * Send a message to the chatbot
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_MESSAGE",
        message: "Message cannot be empty",
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: "MESSAGE_TOO_LONG",
        message: "Message must be less than 500 characters",
      });
    }

    // Save user message
    await chatBotService.saveChatMessage(
      conversationId,
      userId,
      companyId,
      "user",
      message
    );

    // Detect intent
    const intent = await chatBotService.detectIntent(message, userId, companyId);

    // Fetch context data (RAG)
    const contextData = await chatBotService.fetchContextData(
      intent,
      message,
      companyId,
      userId
    );

    // Get conversation history
    const conversationHistory = await chatBotService.getConversationHistory(
      conversationId,
      userId,
      companyId,
      10
    );

    // Build prompt
    const prompt = chatBotService.buildPrompt(
      message,
      contextData,
      conversationHistory
    );

    // Call Hugging Face API
    const startTime = Date.now();
    const aiResponse = await chatBotService.callHuggingFaceAPI(prompt);
    const totalProcessingTime = Date.now() - startTime;

    if (!aiResponse.success) {
      logger.warn(`ChatBot API failed: ${aiResponse.error}`);
      // Still save the attempted response
      await chatBotService.saveChatMessage(
        conversationId,
        userId,
        companyId,
        "assistant",
        aiResponse.message,
        "unknown",
        {
          error: aiResponse.error,
          tokensUsed: 0,
          processingTime: totalProcessingTime,
        }
      );

      return res.status(503).json({
        success: false,
        error: aiResponse.error,
        message: aiResponse.message,
      });
    }

    // Save assistant response
    await chatBotService.saveChatMessage(
      conversationId,
      userId,
      companyId,
      "assistant",
      aiResponse.message,
      intent,
      {
        dataAccessed: contextData.data.map((d) => d._id || d.id || ""),
        tokensUsed: aiResponse.tokensUsed,
        processingTime: totalProcessingTime,
      }
    );

    logger.info(
      `ChatBot response generated for user ${userId} in ${totalProcessingTime}ms`
    );

    return res.status(200).json({
      success: true,
      conversationId,
      message: aiResponse.message,
      intent,
      processingTime: totalProcessingTime,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    logger.error("ChatBot sendMessage error:", error);
    res.status(500).json({
      success: false,
      error: "CHATBOT_ERROR",
      message: "Failed to process your message",
    });
  }
};

/**
 * GET /api/chatbot/history/:conversationId
 * Get chat history for a conversation
 */
exports.getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const chatHistory = await ChatHistory.findOne(
      {
        conversationId,
        userId,
        companyId,
      },
      { messages: { $slice: -limit } }
    ).lean();

    if (!chatHistory) {
      return res.status(404).json({
        success: false,
        error: "CONVERSATION_NOT_FOUND",
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversationId,
      messages: chatHistory.messages,
      messageCount: chatHistory.messages.length,
    });
  } catch (error) {
    logger.error("ChatBot getHistory error:", error);
    res.status(500).json({
      success: false,
      error: "CHATBOT_ERROR",
      message: "Failed to fetch chat history",
    });
  }
};

/**
 * GET /api/chatbot/conversations
 * Get all conversations for the user
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const { limit = 20, skip = 0 } = req.query;

    const conversations = await ChatHistory.find(
      {
        userId,
        companyId,
        status: "active",
      },
      {
        conversationId: 1,
        createdAt: 1,
        lastActivity: 1,
        "messages.0": 1,
        summary: 1,
      }
    )
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await ChatHistory.countDocuments({
      userId,
      companyId,
      status: "active",
    });

    return res.status(200).json({
      success: true,
      conversations: conversations.map((conv) => ({
        conversationId: conv.conversationId,
        createdAt: conv.createdAt,
        lastActivity: conv.lastActivity,
        summary: conv.summary || "Untitled conversation",
        messageCount: conv.messages?.length || 0,
      })),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    logger.error("ChatBot getConversations error:", error);
    res.status(500).json({
      success: false,
      error: "CHATBOT_ERROR",
      message: "Failed to fetch conversations",
    });
  }
};

/**
 * DELETE /api/chatbot/conversation/:conversationId
 * Archive/delete a conversation
 */
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const result = await ChatHistory.findOneAndUpdate(
      {
        conversationId,
        userId,
        companyId,
      },
      {
        status: "archived",
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "CONVERSATION_NOT_FOUND",
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation archived",
      conversationId,
    });
  } catch (error) {
    logger.error("ChatBot deleteConversation error:", error);
    res.status(500).json({
      success: false,
      error: "CHATBOT_ERROR",
      message: "Failed to delete conversation",
    });
  }
};

/**
 * POST /api/chatbot/conversation/new
 * Start a new conversation
 */
exports.startNewConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chatHistory = new ChatHistory({
      userId,
      companyId,
      conversationId,
      messages: [],
      status: "active",
    });

    await chatHistory.save();

    return res.status(201).json({
      success: true,
      message: "New conversation started",
      conversationId,
    });
  } catch (error) {
    logger.error("ChatBot startNewConversation error:", error);
    res.status(500).json({
      success: false,
      error: "CHATBOT_ERROR",
      message: "Failed to start new conversation",
    });
  }
};
