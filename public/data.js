/* ============================================
   Scale Works - 業務データ定義（オフィスワーク専用）
   ============================================ */

const DEFAULT_HOURLY_RATE = 2500;
const HOURLY_RATE_MIN = 1000;
const HOURLY_RATE_MAX = 5000;
const HOURLY_RATE_STEP = 100;

/* 熊谷さんのGoogle Calendar予約ページ（サーバー側でリダイレクト） */
const BOOKING_URL = "/booking";

const DEFAULT_TASKS = [
  { name: "請求書の作成・送付", hours: 15 },
  { name: "メール問い合わせの対応・振り分け", hours: 20 },
  { name: "受発注データの入力・照合", hours: 12 },
  { name: "各種集計・レポート作成", hours: 10 },
  { name: "社内資料・マニュアルの更新", hours: 8 },
  { name: "経費精算・申請処理", hours: 10 },
  { name: "会議調整・議事録作成", hours: 8 },
  { name: "SNS・Web更新作業", hours: 5 },
];


const STEP_LABELS = [
  "時給入力",
  "カレンダー連携",
  "業務確認",
  "分析結果",
];

const TOTAL_STEPS = 4;
