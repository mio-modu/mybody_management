/* 숫자를 "그래서 뭘 하지"로 바꾸는 계산들 */
import { DEFAULT_TARGETS, GLUCOSE_CONTEXTS } from './config.js';
import { painAreas } from './profile.js';
import { parseISO, mean, movingAverage, slopePerDay, pearson, eA1c, dateKey, daysAgo } from './utils.js';

export function weightPoints(state, days = 90) {
  const from = daysAgo(days).getTime();
  return state.weight
    .filter((w) => w.kg != null && (parseISO(w.date)?.getTime() ?? 0) >= from)
    .map((w) => ({ x: parseISO(w.date), y: Number(w.kg) }))
    .sort((a, b) => a.x - b.x);
}

export function weightSummary(state) {
  const t = state.targets.weightKg ?? DEFAULT_TARGETS.weightKg;
  const pts = weightPoints(state, 365);
  if (!pts.length) return { target: t, latest: null, toGo: null };
  const latest = pts[pts.length - 1];
  const ma = movingAverage(pts, 7);
  const trend = ma[ma.length - 1]?.y ?? latest.y;
  const recent = pts.filter((p) => p.x.getTime() >= daysAgo(28).getTime());
  const slope = slopePerDay(recent.length >= 3 ? recent : pts); // kg/일
  const perWeek = slope == null ? null : slope * 7;
  const toGo = trend - t;
  const weeksLeft = perWeek && perWeek < -0.02 && toGo > 0 ? toGo / -perWeek : null;
  const start = state.profile.startWeightKg ?? pts[0].y;
  const progress = start > t ? Math.min(100, Math.max(0, ((start - trend) / (start - t)) * 100)) : null;
  const h = state.profile.heightCm ? Number(state.profile.heightCm) / 100 : null;
  return {
    target: t, latest, trend, slope, perWeek, toGo, weeksLeft, start, progress,
    bmi: h ? trend / (h * h) : null,
    targetBmi: h ? t / (h * h) : null,
    sevenDayDelta: deltaOver(pts, 7),
    thirtyDayDelta: deltaOver(pts, 30),
  };
}

function deltaOver(pts, days) {
  if (pts.length < 2) return null;
  const cutoff = daysAgo(days).getTime();
  const before = pts.filter((p) => p.x.getTime() <= cutoff);
  const base = before.length ? before[before.length - 1].y : pts[0].y;
  return pts[pts.length - 1].y - base;
}

export function glucoseSummary(state, days = 14) {
  const from = daysAgo(days).getTime();
  const rows = state.glucose.filter((g) => (parseISO(g.ts)?.getTime() ?? 0) >= from);
  const byCtx = {};
  GLUCOSE_CONTEXTS.forEach((c) => {
    const vals = rows.filter((r) => r.context === c.id).map((r) => Number(r.value));
    const [lo, hi] = state.targets[c.target] || [70, 140];
    const inRange = vals.filter((v) => v >= lo && v <= hi).length;
    byCtx[c.id] = {
      ctx: c, n: vals.length, avg: mean(vals), max: vals.length ? Math.max(...vals) : null,
      min: vals.length ? Math.min(...vals) : null,
      tir: vals.length ? (inRange / vals.length) * 100 : null, range: [lo, hi],
    };
  });
  const allVals = rows.map((r) => Number(r.value));
  const avg = mean(allVals);
  const inAll = rows.filter((r) => {
    const [lo, hi] = state.targets[(GLUCOSE_CONTEXTS.find((c) => c.id === r.context) || {}).target] || [70, 140];
    return r.value >= lo && r.value <= hi;
  }).length;
  return {
    days, n: rows.length, avg, byCtx,
    tir: rows.length ? (inAll / rows.length) * 100 : null,
    estA1c: avg == null ? null : eA1c(avg),
    latest: state.glucose[state.glucose.length - 1] || null,
  };
}

