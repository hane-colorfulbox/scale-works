require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const authRoutes = require("./routes/auth");
const analysisRoutes = require("./routes/analysis");
const reportRoutes = require("./routes/report");
const db = require("./services/db");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "scale-works-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000 }, // 30分
  })
);
app.use(express.static(path.join(__dirname, "public")));

// --- Routes ---
app.use("/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/report", reportRoutes);

// --- 予約リダイレクト ---
app.get("/booking", (req, res) => {
  const url = process.env.BOOKING_URL;
  if (!url) return res.status(404).send("予約リンクが設定されていません");
  res.redirect(url);
});

// --- DB初期化 & 起動 ---
db.init();

app.listen(PORT, () => {
  console.log(`Scale Works running on http://localhost:${PORT}`);
});
