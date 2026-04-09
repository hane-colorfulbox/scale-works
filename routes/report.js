const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const db = require("../services/db");
const { generateReport } = require("../services/pdf");
const { sendReportEmail } = require("../services/email");

/**
 * GET /api/report/:id/download
 * PDFレポートをダウンロード
 */
router.get("/:id/download", async (req, res) => {
  try {
    const submission = db.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "データが見つかりません" });
    }

    let pdfPath;

    if (submission.pdf_path) {
      pdfPath = path.join(__dirname, "..", "reports", submission.pdf_path);
    }

    // PDFが存在しない場合は再生成
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      const pdfFilename = `report_${submission.id}_${Date.now()}.pdf`;
      pdfPath = path.join(__dirname, "..", "reports", pdfFilename);
      await generateReport(submission, pdfPath);
      db.updatePdfPath(submission.id, pdfFilename);
    }

    const downloadName = `${submission.company_name}_業務分析レポート.pdf`;
    res.download(pdfPath, downloadName);
  } catch (err) {
    console.error("[Report] Download error:", err);
    res.status(500).json({ error: "レポート生成に失敗しました" });
  }
});

/**
 * POST /api/report/:id/send
 * レポートをメールで送信
 */
router.post("/:id/send", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes("@")) {
      return res.status(400).json({ error: "送信先メールアドレスが不正です" });
    }

    const submission = db.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "データが見つかりません" });
    }

    let pdfPath;
    if (submission.pdf_path) {
      pdfPath = path.join(__dirname, "..", "reports", submission.pdf_path);
    }

    if (!pdfPath || !fs.existsSync(pdfPath)) {
      const pdfFilename = `report_${submission.id}_${Date.now()}.pdf`;
      pdfPath = path.join(__dirname, "..", "reports", pdfFilename);
      await generateReport(submission, pdfPath);
      db.updatePdfPath(submission.id, pdfFilename);
    }

    await sendReportEmail(to, submission, pdfPath);

    res.json({ success: true, message: "レポートを送信しました" });
  } catch (err) {
    console.error("[Report] Send error:", err);
    res.status(500).json({ error: "レポート送信に失敗しました" });
  }
});

/**
 * POST /api/report/download-direct
 * 分析データを受け取り、PDFを生成してダウンロード返却
 */
router.post("/download-direct", async (req, res) => {
  try {
    const { hourlyRate, tasks, analysis } = req.body;
    if (!tasks || !analysis) {
      return res.status(400).json({ error: "分析データが不足しています" });
    }

    const submission = {
      company_name: null,
      user_name: null,
      job_type: "office",
      hourly_rate: hourlyRate || 2000,
      tasks_json: JSON.stringify(tasks),
      analysis_json: JSON.stringify(analysis),
      created_at: new Date().toLocaleString("ja-JP"),
    };

    const pdfFilename = `report_dl_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, "..", "reports", pdfFilename);

    await generateReport(submission, pdfPath);

    res.download(pdfPath, "業務分析レポート.pdf", () => {
      fs.unlink(pdfPath, () => {});
    });
  } catch (err) {
    console.error("[Report] Download-direct error:", err);
    res.status(500).json({ error: "レポート生成に失敗しました" });
  }
});

/**
 * POST /api/report/send-direct
 * 分析データを直接受け取り、PDF生成→メール送信（DB不要）
 */
router.post("/send-direct", async (req, res) => {
  try {
    const { to, hourlyRate, tasks, analysis } = req.body;
    if (!to || !to.includes("@")) {
      return res.status(400).json({ error: "メールアドレスが不正です" });
    }
    if (!tasks || !analysis) {
      return res.status(400).json({ error: "分析データが不足しています" });
    }

    // submissionオブジェクトを組み立て（DBなし）
    const submission = {
      company_name: null,
      user_name: null,
      job_type: "office",
      hourly_rate: hourlyRate || 2000,
      tasks_json: JSON.stringify(tasks),
      analysis_json: JSON.stringify(analysis),
      created_at: new Date().toLocaleString("ja-JP"),
    };

    const pdfFilename = `report_direct_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, "..", "reports", pdfFilename);

    await generateReport(submission, pdfPath);
    await sendReportEmail(to, submission, pdfPath);

    // PDF削除（送信後は不要）
    fs.unlink(pdfPath, () => {});

    res.json({ success: true, message: "レポートを送信しました" });
  } catch (err) {
    console.error("[Report] Send-direct error:", err);
    res.status(500).json({ error: "レポート送信に失敗しました" });
  }
});

module.exports = router;
