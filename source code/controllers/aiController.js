const aiService = require("../services/aiService");
const transactionService = require("../services/transactionService");
const BudgetPlan = require("../models/BudgetPlan");

// Lấy ngân sách tháng hiện tại từ BudgetPlan (do người dùng nhập)
const getCurrentMonthlyBudget = async () => {
  const now = new Date();
  const plan = await BudgetPlan.findOne({
    month: now.getMonth() + 1,
    year:  now.getFullYear(),
  });
  return plan?.monthlyBudget ?? 0;
};

// GET /api/ai/overview
const getOverview = async (req, res, next) => {
  try {
    const monthlyBudget = await getCurrentMonthlyBudget();
    const data = await aiService.getAIData(monthlyBudget);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/health-score
const getHealthScore = async (req, res, next) => {
  try {
    const [monthlyBudget, transactions] = await Promise.all([
      getCurrentMonthlyBudget(),
      transactionService.getThisMonthTransactions(),
    ]);
    const score = aiService.computeHealthScore(transactions, monthlyBudget);
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

// POST /api/ai/chat  — body: { query: string, lang: "vi" | "en" }
const chat = async (req, res, next) => {
  try {
    const { query, lang = "vi" } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu nội dung câu hỏi" });
    }

    const [monthlyBudget, transactions] = await Promise.all([
      getCurrentMonthlyBudget(),
      transactionService.getThisMonthTransactions(),
    ]);
    const summary     = await transactionService.computeSummary(monthlyBudget);
    const healthScore = aiService.computeHealthScore(transactions, monthlyBudget);

    const financialContext = { ...summary, healthScore };
    const reply = await aiService.chatWithAI(query.trim(), financialContext, lang);

    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getHealthScore, getSpendingBreakdown, chat };
