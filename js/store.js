/* 데이터 저장소 — 전부 이 기기 localStorage 안에만 있다. 서버로 나가지 않는다. */
import { APP, DEFAULT_TARGETS } from './config.js';

const listeners = new Set();

function emptyState() {
  return {
    schema: 1,
    createdAt: new Date().toISOString(),
    profile: { name: '', sex: '', birthYear: null, heightCm: null, startWeightKg: null, memo: '' },
    targets: { ...DEFAULT_TARGETS },
    weight: [],   // {id, date, kg, bodyFat, waist, note}
    glucose: [],  // {id, ts, value, context, meal, note}
    labs: [],     // {id, date, ...LAB_FIELDS, note}
    pain: [],     // {id, ts, scores:{}, triggers:[], redFlags:[], sleepH, sleepQ, stress, sittingH, note}
    days: {},     // 'YYYY-MM-DD': {done:[routineId], waterMl, proteinG, steps, note}
    settings: { theme: 'auto', reminders: { morning: '07:00', midday: '13:30', evening: '20:00' }, lastSeen: null },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(APP.storageKey);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (err) {
    console.warn('저장된 데이터를 읽지 못했습니다. 새로 시작합니다.', err);
    return emptyState();
  }
}

function migrate(s) {
  const base = emptyState();
  const merged = { ...base, ...s };
  merged.profile = { ...base.profile, ...(s.profile || {}) };
  merged.targets = { ...base.targets, ...(s.targets || {}) };
  merged.settings = { ...base.settings, ...(s.settings || {}) };
  merged.settings.reminders = { ...base.settings.reminders, ...((s.settings || {}).reminders || {}) };
  for (const k of ['weight', 'glucose', 'labs', 'pain']) {
    merged[k] = Array.isArray(s[k]) ? s[k] : [];
  }
  merged.days = s.days && typeof s.days === 'object' ? s.days : {};
  merged.schema = 1;
  return merged;
}

export function save() {
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify(state));
  } catch (err) {
    alert('저장 공간이 부족해 기록을 저장하지 못했습니다. 설정에서 백업 후 오래된 기록을 정리해 주세요.');
    console.error(err);
  }
  listeners.forEach((fn) => fn(state));
}

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── 공통 CRUD ─────────────────────────────────────────── */
export function addEntry(kind, entry) {
  const row = { id: uid(), ...entry };
  state[kind].push(row);
  sortKind(kind);
  save();
  return row;
}

export function updateEntry(kind, id, patch) {
  const row = state[kind].find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  sortKind(kind);
  save();
  return row;
}

export function removeEntry(kind, id) {
  state[kind] = state[kind].filter((r) => r.id !== id);
  save();
}

function sortKind(kind) {
  const key = kind === 'weight' || kind === 'labs' ? 'date' : 'ts';
  state[kind].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

/* 같은 날 체중은 하나만 유지(덮어쓰기) — 하루에 여러 번 재면 혼선만 생긴다 */
export function upsertWeight(entry) {
  const found = state.weight.find((w) => w.date === entry.date);
  if (found) return updateEntry('weight', found.id, entry);
  return addEntry('weight', entry);
}

/* ── 하루 단위 체크리스트 ──────────────────────────────── */
export function getDay(dateKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = { done: [], waterMl: 0, proteinG: 0, steps: 0, note: '' };
  }
  return state.days[dateKey];
}

export function setDay(dateKey, patch) {
  const day = getDay(dateKey);
  Object.assign(day, patch);
  save();
  return day;
}

export function toggleRoutine(dateKey, routineId) {
  const day = getDay(dateKey);
  day.done = day.done.includes(routineId)
    ? day.done.filter((x) => x !== routineId)
    : [...day.done, routineId];
  save();
  return day;
}

export function setTargets(patch) { Object.assign(state.targets, patch); save(); }
export function setProfile(patch) { Object.assign(state.profile, patch); save(); }
export function setSettings(patch) { Object.assign(state.settings, patch); save(); }

/* ── 백업 / 복원 ──────────────────────────────────────── */
export function exportJSON() {
  return JSON.stringify({ app: APP.name, version: APP.version, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text, { merge = false } = {}) {
  const parsed = JSON.parse(text);
  const incoming = parsed.state || parsed;
  if (!incoming || typeof incoming !== 'object') throw new Error('형식을 알 수 없는 파일입니다.');
  if (!merge) {
    state = migrate(incoming);
  } else {
    const next = migrate(incoming);
    for (const kind of ['weight', 'glucose', 'labs', 'pain']) {
      const seen = new Set(state[kind].map((r) => r.id));
      state[kind] = state[kind].concat(next[kind].filter((r) => !seen.has(r.id)));
      sortKind(kind);
    }
    state.days = { ...next.days, ...state.days };
  }
  save();
  return state;
}

export function wipeAll() {
  state = emptyState();
  save();
}
