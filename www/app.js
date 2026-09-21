import {
  APP_VERSION,
  GITHUB_REPO,
  dayNames,
  checkKeys,
  checkNames,
  checkDescriptions,
  checkIcons,
  today,
  defaults,
  defaultRecord,
  key,
  isToday,
  isFuture,
  clamp,
  formatMinutes,
  escapeHtml,
  ensureRecord,
  avg,
  recordScore,
  weekRecords,
} from "./state.js";
import { loadData, saveData, exportData, parseImportedData } from "./storage.js";

const nativeCapacitor = globalThis.Capacitor;
const nativeFilesystemPlugin = globalThis.capacitorFilesystemPluginCapacitor;

const appState = {
  selectedDate: new Date(today),
  data: loadData(),
  currentView: "home",
  currentDays: 7,
  currentEditor: "sleep",
  saveTimer: null,
};

const THEME_KEY = "life-system-theme";
const hasRecord = (d) => Object.prototype.hasOwnProperty.call(appState.data, key(d));

function applyTheme(themeName) {
  const theme = themeName || localStorage.getItem(THEME_KEY) || "light";
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    const label = document.getElementById("themeModeLabel");
    const icon = themeBtn.querySelector(".setting-icon");
    const isDark = theme === "dark";
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (label) label.textContent = isDark ? "深色模式" : "浅色模式";
    document.getElementById("themeToggle")?.classList.toggle("active", isDark);
  }
}

function showToast(t) {
  const el = document.getElementById("toast");
  el.textContent = t;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 1400);
}

function confirmAction(message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  const text = document.getElementById("confirmText");
  if (!modal || !text) {
    if (window.confirm(message)) onConfirm();
    return;
  }

  text.textContent = message;
  modal.hidden = false;
  modal.classList.remove("hidden");
  const proceed = () => {
    modal.hidden = true;
    modal.classList.add("hidden");
    onConfirm();
  };

  const reject = () => {
    modal.hidden = true;
    modal.classList.add("hidden");
  };

  document.getElementById("confirmYes").onclick = proceed;
  document.getElementById("confirmNo").onclick = reject;
}

