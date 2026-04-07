/* ============================================
   Scale Works - 業務データ定義（オフィスワーク専用）
   ============================================ */

const DEFAULT_HOURLY_RATE = 2500;
const HOURLY_RATE_MIN = 1000;
const HOURLY_RATE_MAX = 5000;
const HOURLY_RATE_STEP = 100;

/* 熊谷さんのGoogle Calendar予約ページ */
const BOOKING_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ12UcU8kZsNnBmuiHvo7IVpLWYaxzQe0Q1Zh82k-umDm21xrdB-a6nXknazqONOO1QxockzlcRU";

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

const PROPOSALS = [
  {
    name: "問い合わせ対応自動化",
    targetTask: "メール問い合わせの対応・振り分け",
    reductionRate: 0.75,
    price: 248000,
    description: "Claude APIによる自動分類・回答ドラフト生成",
  },
  {
    name: "請求書作成自動化",
    targetTask: "請求書の作成・送付",
    reductionRate: 0.80,
    price: 148000,
    description: "データ入力から請求書PDF生成・送付まで自動化",
  },
  {
    name: "フォームマーケティング自動化",
    targetTask: "SNS・Web更新作業",
    reductionRate: 0.70,
    price: 148000,
    description: "問い合わせフォームへの自動アプローチ",
  },
  {
    name: "ホームページAIO最適化",
    targetTask: "SNS・Web更新作業",
    reductionRate: 0.50,
    price: 198000,
    description: "AI検索最適化でWeb経由の問い合わせを増加",
  },
  {
    name: "社内マニュアル作成BPO",
    targetTask: "社内資料・マニュアルの更新",
    reductionRate: 0.80,
    price: 60000,
    priceUnit: "月額",
    description: "マニュアルの取材・執筆・校正を代行",
  },
];

const STEP_LABELS = [
  "時給入力",
  "カレンダー連携",
  "業務確認",
  "分析結果",
];

const TOTAL_STEPS = 4;
