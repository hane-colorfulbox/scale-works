const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const FONT_PATH = path.join(__dirname, "..", "fonts", "NotoSansJP-Regular.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "..", "fonts", "NotoSansJP-Bold.ttf");

const COLORS = {
  primary: "#1a2b5f",
  accent: "#3b82f6",
  success: "#10b981",
  gray700: "#374151",
  gray500: "#6b7280",
  gray300: "#d1d5db",
  white: "#ffffff",
};

/**
 * 業務分析レポートPDFを生成する
 */
function generateReport(submission, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `${submission.company_name} 業務分析レポート`,
        Author: "Scale Works by カラフルボックス株式会社",
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // フォントが存在するか確認
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
    const tasks = JSON.parse(submission.tasks_json || "[]").filter((t) => t.enabled);
    const proposals = analysis.proposals || [];
    const jobLabels = { office: "オフィスワーク", sr: "社労士", tax: "税理士" };

    // --- ヘッダー ---
    doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
    doc.font(fontBold).fontSize(22).fillColor(COLORS.white).text("Scale Works", 50, 25);
    doc.font(font).fontSize(11).fillColor(COLORS.white).text("業務分析レポート", 50, 52);
    doc.font(font).fontSize(9).fillColor(COLORS.white).text(submission.created_at || "", 400, 52);

    let y = 100;

    // --- 基本情報 ---
    y = sectionTitle(doc, fontBold, "基本情報", y);
    const infoRows = [
      ["会社名", submission.company_name],
      ["担当者", submission.user_name],
      ["職種", jobLabels[submission.job_type] || submission.job_type],
      ["時給", `¥${Number(submission.hourly_rate || 0).toLocaleString()}`],
      ["月間労働時間", `${submission.work_hours}h + 残業${submission.overtime_hours}h = ${(submission.work_hours || 0) + (submission.overtime_hours || 0)}h`],
    ];
    y = infoTable(doc, font, fontBold, infoRows, y);
    y += 20;

    // --- 業務一覧 ---
    y = sectionTitle(doc, fontBold, "対象業務", y);
    for (const task of tasks) {
      if (y > 720) { doc.addPage(); y = 60; }
      doc.font(font).fontSize(10).fillColor(COLORS.gray700);
      doc.text(`・ ${task.name}`, 60, y, { width: 350 });
      doc.text(`${task.hours}h/月`, 430, y, { width: 70, align: "right" });
      y += 18;
    }
    const totalTaskHours = tasks.reduce((s, t) => s + t.hours, 0);
    doc.moveTo(60, y + 2).lineTo(500, y + 2).stroke(COLORS.gray300);
    y += 8;
    doc.font(fontBold).fontSize(10).fillColor(COLORS.primary);
    doc.text("合計", 60, y);
    doc.text(`${totalTaskHours}h/月`, 430, y, { width: 70, align: "right" });
    y += 30;

    // --- ROIサマリー ---
    if (y > 620) { doc.addPage(); y = 60; }
    y = sectionTitle(doc, fontBold, "削減効果サマリー", y);

    const boxW = 145;
    const boxH = 55;
    const boxes = [
      { label: "月間削減可能時間", value: `${analysis.totalReductionHours || 0}時間` },
      { label: "月間削減コスト", value: `¥${(analysis.totalMonthlySaving || 0).toLocaleString()}` },
      { label: "年間削減コスト", value: `¥${(analysis.totalAnnualSaving || 0).toLocaleString()}` },
    ];
    for (let i = 0; i < boxes.length; i++) {
      const bx = 50 + i * (boxW + 15);
      doc.roundedRect(bx, y, boxW, boxH, 6).fill("#f0f4ff");
      doc.font(font).fontSize(8).fillColor(COLORS.gray500).text(boxes[i].label, bx + 10, y + 10, { width: boxW - 20 });
      doc.font(fontBold).fontSize(16).fillColor(COLORS.primary).text(boxes[i].value, bx + 10, y + 28, { width: boxW - 20 });
    }
    y += boxH + 25;

    // --- 提案カード ---
    y = sectionTitle(doc, fontBold, "自動化・BPO提案（ROI順）", y);

    for (let i = 0; i < Math.min(proposals.length, 5); i++) {
      if (y > 640) { doc.addPage(); y = 60; }
      const p = proposals[i];
      const cardY = y;

      // カード背景
      doc.roundedRect(50, cardY, 450, 75, 6).fill("#fafbfc").stroke(COLORS.gray300);

      // 番号
      doc.circle(70, cardY + 16, 10).fill(COLORS.accent);
      doc.font(fontBold).fontSize(10).fillColor(COLORS.white).text(String(i + 1), 64, cardY + 11, { width: 12, align: "center" });

      // 名前
      doc.font(fontBold).fontSize(12).fillColor(COLORS.primary).text(p.name, 90, cardY + 10, { width: 300 });

      // メトリクス
      const mx = 90;
      const my = cardY + 30;
      doc.font(font).fontSize(8).fillColor(COLORS.gray500);
      doc.text(`現在: 月${p.baseHours}h × ¥${Number(submission.hourly_rate).toLocaleString()}`, mx, my);
      doc.text(`削減: 月${p.reducedHours}h（${Math.round(p.reductionRate * 100)}%）`, mx, my + 14);

      doc.fillColor(COLORS.success);
      doc.text(`月次削減額: ¥${(p.monthlySaving || 0).toLocaleString()}`, mx + 200, my);

      const payback = p.priceUnit === "月額" ? "即月回収" : `${p.paybackMonths}ヶ月`;
      doc.fillColor(COLORS.gray700);
      doc.text(`回収期間: ${payback}`, mx + 200, my + 14);

      // 価格
      const priceLabel = p.priceUnit === "月額"
        ? `¥${Number(p.price).toLocaleString()}/月`
        : `¥${Number(p.price).toLocaleString()}`;
      doc.font(fontBold).fontSize(11).fillColor(COLORS.primary);
      doc.text(priceLabel, 380, cardY + 52, { width: 110, align: "right" });

      // 説明
      doc.font(font).fontSize(7).fillColor(COLORS.gray500);
      doc.text(p.description || "", mx, cardY + 56, { width: 280 });

      y = cardY + 85;
    }

    // --- フッター ---
    if (y > 700) { doc.addPage(); y = 60; }
    y += 20;
    doc.moveTo(50, y).lineTo(500, y).stroke(COLORS.gray300);
    y += 15;
    doc.font(font).fontSize(9).fillColor(COLORS.gray500);
    doc.text("本レポートは業務分析ツールによる自動算出結果です。", 50, y);
    doc.text("詳細はオンライン説明会にてご説明いたします。", 50, y + 14);
    y += 40;
    doc.font(fontBold).fontSize(10).fillColor(COLORS.primary);
    doc.text("Scale Works by カラフルボックス株式会社", 50, y);

    doc.end();

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

function sectionTitle(doc, fontBold, text, y) {
  doc.moveTo(50, y).lineTo(500, y).stroke(COLORS.primary);
  y += 8;
  doc.font(fontBold).fontSize(13).fillColor(COLORS.primary).text(text, 50, y);
  return y + 25;
}

function infoTable(doc, font, fontBold, rows, y) {
  for (const [label, value] of rows) {
    doc.font(fontBold).fontSize(9).fillColor(COLORS.gray500).text(label, 60, y, { width: 100 });
    doc.font(font).fontSize(10).fillColor(COLORS.gray700).text(value, 170, y, { width: 330 });
    y += 18;
  }
  return y;
}

module.exports = { generateReport };
