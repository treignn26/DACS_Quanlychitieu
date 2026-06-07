const BudgetPlan  = require("../models/BudgetPlan");
const Transaction = require("../models/Transaction");

// ─── GET /api/budget/plan?month=X&year=Y ─────────────────────────────────────
exports.getBudgetPlan = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = Number(req.query.month ?? now.getMonth() + 1);
    const year  = Number(req.query.year  ?? now.getFullYear());

    // Upsert: tạo mới nếu chưa có
    let plan = await BudgetPlan.findOne({ month, year });
    if (!plan) plan = await BudgetPlan.create({ month, year });

    // Thực chi mỗi danh mục trong tháng (group by emoji)
    const rows = await Transaction.aggregate([
      {
        $match: {
          type: "expense",
          $expr: {
            $and: [
              { $eq: [{ $month: "$date" }, month] },
              { $eq: [{ $year:  "$date" }, year]  },
            ],
          },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);

    const categorySpending = {};
    rows.forEach(({ _id, total }) => { categorySpending[_id] = total; });

    res.json({
      success: true,
      data: {
        plan: {
          month:            plan.month,
          year:             plan.year,
          monthlyIncome:    plan.monthlyIncome,
          monthlyBudget:    plan.monthlyBudget,
          monthlySavings:   plan.monthlySavings,
          otherPlan:        plan.otherPlan,
          categoryBudgets:  Object.fromEntries(plan.categoryBudgets),
          categoryNames:    Object.fromEntries(plan.categoryNames),
          customCategories: plan.customCategories,
        },
        categorySpending,   // { "🍜": 1650000, "🛍️": 450000, … }
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/budget/plan ─────────────────────────────────────────────────────
exports.saveBudgetPlan = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = Number(req.body.month ?? now.getMonth() + 1);
    const year  = Number(req.body.year  ?? now.getFullYear());

    const update = {
      monthlyIncome:    Number(req.body.monthlyIncome  ?? 0),
      monthlyBudget:    Number(req.body.monthlyBudget  ?? 0),
      monthlySavings:   Number(req.body.monthlySavings ?? 0),
      otherPlan:        req.body.otherPlan        ?? "",
      categoryBudgets:  req.body.categoryBudgets  ?? {},
      categoryNames:    req.body.categoryNames    ?? {},
      customCategories: req.body.customCategories ?? [],
    };

    const plan = await BudgetPlan.findOneAndUpdate(
      { month, year },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        month:            plan.month,
        year:             plan.year,
        monthlyIncome:    plan.monthlyIncome,
        monthlyBudget:    plan.monthlyBudget,
        monthlySavings:   plan.monthlySavings,
        otherPlan:        plan.otherPlan,
        categoryBudgets:  Object.fromEntries(plan.categoryBudgets),
        categoryNames:    Object.fromEntries(plan.categoryNames),
        customCategories: plan.customCategories,
      },
    });
  } catch (err) {
    next(err);
  }
};
