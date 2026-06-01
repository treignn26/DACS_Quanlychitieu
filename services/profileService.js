const Profile = require("../models/Profile");

// Lấy profile (tạo mặc định nếu chưa có)
const getProfile = async () => {
  let profile = await Profile.findOne();
  if (!profile) {
    profile = await Profile.create({
      name: "Người dùng",
      email: "",
      monthlyBudget: 10_000_000,
    });
  }
  return profile;
};

// Cập nhật profile
const updateProfile = async ({ name, email, monthlyBudget }) => {
  let profile = await Profile.findOne();
  if (!profile) {
    profile = new Profile({});
  }

  if (name !== undefined) profile.name = name;
  if (email !== undefined) profile.email = email;
  if (monthlyBudget !== undefined) profile.monthlyBudget = monthlyBudget;

  return profile.save();
};

module.exports = { getProfile, updateProfile };
