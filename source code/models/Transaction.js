const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String, // emoji icon
      required: true,
    },
    catLabel: {
      vi: { type: String, required: true },
      en: { type: String, required: true },
    },
    note: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index để query nhanh theo date
transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
