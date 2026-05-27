@AGENTS.md

# CLAUDE.md — Personal Finance App

## Stack

| Concern    | Decision |
|------------|----------|
| Framework  | React Native + **Expo Router** v6 (file-based routing, `src/app/`) |
| Language   | **TypeScript** — strict, no `any` except layout width hacks |
| UI         | **Default RN only** — `View`, `Text`, `TextInput`, `TouchableOpacity`, `ScrollView`, `FlatList`, `Modal`, `Animated`, `StyleSheet` |
| Navigation | Expo Router `<Tabs>` in `_layout.tsx` — không dùng react-navigation trực tiếp |
| State      | `useState` + React Context — không dùng Redux / Zustand |
| Icons      | Emoji trong `<Text>` hoặc shape `View` — không dùng icon library |
| Currency   | Vietnamese Đồng — `n.toLocaleString("vi-VN") + " đ"` |
| i18n       | `LanguageContext` — global `"vi" \| "en"` toggle |

---

## Project Structure

```
src/
├── context/
│   └── LanguageContext.tsx      # Lang types, AppStrings, VI/EN dicts, useLanguage()
├── components/
│   └── CalendarModal.tsx        # Shared calendar picker (dùng ở index.tsx)
└── app/
    ├── _layout.tsx              # Tab navigator — bọc toàn app trong <LanguageProvider>
    ├── index.tsx                # Tab 1: Home / Dashboard
    ├── add-transaction.tsx      # Tab 2: Add Transaction
    ├── ai-assistant.tsx         # Tab 3: AI Assistant
    └── settings.tsx             # Tab 4: Settings
```

---

## Design Tokens

Khai báo `const COLORS`, `SP`, `R` **ở đầu mỗi file** — không có shared token file.

```ts
const COLORS = {
  pageBg: "#F5F7F6",  cardBg: "#FFFFFF",
  heroBg: "#1A2E2A",  heroSub: "#243D38",
  accent: "#2ECC9A",  accentDeep: "#1BAA7E",  accentSoft: "#E6FAF4",
  income: "#2ECC9A",  incomeText: "#15704F",   incomeBg: "#E6FAF4",
  expense: "#FF6B6B", expenseText: "#C0392B",  expenseBg: "#FFF0F0",
  textPrimary: "#1A2422",   textSecondary: "#6B8076",
  textMuted: "#9EB8B0",     textOnDark: "#FFFFFF",
  textOnDarkMuted: "#A8C4BC",
  border: "#E8EFED",  inputBg: "#F0F5F3",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
const R  = { sm: 10, md: 16, lg: 24, xl: 32 } as const;
```

---

## Helpers (khai báo lại trong mỗi file cần dùng)

```ts
// VND formatter — dùng trong mọi file
const fmtVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

// Chỉ dùng trong index.tsx (mock data)
const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

// Helper ngôn ngữ — dùng trong add-transaction.tsx, ai-assistant.tsx
const s = (vi: string, en: string) => lang === "vi" ? vi : en;
```

---

## Internationalization (i18n)

### Hai pattern được chấp nhận

**Pattern A — qua `t` object** (dùng ở `index.tsx`, `settings.tsx`, `_layout.tsx`, `CalendarModal.tsx`):
```ts
const { t, lang } = useLanguage();
<Text>{t.homeOverview}</Text>
```

**Pattern B — helper `s()`** (dùng ở `add-transaction.tsx`, `ai-assistant.tsx`):
```ts
const { lang } = useLanguage();
const s = (vi: string, en: string) => lang === "vi" ? vi : en;
<Text>{s("Số tiền", "Amount")}</Text>
```

Pattern B phù hợp khi màn hình có nhiều chuỗi không cần thêm vào LanguageContext (inline data, category labels trong arrays).

### Quy tắc bắt buộc

- **Không bao giờ** hardcode chuỗi song ngữ dạng `"Tiếng Việt / English"` trong JSX
- Mọi text hiển thị cho user phải qua `t.xxx` hoặc `s("vi", "en")`
- Khi thêm key mới vào LanguageContext → thêm vào **cả hai** `VI` và `EN`
- Chuỗi trong dict `VI` phải là **thuần tiếng Việt** — không kèm phần tiếng Anh

### AppStrings — key thực tế trong LanguageContext

| Nhóm       | Prefix  | Các key |
|------------|---------|---------|
| Navigation | `nav`   | `navHome`, `navAdd`, `navAI`, `navSettings` |
| Home       | `home`  | `homeOverview`, `homeIncome`, `homeExpenses`, `homeBudgetTitle`, `homeBudgetUsed`, `homeBudgetOf`, `homeSpent`, `homeRemaining`, `homeDateLabel`, `homeClearFilter`, `homeFilteringDate`, `homeNoTxForDate`, `homeWeekdays[]`, `homeMonths[]`, `homeActivity`, `homeSeeAll`, `homeAll`, `homeIncFilter`, `homeExpFilter`, `homeToday`, `homeYesterday` |
| Settings   | `sett`  | `settTitle`, `settProfile`, `settName`, `settNamePH`, `settEmail`, `settEmailPH`, `settPrefs`, `settLang`, `settLangSub`, `settViOpt`, `settEnOpt`, `settCurrency`, `settCurrencyVal`, `settAppInfo`, `settVersion`, `settBuild`, `settSave`, `settSaved`, `settPrivacy`, `settTerms` |

