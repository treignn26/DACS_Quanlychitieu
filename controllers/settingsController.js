const profileService = require("../services/profileService");
const transactionService = require("../services/transactionService");

// GET /api/settings/profile
const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile();
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/profile
// Body: { name?, email?, monthlyBudget? }
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, monthlyBudget } = req.body;

    if (monthlyBudget !== undefined && Number(monthlyBudget) < 0) {
      return res.status(400).json({ success: false, message: "Ngân sách không được âm" });
    }

    const profile = await profileService.updateProfile({
      name,
      email,
      monthlyBudget: monthlyBudget !== undefined ? Number(monthlyBudget) : undefined,
    });

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/settings/data
// Xoá toàn bộ giao dịch (giữ lại profile)
const clearData = async (req, res, next) => {
  try {
    await transactionService.deleteAllTransactions();
    res.json({ success: true, message: "Đã xoá toàn bộ dữ liệu giao dịch" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, clearData };