async function exportBackup() {
  const filename = `jianwei-backup-${key(today)}.json`;
  const content = exportData(appState.data);

  if (nativeCapacitor?.isNativePlatform() && nativeFilesystemPlugin) {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    await nativeFilesystemPlugin.Filesystem.writeFile({
      path: filename,
      data: encoded,
      directory: nativeFilesystemPlugin.FilesystemDirectory.Documents,
      recursive: true,
    });
    showToast(`已导出到 Documents/${filename}`);
    return;
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已下载：${filename}`);
}

function persistRecord(record) {
  record.score = recordScore(record);
  appState.data[key(appState.selectedDate)] = record;
  clearTimeout(appState.saveTimer);
  appState.saveTimer = setTimeout(() => {
    appState.data = saveData(appState.data);
  }, 180);
  renderHome();
}

function navigate(view) {
  appState.currentView = view;
  document.querySelector(".app-shell").classList.toggle("about-open", view === "about");
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
  document.querySelectorAll(".nav-item").forEach((v) => v.classList.toggle("active", v.dataset.nav === view));

  if (view === "home") renderHome();
  if (view === "records") renderEditor();
  if (view === "stats") renderStats();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderBars(id, days, endDate) {
  const box = document.getElementById(id);
  if (!box) return;
  box.innerHTML = "";

  weekRecords(days, endDate, appState.data).forEach(({ date, record }) => {
    const score = record ? recordScore(record) : 0;
    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `<div class="bar-stack"><i class="bar-fill" style="height:${clamp(score * 10, 3, 100)}%"></i></div><span>${date.getMonth() + 1}/${date.getDate()}</span>`;
    box.appendChild(col);
  });
}

function renderSparkline(svgId, days, endDate) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const vals = weekRecords(days, endDate, appState.data)
    .map((x) => (x.record ? recordScore(x.record) : null))
    .filter((x) => x !== null);

  if (!vals.length) {
    svg.innerHTML = "";
    return;
  }

  const pts = vals.map((v, i) => {
    const x = 5 + (i / Math.max(1, vals.length - 1)) * 140;
    const y = 49 - v * 4.2;
    return `${x},${y}`;
  }).join(" ");

  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#2389ee" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderHome() {
  const recorded = hasRecord(appState.selectedDate);
  const r = appState.data[key(appState.selectedDate)] || defaultRecord();

  document.getElementById("dateLabel").textContent = `${appState.selectedDate.getFullYear()}年${appState.selectedDate.getMonth() + 1}月${appState.selectedDate.getDate()}日`;
  document.getElementById("dateHint").textContent = `星期${dayNames[appState.selectedDate.getDay()]}${isToday(appState.selectedDate) ? " · 今天" : ""}`;

  const done = recorded ? checkKeys.filter((x) => r.checks[x]).length : 0;
  document.getElementById("completion").textContent = `${done}/5`;

  document.querySelectorAll(".status-item").forEach((el) => {
    const x = el.dataset.key;
    el.classList.toggle("done", !!r.checks[x]);
    const score = recorded ? r.scores?.[x] ?? defaults[x] : null;
    el.querySelector("small").textContent = score === null ? "—" : `${score}/10`;
  });

  const averageScore = checkKeys.reduce((sum, x) => sum + Number(r.scores?.[x] ?? defaults[x]), 0) / checkKeys.length;
  document.getElementById("scoreValue").textContent = recorded ? averageScore.toFixed(1) : "—";
  document.getElementById("noteDisplay").textContent = recorded ? (r.note || "") : "";
  document.getElementById("editTodayBtn").textContent = recorded ? "去修改" : "去记录";
  document.getElementById("editTodayBtn").hidden = isFuture(appState.selectedDate);
  document.getElementById("nextDay").disabled = isToday(appState.selectedDate);

  renderBars("homeBars", 7, appState.selectedDate);
  renderSparkline("homeSparkline", 7, appState.selectedDate);
}

function durationScale(maxMinutes) {
  const step = maxMinutes <= 300 ? 1 : 2;
  const labels = [];
  for (let hour = 0; hour <= maxMinutes / 60; hour += step) {
    labels.push(`<span>${hour}</span>`);
  }
  return `<div class="score-scale" aria-hidden="true">${labels.join("")}</div>`;
}

function renderEditor() {
  if (isFuture(appState.selectedDate)) {
    navigate("home");
    return;
  }

  const r = ensureRecord(appState.selectedDate, appState.data);
  document.getElementById("recordDateLabel").textContent = `${appState.selectedDate.getFullYear()}年${appState.selectedDate.getMonth() + 1}月${appState.selectedDate.getDate()}日`;
  document.getElementById("recordDateHint").textContent = `星期${dayNames[appState.selectedDate.getDay()]}${isToday(appState.selectedDate) ? " · 今天" : ""}`;
  document.getElementById("recordNextDay").disabled = isToday(appState.selectedDate);

  const tabs = document.getElementById("recordTabs");
  tabs.innerHTML = checkKeys.map((x) => `<button class="${x === appState.currentEditor ? "active" : ""}" data-editor="${x}"><span class="tab-icon ${x}">${checkIcons[x]}</span><span>${checkNames[x]}</span></button>`).join("");

  const editor = document.getElementById("recordEditor");
  const x = appState.currentEditor;
  const score = r.scores[x];
  const details = r.details || {};
  const scoreScale = `<div class="score-scale" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span>${i + 1}</span>`).join("")}</div>`;
  const body = x === "sleep"
    ? `<div class="score-section"><label class="field-label">睡眠时长 <strong id="sleepMinutesValue">${formatMinutes(details.sleepMinutes ?? 360)}</strong></label><input class="duration-range" data-field="sleepMinutes" type="range" min="0" max="720" step="30" value="${details.sleepMinutes ?? 360}">${durationScale(720)}</div>`
    : x === "body"
      ? `<div class="editor-section"><label class="field-label">锻炼内容和时长</label><input id="contentInput" class="text-input" maxlength="100" placeholder="例如：跑步、散步、拉伸" value="${escapeHtml(details.bodyActivity || "")}"><div class="score-section"><label class="field-label">锻炼时长 <strong id="bodyMinutesValue">${formatMinutes(details.bodyMinutes ?? 30)}</strong></label><input class="duration-range" data-field="bodyMinutes" type="range" min="0" max="300" step="10" value="${details.bodyMinutes ?? 30}">${durationScale(300)}</div></div>`
      : x === "task"
        ? `<div class="editor-section"><label class="field-label">今日待办（最多3项）</label><div class="todo-list">${r.todos.map((todo, i) => `<div class="todo-swipe"><div class="todo-actions"><button class="todo-delete" data-index="${i}" aria-label="删除待办">删除</button></div><div class="todo-row" data-index="${i}"><label><input class="todo-check" type="checkbox" data-index="${i}" ${r.todoDone?.[i] ? "checked" : ""}><span>${escapeHtml(todo)}</span></label></div></div>`).join("")}</div>${r.todos.length < 3 ? '<div class="todo-add"><input id="todoInput" maxlength="50" placeholder="添加任务"><button id="todoAdd">＋ 添加任务</button></div>' : ""}</div>`
        : x === "life"
          ? `<div class="editor-section"><label class="field-label">内容</label><textarea id="contentInput" maxlength="300" placeholder="今天主动做了什么？">${escapeHtml(details.lifeContent || "")}</textarea><label class="field-label">目的</label><input id="purposeInput" class="text-input" maxlength="100" placeholder="为什么做这件事？" value="${escapeHtml(details.lifePurpose || "")}"></div>`
          : `<div class="editor-section"><div class="score-section"><label class="field-label">时长 <strong id="entertainmentMinutesValue">${formatMinutes(details.entertainmentMinutes ?? 90)}</strong></label><input class="duration-range" data-field="entertainmentMinutes" type="range" min="0" max="600" step="30" value="${details.entertainmentMinutes ?? 90}">${durationScale(600)}</div><label class="field-label">目的</label><input id="purposeInput" class="text-input" maxlength="100" placeholder="例如：放松心情" value="${escapeHtml(details.entertainmentPurpose || "")}"></div>`;

  editor.innerHTML = `<div class="editor-heading"><span class="record-icon ${x}">${checkIcons[x]}</span><div><h2>${checkNames[x]}</h2><small>${checkDescriptions[x]}</small></div><strong id="editorScore">${score}/10</strong></div><div class="score-section"><label class="field-label">评分</label><input id="editorScoreInput" class="editor-score" type="range" min="1" max="10" step="1" value="${Math.max(1, score)}">${scoreScale}</div>${body}`;

  document.getElementById("summaryInput").value = r.note || "";
  document.getElementById("summaryInput").oninput = (e) => {
    r.note = e.target.value;
    persistRecord(r);
  };

  tabs.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    appState.currentEditor = b.dataset.editor;
    renderEditor();
  }));

  document.getElementById("editorScoreInput").addEventListener("input", (e) => {
    r.scores[x] = Number(e.target.value);
    r.checks[x] = true;
    document.getElementById("editorScore").textContent = `${e.target.value}/10`;
    persistRecord(r);
  });

  if (x === "body") {
    document.getElementById("contentInput").addEventListener("input", (e) => {
      r.details = { ...(r.details || {}), bodyActivity: e.target.value };
      r.checks[x] = true;
      persistRecord(r);
    });
  }

  if (x === "life") {
    document.getElementById("contentInput").addEventListener("input", (e) => {
      r.details = { ...(r.details || {}), lifeContent: e.target.value };
      r.checks[x] = true;
      persistRecord(r);
    });
    document.getElementById("purposeInput").addEventListener("input", (e) => {
      r.details = { ...(r.details || {}), lifePurpose: e.target.value };
      r.checks[x] = true;
      persistRecord(r);
    });
  }

  if (x === "entertainment") {
    document.getElementById("purposeInput").addEventListener("input", (e) => {
      r.details = { ...(r.details || {}), entertainmentPurpose: e.target.value };
      r.checks[x] = true;
      persistRecord(r);
    });
  }

  editor.querySelectorAll(".duration-range").forEach((input) => {
    input.addEventListener("input", () => {
      r.details = { ...(r.details || {}), [input.dataset.field]: Number(input.value) };
      r.checks[x] = true;
      const output = document.getElementById(`${input.dataset.field}Value`);
      if (output) output.textContent = formatMinutes(Number(input.value));
      persistRecord(r);
    });
  });

  if (x === "task") {
    document.getElementById("todoAdd")?.addEventListener("click", () => {
      const input = document.getElementById("todoInput");
      const value = input.value.trim();
      if (!value) return;
      r.todos.push(value);
      r.checks.task = true;
      persistRecord(r);
      renderEditor();
    });

    editor.querySelectorAll(".todo-delete").forEach((b) => b.addEventListener("click", (event) => {
      event.stopPropagation();
      r.todos.splice(Number(b.dataset.index), 1);
      if (r.todoDone) r.todoDone.splice(Number(b.dataset.index), 1);
      persistRecord(r);
      renderEditor();
    }));

    editor.querySelectorAll(".todo-check").forEach((b) => b.addEventListener("change", () => {
      r.todoDone = r.todoDone || [];
      r.todoDone[Number(b.dataset.index)] = b.checked;
      persistRecord(r);
    }));
  }

  editor.querySelectorAll(".todo-swipe").forEach((row) => {
    let startX = 0;
    let startY = 0;
    let dragging = false;
    row.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button,input")) return;
      startX = event.clientX;
      startY = event.clientY;
      dragging = true;
      row.setPointerCapture?.(event.pointerId);
    });
    row.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        event.preventDefault();
      }
    });
    const finishTodoSwipe = (event) => {
      if (!dragging) return;
      dragging = false;
      const delta = event.clientX - startX;
      if (delta < -35) row.classList.add("open");
      if (delta > 35) row.classList.remove("open");
      row.releasePointerCapture?.(event.pointerId);
    };
    row.addEventListener("pointerup", finishTodoSwipe);
    row.addEventListener("pointercancel", () => {
      dragging = false;
    });
  });
}

