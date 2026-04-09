/* ============================================
   Scale Works - 業務データ定義（オフィスワーク専用）
   ============================================ */

const DEFAULT_HOURLY_RATE = 2000;
const HOURLY_RATE_MIN = 1000;
const HOURLY_RATE_MAX = 5000;
const HOURLY_RATE_STEP = 100;

/* 熊谷さんのGoogle Calendar予約ページ（サーバー側でリダイレクト） */
const BOOKING_URL = "/booking";

const DEFAULT_TASKS = [
  { name: "請求書・見積書の作成・発行", hours: 0, savePct: 80 },
  { name: "記帳・仕訳入力", hours: 0, savePct: 85 },
  { name: "経費精算処理", hours: 0, savePct: 75 },
  { name: "給与計算", hours: 0, savePct: 90 },
  { name: "売掛金・入金確認", hours: 0, savePct: 70 },
  { name: "受電・電話一次対応", hours: 0, savePct: 90 },
  { name: "メール問い合わせ対応", hours: 0, savePct: 70 },
  { name: "データ入力・整理", hours: 0, savePct: 85 },
  { name: "書類作成・文書管理", hours: 0, savePct: 70 },
  { name: "スケジュール管理・アポ調整", hours: 0, savePct: 80 },
  { name: "出張・会議室手配", hours: 0, savePct: 85 },
  { name: "求人票作成・媒体管理", hours: 0, savePct: 75 },
  { name: "応募者対応・面接日程調整", hours: 0, savePct: 80 },
  { name: "入退社手続き・社会保険届出", hours: 0, savePct: 70 },
  { name: "営業リスト作成・リサーチ", hours: 0, savePct: 80 },
  { name: "営業資料・プレゼン資料作成", hours: 0, savePct: 60 },
  { name: "受注処理・発注管理", hours: 0, savePct: 75 },
  { name: "SNS投稿・運用管理", hours: 0, savePct: 70 },
  { name: "Webサイト更新・ブログ記事投稿", hours: 0, savePct: 75 },
  { name: "DM・案内状の発送作業", hours: 0, savePct: 90 },
];


/* カレンダー連携を有効にする場合は true に変更 */
const ENABLE_CALENDAR_STEP = false;

const STEP_LABELS = ENABLE_CALENDAR_STEP
  ? ["時給入力", "カレンダー連携", "業務確認", "分析結果"]
  : ["時給入力", "業務確認", "分析結果"];

const TOTAL_STEPS = STEP_LABELS.length;
