const aiService = require("../services/aiService");
const profileService = require("../services/profileService");
const transactionService = require("../services/transactionService");

// GET /api/ai/overview
// Trả về healthScore, insights, spendingBreakdown, savingsRate trong 1 request
const getOverview = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile();
    const data = await aiService.getAIData(profile.monthlyBudget);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/health-score
const getHealthScore = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile();
    const transactions = await transactionService.getThisMonthTransactions();
    const score = aiService.computeHealthScore(transactions, profile.monthlyBudget);
    res.json({ success: true, data: { score } });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/spending-breakdown
const getSpendingBreakdown = async (req, res, next) => {
  try {
    const transactions = await transactionService.getThisMonthTransactions();
    const breakdown = aiService.computeSpendingBreakdown(transactions);
    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/chat
// Body: { query: string, lang: "vi" | "en" }
const chat = async (req, res, next) => {
  try {
    const { query, lang = "vi" } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu nội dung câu hỏi" });
    }

    const profile = await profileService.getProfile();
    const summary = await transactionService.computeSummary(profile.monthlyBudget);
    const transactions = await transactionService.getThisMonthTransactions();
    const healthScore = aiService.computeHealthScore(transactions, profile.monthlyBudget);

    const financialContext = { ...summary, healthScore };
    const reply = await aiService.chatWithAI(query.trim(), financialContext, lang);

    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getHealthScore, getSpendingBreakdown, chat };