function renderStats() {
  const rows = weekRecords(appState.currentDays, appState.selectedDate, appState.data);
  const scores = rows.map((x) => (x.record ? recordScore(x.record) : null));
  const valid = scores.filter((x) => x !== null);

  document.getElementById("statsAvg").textContent = `平均 ${valid.length ? avg(valid, (x) => x).toFixed(1) : "—"}`;
  drawTrend(rows);
  drawRadar(rows);

  const recent = weekRecords(7, appState.selectedDate, appState.data).filter((x) => x.record);
  document.getElementById("weekSleep").textContent = recent.length ? avg(recent, (x) => Number(x.record.scores?.sleep ?? 7)).toFixed(1) : "—";
  document.getElementById("weekBody").textContent = recent.length ? avg(recent, (x) => Number(x.record.scores?.body ?? 6)).toFixed(1) : "—";
  document.getElementById("weekTask").textContent = recent.length ? avg(recent, (x) => Number(x.record.scores?.task ?? 8)).toFixed(1) : "—";
}

function drawTrend(rows) {
  const svg = document.getElementById("trendSvg");
  const w = 360;
  const h = 150;
  const pad = 20;
  let html = "";

  for (let i = 0; i < 5; i += 1) {
    const y = 15 + i * 28;
    html += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#e8f0f6" stroke-width="1"/>`;
  }

  const vals = rows.map((x) => (x.record ? recordScore(x.record) : null));
  const valid = vals.filter((x) => x !== null);

  if (valid.length) {
    const pts = vals.map((v, i) => (v === null ? null : `${pad + (i / Math.max(1, rows.length - 1)) * (w - 2 * pad)},${h - 20 - v * 11}`)).filter(Boolean);
    html += `<polyline points="${pts.join(" ")}" fill="none" stroke="#2186eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach((p) => {
      const [x, y] = p.split(",");
      html += `<circle cx="${x}" cy="${y}" r="3.2" fill="#2186eb"/>`;
    });
  }

  const labelIndexes = rows.length > 7 ? [0, Math.floor((rows.length - 1) / 2), rows.length - 1] : rows.map((_, i) => i);
  labelIndexes.forEach((i) => {
    const x = rows[i];
    const xx = pad + (i / Math.max(1, rows.length - 1)) * (w - 2 * pad);
    html += `<text x="${xx}" y="146" text-anchor="middle" font-size="8" fill="#8396aa">${x.date.getMonth() + 1}/${x.date.getDate()}</text>`;
  });

  svg.innerHTML = html;
}

function drawRadar(rows) {
  const svg = document.getElementById("radarSvg");
  const cx = 130;
  const cy = 112;
  const R = 78;
  const labels = ["睡眠", "身体", "任务", "主动", "娱乐"];
  const vals = labels.map((_, i) => avg(rows.filter((x) => x.record), (x) => Number(x.record?.scores?.[checkKeys[i]] ?? defaults[checkKeys[i]])));
  let html = "";

  for (let ring = 1; ring <= 4; ring += 1) {
    const rr = R * ring / 4;
    const pts = labels.map((_, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
    }).join(" ");
    html += `<polygon points="${pts}" fill="none" stroke="#dfeaf4" stroke-width="1"/>`;
  }

  const outer = labels.map((_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    return `${cx + Math.cos(a) * R},${cy + Math.sin(a) * R}`;
  });

  outer.forEach((p, i) => {
    const [x, y] = p.split(",");
    html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e3edf5" stroke-width="1"/><text x="${cx + (x - cx) * 1.2}" y="${cy + (y - cy) * 1.2}" text-anchor="middle" font-size="9" fill="#4b6684">${labels[i]} ${vals[i].toFixed(1)}</text>`;
  });

  const area = labels.map((_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    const rr = R * clamp(vals[i], 0, 10) / 10;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  }).join(" ");

  html += `<polygon points="${area}" fill="#2c8ef533" stroke="#2588eb" stroke-width="2.5"/>`;
  svg.innerHTML = html;
}

