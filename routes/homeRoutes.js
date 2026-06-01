const express = require("express");
const router = express.Router();
const { getTransactions, getSummary } = require("../controllers/homeController");

// GET /api/home/transactions?type=all|income|expense&date=YYYY-MM-DD&month=MM&year=YYYY
router.get("/transactions", getTransactions);

// GET /api/home/summary
router.get("/summary", getSummary);

module.exports = router;
