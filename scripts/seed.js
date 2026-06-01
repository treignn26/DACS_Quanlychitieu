// scripts/seed.js — Đưa dữ liệu mẫu vào MongoDB Atlas
require("dotenv").config();
const mongoose  = require("mongoose");
const Transaction = require("../models/Transaction");
const Profile     = require("../models/Profile");

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const SEED_TRANSACTIONS = [
  { type: "expense", amount: 125_000,    category: "🍜", catLabel: { vi: "Ăn uống",   en: "Food"          }, note: "Phở bò buổi sáng",            date: daysAgo(0)  },
  { type: "income",  amount: 15_000_000, category: "💼", catLabel: { vi: "Lương",     en: "Salary"        }, note: "Lương tháng 5",                date: daysAgo(0)  },
  { type: "expense", amount: 45_000,     category: "🚌", catLabel: { vi: "Di chuyển", en: "Transport"     }, note: "Grab về nhà",                  date: daysAgo(1)  },
  { type: "expense", amount: 320_000,    category: "🛒", catLabel: { vi: "Mua sắm",   en: "Shopping"      }, note: "Siêu thị BigC",               date: daysAgo(1)  },
  { type: "income",  amount: 500_000,    category: "🎁", catLabel: { vi: "Thưởng",    en: "Bonus"         }, note: "Thưởng hoàn thành dự án",     date: daysAgo(3)  },
  { type: "expense", amount: 85_000,     category: "🎮", catLabel: { vi: "Giải trí",  en: "Entertainment" }, note: "Netflix tháng này",            date: daysAgo(8)  },
  { type: "expense", amount: 250_000,    category: "💊", catLabel: { vi: "Sức khỏe",  en: "Health"        }, note: "Mua thuốc",                   date: daysAgo(8)  },
  { type: "expense", amount: 1_500_000,  category: "🏠", catLabel: { vi: "Nhà ở",     en: "Housing"       }, note: "Tiền điện nước",              date: daysAgo(12) },
  { type: "income",  amount: 2_000_000,  category: "📈", catLabel: { vi: "Đầu tư",    en: "Investment"    }, note: "Cổ tức quý 1",               date: daysAgo(15) },
];

const SEED_PROFILE = {
  name:          "Nguyễn Văn A",
  email:         "nguyenvana@email.com",
  monthlyBudget: 10_000_000,
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Đã kết nối MongoDB Atlas");

  // Xoá dữ liệu cũ
  await Promise.all([
    Transaction.deleteMany({}),
    Profile.deleteMany({}),
  ]);
  console.log("Đã xoá dữ liệu cũ");

  // Tạo dữ liệu mới
  await Promise.all([
    Transaction.insertMany(SEED_TRANSACTIONS),
    Profile.create(SEED_PROFILE),
  ]);

  console.log(`Đã tạo ${SEED_TRANSACTIONS.length} giao dịch + 1 profile`);
  await mongoose.disconnect();
  console.log("Xong!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