function initializeApp() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });

  document.getElementById("prevDay").addEventListener("click", () => {
    appState.selectedDate.setDate(appState.selectedDate.getDate() - 1);
    renderHome();
  });

  document.getElementById("nextDay").addEventListener("click", () => {
    if (isToday(appState.selectedDate)) return;
    appState.selectedDate.setDate(appState.selectedDate.getDate() + 1);
    renderHome();
  });

  document.getElementById("todayBtn").addEventListener("click", () => {
    appState.selectedDate = new Date(today);
    renderHome();
  });

  document.getElementById("editTodayBtn").addEventListener("click", () => {
    if (!isFuture(appState.selectedDate)) navigate("records");
  });

  document.getElementById("recordPrevDay").addEventListener("click", () => {
    appState.selectedDate.setDate(appState.selectedDate.getDate() - 1);
    renderEditor();
  });

  document.getElementById("recordNextDay").addEventListener("click", () => {
    if (isToday(appState.selectedDate)) return;
    appState.selectedDate.setDate(appState.selectedDate.getDate() + 1);
    renderEditor();
  });

  document.getElementById("recordTodayBtn").addEventListener("click", () => {
    appState.selectedDate = new Date(today);
    renderEditor();
  });

  document.getElementById("githubBtn").addEventListener("click", () => window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, "_blank"));
  document.getElementById("aboutBackBtn").addEventListener("click", () => navigate("settings"));

  document.querySelectorAll(".period").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".period").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    appState.currentDays = Number(b.dataset.days);
    renderStats();
  }));

  document.getElementById("dataBtn").addEventListener("click", () => {
    confirmAction("确认导出本地数据吗？", () => {
      exportBackup().catch((error) => {
        console.error("Failed to export data.", error);
        showToast("导出失败，请检查存储空间");
      });
    });
  });

  const restoreInput = document.getElementById("restoreInput");
  document.getElementById("restoreBtn").addEventListener("click", () => restoreInput.click());
  restoreInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseImportedData(text);
      appState.data = imported;
      saveData(appState.data);
      renderHome();
      renderEditor();
      renderStats();
      showToast("数据已恢复");
    } catch (error) {
      console.error(error);
      showToast("恢复失败：文件格式不正确");
    } finally {
      restoreInput.value = "";
    }
  });

  document.getElementById("clearDataBtn").addEventListener("click", () => {
    confirmAction("确认清空全部本地记录吗？此操作无法撤销。", () => {
      appState.data = {};
      saveData(appState.data);
      renderHome();
      renderEditor();
      renderStats();
      showToast("已清空本地数据");
    });
  });

  document.getElementById("themeBtn").addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  renderHome();
}

initializeApp();
