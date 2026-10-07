/* 데이터 저장소 — 전부 이 기기 안에만 있다. 서버로 나가지 않는다.
 *
 * schema 2 부터 "프로필" 단위로 나뉜다. 한 기기에서 여러 사람이 각자 쓸 수 있고,
 * 나중에 서버를 붙일 때도 프로필 하나가 그대로 계정 하나가 되도록 모양을 맞춰 뒀다.
 * 뷰는 getState() 가 돌려주는 "지금 프로필의 데이터"만 본다 — 저장 위치를 몰라도 된다. */
import { APP, DEFAULT_TARGETS, DEFAULT_REWARDS, DEFAULT_MODULES, DEFAULT_PAIN_AREAS } from './config.js';

const listeners = new Set();

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function emptyProfileData(name = '') {
  return {
    createdAt: new Date().toISOString(),
    profile: {
      name,
      sex: '',
      birthYear: null,
      heightCm: null,
      startWeightKg: null,
      memo: '',
      onboarded: false,
      showHowTo: true,
      modules: { ...DEFAULT_MODULES },
      painAreas: [...DEFAULT_PAIN_AREAS],
    },
    targets: { ...DEFAULT_TARGETS },
    weight: [],   // {id, date, kg, bodyFat, waist, note}
    glucose: [],  // {id, ts, value, context, meal, note}
    labs: [],     // {id, date, ...LAB_FIELDS, note}
    pain: [],     // {id, ts, scores:{}, triggers:[], redFlags:[], sleepH, sleepQ, stress, sittingH, note}
    days: {},     // 'YYYY-MM-DD': {done:[routineId], waterMl, proteinG, steps, skipped:[], note}
    rewards: { custom: DEFAULT_REWARDS.map((r) => ({ ...r })), claimed: [], celebrated: null },
  };
}

function emptyRoot() {
  const id = `p-${uid()}`;
  return {
    schema: 2,
    activeId: id,
    profiles: [{ id, data: emptyProfileData('') }],
    settings: { theme: 'auto', reminders: { morning: '07:00', midday: '13:30', evening: '20:00' }, lastSeen: null },
  };
}

/* schema 1(단일 사용자) → schema 2(프로필) */
let migratedOnLoad = false;

function migrate(raw) {
  const base = emptyRoot();
  if (!raw || typeof raw !== 'object') return base;

  if (raw.schema >= 2 && Array.isArray(raw.profiles) && raw.profiles.length) {
    const root = {
      schema: 2,
      activeId: raw.activeId,
      profiles: raw.profiles.map((p) => ({ id: p.id || `p-${uid()}`, data: fillData(p.data) })),
      settings: { ...base.settings, ...(raw.settings || {}) },
    };
    root.settings.reminders = { ...base.settings.reminders, ...((raw.settings || {}).reminders || {}) };
    if (!root.profiles.some((p) => p.id === root.activeId)) root.activeId = root.profiles[0].id;
    return root;
  }

  // 예전 단일 사용자 데이터를 프로필 하나로 감싼다
  migratedOnLoad = true;
  const id = `p-${uid()}`;
  const data = fillData(raw);
  data.profile.onboarded = true; // 이미 쓰던 사람에게 온보딩을 다시 묻지 않는다
  return {
    schema: 2,
    activeId: id,
    profiles: [{ id, data }],
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

function fillData(d = {}) {
  const base = emptyProfileData();
  const out = { ...base, ...d };
  out.profile = { ...base.profile, ...(d.profile || {}) };
  out.profile.modules = { ...base.profile.modules, ...((d.profile || {}).modules || {}) };
  if (!Array.isArray(out.profile.painAreas) || !out.profile.painAreas.length) {
    out.profile.painAreas = [...DEFAULT_PAIN_AREAS];
  }
  out.targets = { ...base.targets, ...(d.targets || {}) };
  ['weight', 'glucose', 'labs', 'pain'].forEach((k) => { out[k] = Array.isArray(d[k]) ? d[k] : []; });
  out.days = d.days && typeof d.days === 'object' ? d.days : {};
  out.rewards = { ...base.rewards, ...(d.rewards || {}) };
  if (!Array.isArray(out.rewards.custom) || !out.rewards.custom.length) out.rewards.custom = base.rewards.custom;
  if (!Array.isArray(out.rewards.claimed)) out.rewards.claimed = [];
  delete out.settings; // 설정은 기기 단위라 프로필 안에 두지 않는다
  return out;
}

let root = loadRoot();
let state = bind();
// 구버전에서 올라온 경우 바로 새 모양으로 다시 써 둔다 (다음 실행부터 변환이 필요 없다)
if (migratedOnLoad) save();

function loadRoot() {
  try {
    const raw = localStorage.getItem(APP.storageKey);
    return raw ? migrate(JSON.parse(raw)) : emptyRoot();
  } catch (err) {
    console.warn('저장된 데이터를 읽지 못했습니다. 새로 시작합니다.', err);
    return emptyRoot();
  }
}

/* 지금 프로필의 데이터에 기기 설정을 "숨은 참조"로 붙인다.
 * enumerable:false 라 JSON.stringify 가 건너뛴다 — 프로필마다 설정이 복제되지 않는다. */
function bind() {
  const entry = root.profiles.find((p) => p.id === root.activeId) || root.profiles[0];
  root.activeId = entry.id;
  const d = entry.data;
  Object.defineProperty(d, 'settings', { value: root.settings, configurable: true, enumerable: false });
  Object.defineProperty(d, 'profileId', { value: entry.id, configurable: true, enumerable: false });
  return d;
}

export function save() {
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify(root));
  } catch (err) {
    alert('저장 공간이 부족해 기록을 저장하지 못했습니다. 설정에서 백업 후 오래된 기록을 정리해 주세요.');
    console.error(err);
  }
  listeners.forEach((fn) => fn(state));
}

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* ── 프로필 ───────────────────────────────────────────── */
export function listProfiles() {
  return root.profiles.map((p) => ({
    id: p.id,
    name: p.data.profile.name || '이름 없음',
    active: p.id === root.activeId,
    onboarded: !!p.data.profile.onboarded,
    entries: p.data.weight.length + p.data.glucose.length + p.data.pain.length,
  }));
}

