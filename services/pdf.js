const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const FONT_PATH = path.join(__dirname, "..", "fonts", "NotoSansJP-Regular.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "..", "fonts", "NotoSansJP-Bold.ttf");

const COLORS = {
  primary: "#1a2b5f",
  accent: "#3b82f6",
  success: "#10b981",
  successLight: "#d1fae5",
  gray700: "#374151",
  gray500: "#6b7280",
  gray300: "#d1d5db",
  gray100: "#f3f4f6",
  white: "#ffffff",
};

/**
 * 業務分析レポートPDFを生成する（1ページ版）
 */
function generateReport(submission, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 45, right: 45 },
      info: {
        Title: "Scale Works 業務分析レポート",
        Author: "Scale Works by カラフルボックス株式会社",
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const hasFont = fs.existsSync(FONT_PATH);
    if (hasFont) {
      doc.registerFont("NotoSans", FONT_PATH);
      if (fs.existsSync(FONT_BOLD_PATH)) {
        doc.registerFont("NotoSansBold", FONT_BOLD_PATH);
      } else {
        doc.registerFont("NotoSansBold", FONT_PATH);
      }
    }

    const font = hasFont ? "NotoSans" : "Helvetica";
    const fontBold = hasFont ? "NotoSansBold" : "Helvetica-Bold";

    const analysis = JSON.parse(submission.analysis_json || "{}");
    const tasks = JSON.parse(submission.tasks_json || "[]").filter((t) => t.enabled && t.hours > 0);
    const pageW = doc.page.width;
    const contentW = pageW - 90;

    // --- ヘッダー ---
    doc.rect(0, 0, pageW, 65).fill(COLORS.primary);
    doc.font(fontBold).fontSize(20).fillColor(COLORS.white).text("Scale Works", 45, 18);
    doc.font(font).fontSize(10).fillColor(COLORS.white).text("業務分析レポート", 45, 42);
    doc.font(font).fontSize(8).fillColor(COLORS.white)
      .text(submission.created_at || new Date().toLocaleDateString("ja-JP"), 400, 42);

    let y = 80;

    // --- コストサマリー（3カード横並び） ---
    const totalHours = analysis.totalHours || tasks.reduce((s, t) => s + t.hours, 0);
    const hourlyRate = submission.hourly_rate || 2000;
    const monthlyCost = analysis.monthlyCost || totalHours * hourlyRate;
    const annualCost = analysis.annualCost || monthlyCost * 12;

    const cardW = (contentW - 20) / 3;
    const cardH = 50;
    const cards = [
      { label: "月間業務時間", value: `${totalHours}時間` },
      { label: "月間コスト", value: `¥${monthlyCost.toLocaleString()}` },
      { label: "年間コスト", value: `¥${annualCost.toLocaleString()}` },
    ];

    for (let i = 0; i < cards.length; i++) {
      const cx = 45 + i * (cardW + 10);
      doc.roundedRect(cx, y, cardW, cardH, 5).lineWidth(1).fillAndStroke("#f8fafc", COLORS.gray300);
      doc.font(font).fontSize(8).fillColor(COLORS.gray500).text(cards[i].label, cx + 8, y + 10, { width: cardW - 16 });
      doc.font(fontBold).fontSize(15).fillColor(COLORS.primary).text(cards[i].value, cx + 8, y + 26, { width: cardW - 16 });
    }
    y += cardH + 12;

    // --- 削減見込みサマリー ---
    const totalSavedHours = analysis.totalSavedHours || tasks.reduce((s, t) => {
      const pct = t.savePct || 50;
      return s + Math.round(t.hours * pct / 100);
    }, 0);
    const monthlySaving = analysis.monthlySaving || totalSavedHours * hourlyRate;
    const annualSaving = analysis.annualSaving || monthlySaving * 12;

    doc.roundedRect(45, y, contentW, 42, 5).lineWidth(1).fillAndStroke(COLORS.successLight, COLORS.success);
    doc.font(fontBold).fontSize(9).fillColor(COLORS.gray700)
      .text("Scale Works 導入による削減見込み（月間）", 55, y + 8);
    doc.font(fontBold).fontSize(14).fillColor(COLORS.success)
      .text(`-${totalSavedHours}時間 / ¥${monthlySaving.toLocaleString()}`, 300, y + 6, { width: contentW - 265, align: "right" });
    doc.font(font).fontSize(8).fillColor(COLORS.gray700)
      .text("年間削減見込み", 55, y + 26);
    doc.font(fontBold).fontSize(11).fillColor(COLORS.success)
      .text(`¥${annualSaving.toLocaleString()}`, 300, y + 24, { width: contentW - 265, align: "right" });
    y += 54;

    // --- 業務別の削減見込み ---
    y = sectionTitle(doc, fontBold, "業務別の削減見込み", y);

    // テーブルヘッダー
    const colX = { name: 50, hours: 280, saved: 350, cost: 430 };
    doc.font(fontBold).fontSize(8).fillColor(COLORS.gray500);
    doc.text("業務名", colX.name, y);
    doc.text("月間時間", colX.hours, y, { width: 60, align: "right" });
    doc.text("削減時間", colX.saved, y, { width: 60, align: "right" });
    doc.text("削減コスト", colX.cost, y, { width: 80, align: "right" });
    y += 14;
    doc.moveTo(50, y).lineTo(510, y).stroke(COLORS.gray300);
    y += 6;

    for (const task of tasks) {
      if (y > 730) break;
      const pct = task.savePct || 50;
      const savedHours = Math.round(task.hours * pct / 100);
      const savedCost = savedHours * hourlyRate;

      doc.font(font).fontSize(9).fillColor(COLORS.gray700);
      doc.text(task.name, colX.name, y, { width: 220 });
      doc.text(`${task.hours}h`, colX.hours, y, { width: 60, align: "right" });
      doc.font(fontBold).fillColor(COLORS.success);
      doc.text(`-${savedHours}h`, colX.saved, y, { width: 60, align: "right" });
      doc.text(`¥${savedCost.toLocaleString()}`, colX.cost, y, { width: 80, align: "right" });

      // バー
      y += 15;
      doc.roundedRect(colX.name, y, 460, 4, 2).fill(COLORS.gray100);
      const barW = Math.max(4, 460 * pct / 100);
      doc.roundedRect(colX.name, y, barW, 4, 2).fill(COLORS.success);
      y += 12;
    }

    // 合計行
    doc.moveTo(50, y).lineTo(510, y).stroke(COLORS.gray300);
    y += 6;
    doc.font(fontBold).fontSize(9).fillColor(COLORS.primary);
    doc.text("合計", colX.name, y);
    doc.text(`${totalHours}h`, colX.hours, y, { width: 60, align: "right" });
    doc.fillColor(COLORS.success);
    doc.text(`-${totalSavedHours}h`, colX.saved, y, { width: 60, align: "right" });
    doc.text(`¥${monthlySaving.toLocaleString()}`, colX.cost, y, { width: 80, align: "right" });
    y += 30;

    // --- フッター ---
    y = Math.max(y, 700);
    doc.moveTo(45, y).lineTo(510, y).stroke(COLORS.gray300);
    y += 10;
    doc.font(font).fontSize(8).fillColor(COLORS.gray500);
    doc.text("本レポートは業務分析ツールによる自動算出結果です。詳細は無料面談にてご説明いたします。", 45, y);
    y += 18;
    doc.font(fontBold).fontSize(9).fillColor(COLORS.primary);
    doc.text("Scale Works by カラフルボックス株式会社", 45, y);

    doc.end();

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

function sectionTitle(doc, fontBold, text, y) {
  doc.font(fontBold).fontSize(11).fillColor("#1a2b5f").text(text, 50, y);
  return y + 20;
}

module.exports = { generateReport };
