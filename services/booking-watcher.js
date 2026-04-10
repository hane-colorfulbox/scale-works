const path = require("path");
const fs = require("fs");
const { getAuthorizedClient, fetchRecentBookings } = require("./google");
const { generateReport } = require("./pdf");
const { sendReportEmail } = require("./email");
const db = require("./db");

const POLL_INTERVAL = 5 * 60 * 1000; // 5分ごと
const SENT_LOG_PATH = path.join(__dirname, "..", "data", "sent_bookings.json");

/**
 * 送信済みイベントIDを管理
 */
function loadSentIds() {
  try {
    if (fs.existsSync(SENT_LOG_PATH)) {
      return new Set(JSON.parse(fs.readFileSync(SENT_LOG_PATH, "utf8")));
    }
  } catch (err) {
    console.error("[BookingWatcher] 送信ログ読み込みエラー:", err.message);
  }
  return new Set();
}

function saveSentIds(sentIds) {
  fs.writeFileSync(SENT_LOG_PATH, JSON.stringify([...sentIds], null, 2));
}

/**
 * 最新の未送信分析データを取得
 */
function getLatestPendingAnalysis() {
  try {
    const conn = db.getDb();
    return conn.prepare(
      "SELECT * FROM submissions WHERE pdf_sent = 0 ORDER BY created_at DESC LIMIT 1"
    ).get();
  } catch (err) {
    return null;
  }
}

function markAsSent(id) {
  try {
    const conn = db.getDb();
    conn.prepare("UPDATE submissions SET pdf_sent = 1 WHERE id = ?").run(id);
  } catch (err) {
    console.error("[BookingWatcher] マーク更新エラー:", err.message);
  }
}

/**
 * カレンダーをチェックし、新しい予約にPDFを送信
 */
async function checkAndSend() {
  const client = getAuthorizedClient();
  if (!client) {
    return; // トークン未設定、静かにスキップ
  }

  try {
    const bookings = await fetchRecentBookings(client, 10);
    const sentIds = loadSentIds();

    for (const event of bookings) {
      if (sentIds.has(event.id)) continue;

      // 予約者のメアドを取得（自分以外のattendee）
      const attendee = event.attendees.find(
        (a) => !a.organizer && !a.self && a.email
      );
      if (!attendee) continue;

      const email = attendee.email;
      console.log(`[BookingWatcher] 新しい予約検知: ${email} (${event.summary})`);

      // 最新の分析データを取得
      const analysis = getLatestPendingAnalysis();
      if (!analysis) {
        console.log("[BookingWatcher] 未送信の分析データなし、スキップ");
        sentIds.add(event.id);
        saveSentIds(sentIds);
        continue;
      }

      // PDF生成
      const pdfFilename = `report_booking_${Date.now()}.pdf`;
      const pdfPath = path.join(__dirname, "..", "reports", pdfFilename);

      await generateReport(analysis, pdfPath);
      await sendReportEmail(email, analysis, pdfPath);

      // 送信済みマーク
      markAsSent(analysis.id);
      sentIds.add(event.id);
      saveSentIds(sentIds);

      // PDF削除
      fs.unlink(pdfPath, () => {});

      console.log(`[BookingWatcher] PDF送信完了: ${email}`);
    }
  } catch (err) {
    console.error("[BookingWatcher] エラー:", err.message);
  }
}

/**
 * ポーリング開始
 */
function startWatcher() {
  console.log(`[BookingWatcher] 監視開始 (${POLL_INTERVAL / 1000}秒間隔)`);
  // 起動直後は少し待ってから初回チェック
  setTimeout(() => {
    checkAndSend();
    setInterval(checkAndSend, POLL_INTERVAL);
  }, 10000);
}

module.exports = { startWatcher, checkAndSend };
