import { API_BASE } from "./config";

// ─── Types khớp với response từ backend ───────────────────────────────────────

export interface Transaction {
  _id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  catLabel: { vi: string; en: string };
  note: string;
  date: string; // ISO string — chuyển sang Date ở màn hình
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface Profile {
  _id: string;
  name: string;
  email: string;
  monthlyBudget: number;
}

export interface BarItem {
  key: string | number; // "YYYY-MM-DD" | month 1-12 | year e.g. 2024
  income: number;
  expense: number;
}

export interface ChartCategory {
  emoji: string;
  vi: string;
  en: string;
  amount: number;
  pct: number;
}

export interface ChartData {
  period: "day" | "month" | "year";
  bars: BarItem[];
  categories: ChartCategory[];
  summary: { totalIncome: number; totalExpense: number };
}

export interface InsightCard {
  id: string;
  emoji: string;
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
  tag: "positive" | "warning" | "neutral";
}

export interface SpendCategory {
  emoji: string;
  vi: string;
  en: string;
  amount: number;
  pct: number;
  color: string;
}

export interface AIOverview {
  healthScore: number;
  insights: InsightCard[];
  spendingBreakdown: SpendCategory[];
  savingsRate: number;
  totalIncome: number;
  totalExpense: number;
}

// ─── Hàm fetch nội bộ ─────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Lỗi server");
  return json.data as T;
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export const getTransactions = (params?: {
  type?: string;
  date?: string;
  month?: number;
  year?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.type)                 qs.set("type",  params.type);
  if (params?.date)                 qs.set("date",  params.date);
  if (params?.month !== undefined)  qs.set("month", String(params.month));
  if (params?.year  !== undefined)  qs.set("year",  String(params.year));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Transaction[]>(`/api/home/transactions${query}`);
};

export const getSummary = () =>
  apiFetch<Summary>("/api/home/summary");

// ─── Add Transaction ─────────────────────────────────────────────────────────

export const createTransaction = (data: {
  type: string;
  amount: number;
  category: string;
  catLabel: { vi: string; en: string };
  note?: string;
  date?: string;
}) =>
  apiFetch<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteTransaction = (id: string) =>
  apiFetch<null>(`/api/transactions/${id}`, { method: "DELETE" });

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export const getAIOverview = () =>
  apiFetch<AIOverview>("/api/ai/overview");

export const chatWithAI = (query: string, lang: "vi" | "en") =>
  apiFetch<{ reply: string }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ query, lang }),
  });

// ─── Charts ──────────────────────────────────────────────────────────────────

export const getChartData = (period: "day" | "month" | "year") =>
  apiFetch<ChartData>(`/api/charts/data?period=${period}`);

// ─── Budget Plan ─────────────────────────────────────────────────────────────

export interface CustomCategory {
  id: string;
  vi: string;
  en: string;
  emoji: string;
  type: "expense" | "income";
}

export interface BudgetPlan {
  month: number;
  year: number;
  monthlyIncome: number;
  monthlyBudget: number;
  monthlySavings: number;
  otherPlan: string;
  categoryBudgets: Record<string, number>;
  categoryNames: Record<string, string>;
  customCategories: CustomCategory[];
}

export interface BudgetData {
  plan: BudgetPlan;
  categorySpending: Record<string, number>; // emoji → amount
}

export const getBudgetData = (month?: number, year?: number) => {
  const qs = new URLSearchParams();
  if (month !== undefined) qs.set("month", String(month));
  if (year  !== undefined) qs.set("year",  String(year));
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<BudgetData>(`/api/budget/plan${q}`);
};

export const saveBudgetPlan = (data: {
  month?: number;
  year?: number;
  monthlyIncome?: number;
  monthlyBudget?: number;
  monthlySavings?: number;
  otherPlan?: string;
  categoryBudgets?: Record<string, number>;
  categoryNames?: Record<string, string>;
  customCategories?: CustomCategory[];
}) =>
  apiFetch<BudgetPlan>("/api/budget/plan", {
    method: "PUT",
    body: JSON.stringify(data),
  });

// ─── Settings ────────────────────────────────────────────────────────────────

export const getProfile = () =>
  apiFetch<Profile>("/api/settings/profile");

export const updateProfile = (data: {
  name?: string;
  email?: string;
}) =>
  apiFetch<Profile>("/api/settings/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const clearAllData = () =>
  apiFetch<null>("/api/settings/data", { method: "DELETE" });
