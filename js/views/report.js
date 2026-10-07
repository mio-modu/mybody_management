/* 리포트 — 숫자를 "다음 주에 뭘 바꿀지"로 요약한다. */
import { painAreas, hasModule } from '../profile.js';
import { dateKey, esc, num, signed, daysAgo } from '../utils.js';
import { weightSummary, glucoseSummary, painSummary, labsSummary, adherence, correlations, strengthWord } from '../analysis.js';
import { painDirection } from '../protocol.js';
import { streakInfo, ledger, rewardList, claimReward, badgeList, stampDays } from '../rewards.js';
import { POINTS } from '../config.js';
import { toast } from '../ui.js';
import { tile, bar, badge } from '../ui.js';

/* 이번 주 집중할 한두 개를 고른다 — 전부 다 하라고 하면 아무것도 안 한다 */
function focus(state) {
  const w = weightSummary(state);
  const g = glucoseSummary(state, 14);
  const p = painSummary(state, 7);
  const l = labsSummary(state);
  const out = [];

  const worst = Object.values(p.byArea).filter((x) => x && x.avg != null).sort((a, b) => b.avg - a.avg)[0];
  if (hasModule(state, 'pain') && worst && worst.avg >= 4) {
    out.push({
      tone: 'serious',
      title: `${worst.area.label} 통증 평균 ${num(worst.avg, 1)} — 이번 주 1순위`,
      body: '강도를 올리는 운동은 보류하세요. 앉는 시간 끊기와 수면 시간 확보가 통증 점수를 가장 빨리 내립니다. 2주 이상 4점 이상이면 진료를 한 번 받는 게 효율적입니다.',
    });
  }
  if (hasModule(state, 'glucose') && g.byCtx.fasting.avg != null && g.byCtx.fasting.avg > state.targets.glucoseFasting[1]) {
    out.push({
      tone: 'warning',
      title: `공복혈당 평균 ${num(g.byCtx.fasting.avg, 0)} — 목표 ${state.targets.glucoseFasting[1]} 초과`,
      body: '저녁 탄수화물 양과 취침 3시간 전 금식이 공복혈당에 가장 직접적입니다. 아침 공복만 한 주 더 매일 찍어보세요.',
    });
  }
  if (hasModule(state, 'glucose') && g.byCtx.post2.avg != null && g.byCtx.post2.avg > state.targets.glucosePost[1]) {
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
  if (hasModule(state, 'labs') && l.daysSince != null && l.daysSince > 90) {
    out.push({ tone: 'warning', title: `혈액검사 ${l.daysSince}일 경과`, body: 'LDL·중성지방·HbA1c 재확인 시점입니다. 식습관 변경 효과는 8~12주면 숫자로 나타납니다.' });
  }
  if (!out.length) {
    out.push({ tone: 'good', title: '목표 범위를 유지하고 있습니다', body: '지금 하는 것을 그대로 유지하세요. 바꿀 것을 찾지 말고, 기록 빈도만 지키면 됩니다.' });
  }
  return out.slice(0, 3);
}

function rewardSection(state) {
  const l = ledger(state);
  const s = streakInfo(state);
  const stamps = stampDays(state, 28);
  const rewards = rewardList(state);
  const badges = badgeList(state);
  const got = badges.filter((b) => b.earned).length;
  const claimed = [...(state.rewards?.claimed || [])].reverse().slice(0, 5);
  const next = rewards.filter((r) => r.cost > l.balance).sort((a, b) => a.cost - b.cost)[0];

  return `
    <div class="section-title">보상</div>

    <div class="card">
      <div class="card-head"><h2>내 포인트</h2>
        <span class="meta">연속 ${s.current}일 · 최고 ${s.best}일</span></div>
      <div class="points"><span class="pv">${l.balance}</span><span class="pl">p 사용 가능</span></div>
      <div style="font-size:12px;color:var(--ink-muted)">
        총 적립 ${esc(String(l.earned))}p (달성 ${esc(String(s.totalDays))}일 × ${POINTS.perDay}p + 연속 보너스 ${esc(String(l.bonus))}p) · 사용 ${esc(String(l.spent))}p
      </div>
      ${next ? `<div class="note" style="margin-top:10px">다음 보상 「${esc(next.title)}」까지 ${esc(String(next.cost - l.balance))}p — 미션 ${esc(String(Math.ceil((next.cost - l.balance) / POINTS.perDay)))}일치입니다.</div>` : ''}
      <div class="section-title" style="margin-top:14px">최근 4주 스탬프</div>
      <div class="stamps">${stamps.map((d) => `<i class="${d.done ? 'on' : ''}" title="${esc(d.key)}${d.done ? ' 달성' : ''}"></i>`).join('')}</div>
      <div style="font-size:11.5px;color:var(--ink-muted)">${esc(String(stamps.filter((d) => d.done).length))}/28일 달성</div>
    </div>

    <div class="card">
      <div class="card-head"><h2>보상 바꾸기</h2><span class="meta">설정에서 내 보상으로 바꿀 수 있습니다</span></div>
      ${rewards.map((r) => {
        const can = l.balance >= r.cost;
        return `<div class="reward">
          <span class="rt">${esc(r.title)}</span>
          <span class="rc">${esc(String(r.cost))}p</span>
          <button class="btn sm ${can ? 'primary' : ''}" data-claim="${esc(r.id)}" ${can ? '' : 'disabled style="opacity:.45"'}>
            ${can ? '바꾸기' : `${esc(String(r.cost - l.balance))}p 남음`}</button>
        </div>`;
      }).join('')}
      ${claimed.length ? `<div class="section-title">받은 보상</div>
        ${claimed.map((c) => `<div class="row"><span class="when">${esc(c.date)}</span>
          <span class="grow" style="color:var(--ink)">${esc(c.title)}</span>
          <span class="val">−${esc(String(c.cost))}p</span></div>`).join('')}` : ''}
      <div class="note" style="margin-top:10px">보상은 <strong>실제로 받아야</strong> 작동합니다. 포인트만 쌓고 넘어가면 다음 주부터 미션이 의미를 잃습니다.</div>
    </div>

    <div class="card">
      <div class="card-head"><h2>뱃지</h2><span class="meta">${got}/${badges.length}</span></div>
      <div class="badges">
        ${badges.map((b) => `<div class="bdg ${b.earned ? 'on' : ''}" title="${esc(b.desc)}">
          <div class="bl">${esc(b.label)}</div><div class="bd">${esc(b.desc)}</div></div>`).join('')}
      </div>
    </div>
  `;
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
      <div class="card">
        <div class="card-head"><h2>진료용 요약 1장</h2><span class="meta">인쇄 · PDF</span></div>
        <div style="font-size:13px;color:var(--ink-2)">최근 90일 기록을 의사에게 보여줄 수 있는 한 장으로 정리합니다.</div>
        <div class="btn-row" style="margin-top:10px"><a class="btn primary" href="#/summary">요약 보기</a></div>
      </div>

      <div class="section-title">이번 주 집중</div>
      ${items.map((it) => `<div class="card">
        <div class="card-head"><h2>${esc(it.title)}</h2>
          ${badge({ tone: it.tone, icon: it.tone === 'good' ? '✓' : '!', label: it.tone === 'good' ? '양호' : '조치' })}</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(it.body)}</div>
      </div>`).join('')}

      ${rewardSection(state)}

      <div class="section-title">최근 7일 요약</div>
      <div class="tiles">
        ${tile({ label: '체중 변화', value: w.sevenDayDelta != null ? signed(w.sevenDayDelta, 1) : '—', unit: 'kg', sub: `현재 ${num(w.trend, 1)}kg` })}
        ${hasModule(state, 'glucose') ? tile({ label: '혈당 측정', value: `${g.n}`, unit: '회', sub: g.tir != null ? `범위 내 ${num(g.tir, 0)}%` : '—' }) : ''}
        ${hasModule(state, 'pain') ? tile({ label: '통증 기록', value: `${p.n}`, unit: '회', sub: `무통증일 ${p.goodDays}일` }) : ''}
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

      ${hasModule(state, 'pain') ? `<div class="card">
        <div class="card-head"><h2>부위별 통증</h2><span class="meta">7일 평균</span></div>
        ${painAreas(state).map((a) => {
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
      </div>` : ''}

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
        ${hasModule(state, 'glucose') ? `<div class="row"><span class="grow">혈당</span><span class="val">${state.glucose.length}건</span></div>` : ''}
        ${hasModule(state, 'pain') ? `<div class="row"><span class="grow">통증</span><span class="val">${state.pain.length}건</span></div>` : ''}
        ${hasModule(state, 'labs') ? `<div class="row"><span class="grow">혈액검사</span><span class="val">${state.labs.length}건</span></div>` : ''}
        <div class="row"><span class="grow">루틴 기록일</span><span class="val">${Object.keys(state.days).length}일</span></div>
      </div>
    `;
  },
  mount(root, state, ctx) {
    root.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
      const r = rewardList(state).find((x) => x.id === b.dataset.claim);
      if (!r) return;
      if (!confirm(`「${r.title}」(으)로 ${r.cost}p를 바꿉니다.\n포인트는 차감되고, 보상은 실제로 받으세요. 계속할까요?`)) return;
      const res = claimReward(state, b.dataset.claim);
      toast(res.ok ? `${r.title} — 오늘 꼭 받으세요` : res.reason);
      ctx.rerender();
    }));
  },
};
