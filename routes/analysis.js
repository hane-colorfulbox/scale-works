const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { notifyNewSubmission } = require("../services/email");
const { generateReport } = require("../services/pdf");
const path = require("path");

/**
 * POST /api/analysis/submit
 * 分析データを受け取り、DB保存 → メール通知 → PDF生成
 */
router.post("/submit", async (req, res) => {
  try {
    const {
      jobType,
      hourlyRate,
      tasks,
      analysis,
    } = req.body;

    // バリデーション
    if (!jobType) {
      return res.status(400).json({ error: "必須項目が不足しています" });
    }

    // DB保存
    const id = db.insertSubmission({
      companyName: null,
      userName: null,
      jobType,
      position: null,
      hourlyRate,
      workHours: null,
      overtimeHours: null,
      tasks,
      apoType: null,
      apoDate: null,
      apoTime: null,
      apoEmail: null,
      analysis,
    });

    const submission = db.getSubmission(id);

    // メール通知（非同期、エラーでも止めない）
    notifyNewSubmission(submission).catch((err) => {
      console.error("[Analysis] メール通知エラー:", err.message);
    });

    // PDF生成（非同期）
    const pdfFilename = `report_${id}_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, "..", "reports", pdfFilename);

    generateReport(submission, pdfPath)
      .then(() => {
        db.updatePdfPath(id, pdfFilename);
        console.log("[Analysis] PDF生成完了:", pdfFilename);
      })
      .catch((err) => {
        console.error("[Analysis] PDF生成エラー:", err.message);
      });

    res.json({
      success: true,
      id,
      message: "分析データを受信しました",
    });
  } catch (err) {
    console.error("[Analysis] Submit error:", err);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

/**
 * GET /api/analysis/list
 * 送信一覧（管理用）
 */
router.get("/list", (req, res) => {
  const submissions = db.listSubmissions();
  res.json(submissions);
});

/**
 * GET /api/analysis/:id
 * 個別の送信データ取得
 */
router.get("/:id", (req, res) => {
  const submission = db.getSubmission(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: "データが見つかりません" });
  }
  res.json(submission);
});

module.exports = router;
