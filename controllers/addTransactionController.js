const transactionService = require("../services/transactionService");

// POST /api/transactions
// Body: { type, amount, category, catLabel: { vi, en }, note, date }
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, catLabel, note, date } = req.body;

    if (!type || !amount || !category || !catLabel) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu trường bắt buộc: type, amount, category, catLabel" });
    }
    if (!["income", "expense"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "type phải là 'income' hoặc 'expense'" });
    }
    if (Number(amount) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền phải lớn hơn 0" });
    }

    const tx = await transactionService.createTransaction({
      type,
      amount: Number(amount),
      category,
      catLabel,
      note: note || "",
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    const deleted = await transactionService.deleteTransaction(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
    }
    res.json({ success: true, message: "Đã xoá giao dịch" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTransaction, deleteTransaction };
