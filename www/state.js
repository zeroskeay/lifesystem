export const APP_VERSION = "__APP_VERSION__";
export const GITHUB_REPO = "zeroskeay/lifesystem";
export const KEY = "life-system-v01";
export const STORAGE_VERSION = 1;

export const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
export const checkKeys = ["sleep", "body", "task", "life", "entertainment"];
export const checkNames = {
  sleep: "睡眠",
  body: "身体",
  task: "任务",
  life: "主动",
  entertainment: "娱乐",
};
export const checkDescriptions = {
  sleep: "睡得好，才有好状态",
  body: "动起来，感受身体的变化",
  task: "把重要的事一件件完成",
  life: "主动选择，认真生活",
  entertainment: "适度放松，享受当下",
};
export const checkIcons = {
  sleep: "☾",
  body: "♟",
  task: "✓",
  life: "✦",
  entertainment: "⌁",
};

export const today = new Date();
today.setHours(0, 0, 0, 0);

export const defaults = {
  sleep: 7,
  body: 6,
  task: 8,
  life: 7,
  entertainment: 6,
};

export function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isToday(d) {
  return key(d) === key(today);
}

export function isFuture(d) {
  return d > today;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function formatMinutes(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}小时${String(minutes % 60).padStart(2, "0")}分`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function defaultRecord() {
  return {
    checks: {},
    scores: { ...defaults },
    score: null,
    note: "",
    todos: [],
    todoDone: [],
    details: {},
  };
}

export function rec(d, data) {
  const record = data[key(d)] || defaultRecord();
  record.checks = record.checks || {};
  record.scores = { ...defaults, ...(record.scores || {}) };
  record.todos = Array.isArray(record.todos) ? record.todos.slice(0, 3) : [];
  record.todoDone = Array.isArray(record.todoDone) ? record.todoDone.slice(0, 3) : [];
  record.details = record.details || {};
  return record;
}

export function ensureRecord(d, data) {
  return rec(d, data);
}

export function weekRecords(days, endDate, data) {
  const arr = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    arr.push({ date: d, record: data[key(d)] || null });
  }
  return arr;
}

export function avg(list, fn) {
  const values = list.map(fn).filter((v) => Number.isFinite(v));
  return values.length ? values.reduce((x, y) => x + y, 0) / values.length : 0;
}

export function recordScore(record) {
  const completedScores = checkKeys
    .filter((x) => record?.checks?.[x])
    .map((x) => Number(record?.scores?.[x]))
    .filter((score) => Number.isFinite(score));

  return completedScores.length
    ? completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length
    : null;
}
