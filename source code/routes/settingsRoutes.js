const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  clearData,
} = require("../controllers/settingsController");

// GET  /api/settings/profile
router.get("/profile", getProfile);

// PUT  /api/settings/profile   body: { name?, email?, monthlyBudget? }
router.put("/profile", updateProfile);

// DELETE /api/settings/data  — xoá toàn bộ giao dịch
router.delete("/data", clearData);

module.exports = router;
