import { KEY, checkKeys, defaults, defaultRecord, recordScore } from "./state.js";

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DETAIL_FIELDS = {
  sleepMinutes: { type: "duration", max: 720 },
  bodyMinutes: { type: "duration", max: 300 },
  entertainmentMinutes: { type: "duration", max: 600 },
  bodyActivity: { type: "text", max: 100 },
  lifeContent: { type: "text", max: 300 },
  lifePurpose: { type: "text", max: 100 },
  entertainmentPurpose: { type: "text", max: 100 },
};

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidDateKey(value) {
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeScore(value, fallback) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 1 && score <= 10 ? score : fallback;
}

function normalizeDuration(value, max) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= max ? minutes : undefined;
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") {
    return defaultRecord();
  }

  const normalized = {
    ...defaultRecord(),
    ...record,
    checks: Object.fromEntries(checkKeys.map((name) => [name, record.checks?.[name] === true])),
    scores: Object.fromEntries(checkKeys.map((name) => [name, normalizeScore(record.scores?.[name], defaults[name])])),
    note: typeof record.note === "string" ? record.note.slice(0, 300) : "",
    todos: Array.isArray(record.todos) ? record.todos.filter((todo) => typeof todo === "string").slice(0, 3).map((todo) => todo.slice(0, 50)) : [],
    todoDone: Array.isArray(record.todoDone) ? record.todoDone.slice(0, 3).map((done) => done === true) : [],
    details: {},
  };

  if (isPlainObject(record.details)) {
    Object.entries(DETAIL_FIELDS).forEach(([field, config]) => {
      const value = record.details[field];
      if (config.type === "text" && typeof value === "string") normalized.details[field] = value.slice(0, config.max);
      if (config.type === "duration") {
        const duration = normalizeDuration(value, config.max);
        if (duration !== undefined) normalized.details[field] = duration;
      }
    });
  }

  normalized.score = recordScore(normalized);

  return normalized;
}

export function migrateData(rawData) {
  if (!rawData || typeof rawData !== "object") {
    return {};
  }

  const entries = Object.entries(rawData);
  const migrated = {};

  entries.forEach(([dateKey, record]) => {
    if (!dateKey || typeof record !== "object") {
      return;
    }
    migrated[dateKey] = normalizeRecord(record);
  });

  return migrated;
}

export function loadData() {
  try {
    const rawValue = localStorage.getItem(KEY) || "{}";
    const parsed = JSON.parse(rawValue);
    const migrated = migrateData(parsed);

    const hasChanges = JSON.stringify(parsed) !== JSON.stringify(migrated);
    if (hasChanges) {
      localStorage.setItem(KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch (error) {
    console.warn("Failed to load local data.", error);
    return {};
  }
}

export function saveData(data) {
  const normalized = migrateData(data);
  localStorage.setItem(KEY, JSON.stringify(normalized));
  return normalized;
}

export function exportData(data) {
  return JSON.stringify(migrateData(data), null, 2);
}

export function parseImportedData(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error("导入内容为空");
  }

  const parsed = JSON.parse(rawText);
  validateImportedData(parsed);
  const migrated = migrateData(parsed);
  return migrated;
}

function validateImportedData(data) {
  if (!isPlainObject(data)) throw new Error("备份文件必须是记录对象");

  Object.entries(data).forEach(([dateKey, record]) => {
    if (!isValidDateKey(dateKey) || !isPlainObject(record)) throw new Error("备份中包含无效记录");
    if (record.checks !== undefined && !isPlainObject(record.checks)) throw new Error("完成状态格式不正确");
    if (record.scores !== undefined && !isPlainObject(record.scores)) throw new Error("评分格式不正确");

    checkKeys.forEach((name) => {
      if (record.checks?.[name] !== undefined && typeof record.checks[name] !== "boolean") throw new Error("完成状态格式不正确");
      if (record.scores?.[name] !== undefined && (!Number.isFinite(record.scores[name]) || record.scores[name] < 1 || record.scores[name] > 10)) throw new Error("评分必须在 1 到 10 之间");
    });

    if (record.note !== undefined && (typeof record.note !== "string" || record.note.length > 300)) throw new Error("一句话记录格式不正确");
    if (record.todos !== undefined && (!Array.isArray(record.todos) || record.todos.length > 3 || record.todos.some((todo) => typeof todo !== "string" || todo.length > 50))) throw new Error("待办事项格式不正确");
    if (record.todoDone !== undefined && (!Array.isArray(record.todoDone) || record.todoDone.length > 3 || record.todoDone.some((done) => typeof done !== "boolean"))) throw new Error("待办完成状态格式不正确");
    if (record.details !== undefined && !isPlainObject(record.details)) throw new Error("记录详情格式不正确");

    Object.entries(record.details || {}).forEach(([field, value]) => {
      const config = DETAIL_FIELDS[field];
      if (!config) return;
      const valid = config.type === "text"
        ? typeof value === "string" && value.length <= config.max
        : Number.isFinite(value) && value >= 0 && value <= config.max;
      if (!valid) throw new Error("记录详情格式不正确");
    });
  });
}
