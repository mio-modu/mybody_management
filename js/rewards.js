/* 보상 엔진 — 포인트는 "행동"에서만 나온다.
 * 기록과 루틴은 내가 통제할 수 있지만 체중과 혈당 수치는 아니다.
 * 통제 밖의 것에 보상을 걸면 과속하거나 일찍 포기한다. */
import { CORE_MISSIONS, ROUTINE, POINTS, DEFAULT_REWARDS, BADGES } from './config.js';
import { dateKey, daysAgo, parseISO } from './utils.js';
import { getState, save } from './store.js';

const ROUTINE_GOAL = 5;

export function missionState(state, key = dateKey()) {
  const day = state.days[key] || { done: [] };
  const hasPain = state.pain.some((p) => String(p.ts).slice(0, 10) === key);
  const hasNumber = state.weight.some((w) => w.date === key)
    || state.glucose.some((g) => String(g.ts).slice(0, 10) === key);
  const routineDone = (day.done || []).length;

  return CORE_MISSIONS.map((m) => {
    if (m.id === 'm-body') return { ...m, done: hasPain, progress: hasPain ? 1 : 0, detail: hasPain ? '기록 완료' : '아직' };
    if (m.id === 'm-routine') return { ...m, done: routineDone >= ROUTINE_GOAL, progress: Math.min(1, routineDone / ROUTINE_GOAL), detail: `${routineDone}/${ROUTINE_GOAL}` };
    return { ...m, done: hasNumber, progress: hasNumber ? 1 : 0, detail: hasNumber ? '기록 완료' : '아직' };
  });
}

export function dayComplete(state, key = dateKey()) {
  return missionState(state, key).every((m) => m.done);
}

/* 기록이 시작된 날부터 오늘까지 중 달성한 날 (오래된 순) */
export function completedDays(state) {
  const keys = new Set([
    ...Object.keys(state.days),
    ...state.weight.map((w) => w.date),
    ...state.glucose.map((g) => String(g.ts).slice(0, 10)),
    ...state.pain.map((p) => String(p.ts).slice(0, 10)),
  ].filter(Boolean));
  return [...keys].sort().filter((k) => dayComplete(state, k));
}

function runs(sortedKeys) {
  const out = [];
  let run = [];
  sortedKeys.forEach((k) => {
    if (!run.length) { run = [k]; return; }
    const prev = parseISO(run[run.length - 1]);
    const cur = parseISO(k);
    if (Math.round((cur - prev) / 86400000) === 1) run.push(k);
    else { out.push(run); run = [k]; }
  });
  if (run.length) out.push(run);
  return out;
}

export function streakInfo(state) {
  const done = completedDays(state);
  const all = runs(done);
  const best = all.reduce((m, r) => Math.max(m, r.length), 0);
  const today = dateKey();
  const yesterday = dateKey(daysAgo(1));
  const last = all[all.length - 1];
  const live = last && (last[last.length - 1] === today || last[last.length - 1] === yesterday);
  return {
    current: live ? last.length : 0,
    best,
    todayDone: done.includes(today),
    totalDays: done.length,
    runs: all,
  };
}

export function ledger(state) {
  const done = completedDays(state);
  const base = done.length * POINTS.perDay;
  const bonus = runs(done).reduce((sum, r) => sum + Math.floor(r.length / POINTS.bonusEvery) * POINTS.streakBonus, 0);
  const spent = (state.rewards?.claimed || []).reduce((sum, c) => sum + (Number(c.cost) || 0), 0);
  return { earned: base + bonus, base, bonus, spent, balance: base + bonus - spent };
}

export function rewardList(state) {
  return (state.rewards?.custom?.length ? state.rewards.custom : DEFAULT_REWARDS);
}

export function claimReward(state, rewardId) {
  const reward = rewardList(state).find((r) => r.id === rewardId);
  if (!reward) return { ok: false, reason: '없는 보상입니다' };
  const { balance } = ledger(state);
  if (balance < reward.cost) return { ok: false, reason: `${reward.cost - balance}p 더 모아야 합니다` };
  state.rewards.claimed.push({ id: reward.id, title: reward.title, cost: reward.cost, date: dateKey() });
  save();
  return { ok: true, reward };
}

/* 뱃지는 결과도 축하한다. 다만 포인트로는 바뀌지 않는다. */
export function badgeList(state) {
  const s = streakInfo(state);
  const earned = new Set();

  if (state.weight.length || state.pain.length || state.glucose.length) earned.add('b-first');
  [[3, 'b-streak3'], [7, 'b-streak7'], [14, 'b-streak14'], [30, 'b-streak30'], [100, 'b-streak100']]
    .forEach(([n, id]) => { if (s.best >= n) earned.add(id); });

  // 편안한 한 주 — 최근 7일 통증 기록이 5회 이상이고 전부 목표 이하
  const from = daysAgo(6).getTime();
  const recentPain = state.pain.filter((p) => (parseISO(p.ts)?.getTime() ?? 0) >= from);
  const limit = state.targets.painMax ?? 2;
  if (recentPain.length >= 5 && recentPain.every((p) => Math.max(0, ...Object.values(p.scores || {}).map(Number)) <= limit)) {
    earned.add('b-pain7');
  }

  // 혈당 안정 — 최근 14일 10회 이상 측정, 범위 내 80% 이상
  const g14 = state.glucose.filter((g) => (parseISO(g.ts)?.getTime() ?? 0) >= daysAgo(13).getTime());
  if (g14.length >= 10) {
    const inRange = g14.filter((g) => {
      const [lo, hi] = g.context === 'fasting' ? state.targets.glucoseFasting : state.targets.glucosePost;
      return g.value >= lo && g.value <= hi;
    }).length;
    if (inRange / g14.length >= 0.8) earned.add('b-tir');
  }

  // 체중 마일스톤 — 7일 평균 기준(하루 변동으로 뱃지가 켜졌다 꺼지지 않게)
  const w = state.weight.filter((x) => x.kg != null).sort((a, b) => a.date.localeCompare(b.date));
  if (w.length) {
    const recent = w.slice(-7).map((x) => Number(x.kg));
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const start = state.profile.startWeightKg ?? Number(w[0].kg);
    const lost = start - avg;
    if (lost >= 1) earned.add('b-w1');
    if (lost >= 3) earned.add('b-w3');
    if (lost >= 5) earned.add('b-w5');
    if (avg <= (state.targets.weightKg ?? 68)) earned.add('b-goal');
  }

  return BADGES.map((b) => ({ ...b, earned: earned.has(b.id) }));
}

/* 오늘 처음 달성한 순간에만 한 번 축하한다 */
export function shouldCelebrate(state) {
  const today = dateKey();
  if (!dayComplete(state, today)) return false;
  return state.rewards?.celebrated !== today;
}

export function markCelebrated(state) {
  state.rewards.celebrated = dateKey();
  save();
}

export function stampDays(state, n = 28) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const key = dateKey(daysAgo(i));
    out.push({ key, done: dayComplete(state, key) });
  }
  return out;
}
