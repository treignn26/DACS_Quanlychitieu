// Global error handler — đặt sau tất cả routes trong server.js
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

  // Lỗi validation của Mongoose
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // ObjectId không hợp lệ
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "ID không hợp lệ" });
  }

  res.status(500).json({
    success: false,
    message: "Lỗi server nội bộ. Vui lòng thử lại.",
  });
};

module.exports = errorHandler;
