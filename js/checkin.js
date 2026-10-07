/* 체크인 엔진 — "지금 이 시간에, 내가 아직 답하지 않은 것"만 골라 묻는다.
 * 하루에 다 묻지 않는다. 시간대별로 2~3개만. */
import { CHECKIN_SLOTS, ROUTINE } from './config.js';
import { dateKey, parseISO, daysAgo } from './utils.js';
import { getDay, setDay } from './store.js';
import { hasModule } from './profile.js';

export function currentSlot(now = new Date()) {
  const h = now.getHours();
  return CHECKIN_SLOTS.find((s) => (h >= s.from && h < s.to) || (s.to > 24 && (h >= s.from || h < s.to - 24)))
    || CHECKIN_SLOTS[0];
}

function hoursSince(ts) {
  const d = parseISO(ts);
  return d ? (Date.now() - d.getTime()) / 3600000 : Infinity;
}

/* 반환: [{id, title, hint, kind, route, priority}] — priority 낮을수록 먼저 */
export function pending(state, now = new Date()) {
  const today = dateKey(now);
  const slot = currentSlot(now);
  const day = state.days[today] || { done: [] };
  const skipped = new Set(day.skipped || []);
  const items = [];

  const hasWeightToday = state.weight.some((w) => w.date === today);
  const fastingToday = state.glucose.some((g) => g.context === 'fasting' && String(g.ts).slice(0, 10) === today);
  const postToday = state.glucose.some((g) => g.context === 'post2' && String(g.ts).slice(0, 10) === today);
  const lastPain = state.pain[state.pain.length - 1];
  const painAgeH = lastPain ? hoursSince(lastPain.ts) : Infinity;
  const painToday = lastPain && String(lastPain.ts).slice(0, 10) === today;
  const lastWaist = [...state.weight].reverse().find((w) => w.waist != null);
  const lastLab = [...state.labs].sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();

  const ON = { glucose: hasModule(state, 'glucose'), labs: hasModule(state, 'labs'), pain: hasModule(state, 'pain') };
  const push = (o) => {
    if (skipped.has(o.id)) return;
    if (o.kind === 'glucose' && !ON.glucose) return;
    if (o.kind === 'labs' && !ON.labs) return;
    if ((o.kind === 'pain' || o.kind === 'micro') && !ON.pain) return;
    if (o.id === 'ci-rx' && !ON.pain) return;
    items.push(o);
  };

  // 아침
  if (slot.id === 'morning') {
    if (!hasWeightToday) push({ id: 'ci-weight', priority: 1, kind: 'weight', route: '#/weight', title: '오늘 아침 체중', hint: '화장실 다녀온 직후, 같은 옷차림으로' });
    if (!fastingToday) push({ id: 'ci-fasting', priority: 2, kind: 'glucose', route: '#/glucose', title: '공복 혈당', hint: '식사 전, 물만 마신 상태' });
    if (!painToday) push({ id: 'ci-pain-am', priority: 3, kind: 'pain', route: '#/pain', title: '목·허리 상태 (아침)', hint: '자고 일어났을 때가 패턴을 가장 잘 보여준다' });
  }

  // 낮
  if (slot.id === 'midday') {
    if (!postToday) push({ id: 'ci-post', priority: 2, kind: 'glucose', route: '#/glucose', title: '식후 2시간 혈당', hint: '점심 첫 숟갈 기준 2시간' });
    if (painAgeH > 6) push({ id: 'ci-pain-mid', priority: 3, kind: 'pain', route: '#/pain', title: '지금 통증은 어때?', hint: '오전 작업 후 변화 확인' });
    push({ id: 'ci-break', priority: 5, kind: 'micro', route: '#/pain', title: '1분 미세 휴식', hint: '50분 넘게 앉아 있었다면 지금 일어나기' });
  }

  // 저녁
  if (slot.id === 'evening') {
    if (painAgeH > 6) push({ id: 'ci-pain-pm', priority: 2, kind: 'pain', route: '#/pain', title: '하루 끝 통증 점검', hint: '오늘 무엇이 통증을 올렸는지 함께 기록' });
    if (!day.done?.includes('r-rx')) push({ id: 'ci-rx', priority: 3, kind: 'routine', route: '#/pain', title: '오늘의 처방 운동', hint: '통증 점수에 맞춰 강도가 이미 조절되어 있다' });
    if (!day.steps) push({ id: 'ci-steps', priority: 4, kind: 'routine', route: '#/today', title: '걸음 수 입력', hint: '휴대폰 건강 앱 숫자 그대로' });
  }

  // 밤
  if (slot.id === 'night') {
    const left = ROUTINE.filter((r) => !day.done?.includes(r.id)).length;
    if (left) push({ id: 'ci-wrap', priority: 2, kind: 'routine', route: '#/today', title: `오늘 루틴 ${left}개 남음`, hint: '지킨 것만 체크해도 데이터가 된다' });
    if (!painToday) push({ id: 'ci-pain-night', priority: 3, kind: 'pain', route: '#/pain', title: '오늘 통증 기록 없음', hint: '한 줄만이라도' });
  }

  // 주 1회 · 분기 1회
  if (!lastWaist || hoursSince(lastWaist.date) > 7 * 24) {
    push({ id: 'ci-waist', priority: 7, kind: 'weight', route: '#/weight', title: '허리둘레 측정 (주 1회)', hint: '체중보다 내장지방을 잘 보여준다' });
  }
  if (!lastLab) {
    push({ id: 'ci-lab-first', priority: 8, kind: 'labs', route: '#/labs', title: '혈액검사 결과 입력', hint: 'LDL·중성지방·HbA1c 기준점이 있어야 목표가 선다' });
  } else if (hoursSince(lastLab.date) > 90 * 24) {
    push({ id: 'ci-lab-due', priority: 8, kind: 'labs', route: '#/labs', title: '혈액검사 3개월 경과', hint: '콜레스테롤·당화혈색소 재확인 시점' });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

export function skipToday(state, id) {
  const day = getDay(dateKey());
  return setDay(dateKey(), { skipped: [...new Set([...(day.skipped || []), id])] });
}

/* 최근 7일 중 기록이 하나도 없는 날 수 — 공백이 길면 먼저 알려준다 */
export function gapDays(state) {
  let gaps = 0;
  for (let i = 1; i <= 7; i += 1) {
    const key = dateKey(daysAgo(i));
    const any = state.weight.some((w) => w.date === key)
      || state.glucose.some((g) => String(g.ts).slice(0, 10) === key)
      || state.pain.some((p) => String(p.ts).slice(0, 10) === key)
      || (state.days[key]?.done?.length > 0);
    if (!any) gaps += 1;
  }
  return gaps;
}
