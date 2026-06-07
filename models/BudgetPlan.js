const mongoose = require("mongoose");

const customCatSchema = new mongoose.Schema(
  {
    id:    { type: String, required: true },
    vi:    { type: String, required: true },
    en:    { type: String, required: true },
    emoji: { type: String, required: true },
    type:  { type: String, enum: ["expense", "income"], required: true },
  },
  { _id: false }
);

const budgetPlanSchema = new mongoose.Schema(
  {
    month:            { type: Number, required: true }, // 1–12
    year:             { type: Number, required: true },
    monthlyIncome:    { type: Number, default: 0 },
    monthlyBudget:    { type: Number, default: 0 },
    monthlySavings:   { type: Number, default: 0 },
    otherPlan:        { type: String, default: "" },
    categoryBudgets:  { type: Map, of: Number, default: {} },  // catId → amount
    categoryNames:    { type: Map, of: String, default: {} },  // catId → custom name
    customCategories: { type: [customCatSchema], default: [] },
  },
  { timestamps: true }
);

budgetPlanSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("BudgetPlan", budgetPlanSchema);
