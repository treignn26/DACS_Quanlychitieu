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

  // MongoDB duplicate key (unique index bị vi phạm)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "trường";
    const msg   = field === "email" ? "Email này đã được sử dụng" : `${field} đã tồn tại`;
    return res.status(409).json({ success: false, message: msg });
  }

  // JWT lỗi
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn" });
  }

  res.status(500).json({
    success: false,
    message: "Lỗi server nội bộ. Vui lòng thử lại.",
  });
};

module.exports = errorHandler;
