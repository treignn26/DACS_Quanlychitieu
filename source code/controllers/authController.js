const authService = require("../services/authService");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PUT /api/auth/password  — đổi mật khẩu
const changePassword = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

    const payload = authService.verifyToken(token);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới tối thiểu 6 ký tự" });
    }

    await authService.changePassword(payload.userId, { oldPassword, newPassword });
    res.json({ success: true, data: null });
  } catch (err) {
    if (err.message.includes("không đúng") || err.message.includes("không tồn tại")) {
      return res.status(401).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// PUT /api/auth/me  — cập nhật tên / email của user đang đăng nhập
const updateMe = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

    const payload = authService.verifyToken(token);
    const User    = require("../models/User");
    const user    = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });

    const { name, email } = req.body;
    if (name?.trim())  user.name  = name.trim();
    if (email?.trim()) user.email = email.trim().toLowerCase();

    await user.save();
    res.json({
      success: true,
      data: { user: { _id: user._id, name: user.name, email: user.email } },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  — xác thực token, trả về thông tin user
const me = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }

    const payload = authService.verifyToken(token);
    const user    = await authService.getUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
    }

    res.json({
      success: true,
      data: { user: { _id: user._id, name: user.name, email: user.email } },
    });
  } catch (err) {
    next(err); // JsonWebTokenError / TokenExpiredError → xử lý trong errorHandler
  }
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Email không đúng định dạng" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu tối thiểu 6 ký tự" });
    }

    const result = await authService.register({
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password,
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      data:    result,
    });
  } catch (err) {
    // Email trùng — từ findOne check hoặc MongoDB unique index
    if (err.message.includes("đã được đăng ký") || err.code === 11000) {
      return res.status(409).json({ success: false, message: "Email này đã được sử dụng" });
    }
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập email và mật khẩu" });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Email không đúng định dạng" });
    }

    const result = await authService.login({
      email:    email.trim().toLowerCase(),
      password,
    });

    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      data:    result,
    });
  } catch (err) {
    if (err.message.includes("chưa được đăng ký") || err.message.includes("không tồn tại")) {
      return res.status(404).json({ success: false, message: "Email chưa được đăng ký" });
    }
    if (err.message.includes("không đúng")) {
      return res.status(401).json({ success: false, message: "Mật khẩu không đúng" });
    }
    next(err);
  }
};

module.exports = { register, login, me, updateMe, changePassword };
