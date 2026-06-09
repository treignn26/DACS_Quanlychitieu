const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const SECRET  = process.env.JWT_SECRET || "finance_app_jwt_secret_2026";
const EXPIRES = "30d";

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email này đã được đăng ký");

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash });

  const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: EXPIRES });
  return { token, user: { _id: user._id, name: user.name, email: user.email } };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Email chưa được đăng ký");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Mật khẩu không đúng");

  const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: EXPIRES });
  return { token, user: { _id: user._id, name: user.name, email: user.email } };
};

const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Tài khoản không tồn tại");

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) throw new Error("Mật khẩu cũ không đúng");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
};

// Xác thực token — dùng cho GET /api/auth/me
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

const getUserById = async (id) => {
  return User.findById(id).select("-password");
};

module.exports = { register, login, changePassword, verifyToken, getUserById };
