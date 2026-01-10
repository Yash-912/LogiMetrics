const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      enum: [
        "query_shipment",
        "query_driver",
        "query_vehicle",
        "query_invoice",
        "query_route",
        "general_question",
        "unknown",
      ],
      default: "unknown",
    },
    metadata: {
      dataAccessed: [String], // e.g., ["shipment_SHP-001", "driver_DRV-001"]
      tokensUsed: Number,
      processingTime: Number, // ms
    },
  },
  { timestamps: true }
);

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      default: () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    messages: [chatMessageSchema],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    summary: String, // AI-generated conversation summary
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
chatHistorySchema.index({ userId: 1, companyId: 1, lastActivity: -1 });
chatHistorySchema.index({ conversationId: 1 });

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
