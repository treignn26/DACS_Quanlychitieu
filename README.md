# Ứng dụng Quản lý Tài chính Cá nhân

Đồ án cơ sở — ứng dụng theo dõi thu nhập/chi tiêu, lập ngân sách và tư vấn tài chính bằng AI, gồm backend Node.js/Express + MongoDB và ứng dụng di động React Native (Expo).

## Mục lục

- [Kiến trúc & cấu trúc dự án](#kiến-trúc--cấu-trúc-dự-án)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt Backend](#cài-đặt-backend)
- [Cài đặt ứng dụng di động (Expo)](#cài-đặt-ứng-dụng-di-động-expo)
- [Sử dụng](#sử-dụng)
- [API chính](#api-chính)

## Kiến trúc & cấu trúc dự án

```
.
├── source code/              # Backend — Node.js + Express + MongoDB
│   ├── server.js              # Điểm khởi chạy server
│   ├── config/db.js           # Kết nối MongoDB Atlas
│   ├── controllers/           # Xử lý logic cho từng route
│   ├── models/                # Schema Mongoose (User, Transaction, Profile, BudgetPlan)
│   ├── routes/                # Định nghĩa API endpoint
│   ├── services/               # Logic nghiệp vụ (AI, auth, transaction...)
│   ├── scripts/seed.js        # Script tạo dữ liệu mẫu
│   └── my-app/                # Frontend — Expo / React Native (TypeScript)
│       └── src/
│           ├── app/            # Các màn hình (file-based routing của Expo Router)
│           ├── api/            # Client gọi API tới backend
│           ├── context/        # AuthContext, LanguageContext (vi/en)
│           └── components/
└── .env.example               # Mẫu biến môi trường cho backend
```

## Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) phiên bản 18 trở lên và npm
- Tài khoản [MongoDB Atlas](https://cloud.mongodb.com) (miễn phí) để có chuỗi kết nối `MONGO_URI`
- [Expo Go](https://expo.dev/go) trên điện thoại, hoặc Android Studio / Xcode nếu muốn dùng emulator
- (Tuỳ chọn) API key [Gemini](https://aistudio.google.com/app/apikey) để dùng tính năng chat AI

## Cài đặt Backend

1. Cài dependencies:

   ```bash
   cd "source code"
   npm install
   ```

2. Tạo file `.env` ở thư mục gốc dự án (cùng cấp `.env.example`) với nội dung:

   ```bash
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key   # tuỳ chọn — cần cho tab AI Assistant
   JWT_SECRET=mot_chuoi_bi_mat_bat_ky
   ```

   Hướng dẫn lấy `MONGO_URI`:
   1. Vào https://cloud.mongodb.com → tạo tài khoản miễn phí
   2. Tạo cluster M0 (free) → chọn region gần Việt Nam (Singapore)
   3. Database Access → tạo user + password
   4. Network Access → cho phép IP `0.0.0.0/0` (cho dev)
   5. Connect → Drivers → sao chép connection string, thay `<password>` và `<dbname>`

3. (Tuỳ chọn) Tạo dữ liệu mẫu (giao dịch + profile) trong database:

   ```bash
   npm run seed
   ```

4. Chạy server ở chế độ dev (tự reload khi sửa code):

   ```bash
   npm run dev
   ```

   Hoặc chạy production:

   ```bash
   npm start
   ```

5. Kiểm tra server đã chạy: mở http://localhost:3000/api/health — phải trả về `{ "status": "ok" }`.

## Cài đặt ứng dụng di động (Expo)

1. Cài dependencies:

   ```bash
   cd "source code/my-app"
   npm install
   ```

2. Trỏ ứng dụng về đúng địa chỉ backend trong [src/api/config.ts](source%20code/my-app/src/api/config.ts):

   | Môi trường chạy app | Giá trị `API_BASE` |
   |---|---|
   | iOS Simulator | `http://localhost:3000` |
   | Android Emulator | `http://10.0.2.2:3000` |
   | Thiết bị thật (qua Expo Go, cùng Wi-Fi với máy chạy backend) | `http://<IP_MÁY_TÍNH>:3000` (Mac: lấy IP bằng `ipconfig getifaddr en0`) |

3. Khởi động Expo:

   ```bash
   npx expo start
   ```

   Trong terminal/trình duyệt Metro hiện ra, chọn cách mở app:
   - Quét QR bằng app **Expo Go** trên điện thoại (thiết bị thật)
   - Nhấn `a` để mở Android Emulator, hoặc `i` để mở iOS Simulator
   - Nhấn `w` để mở bản web

   > Lưu ý: backend phải đang chạy (`npm run dev` ở bước trước) thì app mới load được dữ liệu.

## Sử dụng

Ứng dụng có 4 tab chính:

1. **Trang chủ** — xem số dư, tổng thu/chi, lịch sử giao dịch theo ngày/tháng, lọc theo loại (thu/chi)
2. **Nhập liệu** — thêm giao dịch thu/chi mới theo danh mục
3. **Trợ lý AI** — xem điểm sức khoẻ tài chính, insight tự động, phân bổ chi tiêu theo danh mục, và chat hỏi đáp với AI (Gemini)
4. **Cài đặt** — cập nhật hồ sơ cá nhân, ngân sách hàng tháng, đổi ngôn ngữ (Tiếng Việt/English), đổi mật khẩu

Ứng dụng yêu cầu đăng ký/đăng nhập tài khoản trước khi sử dụng (xem màn hình Auth khi mở app lần đầu).

## API chính

Tất cả endpoint có prefix `http://<host>:3000/api`.

| Nhóm | Method & path | Mô tả |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/password` | Đăng ký, đăng nhập, lấy/sửa hồ sơ, đổi mật khẩu |
| Home | `GET /home/transactions`, `GET /home/summary` | Danh sách giao dịch (lọc theo loại/ngày/tháng), tổng thu-chi |
| Transactions | `POST /transactions`, `DELETE /transactions/:id` | Thêm / xoá giao dịch |
| AI | `GET /ai/overview`, `GET /ai/health-score`, `GET /ai/spending-breakdown`, `POST /ai/chat` | Điểm sức khoẻ tài chính, insight, phân bổ chi tiêu, chat AI |
| Settings | `GET /settings/profile`, `PUT /settings/profile`, `DELETE /settings/data` | Hồ sơ người dùng, ngân sách, xoá toàn bộ dữ liệu |
| Charts | `GET /charts/data?period=day|month|year` | Dữ liệu biểu đồ theo khoảng thời gian |
| Budget | `GET /budget/plan`, `PUT /budget/plan` | Lấy / lưu kế hoạch ngân sách |
| Health check | `GET /health` | Kiểm tra server đang chạy |
