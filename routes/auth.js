const express = require("express");
const router = express.Router();
const googleService = require("../services/google");

/**
 * GET /auth/google
 * Google OAuth認証画面へリダイレクト
 */
router.get("/google", (req, res) => {
  const oauth2Client = googleService.createOAuth2Client();
  const url = googleService.getAuthUrl(oauth2Client);
  res.redirect(url);
});

/**
 * GET /auth/google/callback
 * OAuth認証後のコールバック。トークンをセッションに保存
 */
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "認証コードがありません" });
  }

  try {
    const oauth2Client = googleService.createOAuth2Client();
    const tokens = await googleService.getTokens(oauth2Client, code);
    req.session.googleTokens = tokens;

    // トークンを永続保存（カレンダー監視用）
    googleService.saveTokens(tokens);

    // カレンダーの前月分データを取得
    const calendarData = await googleService.fetchCalendarEvents(oauth2Client);
    req.session.googleData = { calendar: calendarData };

    // フロントエンドに戻る（データ取得完了を通知）
    res.send(`
      <!DOCTYPE html>
      <html><head><title>連携完了</title></head>
      <body>
        <script>
          window.opener.postMessage({
            type: "google-auth-success",
            data: ${JSON.stringify({ calendar: calendarData })}
          }, window.location.origin);
          window.close();
        </script>
      </body></html>
    `);
  } catch (err) {
    console.error("[Auth] Google OAuth error:", err.message);
    res.send(`
      <!DOCTYPE html>
      <html><head><title>エラー</title></head>
      <body>
        <script>
          window.opener.postMessage({
            type: "google-auth-error",
            error: "認証に失敗しました"
          }, window.location.origin);
          window.close();
        </script>
      </body></html>
    `);
  }
});

/**
 * GET /auth/google/status
 * 認証状態を確認
 */
router.get("/google/status", (req, res) => {
  const connected = !!req.session.googleTokens;
  res.json({
    connected,
    data: connected ? req.session.googleData : null,
  });
});

module.exports = router;
