const transactionService = require("../services/transactionService");
const profileService = require("../services/profileService");

// GET /api/home/transactions
// Query: ?type=all|income|expense  &date=YYYY-MM-DD  &month=MM&year=YYYY
const getTransactions = async (req, res, next) => {
  try {
    const { type, date, month, year } = req.query;
    const transactions = await transactionService.getTransactions({
      type,
      date,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// GET /api/home/summary
// Trả về tổng thu, tổng chi, số dư, % ngân sách của tháng hiện tại
const getSummary = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile();
    const summary = await transactionService.computeSummary(profile.monthlyBudget);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions, getSummary };
