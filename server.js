require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const authRoutes = require("./routes/auth");
const analysisRoutes = require("./routes/analysis");
const reportRoutes = require("./routes/report");
const db = require("./services/db");
const { startWatcher } = require("./services/booking-watcher");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS (Cloudflare Pages からのAPI呼び出しを許可) ---
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,           // 本番: CF Pages URL
  "http://localhost:3000",             // ローカル開発
  "http://localhost:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

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

// --- ヘルスチェック (pre-warm用) ---
app.get("/health", (_req, res) => res.send("ok"));

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
  startWatcher();
});
