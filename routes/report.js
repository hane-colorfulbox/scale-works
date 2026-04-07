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

module.exports = router;