export function labsSummary(state) {
  const sorted = [...state.labs].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = sorted[sorted.length - 1] || null;
  const prev = sorted[sorted.length - 2] || null;
  const ratio = latest && latest.tg && latest.hdl ? Number(latest.tg) / Number(latest.hdl) : null;
  const nonHdl = latest && latest.tc && latest.hdl ? Number(latest.tc) - Number(latest.hdl) : null;
  const daysSince = latest ? Math.round((Date.now() - (parseISO(latest.date)?.getTime() ?? 0)) / 86400000) : null;
  return { latest, prev, ratio, nonHdl, daysSince, history: sorted };
}

export function painSummary(state, days = 7) {
  const from = daysAgo(days).getTime();
  const rows = state.pain.filter((p) => (parseISO(p.ts)?.getTime() ?? 0) >= from);
  const areas = painAreas(state);
  const byArea = {};
  areas.forEach((a) => {
    const vals = rows.map((r) => r.scores?.[a.id]).filter((v) => v != null).map(Number);
    byArea[a.id] = { area: a, n: vals.length, avg: mean(vals), max: vals.length ? Math.max(...vals) : null };
  });
  const goodDays = new Set(rows.filter((r) => Math.max(0, ...areas.map((a) => Number(r.scores?.[a.id] ?? 0))) <= (state.targets.painMax ?? 2))
    .map((r) => String(r.ts).slice(0, 10)));
  return { days, n: rows.length, byArea, areas, goodDays: goodDays.size, latest: state.pain[state.pain.length - 1] || null };
}

export function adherence(state, days = 7) {
  let done = 0; let possible = 0;
  for (let i = 0; i < days; i += 1) {
    const key = dateKey(daysAgo(i));
    const day = state.days[key];
    possible += 1;
    if (day && day.done?.length) done += Math.min(1, day.done.length / 5);
  }
  return possible ? (done / possible) * 100 : 0;
}

/* 내 몸에서 실제로 뭐가 뭘 흔드는지 — 기록이 쌓이면 자동으로 드러난다 */
export function correlations(state) {
  const out = [];
  const painRows = state.pain.filter((p) => p.scores);
  const back = painRows.filter((p) => p.scores.lowBack != null);
  const neck = painRows.filter((p) => p.scores.neck != null);

  const pairs = [
    { label: '앉은 시간 → 허리 통증', rows: back.filter((p) => p.sittingH != null), x: (p) => Number(p.sittingH), y: (p) => Number(p.scores.lowBack), good: 'neg' },
    { label: '수면 시간 → 허리 통증', rows: back.filter((p) => p.sleepH != null), x: (p) => Number(p.sleepH), y: (p) => Number(p.scores.lowBack), good: 'pos' },
    { label: '수면 시간 → 목 통증', rows: neck.filter((p) => p.sleepH != null), x: (p) => Number(p.sleepH), y: (p) => Number(p.scores.neck), good: 'pos' },
    { label: '스트레스 → 목 통증', rows: neck.filter((p) => p.stress != null), x: (p) => Number(p.stress), y: (p) => Number(p.scores.neck), good: 'neg' },
  ];
  pairs.forEach((p) => {
    const r = pearson(p.rows.map(p.x), p.rows.map(p.y));
    if (r != null) out.push({ label: p.label, r, n: p.rows.length });
  });

  // 체중 추세 ↔ 공복혈당
  const byDay = new Map();
  state.glucose.filter((g) => g.context === 'fasting').forEach((g) => {
    byDay.set(String(g.ts).slice(0, 10), Number(g.value));
  });
  const wPairs = state.weight.filter((w) => byDay.has(w.date));
  const r2 = pearson(wPairs.map((w) => Number(w.kg)), wPairs.map((w) => byDay.get(w.date)));
  if (r2 != null) out.push({ label: '체중 → 공복혈당', r: r2, n: wPairs.length });

  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

export function strengthWord(r) {
  const a = Math.abs(r);
  if (a >= 0.7) return '매우 강함';
  if (a >= 0.5) return '강함';
  if (a >= 0.3) return '보통';
  return '약함';
}
