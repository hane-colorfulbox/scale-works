const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

const TOKEN_PATH = path.join(__dirname, "..", "data", "calendar_token.json");

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * 保存済みトークンを読み込んでOAuth2クライアントを返す
 */
function getAuthorizedClient() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    const client = createOAuth2Client();
    client.setCredentials(tokens);
    return client;
  } catch (err) {
    console.error("[Google] トークン読み込みエラー:", err.message);
    return null;
  }
}

/**
 * トークンをファイルに永続保存
 */
function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("[Google] トークン保存完了:", TOKEN_PATH);
}

/**
 * 指定期間の新しい予約イベントを取得
 */
async function fetchRecentBookings(oauth2Client, sinceMinutes = 10) {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: since.toISOString(),
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  // 予約スケジュールから入ったイベント（attendeesがいるもの）をフィルタ
  return events.filter((e) => e.attendees && e.attendees.length > 0);
}

function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

async function getTokens(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

/**
 * Googleカレンダーから前月分の予定を取得し、
 * 業務カテゴリごとに集計する
 */
async function fetchCalendarEvents(oauth2Client) {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const now = new Date();
  // 前月の1日〜末日
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: lastMonthStart.toISOString(),
    timeMax: lastMonthEnd.toISOString(),
    maxResults: 500,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  const summary = {
    totalEvents: events.length,
    totalMinutes: 0,
    categories: {},
  };

  for (const event of events) {
    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const minutes = (end - start) / 60000;
    summary.totalMinutes += minutes;

    // イベント名からカテゴリを推定
    const title = (event.summary || "").toLowerCase();
    const category = categorizeEvent(title);
    if (!summary.categories[category]) {
      summary.categories[category] = { count: 0, minutes: 0 };
    }
    summary.categories[category].count++;
    summary.categories[category].minutes += minutes;
  }

  return summary;
}

/**
 * イベントタイトルから業務カテゴリを推定
 */
function categorizeEvent(title) {
  const patterns = {
    "会議・ミーティング": ["会議", "mtg", "meeting", "打ち合わせ", "打合せ", "ミーティング", "定例"],
    "面談・1on1": ["面談", "1on1", "one on one", "相談"],
    "研修・セミナー": ["研修", "セミナー", "勉強会", "トレーニング"],
    "営業・商談": ["商談", "営業", "プレゼン", "提案", "デモ"],
    "レビュー・確認": ["レビュー", "review", "確認", "チェック"],
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => title.includes(kw))) {
      return category;
    }
  }
  return "その他";
}

module.exports = {
  createOAuth2Client,
  getAuthUrl,
  getTokens,
  getAuthorizedClient,
  saveTokens,
  fetchCalendarEvents,
  fetchRecentBookings,
};
