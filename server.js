require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const homeRoutes           = require("./routes/homeRoutes");
const addTransactionRoutes = require("./routes/addTransactionRoutes");
const aiRoutes             = require("./routes/aiRoutes");
const settingsRoutes       = require("./routes/settingsRoutes");
const chartRoutes          = require("./routes/chartRoutes");
const budgetRoutes         = require("./routes/budgetRoutes");
const errorHandler         = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Kết nối MongoDB Atlas ───────────────────────────────────────────────────
connectDB();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
// Tab 1 — Home / Dashboard
app.use("/api/home", homeRoutes);

// Tab 2 — Add Transaction
app.use("/api/transactions", addTransactionRoutes);

// Tab 3 — AI Assistant
app.use("/api/ai", aiRoutes);

// Tab 4 — Settings
app.use("/api/settings", settingsRoutes);

// Tab 2 — Charts
app.use("/api/charts", chartRoutes);
app.use("/api/budget", budgetRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────────────────────
// Dùng '0.0.0.0' để thiết bị cùng mạng Wi-Fi có thể truy cập
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend đang chạy tại cổng ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
