const express = require("express");
const router  = express.Router();
const { getChartData } = require("../controllers/chartController");

// GET /api/charts/data?period=day|month|year
router.get("/data", getChartData);

module.exports = router;
