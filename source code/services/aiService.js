const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  getThisMonthTransactions,
  getLastMonthTransactions,
} = require("./transactionService");

const fmtVND = (n) => n.toLocaleString("vi-VN") + " đ";

// ── Bảng màu cho từng danh mục ──────────────────────────────────────────────
const CAT_COLORS = {
  "🍜": "#FF6B6B",
  "🛍️": "#F5A623",
  "🚌": "#A78BFA",
  "💊": "#2ECC9A",
  "📑": "#4ECDC4",
  "🎮": "#FF8C42",
  "🏠": "#6B8076",
  "✈️": "#3498DB",
  "💡": "#9EB8B0",
  "🚗": "#A78BFA",
  "🛒": "#F5A623",
};

// ── Tính điểm sức khoẻ tài chính (0–100) ───────────────────────────────────
const computeHealthScore = (transactions, monthlyBudget) => {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Tỉ lệ tiết kiệm → 0–40 điểm
  let savingsPoints = 0;
  if (totalIncome > 0) {
    const rate = (totalIncome - totalExpense) / totalIncome;
    if (rate >= 0.2) savingsPoints = 40;
    else if (rate >= 0.1) savingsPoints = 25;
    else if (rate >= 0) savingsPoints = 10;
  }

  // Tuân thủ ngân sách → 0–30 điểm
  let budgetPoints = 0;
  if (monthlyBudget > 0) {
    const ratio = totalExpense / monthlyBudget;
    if (ratio <= 0.7) budgetPoints = 30;
    else if (ratio <= 0.9) budgetPoints = 20;
    else if (ratio <= 1.0) budgetPoints = 10;
  }

  // Đa dạng danh mục → 0–15 điểm
  const cats = new Set(transactions.map((t) => t.category));
  const diversityPoints = cats.size >= 5 ? 15 : cats.size >= 3 ? 8 : 0;

  // Hoạt động gần đây (7 ngày) → 0–15 điểm
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const recentCount = transactions.filter((t) => new Date(t.date) >= cutoff).length;
  const activityPoints = recentCount >= 3 ? 15 : recentCount >= 1 ? 8 : 0;

  return Math.min(100, savingsPoints + budgetPoints + diversityPoints + activityPoints);
};

// ── Tạo các insight cards từ dữ liệu thực ──────────────────────────────────
const computeInsights = (thisMonth, lastMonth, monthlyBudget) => {
  const thisExpense = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const lastExpense = lastMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const insights = [];

  // Insight 1: so sánh chi tiêu tháng này vs tháng trước
  if (lastExpense > 0) {
    const pct = Math.abs(
      Math.round(((thisExpense - lastExpense) / lastExpense) * 100)
    );
    const decreased = thisExpense <= lastExpense;
    insights.push({
      id: "1",
      emoji: "📊",
      titleVi: "Chi tiêu tháng này",
      titleEn: "This Month's Spending",
      bodyVi: decreased
        ? `Bạn đã chi ${fmtVND(thisExpense)} — ít hơn ${pct}% so với tháng trước. Tiếp tục duy trì!`
        : `Bạn đã chi ${fmtVND(thisExpense)} — nhiều hơn ${pct}% so với tháng trước.`,
      bodyEn: decreased
        ? `You've spent ${fmtVND(thisExpense)} — ${pct}% less than last month. Keep it up!`
        : `You've spent ${fmtVND(thisExpense)} — ${pct}% more than last month.`,
      tag: decreased ? "positive" : "warning",
    });
  }

  // Insight 2: danh mục chi tiêu nhiều nhất
  const expenseTx = thisMonth.filter((t) => t.type === "expense");
  if (expenseTx.length > 0 && thisExpense > 0) {
    const byCategory = {};
    expenseTx.forEach((tx) => {
      const key = tx.category;
      if (!byCategory[key]) {
        byCategory[key] = {
          emoji: tx.category,
          vi: tx.catLabel.vi,
          en: tx.catLabel.en,
          amount: 0,
        };
      }
      byCategory[key].amount += tx.amount;
    });

    const topCat = Object.values(byCategory).sort((a, b) => b.amount - a.amount)[0];
    const topPct = Math.round((topCat.amount / thisExpense) * 100);

    if (topPct > 25) {
      insights.push({
        id: "2",
        emoji: topCat.emoji,
        titleVi: `${topCat.vi} chiếm nhiều nhất`,
        titleEn: `${topCat.en} Is Top Spend`,
        bodyVi: `${topCat.vi} chiếm ${topPct}% tổng chi tiêu tháng này (${fmtVND(topCat.amount)}).`,
        bodyEn: `${topCat.en} is ${topPct}% of your spending this month (${fmtVND(topCat.amount)}).`,
        tag: topPct > 40 ? "warning" : "neutral",
      });
    }
  }

  // Insight 3: tình trạng ngân sách
  if (monthlyBudget > 0) {
    const remaining = monthlyBudget - thisExpense;
    const usedPct = Math.round((thisExpense / monthlyBudget) * 100);
    if (remaining >= 0) {
      insights.push({
        id: "3",
        emoji: "🎯",
        titleVi: `Đã dùng ${usedPct}% ngân sách`,
        titleEn: `${usedPct}% of Budget Used`,
        bodyVi: `Còn lại ${fmtVND(remaining)} trong ngân sách tháng. Giữ vững nhé!`,
        bodyEn: `${fmtVND(remaining)} remaining in your monthly budget. Stay on track!`,
        tag: usedPct >= 90 ? "warning" : "positive",
      });
    } else {
      insights.push({
        id: "3",
        emoji: "⚠️",
        titleVi: "Đã vượt ngân sách",
        titleEn: "Over Budget",
        bodyVi: `Bạn đã vượt ${fmtVND(Math.abs(remaining))} so với ngân sách. Hãy kiểm soát!`,
        bodyEn: `You're ${fmtVND(Math.abs(remaining))} over budget. Take control!`,
        tag: "warning",
      });
    }
  }

  return insights;
};