> `add-transaction.tsx` và `ai-assistant.tsx` không dùng prefix `add`/`ai` trong LanguageContext — dùng Pattern B (helper `s()`) thay thế.

---

## Tab Navigation

| # | File | Label VI | Label EN | Icon |
|---|------|----------|----------|------|
| 1 | `index` | Trang chủ | Home | 🏠 pill |
| 2 | `add-transaction` | Nhập liệu | Add | Floating mint circle |
| 3 | `ai-assistant` | Trợ lý AI | AI Advisor | ✦ pill |
| 4 | `settings` | Cài đặt | Settings | ⚙️ pill |

**Floating Add button** (`_layout.tsx`):
- Kích thước: `44×44px` (–20% so với thiết kế gốc 54px), `borderRadius: 22`
- `marginTop: -18` — nổi lên trên tab bar
- `borderWidth: 3, borderColor: "#FFFFFF"` — vòng trắng tách biệt
- Shadow màu accent: `shadowColor: C.accent, shadowOpacity: 0.45`
- Font `+`: `fontSize: 19`

Tab bar: `height: 88px` iOS / `68px` Android.  
Tab labels tự cập nhật khi đổi ngôn ngữ vì đến từ `t.navXxx`.

---

## CalendarModal

**Chỉ dùng ở `index.tsx`** (có `txDates` dots). Không dùng ở `add-transaction.tsx`.

```tsx
import CalendarModal from "../components/CalendarModal";

<CalendarModal
  visible={showCal}
  selectedDate={selectedDate}        // Date | null
  onSelectDate={setSelectedDate}     // (d: Date) => void — tự đóng modal sau khi chọn
  onClose={() => setShowCal(false)}
  txDates={txDates}                  // Date[] — hiển thị dot xanh
/>
```

---

## Component Patterns

### Hero Card (dark)
- `backgroundColor: COLORS.heroBg`, `borderRadius: R.xl`, `padding: SP.lg`
- Balance: `fontSize: 32, fontWeight: "800"`
- Sub-cards income/expense: `flex: 1` side-by-side, nền `rgba(255,255,255,0.08)`

### Transaction Row (index.tsx)
- Icon circle: `44×44px`, màu nền `incomeBg` / `expenseBg`
- Amount ký hiệu: `+` cho income, `−` (Unicode `−`) cho expense — không dùng ASCII `-`
- Shadow nhẹ: `shadowOpacity: 0.06, elevation: 2`

### Filter Chips
- Inactive: `backgroundColor: cardBg, borderWidth: 1.5, borderColor: border`
- Active: `backgroundColor: heroBg`, label `color: textOnDark`

### Success Toast
- `Animated.sequence`: fade-in 250ms → hold 1800ms → fade-out 350ms
- `position: "absolute"`, bottom 100px (tránh tab bar)
- Reset form sau khi animation kết thúc

### Settings LanguageToggle
- Animated sliding pill (width 280px, 2 options)
- Dùng `Animated.spring` — không cần `useNativeDriver: false` ngoại lệ vì animate `left`
- Active pill: `backgroundColor: langActive (#1A2E2A)`

---

## TypeScript

- Không dùng `any` — ngoại lệ duy nhất: `width: \`${pct}%\` as any` trong progress bars
- Mọi component có props phải có `interface XxxProps { ... }`
- `useMemo` cho filtered/computed lists (tránh recompute mỗi render)
- `useRef` cho `Animated.Value` — không khai báo trong body component

---

## UI / UX Rules

- `contentContainerStyle={{ paddingBottom: 120 }}` trên **mọi** `ScrollView`/`FlatList` — tránh bị tab bar che
- `SafeAreaView` ở `index.tsx`; các màn hình còn lại dùng `paddingTop: Platform.OS === "ios" ? 58 : 46` trong header
- `keyboardType="numeric"` cho mọi input số tiền
- `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` cho nút nhỏ hơn 44px
- `TouchableOpacity` lồng nhau: wrapper dùng `activeOpacity={1}` để chặn bubble
- `showsVerticalScrollIndicator={false}` + `keyboardShouldPersistTaps="handled"` trên ScrollView

---

## Backlog (chưa làm)

- [ ] Persistence — chưa có AsyncStorage/SQLite, đang dùng mock data trong mỗi file
- [ ] "Clear All Data" (Settings) — UI only, chưa có logic
- [ ] "Tư vấn AI" / "Ask AI" section — chưa nối Anthropic API
- [ ] Wire giao dịch từ `add-transaction.tsx` vào data store thực
- [ ] Date picker trong `add-transaction.tsx` — hiện chỉ lấy ngày hôm nay

---

## Không bao giờ làm

- ❌ Cài thêm thư viện UI (react-native-paper, native-base, v.v.)
- ❌ Cài thư viện icon (react-native-vector-icons, @expo/vector-icons, v.v.)
- ❌ Dùng Redux, Zustand, hoặc external state lib
- ❌ Tạo shared token file — mỗi file tự khai báo `COLORS`/`SP`/`R`
- ❌ Hardcode chuỗi song ngữ dạng `"Tiếng Việt / English"` trong JSX
- ❌ Dùng `react-navigation` trực tiếp — chỉ dùng Expo Router
