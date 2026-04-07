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
  $("bookingLink").href = BOOKING_URL;
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
  }));
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
  return `
    <div class="task-item ${task.enabled ? "" : "disabled"}" data-index="${index}">
      <div class="task-check" onclick="toggleTask(${index})">${checkSvg}</div>
      <span class="task-name">${escapeHTML(task.name)}</span>
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
      state.tasks[idx].hours = Math.max(0, parseInt(e.target.value) || 0);
      updateTaskTotal();
    });
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.tasks[idx].hours = Math.max(0, parseInt(e.target.value) || 0);
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
  const activeTasks = state.tasks.filter((t) => t.enabled);

  let totalReductionHours = 0;
  const proposalResults = [];

  PROPOSALS.forEach((proposal) => {
    const matchTask = activeTasks.find((t) => t.name === proposal.targetTask);
    const baseHours = matchTask ? matchTask.hours : 10;
    const reducedHours = Math.round(baseHours * proposal.reductionRate);
    const monthlySaving = reducedHours * state.hourlyRate;
    const annualSaving = monthlySaving * 12;
    const paybackMonths = proposal.priceUnit === "月額"
      ? (monthlySaving > 0 ? 1 : 0)
      : (monthlySaving > 0 ? Math.ceil((proposal.price / monthlySaving) * 10) / 10 : 0);

    totalReductionHours += reducedHours;

    proposalResults.push({
      ...proposal,
      baseHours,
      reducedHours,
      monthlySaving,
      annualSaving,
      paybackMonths,
    });
  });

  proposalResults.sort((a, b) => b.annualSaving - a.annualSaving);

  const totalMonthlySaving = proposalResults.reduce((s, p) => s + p.monthlySaving, 0);
  const totalAnnualSaving = totalMonthlySaving * 12;

  $("roiSummary").innerHTML = `
    <div class="roi-card">
      <div class="roi-label">月間削減可能時間</div>
      <div class="roi-value">${totalReductionHours}<span class="roi-unit">時間</span></div>
    </div>
    <div class="roi-card">
      <div class="roi-label">月間削減コスト</div>
      <div class="roi-value highlight">¥${formatCurrency(totalMonthlySaving)}</div>
    </div>
    <div class="roi-card">
      <div class="roi-label">年間削減コスト</div>
      <div class="roi-value highlight">¥${formatCurrency(totalAnnualSaving)}</div>
    </div>
  `;

  $("proposalCards").innerHTML = proposalResults
    .slice(0, 5)
    .map((p, i) => {
      const priceLabel = p.priceUnit === "月額"
        ? `¥${formatCurrency(p.price)}/月`
        : `¥${formatCurrency(p.price)}`;
      const paybackLabel = p.priceUnit === "月額"
        ? "即月回収"
        : `${p.paybackMonths}ヶ月`;

      return `
        <div class="proposal-card">
          <div class="proposal-header">
            <span class="proposal-rank">${i + 1}</span>
            <span class="proposal-name">${p.name}</span>
          </div>
          <div class="proposal-metrics">
            <div class="proposal-metric">
              <span class="proposal-metric-label">現在コスト</span>
              <span class="proposal-metric-value">月${p.baseHours}h × ¥${formatCurrency(state.hourlyRate)}</span>
            </div>
            <div class="proposal-metric">
              <span class="proposal-metric-label">削減時間</span>
              <span class="proposal-metric-value positive">月${p.reducedHours}時間（${Math.round(p.reductionRate * 100)}%削減）</span>
            </div>
            <div class="proposal-metric">
              <span class="proposal-metric-label">月次削減額</span>
              <span class="proposal-metric-value positive">¥${formatCurrency(p.monthlySaving)}</span>
            </div>
            <div class="proposal-metric">
              <span class="proposal-metric-label">回収期間</span>
              <span class="proposal-metric-value">${paybackLabel}</span>
            </div>
          </div>
          <div class="proposal-price">
            <span class="proposal-price-label">${p.description}</span>
            <span class="proposal-price-value">${priceLabel}</span>
          </div>
        </div>
      `;
    })
    .join("");

  // バックエンドに分析データを送信（非同期・失敗しても問題なし）
  submitAnalysis({
    totalReductionHours,
    totalMonthlySaving,
    totalAnnualSaving,
    proposals: proposalResults.slice(0, 5),
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
    await fetch("/api/analysis/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // 送信失敗しても問題なし
  }
}