export function activeProfileId() { return root.activeId; }

export function switchProfile(id) {
  if (!root.profiles.some((p) => p.id === id)) return false;
  root.activeId = id;
  state = bind();
  save();
  return true;
}

export function addProfile(name = '') {
  const id = `p-${uid()}`;
  root.profiles.push({ id, data: emptyProfileData(name) });
  root.activeId = id;
  state = bind();
  save();
  return id;
}

export function removeProfile(id) {
  if (root.profiles.length <= 1) return false;
  root.profiles = root.profiles.filter((p) => p.id !== id);
  if (root.activeId === id) root.activeId = root.profiles[0].id;
  state = bind();
  save();
  return true;
}

/* ── 공통 CRUD (지금 프로필 기준) ───────────────────────── */
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
    state.days[dateKey] = { done: [], waterMl: 0, proteinG: 0, steps: 0, skipped: [], note: '' };
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
export function setSettings(patch) { Object.assign(root.settings, patch); save(); }
export function setRewards(patch) { Object.assign(state.rewards, patch); save(); }

/* ── 백업 / 복원 ──────────────────────────────────────── */
export function exportJSON({ allProfiles = true } = {}) {
  const payload = allProfiles
    ? root
    : { schema: 2, activeId: root.activeId, profiles: root.profiles.filter((p) => p.id === root.activeId), settings: root.settings };
  return JSON.stringify({ app: APP.name, version: APP.version, exportedAt: new Date().toISOString(), ...payload }, null, 2);
}

export function importJSON(text, { merge = false } = {}) {
  const parsed = JSON.parse(text);
  const incoming = migrate(parsed.state || parsed);
  if (!incoming.profiles.length) throw new Error('형식을 알 수 없는 파일입니다.');

  if (!merge) {
    root = incoming;
  } else {
    // 같은 id 는 기록만 합치고, 새 id 는 프로필째 추가한다
    incoming.profiles.forEach((inc) => {
      const mine = root.profiles.find((p) => p.id === inc.id);
      if (!mine) { root.profiles.push(inc); return; }
      ['weight', 'glucose', 'labs', 'pain'].forEach((kind) => {
        const seen = new Set(mine.data[kind].map((r) => r.id));
        mine.data[kind] = mine.data[kind]
          .concat(inc.data[kind].filter((r) => !seen.has(r.id)))
          .sort((a, b) => String(a.date || a.ts).localeCompare(String(b.date || b.ts)));
      });
      mine.data.days = { ...inc.data.days, ...mine.data.days };
    });
  }
  state = bind();
  save();
  return state;
}

export function wipeAll() {
  root = emptyRoot();
  state = bind();
  save();
}
