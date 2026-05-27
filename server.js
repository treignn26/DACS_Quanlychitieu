const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Tạo một API đơn giản trả về câu chào
app.get("/api/hello", (req, res) => {
  res.json({ message: "Xin chào từ Node.js Backend! 🚀" });
});

// Chạy server
// LƯU Ý: Chạy ở '0.0.0.0' để điện thoại cùng mạng Wi-Fi có thể truy cập được
app.listen(port, "0.0.0.0", () => {
  console.log(`Backend đang chạy tại cổng ${port}`);
});
