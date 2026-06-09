const Transaction = require("../models/Transaction");

// GET /api/charts/data?period=day|month|year
const getChartData = async (req, res, next) => {
  try {
    const period      = req.query.period || "month";
    const now         = new Date();
    const currentYear = now.getFullYear();

    // ── Tính ngày bắt đầu cho từng kỳ ─────────────────────────────────────
    let dateStart;
    if (period === "day") {
      dateStart = new Date(now);
      dateStart.setDate(dateStart.getDate() - 6);
      dateStart.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      dateStart = new Date(currentYear, 0, 1); // 01/01/năm hiện tại
    } else {
      dateStart = new Date(currentYear - 4, 0, 1); // 01/01/5 năm trước
    }

    // ── Xác định groupId cho aggregation ──────────────────────────────────
    let groupId;
    if (period === "day") {
      groupId = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
    } else if (period === "month") {
      groupId = { $month: "$date" };
    } else {
      groupId = { $year: "$date" };
    }

    // ── Aggregation: tổng thu/chi theo kỳ ────────────────────────────────
    const rawBars = await Transaction.aggregate([
      { $match: { date: { $gte: dateStart } } },
      {
        $group: {
          _id:     groupId,
          income:  { $sum: { $cond: [{ $eq: ["$type", "income"]  }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Điền đủ các kỳ (kỳ không có giao dịch → income=0, expense=0) ─────
    let bars;
    if (period === "day") {
      bars = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const key   = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const found = rawBars.find(r => r._id === key) ?? {};
        return { key, income: found.income ?? 0, expense: found.expense ?? 0 };
      });
    } else if (period === "month") {
      bars = Array.from({ length: 12 }, (_, i) => {
        const key   = i + 1; // 1-12
        const found = rawBars.find(r => r._id === key) ?? {};
        return { key, income: found.income ?? 0, expense: found.expense ?? 0 };
      });
    } else {
      bars = Array.from({ length: 5 }, (_, i) => {
        const key   = currentYear - 4 + i;
        const found = rawBars.find(r => r._id === key) ?? {};
        return { key, income: found.income ?? 0, expense: found.expense ?? 0 };
      });
    }

    // ── Aggregation: danh mục chi tiêu top 6 ─────────────────────────────
    const rawCats = await Transaction.aggregate([
      { $match: { type: "expense", date: { $gte: dateStart } } },
      {
        $group: {
          _id:    { emoji: "$category", vi: "$catLabel.vi", en: "$catLabel.en" },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 6 },
    ]);

    const catTotal   = rawCats.reduce((s, c) => s + c.amount, 0);
    const categories = rawCats.map(c => ({
      emoji:  c._id.emoji,
      vi:     c._id.vi,
      en:     c._id.en,
      amount: c.amount,
      pct:    catTotal > 0 ? Math.round((c.amount / catTotal) * 100) : 0,
    }));

    // ── Tổng kỳ (tính từ bars) ────────────────────────────────────────────
    const totalIncome  = bars.reduce((s, b) => s + b.income,  0);
    const totalExpense = bars.reduce((s, b) => s + b.expense, 0);

    res.json({
      success: true,
      data: {
        period,
        bars,
        categories,
        summary: { totalIncome, totalExpense },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getChartData };
