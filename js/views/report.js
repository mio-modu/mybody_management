/* 리포트 — 숫자를 "다음 주에 뭘 바꿀지"로 요약한다. */
import { PAIN_AREAS } from '../config.js';
import { dateKey, esc, num, signed, daysAgo } from '../utils.js';
import { weightSummary, glucoseSummary, painSummary, labsSummary, adherence, correlations, strengthWord } from '../analysis.js';
import { painDirection } from '../protocol.js';
import { tile, bar, badge } from '../ui.js';

/* 이번 주 집중할 한두 개를 고른다 — 전부 다 하라고 하면 아무것도 안 한다 */
function focus(state) {
  const w = weightSummary(state);
  const g = glucoseSummary(state, 14);
  const p = painSummary(state, 7);
  const l = labsSummary(state);
  const out = [];

  const back = p.byArea.lowBack; const neck = p.byArea.neck;
  if ((back.avg ?? 0) >= 4 || (neck.avg ?? 0) >= 4) {
    const worst = (back.avg ?? 0) >= (neck.avg ?? 0) ? back : neck;
    out.push({
      tone: 'serious',
      title: `${worst.area.label} 통증 평균 ${num(worst.avg, 1)} — 이번 주 1순위`,
      body: '강도를 올리는 운동은 보류하세요. 앉는 시간 끊기와 수면 시간 확보가 통증 점수를 가장 빨리 내립니다. 2주 이상 4점 이상이면 진료를 한 번 받는 게 효율적입니다.',
    });
  }
  if (g.byCtx.fasting.avg != null && g.byCtx.fasting.avg > state.targets.glucoseFasting[1]) {
    out.push({
      tone: 'warning',
      title: `공복혈당 평균 ${num(g.byCtx.fasting.avg, 0)} — 목표 ${state.targets.glucoseFasting[1]} 초과`,
      body: '저녁 탄수화물 양과 취침 3시간 전 금식이 공복혈당에 가장 직접적입니다. 아침 공복만 한 주 더 매일 찍어보세요.',
    });
  }
  if (g.byCtx.post2.avg != null && g.byCtx.post2.avg > state.targets.glucosePost[1]) {
    out.push({
      tone: 'warning',
      title: `식후 평균 ${num(g.byCtx.post2.avg, 0)} — 스파이크 관리 필요`,
      body: '같은 식사라도 순서(채소→단백질→탄수)와 식후 10분 걷기로 정점이 20~40 내려갑니다. 어떤 메뉴에서 튀는지 메모를 남기세요.',
    });
  }
  if (w.perWeek != null && w.toGo > 0.5 && w.perWeek > -0.05) {
    out.push({
      tone: 'warning',
      title: '체중이 정체 중입니다',
      body: '먹는 양을 더 줄이기보다 단백질·걸음 수·수면을 먼저 채우세요. 정체는 보통 수면 부족과 활동량 감소에서 옵니다.',
    });
  }
  if (l.daysSince != null && l.daysSince > 90) {
    out.push({ tone: 'warning', title: `혈액검사 ${l.daysSince}일 경과`, body: 'LDL·중성지방·HbA1c 재확인 시점입니다. 식습관 변경 효과는 8~12주면 숫자로 나타납니다.' });
  }
  if (!out.length) {
    out.push({ tone: 'good', title: '목표 범위를 유지하고 있습니다', body: '지금 하는 것을 그대로 유지하세요. 바꿀 것을 찾지 말고, 기록 빈도만 지키면 됩니다.' });
  }
  return out.slice(0, 3);
}

