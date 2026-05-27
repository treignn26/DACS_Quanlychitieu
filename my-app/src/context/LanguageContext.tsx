import React, { createContext, ReactNode, useContext, useState } from "react";

export type Lang = "vi" | "en";

export interface AppStrings {
  navHome: string;
  navAdd: string;
  navAI: string;
  navSettings: string;

  homePeriod: string;
  homeOverview: string;
  homeTotalBal: string;
  homeIncome: string;
  homeExpenses: string;
  homeBudgetTitle: string;
  homeBudgetUsed: string;
  homeBudgetOf: string;
  homeSpent: string;
  homeRemaining: string;
  homeDateLabel: string;
  homeTapHint: string;
  homeClearFilter: string;
  homeFilteringDate: string;
  homeNoTxForDate: string;
  homeWeekdays: string[];
  homeMonths: string[];
  homeActivity: string;
  homeSeeAll: string;
  homeAll: string;
  homeIncFilter: string;
  homeExpFilter: string;
  homeToday: string;
  homeYesterday: string;

  settTitle: string;
  settProfile: string;
  settName: string;
  settNamePH: string;
  settEmail: string;
  settEmailPH: string;
  settPrefs: string;
  settLang: string;
  settLangSub: string;
  settViOpt: string;
  settEnOpt: string;
  settCurrency: string;
  settCurrencyVal: string;
  settAppInfo: string;
  settVersion: string;
  settBuild: string;
  settSave: string;
  settSaved: string;
  settPrivacy: string;
  settTerms: string;
}

const VI: AppStrings = {
  navHome: "Trang chủ",
  navAdd: "Nhập liệu",
  navAI: "Trợ lý AI",
  navSettings: "Cài đặt",

  homePeriod: "Tháng 5, 2025",
  homeOverview: "Tổng quan",
  homeTotalBal: "Tổng số dư",
  homeIncome: "Thu nhập",
  homeExpenses: "Chi tiêu",
  homeBudgetTitle: "Ngân sách tháng",
  homeBudgetUsed: "Đã dùng",
  homeBudgetOf: "của",
  homeSpent: "Đã chi",
  homeRemaining: "Còn lại",

  homeDateLabel: "Lọc theo ngày",
  homeTapHint: "Nhấn để mở lịch",
  homeClearFilter: "✕ Xóa bộ lọc",
  homeFilteringDate: "Đang lọc:",
  homeNoTxForDate: "Không có giao dịch ngày này",
  homeWeekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  homeMonths: [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  ],

  homeActivity: "Giao dịch gần đây",
  homeSeeAll: "Xem tất cả",
  homeAll: "Tất cả",
  homeIncFilter: "Thu nhập",
  homeExpFilter: "Chi tiêu",
  homeToday: "Hôm nay",
  homeYesterday: "Hôm qua",

  settTitle: "Cài đặt",
  settProfile: "Thông tin cá nhân",
  settName: "Họ tên",
  settNamePH: "Nguyễn Văn A",
  settEmail: "Email",
  settEmailPH: "email@example.com",
  settPrefs: "Tùy chỉnh",
  settLang: "Ngôn ngữ",
  settLangSub: "Chọn ngôn ngữ hiển thị",
  settViOpt: "🇻🇳  Tiếng Việt",
  settEnOpt: "🇺🇸  English",
  settCurrency: "Tiền tệ",
  settCurrencyVal: "VND (₫) — Đồng Việt Nam",
  settAppInfo: "Thông tin ứng dụng",
  settVersion: "Phiên bản",
  settBuild: "Build",
  settSave: "Lưu thay đổi",
  settSaved: "✓ Đã lưu!",
  settPrivacy: "Chính sách bảo mật",
  settTerms: "Điều khoản sử dụng",
};

const EN: AppStrings = {
  navHome: "Home",
  navAdd: "Add",
  navAI: "AI Advisor",
  navSettings: "Settings",

  homePeriod: "May 2025",
  homeOverview: "Overview",
  homeTotalBal: "Total Balance",
  homeIncome: "Income",
  homeExpenses: "Expenses",
  homeBudgetTitle: "Monthly Budget",
  homeBudgetUsed: "Used",
  homeBudgetOf: "of",
  homeSpent: "Spent",
  homeRemaining: "Remaining",

  homeDateLabel: "Filter by date",
  homeTapHint: "Tap to open calendar",
  homeClearFilter: "✕ Clear filter",
  homeFilteringDate: "Filtering:",
  homeNoTxForDate: "No transactions on this date",
  homeWeekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  homeMonths: [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ],

  homeActivity: "Recent Activity",
  homeSeeAll: "See all",
  homeAll: "All",
  homeIncFilter: "Income",
  homeExpFilter: "Expense",
  homeToday: "Today",
  homeYesterday: "Yesterday",

  settTitle: "Settings",
  settProfile: "Personal Info",
  settName: "Full Name",
  settNamePH: "Nguyen Van A",
  settEmail: "Email",
  settEmailPH: "email@example.com",
  settPrefs: "Preferences",
  settLang: "Language",
  settLangSub: "Choose display language",
  settViOpt: "🇻🇳  Tiếng Việt",
  settEnOpt: "🇺🇸  English",
  settCurrency: "Currency",
  settCurrencyVal: "VND (₫) — Vietnamese Dong",
  settAppInfo: "App Info",
  settVersion: "Version",
  settBuild: "Build",
  settSave: "Save Changes",
  settSaved: "✓ Saved!",
  settPrivacy: "Privacy Policy",
  settTerms: "Terms of Service",
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: AppStrings;
}

const LangContext = createContext<LangContextType>({
  lang: "vi",
  setLang: () => {},
  t: VI,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("vi");
  const t = lang === "vi" ? VI : EN;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage(): LangContextType {
  return useContext(LangContext);
}
