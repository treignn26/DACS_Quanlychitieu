const express = require("express");
const router = express.Router();
const {
  getOverview,
  getHealthScore,
  getSpendingBreakdown,
  chat,
} = require("../controllers/aiController");

// GET /api/ai/overview  — healthScore + insights + spendingBreakdown trong 1 call
router.get("/overview", getOverview);

// GET /api/ai/health-score
router.get("/health-score", getHealthScore);

// GET /api/ai/spending-breakdown
router.get("/spending-breakdown", getSpendingBreakdown);

// POST /api/ai/chat   body: { query, lang }
router.post("/chat", chat);

module.exports = router;
