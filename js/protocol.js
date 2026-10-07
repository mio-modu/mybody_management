/* 통증 점수 → 오늘 할 것. "그때그때 묻고, 그때그때 조절한다"의 조절 담당. */
import { PAIN_AREAS, PROTOCOLS, RED_FLAGS, tierFor } from './config.js';
import { parseISO, mean } from './utils.js';

export function latestPain(state) {
  return state.pain.length ? state.pain[state.pain.length - 1] : null;
}

export function painSeries(state, areaId, days = 30) {
  const from = Date.now() - days * 86400000;
  return state.pain
    .filter((p) => (parseISO(p.ts)?.getTime() ?? 0) >= from && p.scores?.[areaId] != null)
    .map((p) => ({ x: parseISO(p.ts), y: Number(p.scores[areaId]) }));
}

/* 최근 3회 평균 vs 그 이전 3회 평균 → 악화/호전 방향 */
export function painDirection(state, areaId) {
  const vals = state.pain.filter((p) => p.scores?.[areaId] != null).map((p) => Number(p.scores[areaId]));
  if (vals.length < 4) return { dir: 'flat', delta: 0 };
  const recent = mean(vals.slice(-3));
  const prior = mean(vals.slice(-6, -3));
  const delta = recent - prior;
  if (delta >= 1) return { dir: 'worse', delta };
  if (delta <= -1) return { dir: 'better', delta };
  return { dir: 'flat', delta };
}

/* 핵심: 기록 하나로 오늘의 처방을 만든다 */
export function buildPrescription(state, log = latestPain(state)) {
  const entry = log || { scores: {}, triggers: [], redFlags: [] };
  const areas = PAIN_AREAS
    .map((a) => ({ area: a, score: entry.scores?.[a.id] }))
    .filter((x) => x.score != null && Number(x.score) > 0 || (x.area.primary && x.score != null));

  const flagged = (entry.redFlags || []).map((id) => RED_FLAGS.find((f) => f.id === id)).filter(Boolean);

  const perArea = areas.map(({ area, score }) => {
    const dir = painDirection(state, area.id);
    let tier = tierFor(score);
    // 악화 중이면 한 단계 보수적으로 (강도를 내린다)
    let adjusted = false;
    if (dir.dir === 'worse' && tier.id === 'A') { tier = tierFor(4); adjusted = true; }
    else if (dir.dir === 'worse' && tier.id === 'B') { tier = tierFor(7); adjusted = true; }
    const items = PROTOCOLS[area.id]?.[tier.id] || [];
    return { area, score: Number(score), tier, items, dir, adjusted };
  }).sort((a, b) => b.score - a.score);

  const cautions = [];
  const triggers = entry.triggers || [];
  if (triggers.includes('장시간 앉아 있기')) cautions.push('앉는 시간을 20~30분 단위로 끊고, 끊을 때마다 1분 일어서기.');
  if (triggers.includes('노트북/모니터 작업') || triggers.includes('스마트폰 고개 숙임')) cautions.push('화면 상단을 눈높이로. 노트북은 받침대 + 외장 키보드.');
  if (triggers.includes('수면 자세')) cautions.push('베개 높이 점검: 목이 중립이 되는 높이. 허리는 무릎 아래 베개.');
  if (triggers.includes('무거운 것 들기')) cautions.push('무릎 굽혀 몸에 붙이고 들기. 들면서 비틀지 않기.');
  if (triggers.includes('운동 과부하')) cautions.push('다음 2회 세션은 중량 20% 감량 후 통증 반응 확인.');
  if (triggers.includes('스트레스')) cautions.push('통증 민감도가 올라간 상태. 호흡 5분 + 수면 시간 확보가 운동보다 먼저.');
  if (triggers.includes('추위/찬바람')) cautions.push('해당 부위 보온. 작업 전 5분 온열로 예열.');
  if (entry.sittingH != null && Number(entry.sittingH) >= 8) cautions.push(`앉은 시간 ${entry.sittingH}시간 — 허리 통증의 가장 강한 예측 인자다. 내일은 2시간 줄이는 걸 목표로.`);
  if (entry.sleepH != null && Number(entry.sleepH) < 6) cautions.push(`수면 ${entry.sleepH}시간 — 6시간 아래에서는 통증 역치가 떨어진다. 오늘은 강도 대신 회복.`);

  const worst = perArea[0]?.score ?? 0;
  const micro = worst >= 6
    ? ['1분 호흡(4초 들이쉬고 6초 내쉬기)', '통증 없는 범위로만 자세 바꾸기', '같은 자세 20분 제한 알람']
    : ['턱 당기기 10회', '의자에서 흉추 회전 좌우 10회', '엉덩이 조이기 10초 × 5', '제자리 걷기 1분'];

  return {
    entry, perArea, cautions, micro,
    redFlags: flagged,
    worst,
    tier: tierFor(worst),
    hasRedFlag: flagged.length > 0,
  };
}
