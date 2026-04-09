const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "scale_works.db");
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

function init() {
  const conn = getDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      user_name TEXT,
      job_type TEXT,
      position TEXT,
      hourly_rate INTEGER,
      work_hours INTEGER,
      overtime_hours INTEGER,
      tasks_json TEXT,
      apo_type TEXT,
      apo_date TEXT,
      apo_time TEXT,
      apo_email TEXT,
      analysis_json TEXT,
      pdf_path TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  console.log("Database initialized");
}

function insertSubmission(data) {
  const conn = getDb();
  const stmt = conn.prepare(`
    INSERT INTO submissions (
      company_name, user_name, job_type, position,
      hourly_rate, work_hours, overtime_hours,
      tasks_json, apo_type, apo_date, apo_time, apo_email,
      analysis_json
    ) VALUES (
      @companyName, @userName, @jobType, @position,
      @hourlyRate, @workHours, @overtimeHours,
      @tasksJson, @apoType, @apoDate, @apoTime, @apoEmail,
      @analysisJson
    )
  `);
  const result = stmt.run({
    companyName: data.companyName,
    userName: data.userName,
    jobType: data.jobType,
    position: data.position,
    hourlyRate: data.hourlyRate,
    workHours: data.workHours,
    overtimeHours: data.overtimeHours,
    tasksJson: JSON.stringify(data.tasks),
    apoType: data.apoType,
    apoDate: data.apoDate || null,
    apoTime: data.apoTime || null,
    apoEmail: data.apoEmail || null,
    analysisJson: JSON.stringify(data.analysis),
  });
  return result.lastInsertRowid;
}

function updatePdfPath(id, pdfPath) {
  const conn = getDb();
  conn.prepare("UPDATE submissions SET pdf_path = ? WHERE id = ?").run(pdfPath, id);
}

function getSubmission(id) {
  const conn = getDb();
  return conn.prepare("SELECT * FROM submissions WHERE id = ?").get(id);
}

function listSubmissions() {
  const conn = getDb();
  return conn.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
}

module.exports = { init, getDb, insertSubmission, updatePdfPath, getSubmission, listSubmissions };