export default {
  title: '리포트',
  render(state) {
    const w = weightSummary(state);
    const g = glucoseSummary(state, 7);
    const p = painSummary(state, 7);
    const ad = adherence(state, 7);
    const cors = correlations(state);
    const items = focus(state);
    const dayKeys = Array.from({ length: 7 }, (_, i) => dateKey(daysAgo(6 - i)));

    return `
      <div class="section-title">이번 주 집중</div>
      ${items.map((it) => `<div class="card">
        <div class="card-head"><h2>${esc(it.title)}</h2>
          ${badge({ tone: it.tone, icon: it.tone === 'good' ? '✓' : '!', label: it.tone === 'good' ? '양호' : '조치' })}</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(it.body)}</div>
      </div>`).join('')}

      <div class="section-title">최근 7일 요약</div>
      <div class="tiles">
        ${tile({ label: '체중 변화', value: w.sevenDayDelta != null ? signed(w.sevenDayDelta, 1) : '—', unit: 'kg', sub: `현재 ${num(w.trend, 1)}kg` })}
        ${tile({ label: '혈당 측정', value: `${g.n}`, unit: '회', sub: g.tir != null ? `범위 내 ${num(g.tir, 0)}%` : '—' })}
        ${tile({ label: '통증 기록', value: `${p.n}`, unit: '회', sub: `무통증일 ${p.goodDays}일` })}
        ${tile({ label: '루틴 이행률', value: num(ad, 0), unit: '%', sub: '하루 5개 기준' })}
      </div>

      <div class="card">
        <div class="card-head"><h2>루틴 이행률</h2><span class="meta">7일</span></div>
        ${bar(ad, { good: ad >= 70 })}
        <div class="week">
          ${dayKeys.map((k) => {
            const n = state.days[k]?.done?.length || 0;
            const lvl = n >= 6 ? 'lv3' : n >= 3 ? 'lv2' : n > 0 ? 'lv1' : '';
            const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${k}T00:00`).getDay()];
            return `<div class="wd"><span class="box ${lvl}" title="${esc(k)} · ${n}개 완료">${n}</span>
              <span class="lbl">${esc(wd)}</span></div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>부위별 통증</h2><span class="meta">7일 평균</span></div>
        ${PAIN_AREAS.map((a) => {
          const s = p.byArea[a.id];
          if (!s.n) return '';
          const dir = painDirection(state, a.id);
          const tone = s.avg <= state.targets.painMax ? 'good' : s.avg <= 5 ? 'warning' : 'serious';
          return `<div class="row">
            <span class="grow" style="color:var(--ink)">${esc(a.label)}</span>
            <span class="val">${esc(num(s.avg, 1))}<small>/10</small></span>
            <span class="when" style="min-width:48px;text-align:right">${dir.dir === 'worse' ? '↑ 악화' : dir.dir === 'better' ? '↓ 호전' : '— 유지'}</span>
            ${badge({ tone, icon: tone === 'good' ? '✓' : '!', label: tone === 'good' ? '목표 내' : '목표 초과' })}
          </div>`;
        }).join('') || '<div class="empty">통증 기록이 없습니다.</div>'}
      </div>

      <div class="card">
        <div class="card-head"><h2>내 몸 패턴</h2><span class="meta">기록 기반 상관</span></div>
        ${cors.length ? cors.map((c) => `<div class="row">
          <span class="grow" style="color:var(--ink);white-space:normal">${esc(c.label)}</span>
          <span class="val">${esc(c.r > 0 ? '+' : '−')}${esc(num(Math.abs(c.r), 2))}</span>
          <span class="when" style="min-width:56px;text-align:right">${esc(strengthWord(c.r))}</span>
          <span class="when" style="min-width:34px;text-align:right">n=${esc(String(c.n))}</span>
        </div>`).join('') : '<div class="empty">기록이 4건 이상 쌓이면 패턴이 계산됩니다.</div>'}
        ${cors.length ? `<div class="note" style="margin-top:10px">상관은 인과가 아닙니다. 다만 "+"는 같이 올라가고 "−"는 반대로 간다는 뜻이니,
          값이 큰 항목 하나를 2주간 의도적으로 바꿔보면 내 몸에서 실제로 작동하는지 확인할 수 있습니다.</div>` : ''}
      </div>

      <div class="card">
        <div class="card-head"><h2>기록 충실도</h2></div>
        <div class="row"><span class="grow">체중</span><span class="val">${state.weight.length}건</span></div>
        <div class="row"><span class="grow">혈당</span><span class="val">${state.glucose.length}건</span></div>
        <div class="row"><span class="grow">통증</span><span class="val">${state.pain.length}건</span></div>
        <div class="row"><span class="grow">혈액검사</span><span class="val">${state.labs.length}건</span></div>
        <div class="row"><span class="grow">루틴 기록일</span><span class="val">${Object.keys(state.days).length}일</span></div>
      </div>
    `;
  },
  mount() {},
};