// ── Phân bổ chi tiêu theo danh mục (tháng hiện tại) ────────────────────────
const computeSpendingBreakdown = (transactions) => {
  const expenseTx = transactions.filter((t) => t.type === "expense");
  const total = expenseTx.reduce((s, t) => s + t.amount, 0);
  if (total === 0) return [];

  const byCategory = {};
  expenseTx.forEach((tx) => {
    const key = tx.category;
    if (!byCategory[key]) {
      byCategory[key] = {
        emoji: tx.category,
        vi: tx.catLabel.vi,
        en: tx.catLabel.en,
        amount: 0,
        color: CAT_COLORS[tx.category] || "#9EB8B0",
      };
    }
    byCategory[key].amount += tx.amount;
  });

  return Object.values(byCategory)
    .map((cat) => ({ ...cat, pct: Math.round((cat.amount / total) * 100) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
};

// ── Chat với Gemini AI ──────────────────────────────────────────────────────
const chatWithAI = async (query, financialContext, lang) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return lang === "vi"
      ? "⚠️ Chưa có API key. Thêm GEMINI_API_KEY vào file .env rồi restart server."
      : "⚠️ No API key. Add GEMINI_API_KEY to .env then restart the server.";
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Nhúng context tài chính trực tiếp vào prompt (tránh dùng systemInstruction)
  const fullPrompt = `Bạn là trợ lý tài chính cá nhân. Dữ liệu tháng này:
- Số dư: ${fmtVND(financialContext.balance)}
- Thu nhập: ${fmtVND(financialContext.totalIncome)}
- Chi tiêu: ${fmtVND(financialContext.totalExpense)}
- Điểm sức khoẻ tài chính: ${financialContext.healthScore}/100

Hãy trả lời bằng ${lang === "vi" ? "tiếng Việt" : "tiếng Anh"}. Ngắn gọn, thực tế. Tối đa 120 từ.

Câu hỏi: ${query}`;

  const callGemini = () => model.generateContent(fullPrompt);

  try {
    const result = await callGemini();
    return result.response.text();
  } catch (err) {
    const msg  = err?.message ?? String(err);
    const code = msg.includes("429") ? 429 : msg.includes("401") || msg.includes("403") ? 403 : msg.includes("404") ? 404 : 0;
    console.error(`Gemini API error [${code}]:`, msg.slice(0, 200));

    // Tự động chờ 12 giây rồi thử lại một lần khi bị rate-limit
    if (code === 429) {
      console.log("Gemini 429 — chờ 12s rồi retry...");
      await new Promise((r) => setTimeout(r, 12_000));
      try {
        const retry = await callGemini();
        return retry.response.text();
      } catch (err2) {
        const msg2 = err2?.message ?? String(err2);
        console.error("Gemini retry cũng lỗi:", msg2.slice(0, 200));
        return lang === "vi"
          ? "⚠️ Gemini đang bận, thử lại sau 1 phút nhé."
          : "⚠️ Gemini is busy, please try again in 1 minute.";
      }
    }

    if (code === 401 || code === 403) return lang === "vi" ? "⚠️ API key không hợp lệ. Kiểm tra GEMINI_API_KEY trong .env." : "⚠️ Invalid API key. Check GEMINI_API_KEY in .env.";
    if (code === 404) return lang === "vi" ? "⚠️ Model không tìm thấy. Đổi tên model trong aiService.js." : "⚠️ Model not found. Change model name in aiService.js.";
    return lang === "vi" ? `⚠️ Lỗi Gemini: ${msg.slice(0, 120)}` : `⚠️ Gemini error: ${msg.slice(0, 120)}`;
  }
};

// ── Hàm tổng hợp cho AI controller ─────────────────────────────────────────
const getAIData = async (monthlyBudget) => {
  const [thisMonth, lastMonth] = await Promise.all([
    getThisMonthTransactions(),
    getLastMonthTransactions(),
  ]);

  const healthScore = computeHealthScore(thisMonth, monthlyBudget);
  const insights = computeInsights(thisMonth, lastMonth, monthlyBudget);
  const spendingBreakdown = computeSpendingBreakdown(thisMonth);

  const totalIncome = thisMonth
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  return { healthScore, insights, spendingBreakdown, savingsRate, totalIncome, totalExpense };
};

module.exports = {
  computeHealthScore,
  computeInsights,
  computeSpendingBreakdown,
  chatWithAI,
  getAIData,
};
