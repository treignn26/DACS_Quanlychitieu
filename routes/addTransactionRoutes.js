const express = require("express");
const router = express.Router();
const {
  createTransaction,
  deleteTransaction,
} = require("../controllers/addTransactionController");

// POST /api/transactions
router.post("/", createTransaction);

// DELETE /api/transactions/:id
router.delete("/:id", deleteTransaction);

module.exports = router;
