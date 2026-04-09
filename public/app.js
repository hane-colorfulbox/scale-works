/* ============================================
   Scale Works - 業務分析ツール メインロジック
   ============================================ */

/* --- State --- */
const state = {
  currentStep: 1,
  hourlyRate: DEFAULT_HOURLY_RATE,
  googleConnected: false,
  googleData: null,
  tasks: [],
  submissionId: null,
};

/* --- Utility --- */
function formatCurrency(num) {
  return new Intl.NumberFormat("ja-JP").format(num);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function $(id) {
  return document.getElementById(id);
}

/* --- Init --- */
document.addEventListener("DOMContentLoaded", () => {
  initProgressSteps();
  initSlider();
  initTasks();
  updateProgress();
});

/* --- Progress Bar --- */
function initProgressSteps() {
  const container = $("progressSteps");
  container.innerHTML = STEP_LABELS.map(
    (label, i) => `<span class="progress-step" data-pstep="${i + 1}">${label}</span>`
  ).join("");
}

function updateProgress() {
  const fill = $("progressFill");
  const pct = (state.currentStep / TOTAL_STEPS) * 100;
  fill.style.width = pct + "%";

  document.querySelectorAll(".progress-step").forEach((el) => {
    const s = parseInt(el.dataset.pstep);
    el.classList.toggle("active", s === state.currentStep);
    el.classList.toggle("done", s < state.currentStep);
  });
}

/* --- Step Navigation --- */
function showStep(step) {
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.add("hidden");
  });
  const target = $("step" + step);
  if (target) {
    target.classList.remove("hidden");
    target.style.animation = "none";
    void target.offsetHeight;
    target.style.animation = "";
  }
  state.currentStep = step;
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextStep() {
  if (state.currentStep < TOTAL_STEPS) {
    const next = state.currentStep + 1;
    if (next === 3) renderTaskList();
    if (next === 4) renderPreview();
    showStep(next);
  }
}

function prevStep() {
  if (state.currentStep > 1) {
    showStep(state.currentStep - 1);
  }
}

/* --- Step 1: Hourly Rate --- */
function initSlider() {
  const slider = $("hourlyRate");
  slider.addEventListener("input", () => {
    state.hourlyRate = parseInt(slider.value);
    $("hourlyRateValue").textContent = formatCurrency(state.hourlyRate) + "円";
  });
}

function skipHourlyRate() {
  state.hourlyRate = DEFAULT_HOURLY_RATE;
  nextStep();
}

/* --- Step 2: Google Calendar Connect --- */
function connectGoogle() {
  if (state.googleConnected) return;

  const btn = $("calendarBtn");
  btn.disabled = true;
  btn.textContent = "接続中...";
  btn.style.opacity = "0.7";

  const authWindow = window.open("/auth/google", "google-auth", "width=500,height=600");

  const handler = (event) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === "google-auth-success") {
      window.removeEventListener("message", handler);
      state.googleData = event.data.data;
      applyCalendarData();
      markCalendarConnected("前月分のデータを取得しました");
    }

    if (event.data.type === "google-auth-error") {
      window.removeEventListener("message", handler);
      markCalendarConnected("サンプルデータで分析します");
    }
  };

  window.addEventListener("message", handler);

  const checkClosed = setInterval(() => {
    if (authWindow && authWindow.closed) {
      clearInterval(checkClosed);
      if (!state.googleConnected) {
        window.removeEventListener("message", handler);
        markCalendarConnected("サンプルデータで分析します");
      }
    }
  }, 500);
}

function markCalendarConnected(message) {
  state.googleConnected = true;
  const card = $("calendarConnect");
  card.classList.add("connected");
  const btn = $("calendarBtn");
  btn.textContent = "接続済み";
  btn.classList.add("connected");
  btn.disabled = true;
  btn.style.opacity = "1";
  $("calendarDesc").textContent = message;
}

/* --- Init Tasks --- */
function initTasks() {
  state.tasks = DEFAULT_TASKS.map((t) => ({
    name: t.name,
    hours: t.hours,
    enabled: true,
    source: "default",
    savePct: t.savePct || 50,
  }));
}

function applyCalendarData() {
  if (!state.googleData || !state.googleData.calendar) return;

  const categories = state.googleData.calendar.categories || {};
  const calendarTasks = [];

  for (const [category, data] of Object.entries(categories)) {
    const hours = Math.round(data.minutes / 60);
    if (hours > 0) {
      calendarTasks.push({
        name: category,
        hours: hours,
        enabled: true,
        source: "calendar",
        count: data.count,
      });
    }
  }

  // カレンダータスクを先頭に、デフォルトタスクを後ろに
  const defaultTasks = DEFAULT_TASKS.map((t) => ({
    name: t.name,
    hours: t.hours,
    enabled: true,
    source: "default",
    savePct: t.savePct || 50,
  }));

  state.tasks = [...calendarTasks, ...defaultTasks];
}

/* --- Step 3: Task List --- */
function renderTaskList() {
  const container = $("taskList");
  container.innerHTML = state.tasks
    .map((task, i) => createTaskItemHTML(task, i))
    .join("");
  updateTaskTotal();
  attachTaskListeners();
}

