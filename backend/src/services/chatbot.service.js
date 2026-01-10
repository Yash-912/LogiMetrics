const axios = require("axios");
const logger = require("../config/logger");
const ChatHistory = require("../models/mongodb/ChatHistory");
const Shipment = require("../models/mongodb/Shipment");
const Driver = require("../models/mongodb/Driver");
const Vehicle = require("../models/mongodb/Vehicle");
const Invoice = require("../models/mongodb/Invoice");
const Route = require("../models/mongodb/Route");

/**
 * ChatBot Service - Handles AI interactions with Hugging Face
 */
class ChatBotService {
  constructor() {
    this.hfApiKey = process.env.HUGGING_FACE_API_KEY;
    this.hfModel = process.env.HF_MODEL || "openchat/openchat_3.5";
    this.hfApiUrl = `https://api-inference.huggingface.co/models/${this.hfModel}`;
    this.maxTokens = 512;
    this.conversationWindow = 10; // Keep last 10 messages for context
  }

  /**
   * Intent Detection - Determines what the user is asking about
   * Uses simple keyword matching + LLM fallback
   */
  async detectIntent(userMessage, userId, companyId) {
    const msg = userMessage.toLowerCase();

    // Simple intent detection (fast path)
    const intents = {
      query_shipment: [
        "shipment",
        "delivery",
        "order",
        "cargo",
        "tracking",
        "where is",
      ],
      query_driver: ["driver", "chauffeur", "operator", "crew", "who is"],
      query_vehicle: ["vehicle", "truck", "car", "bus", "fleet", "how many"],
      query_invoice: ["invoice", "billing", "bill", "payment", "charge", "balance", "outstanding", "owed"],
      query_route: ["route", "path", "destination", "way", "direction"],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((kw) => msg.includes(kw))) {
        return intent;
      }
    }

