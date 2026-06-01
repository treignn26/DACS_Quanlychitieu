const Transaction = require("../models/Transaction");

// Lấy danh sách giao dịch với bộ lọc tuỳ chọn
const getTransactions = async ({ type, date, month, year } = {}) => {
  const filter = {};

  if (type && type !== "all") {
    filter.type = type;
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  } else if (month !== undefined && year !== undefined) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  return Transaction.find(filter).sort({ date: -1 });
};

// Giao dịch tháng hiện tại
const getThisMonthTransactions = async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return Transaction.find({ date: { $gte: start, $lte: end } });
};

// Giao dịch tháng trước
const getLastMonthTransactions = async () => {
  const now = new Date();
  const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return Transaction.find({ date: { $gte: start, $lte: end } });
};

// Tạo giao dịch mới
const createTransaction = async (data) => {
  const tx = new Transaction(data);
  return tx.save();
};

// Xoá giao dịch theo ID
const deleteTransaction = async (id) => {
  return Transaction.findByIdAndDelete(id);
};

// Tính tổng kết tháng: thu nhập, chi tiêu, số dư, % ngân sách
const computeSummary = async (monthlyBudget) => {
  const transactions = await getThisMonthTransactions();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const budgetPct =
    monthlyBudget > 0
      ? Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100)
      : 0;

  return { totalIncome, totalExpense, balance, monthlyBudget, budgetPct };
};

// Xoá toàn bộ giao dịch
const deleteAllTransactions = async () => {
  return Transaction.deleteMany({});
};

module.exports = {
  getTransactions,
  getThisMonthTransactions,
  getLastMonthTransactions,
  createTransaction,
  deleteTransaction,
  computeSummary,
  deleteAllTransactions,
};
