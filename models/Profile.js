const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Người dùng",
    },
    email: {
      type: String,
      default: "",
    },
    monthlyBudget: {
      type: Number,
      default: 10_000_000,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
