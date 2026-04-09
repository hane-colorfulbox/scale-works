const nodemailer = require("nodemailer");

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * 新規送信時の社内通知メール
 */
async function notifyNewSubmission(submission) {
  if (!process.env.SMTP_USER || !process.env.NOTIFY_TO) {
    console.log("[Email] SMTP未設定のためスキップ:", submission.companyName);
    return;
  }

  const transport = createTransport();

  const apoInfo =
    submission.apoType === "calendar"
      ? `日程予約: ${submission.apoDate} ${submission.apoTime}〜`
      : `メール連絡希望: ${submission.apoEmail}`;

  const tasks = JSON.parse(submission.tasks_json || "[]");
  const taskList = tasks
    .filter((t) => t.enabled)
    .map((t) => `  - ${t.name}: ${t.hours}h/月`)
    .join("\n");

  const analysis = JSON.parse(submission.analysis_json || "{}");
  const proposals = (analysis.proposals || [])
    .slice(0, 5)
    .map((p, i) => `  ${i + 1}. ${p.name} (月${p.reducedHours}h削減 / ¥${p.monthlySaving.toLocaleString()})`)
    .join("\n");

  const jobLabels = { office: "オフィスワーク", sr: "社労士", tax: "税理士" };

  const body = `
Scale Works 新規業務分析レポート

━━━━━━━━━━━━━━━━━━━━━━━━
基本情報
━━━━━━━━━━━━━━━━━━━━━━━━
会社名: ${submission.company_name}
担当者: ${submission.user_name}
職種: ${jobLabels[submission.job_type] || submission.job_type}
時給: ¥${(submission.hourly_rate || 0).toLocaleString()}
月間労働時間: ${submission.work_hours}h + 残業${submission.overtime_hours}h

━━━━━━━━━━━━━━━━━━━━━━━━
アポイントメント
━━━━━━━━━━━━━━━━━━━━━━━━
${apoInfo}

━━━━━━━━━━━━━━━━━━━━━━━━
登録業務
━━━━━━━━━━━━━━━━━━━━━━━━
${taskList}

━━━━━━━━━━━━━━━━━━━━━━━━
提案（ROI順）
━━━━━━━━━━━━━━━━━━━━━━━━
${proposals}

月間削減可能時間: ${analysis.totalReductionHours || 0}h
月間削減コスト: ¥${(analysis.totalMonthlySaving || 0).toLocaleString()}
年間削減コスト: ¥${(analysis.totalAnnualSaving || 0).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━
送信日時: ${submission.created_at}
`.trim();

  await transport.sendMail({
    from: `"Scale Works" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_TO,
    subject: `【Scale Works】新規分析: ${submission.company_name} ${submission.user_name}様`,
    text: body,
  });

  console.log("[Email] 通知送信完了:", submission.company_name);
}

/**
 * レポートPDF送付メール
 */
async function sendReportEmail(to, submission, pdfPath) {
  if (!process.env.SMTP_USER) {
    console.log("[Email] SMTP未設定のためスキップ");
    return;
  }

  const transport = createTransport();

  const companyName = submission.company_name || "";
  const userName = submission.user_name || "";
  const greeting = userName ? `${userName}様` : "お客様";
  const subjectName = companyName ? `${companyName}様 ` : "";
  const fileName = companyName
    ? `${companyName}_業務分析レポート.pdf`
    : "業務分析レポート.pdf";

  await transport.sendMail({
    from: `"Scale Works" <${process.env.SMTP_USER}>`,
    to,
    subject: `【Scale Works】${subjectName}業務分析レポート`,
    text: `${greeting}

Scale Worksをご利用いただきありがとうございます。
業務分析レポートを添付いたします。

詳細は無料面談にてご説明させていただきます。
ご不明点がございましたらお気軽にお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━
Scale Works by カラフルボックス株式会社
━━━━━━━━━━━━━━━━━━━━━━━━`,
    attachments: [
      {
        filename: fileName,
        path: pdfPath,
      },
    ],
  });

  console.log("[Email] レポート送信完了:", to);
}

module.exports = { notifyNewSubmission, sendReportEmail };
