const express              = require("express");
const router               = express.Router();
const { register, login, me, updateMe, changePassword } = require("../controllers/authController");

// POST /api/auth/register  — tạo tài khoản mới
router.post("/register", register);

// POST /api/auth/login     — đăng nhập, nhận JWT
router.post("/login",    login);

// GET  /api/auth/me        — kiểm tra token còn hợp lệ không
router.get("/me",        me);

// PUT  /api/auth/me        — cập nhật tên / email
router.put("/me",        updateMe);

// PUT  /api/auth/password  — đổi mật khẩu
router.put("/password",  changePassword);

module.exports = router;
