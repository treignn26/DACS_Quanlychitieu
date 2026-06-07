const express = require("express");
const router  = express.Router();
const { getBudgetPlan, saveBudgetPlan } = require("../controllers/budgetController");

router.get("/plan", getBudgetPlan);
router.put("/plan", saveBudgetPlan);

module.exports = router;
