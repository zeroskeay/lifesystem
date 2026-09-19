import { KEY, defaults, defaultRecord, recordScore } from "./state.js";

function normalizeRecord(record) {
  if (!record || typeof record !== "object") {
    return defaultRecord();
  }

  const normalized = {
    ...defaultRecord(),
    ...record,
    checks: { ...(record.checks || {}) },
    scores: { ...defaults, ...(record.scores || {}) },
    todos: Array.isArray(record.todos) ? record.todos.slice(0, 3) : [],
    todoDone: Array.isArray(record.todoDone) ? record.todoDone.slice(0, 3) : [],
    details: record.details || {},
  };

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
  const migrated = migrateData(parsed);
  return migrated;
}