function createTaskItemHTML(task, index) {
  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>`;
  const badge = task.source === "calendar"
    ? `<span class="task-badge-calendar">カレンダー</span>`
    : "";
  const countInfo = task.count ? ` <span class="task-count">(${task.count}件)</span>` : "";
  return `
    <div class="task-item ${task.enabled ? "" : "disabled"} ${task.source === "calendar" ? "from-calendar" : ""}" data-index="${index}">
      <div class="task-check" onclick="toggleTask(${index})">${checkSvg}</div>
      ${badge}
      <span class="task-name">${escapeHTML(task.name)}${countInfo}</span>
      <input type="number" class="task-hours-input" value="${task.hours}" min="0" max="200"
             data-index="${index}" ${task.enabled ? "" : "disabled"}>
      <span class="task-unit">h/月</span>
      <button class="task-remove" onclick="removeTask(${index})">×</button>
    </div>
  `;
}

function attachTaskListeners() {
  document.querySelectorAll(".task-hours-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index);
      const val = Math.max(0, parseInt(e.target.value) || 0);
      state.tasks[idx].hours = val;
      if (val > 0 && !state.tasks[idx].enabled) {
        state.tasks[idx].enabled = true;
        renderTaskList();
        return;
      }
      updateTaskTotal();
    });
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.index);
      const val = Math.max(0, parseInt(e.target.value) || 0);
      state.tasks[idx].hours = val;
      updateTaskTotal();
    });
  });
}

function toggleTask(index) {
  state.tasks[index].enabled = !state.tasks[index].enabled;
  renderTaskList();
}

function removeTask(index) {
  state.tasks.splice(index, 1);
  renderTaskList();
}

function addCustomTask() {
  const name = prompt("追加する業務名を入力してください");
  if (!name || !name.trim()) return;
  state.tasks.push({ name: name.trim(), hours: 5, enabled: true });
  renderTaskList();
}

function updateTaskTotal() {
  const total = state.tasks
    .filter((t) => t.enabled)
    .reduce((sum, t) => sum + t.hours, 0);
  $("taskTotalHours").textContent = total + "時間/月";
}

/* --- Step 4: Preview --- */
function renderPreview() {
  const activeTasks = state.tasks.filter((t) => t.enabled && t.hours > 0);
  const totalHours = activeTasks.reduce((sum, t) => sum + t.hours, 0);
  const monthlyCost = totalHours * state.hourlyRate;
  const annualCost = monthlyCost * 12;

  const totalSavedHours = activeTasks.reduce((sum, t) => {
    const pct = t.savePct || 50;
    return sum + Math.round(t.hours * pct / 100);
  }, 0);
  const monthlySaving = totalSavedHours * state.hourlyRate;
  const annualSaving = monthlySaving * 12;

  $("roiSummary").innerHTML = `
    <div class="roi-card">
      <div class="roi-label">月間業務時間</div>
      <div class="roi-value">${totalHours}<span class="roi-unit">時間</span></div>
    </div>
    <div class="roi-card">
      <div class="roi-label">月間コスト</div>
      <div class="roi-value">¥${formatCurrency(monthlyCost)}</div>
    </div>
    <div class="roi-card">
      <div class="roi-label">年間コスト</div>
      <div class="roi-value">¥${formatCurrency(annualCost)}</div>
    </div>
    <div class="roi-saving">
      <div class="roi-saving-item">
        <span class="roi-saving-label">Scale Works 導入による削減見込み（月間）</span>
        <span class="roi-saving-value">-${totalSavedHours}時間 / ¥${formatCurrency(monthlySaving)}</span>
      </div>
      <div class="roi-saving-item">
        <span class="roi-saving-label">年間削減見込み</span>
        <span class="roi-saving-value">¥${formatCurrency(annualSaving)}</span>
      </div>
    </div>
  `;

  $("breakdownList").innerHTML = activeTasks.map((task, i) => {
    const pct = task.savePct || 50;
    const savedHours = Math.round(task.hours * pct / 100);
    const savedCost = savedHours * state.hourlyRate;
    return `
      <div class="breakdown-item" style="animation-delay: ${i * 0.08}s">
        <div class="breakdown-name">${escapeHTML(task.name)}</div>
        <div class="breakdown-detail">
          <span class="breakdown-current">${task.hours}h/月</span>
          <span class="breakdown-arrow">→</span>
          <span class="breakdown-saved">-${savedHours}h 削減</span>
          <span class="breakdown-cost">（¥${formatCurrency(savedCost)}）</span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join("");

  submitAnalysis({
    totalHours,
    monthlyCost,
    annualCost,
    totalSavedHours,
    monthlySaving,
    annualSaving,
  });
}

/* --- Submit (バックグラウンド送信) --- */
async function submitAnalysis(analysisResult) {
  const payload = {
    jobType: "office",
    hourlyRate: state.hourlyRate,
    tasks: state.tasks,
    analysis: analysisResult,
  };

  try {
    const res = await fetch("/api/analysis/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.id) state.submissionId = data.id;
  } catch (err) {
    // 送信失敗しても問題なし
  }
}

/* --- Email + Booking --- */
async function submitEmailAndBook() {
  const emailInput = $("ctaEmail");
  const email = emailInput.value.trim();
  if (!email || !email.includes("@")) {
    emailInput.focus();
    emailInput.style.borderColor = "#ef4444";
    return;
  }

  const btn = $("ctaSubmitBtn");
  btn.disabled = true;
  btn.textContent = "送信中...";

  try {
    if (!state.submissionId) {
      btn.textContent = "エラー: 分析データがありません";
      return;
    }

    const res = await fetch(`/api/report/${state.submissionId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email }),
    });

    const data = await res.json();

    if (data.success) {
      btn.textContent = "レポートを送信しました！予約ページへ移動します...";
      setTimeout(() => {
        window.open(BOOKING_URL, "_blank");
      }, 1000);
    } else {
      btn.disabled = false;
      btn.textContent = "無料面談予約でレポートを受け取る";
      emailInput.style.borderColor = "#ef4444";
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "無料面談予約でレポートを受け取る";
  }
}