    return "general_question";
  }

  /**
   * Retrieval Augmented Generation (Light RAG)
   * Fetches relevant data from MongoDB based on intent
   */
  async fetchContextData(intent, userMessage, companyId, userId) {
    const context = {
      intent,
      data: [],
      summary: "",
    };

    try {
      const limit = 3; // Limit results to avoid huge prompts

      switch (intent) {
        case "query_shipment":
          const shipments = await Shipment.find({
            companyId,
            status: { $ne: "cancelled" },
          })
            .limit(limit)
            .select("shipmentNumber status sourceLocation destination lastLocation eta")
            .lean();
          context.data = shipments;
          context.summary = this.summarizeShipments(shipments);
          break;

        case "query_driver":
          const drivers = await Driver.find({ companyId, status: "active" })
            .limit(limit)
            .select("name contactNumber assignedVehicle currentLocation status")
            .lean();
          context.data = drivers;
          context.summary = this.summarizeDrivers(drivers);
          break;

        case "query_vehicle":
          const vehicles = await Vehicle.find({ companyId })
            .limit(limit)
            .select("registrationNumber type status currentLocation assignedDriver")
            .lean();
          context.data = vehicles;
          context.summary = this.summarizeVehicles(vehicles);
          break;

        case "query_invoice":
          const invoices = await Invoice.find({ companyId })
            .limit(limit)
            .select("invoiceNumber amount status dueDate shipmentId")
            .lean();
          context.data = invoices;
          context.summary = this.summarizeInvoices(invoices);
          break;

        case "query_route":
          const routes = await Route.find({ companyId })
            .limit(limit)
            .select("routeName origin destination distance estimatedTime")
            .lean();
          context.data = routes;
          context.summary = this.summarizeRoutes(routes);
          break;

        default:
          context.summary = "General question - no specific data context needed";
      }
    } catch (error) {
      logger.error(`Error fetching context for intent ${intent}:`, error);
    }

    return context;
  }

  /**
   * Build prompt for Hugging Face API
   */
  buildPrompt(userMessage, contextData, conversationHistory) {
    const systemPrompt = `You are a helpful logistics assistant for LogiMetrics. 
You help users with shipment tracking, driver management, vehicle status, invoicing, and route planning.
Be concise, professional, and always cite specific data when available.
If you don't know something, say so clearly.
Format responses in markdown when appropriate (use bullet points, tables for clarity).`;

    // Build context section
    let contextSection = "";
    if (contextData.summary) {
      contextSection = `\nContext Data:\n${contextData.summary}\n`;
    }

    // Build conversation history (last 5 exchanges for memory)
    let historySection = "";
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      historySection = "\nRecent Conversation:\n";
      recentHistory.forEach((msg) => {
        historySection += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      });
    }

    const fullPrompt = `${systemPrompt}${historySection}${contextSection}\nUser: ${userMessage}\nAssistant:`;
    return fullPrompt;
  }

  /**
   * Call Hugging Face Inference API
   */
  async callHuggingFaceAPI(prompt) {
    try {
      const startTime = Date.now();

      const response = await axios.post(
        this.hfApiUrl,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: this.maxTokens,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.hfApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 seconds
        }
      );

      const processingTime = Date.now() - startTime;

      if (!response.data || !response.data[0]) {
        throw new Error("Invalid response from Hugging Face API");
      }

      const assistantMessage = response.data[0].generated_text?.trim();

      return {
        success: true,
        message: assistantMessage,
        processingTime,
        tokensUsed: response.data[0].generated_tokens || 0,
      };
    } catch (error) {
      logger.error("Hugging Face API Error:", error.message);

      // Return fallback response
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return {
          success: false,
          message: "The AI service is taking longer than expected. Please try again.",
          error: "TIMEOUT",
        };
      }

      return {
        success: false,
        message:
          "I'm having trouble processing your request. Please try again later.",
        error: "API_ERROR",
      };
    }
  }

  /**
   * Save chat message to MongoDB
   */
  async saveChatMessage(
    conversationId,
    userId,
    companyId,
    role,
    content,
    intent = "unknown",
    metadata = {}
  ) {
    try {
      const filter = {
        conversationId,
        userId,
        companyId,
      };

      const update = {
        $push: {
          messages: {
            role,
            content,
            intent,
            metadata,
          },
        },
        $set: {
          lastActivity: new Date(),
        },
      };

      const options = { upsert: true, new: true };

      const chatHistory = await ChatHistory.findOneAndUpdate(
        filter,
        update,
        options
      );

      return chatHistory;
    } catch (error) {
      logger.error("Error saving chat message:", error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId, userId, companyId, limit = 10) {
    try {
      const chatHistory = await ChatHistory.findOne(
        {
          conversationId,
          userId,
          companyId,
        },
        { messages: { $slice: -limit } } // Get last N messages
      );

      return chatHistory?.messages || [];
    } catch (error) {
      logger.error("Error fetching conversation history:", error);
      return [];
    }
  }

  /**
   * Helper functions to summarize data
   */
  summarizeShipments(shipments) {
    if (!shipments.length) return "No active shipments found.";
    return (
      "Recent Shipments:\n" +
      shipments
        .map(
          (s) =>
            `- ${s.shipmentNumber}: ${s.status} | ETA: ${s.eta || "N/A"} | From: ${s.sourceLocation} To: ${s.destination}`
        )
        .join("\n")
    );
  }

  summarizeDrivers(drivers) {
    if (!drivers.length) return "No drivers available.";
    return (
      "Active Drivers:\n" +
      drivers
        .map(
          (d) =>
            `- ${d.name} | Vehicle: ${d.assignedVehicle || "Unassigned"} | Location: ${d.currentLocation}`
        )
        .join("\n")
    );
  }

  summarizeVehicles(vehicles) {
    if (!vehicles.length) return "No vehicles in fleet.";
    return (
      "Fleet Vehicles:\n" +
      vehicles
        .map(
          (v) =>
            `- ${v.registrationNumber} (${v.type}): ${v.status} | Driver: ${v.assignedDriver || "Unassigned"}`
        )
        .join("\n")
    );
  }

  summarizeInvoices(invoices) {
    if (!invoices.length) return "No invoices.";
    return (
      "Recent Invoices:\n" +
      invoices
        .map(
          (inv) =>
            `- ${inv.invoiceNumber}: $${inv.amount} | ${inv.status} | Due: ${inv.dueDate}`
        )
        .join("\n")
    );
  }

  summarizeRoutes(routes) {
    if (!routes.length) return "No routes found.";
    return (
      "Active Routes:\n" +
      routes
        .map(
          (r) =>
            `- ${r.routeName}: ${r.origin} → ${r.destination} | ${r.distance}km | ETA: ${r.estimatedTime}h`
        )
        .join("\n")
    );
  }
}

module.exports = new ChatBotService();
