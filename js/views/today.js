/* 홈 — "지금 뭘 해야 하는지"만 보여주는 화면 */
import { ROUTINE } from '../config.js';
import { hasModule, painAreas } from '../profile.js';
import { dateKey, esc, num, signed, relDay, fmtDateTime } from '../utils.js';
import { toggleRoutine, setDay, upsertWeight, addEntry } from '../store.js';
import { pending, skipToday, currentSlot, gapDays } from '../checkin.js';
import { missionState, streakInfo, ledger, shouldCelebrate, markCelebrated } from '../rewards.js';
import { POINTS } from '../config.js';
import { buildPrescription } from '../protocol.js';
import { weightSummary, glucoseSummary, painSummary, adherence, labsSummary } from '../analysis.js';
import { tile, bar, toast, installBlock } from '../ui.js';
import * as install from '../install.js';

function ring(pct) {
  const r = 24; const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="ring"><svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
      <circle class="ring-bg" cx="29" cy="29" r="${r}"></circle>
      <circle class="ring-fg" cx="29" cy="29" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
    </svg><span class="ring-t">${Math.round(pct * 100)}%</span></div>`;
}

function installBanner() {
  if (!install.shouldOffer() || install.dismissed()) return '';
  return `<div class="card install-banner" data-install-banner>
    <div class="ib-head">
      <img class="ib-icon" src="./assets/icons/icon-192.png" alt="" />
      <div class="ib-text">
        <div class="ib-title">홈 화면에 앱으로 두기</div>
        <div class="ib-sub">주소창 없이 전체 화면으로 열리고, 오프라인에서도 기록할 수 있습니다.</div>
      </div>
      <button class="btn sm ghost" data-install-dismiss aria-label="설치 안내 닫기">닫기</button>
    </div>
    ${installBlock(install)}
  </div>`;
}

function missionCard(state) {
  const ms = missionState(state);
  const doneN = ms.filter((m) => m.done).length;
  const s = streakInfo(state);
  const l = ledger(state);
  const all = doneN === ms.length;
  const toBonus = s.current > 0 ? POINTS.bonusEvery - (s.current % POINTS.bonusEvery) : POINTS.bonusEvery;

  return `<div class="card mission" data-mission>
    <div class="mission-top">
      ${ring(doneN / ms.length)}
      <div class="mission-lead">
        <div class="ml-1">${all ? '오늘 미션 완료' : `오늘 미션 ${doneN}/${ms.length}`}</div>
        <div class="ml-2">${all
          ? `+${POINTS.perDay}p 적립 · 잔액 ${l.balance}p`
          : `3개만 채우면 오늘은 성공 · 잔액 ${l.balance}p`}</div>
      </div>
      <div class="streak">
        <div class="sn">${s.current}</div>
        <div class="sl">연속일</div>
      </div>
    </div>
    ${ms.map((m) => `<button type="button" class="mi ${m.done ? 'done' : ''}" data-mission-go="${esc(m.route)}">
      <span class="mk">✓</span>
      <span class="mt"><span class="ml">${esc(m.label)}</span><span class="mh"> ${esc(m.hint)}</span></span>
      <span class="md">${esc(m.detail)}</span>
    </button>`).join('')}
    <div class="note" style="margin-top:10px">
      ${all
        ? (s.current >= POINTS.bonusEvery && s.current % POINTS.bonusEvery === 0
            ? `연속 ${s.current}일 — 보너스 ${POINTS.streakBonus}p가 더 들어왔습니다. 리포트에서 보상을 바꿔 가세요.`
            : `연속 ${toBonus}일만 더 채우면 보너스 ${POINTS.streakBonus}p가 붙습니다.`)
        : '포인트는 체중이 아니라 <strong>기록과 루틴</strong>에서만 쌓입니다. 숫자가 안 좋은 날도 기록만 하면 성공입니다.'}
    </div>
  </div>`;
}

function checkinCard(state) {
  const items = pending(state);
  const slot = currentSlot();
  if (!items.length) {
    return `<div class="card checkin">
      <div class="card-head"><h2>${esc(slot.label)} 체크인</h2><span class="meta">완료</span></div>
      <div class="note">이 시간대에 물어볼 게 없습니다. 기록이 다 차 있습니다.</div>
    </div>`;
  }
  return `<div class="card checkin">
    <div class="card-head"><h2>${esc(slot.label)} 체크인</h2><span class="meta">${items.length}개</span></div>
    ${items.map((it) => `<div class="ci-item">
      <div class="ci-text">
        <div class="ci-title">${esc(it.title)}</div>
        <div class="ci-hint">${esc(it.hint)}</div>
      </div>
      <a class="btn sm primary" href="${esc(it.route)}">기록</a>
      <button class="btn sm ghost" data-skip="${esc(it.id)}" aria-label="오늘은 건너뛰기">나중</button>
    </div>`).join('')}
  </div>`;
}

function painCard(state) {
  if (!hasModule(state, 'pain')) return '';
  const rx = buildPrescription(state);
  const last = rx.entry;
  if (!last.ts) {
    return `<div class="card">
      <div class="card-head"><h2>통증 상태</h2></div>
      <div class="empty">아직 기록이 없습니다. 목·허리 상태를 한 번 입력하면 그에 맞는 운동이 바로 뜹니다.</div>
      <a class="btn primary full" href="#/pain">지금 통증 기록하기</a>
    </div>`;
  }
  const top = rx.perArea.slice(0, 2);
  return `<div class="card">
    <div class="card-head"><h2>통증 상태</h2>
      <span class="meta">${esc(relDay(last.ts))} ${esc(String(last.ts).slice(11, 16))}</span></div>
    ${rx.hasRedFlag ? `<div class="note alert"><strong>⚠ 적색신호 체크됨</strong> — ${rx.redFlags.map((f) => esc(f.label)).join(', ')}.
      운동으로 해결할 단계가 아닙니다. 진료를 먼저 보세요.</div>` : ''}
    <div class="tiles" style="margin-top:8px">
      ${top.map((a) => tile({
        label: a.area.label,
        value: a.score,
        unit: '/10',
        sub: a.dir.dir === 'worse' ? '악화 추세' : a.dir.dir === 'better' ? '호전 추세' : '유지',
      })).join('')}
    </div>
    <div class="note ${rx.tier.tone === 'good' ? '' : 'warn'}">
      <strong>${esc(rx.tier.label)}</strong> — ${esc(rx.tier.intent)}</div>
    <div class="btn-row" style="margin-top:10px">
      <a class="btn primary" href="#/pain">오늘 처방 보기</a>
      <a class="btn" href="#/pain?new=1">다시 측정</a>
    </div>
  </div>`;
}

function quickCard(state) {
  const today = dateKey();
  const day = state.days[today] || {};
  return `<div class="card">
    <div class="card-head"><h2>빠른 입력</h2><span class="meta">오늘</span></div>
    <form data-quick>
      <div class="${hasModule(state, 'glucose') ? 'grid3' : 'grid2'}">
        <div class="field"><label for="q-kg">체중 <span class="unit">kg</span></label>
          <input id="q-kg" name="kg" type="number" step="0.1" min="30" max="200" inputmode="decimal" placeholder="—" /></div>
        ${hasModule(state, 'glucose') ? `<div class="field"><label for="q-glu">혈당 <span class="unit">mg/dL</span></label>
          <input id="q-glu" name="glu" type="number" step="1" min="30" max="500" inputmode="numeric" placeholder="—" /></div>` : ''}
        <div class="field"><label for="q-steps">걸음</label>
          <input id="q-steps" name="steps" type="number" step="100" min="0" max="100000" inputmode="numeric" value="${day.steps || ''}" placeholder="—" /></div>
      </div>
      ${hasModule(state, 'glucose') ? `<div class="field"><label>혈당 측정 시점</label>
        <div class="chips" data-ctx-group>
          <button type="button" class="chip ctx" data-ctx="fasting" aria-pressed="true">공복</button>
          <button type="button" class="chip ctx" data-ctx="post2" aria-pressed="false">식후 2시간</button>
          <button type="button" class="chip ctx" data-ctx="random" aria-pressed="false">임의/취침전</button>
        </div>
      </div>` : ''}
      <div class="grid2">
        <div class="field"><label for="q-water">물 <span class="unit">ml</span></label>
          <input id="q-water" name="water" type="number" step="100" min="0" max="6000" inputmode="numeric" value="${day.waterMl || ''}" placeholder="—" /></div>
        <div class="field"><label for="q-protein">단백질 <span class="unit">g</span></label>
          <input id="q-protein" name="protein" type="number" step="5" min="0" max="400" inputmode="numeric" value="${day.proteinG || ''}" placeholder="—" /></div>
      </div>
      <button class="btn primary full" type="submit">저장</button>
    </form>
  </div>`;
}

function routineCard(state) {
  const today = dateKey();
  const day = state.days[today] || { done: [] };
  const done = day.done || [];
  const pct = (done.length / ROUTINE.length) * 100;
  return `<div class="card">
    <div class="card-head"><h2>오늘 루틴</h2><span class="meta">${done.length}/${ROUTINE.length}</span></div>
    ${bar(pct, { good: pct >= 80 })}
    ${ROUTINE.map((r) => `<label class="check">
      <input type="checkbox" data-routine="${esc(r.id)}" ${done.includes(r.id) ? 'checked' : ''} />
      <span class="ct"><span class="cl">${esc(r.label)}</span></span>
      <span class="tag">${esc(r.tag)}</span>
    </label>`).join('')}
  </div>`;
}

export default {
  title: '홈',
  render(state) {
    const w = weightSummary(state);
    const g = glucoseSummary(state);
    const p = painSummary(state);
    const l = labsSummary(state);
    const gaps = gapDays(state);
    const worstPain = painAreas(state).map((a) => p.byArea[a.id]).filter((x) => x && x.avg != null).sort((a, b) => b.avg - a.avg)[0];

    return `
      ${installBanner()}
      ${missionCard(state)}
      ${gaps >= 3 ? `<div class="card"><div class="note warn">최근 7일 중 ${gaps}일은 기록이 없습니다. 추세를 보려면 체중·통증 두 개만이라도 매일 남기는 게 좋습니다.</div></div>` : ''}
      ${checkinCard(state)}

      <div class="tiles">
        ${tile({
          label: '현재 체중 (7일 평균)',
          value: w.trend != null ? num(w.trend, 1) : '—',
          unit: 'kg',
          delta: w.sevenDayDelta,
          sub: w.toGo != null ? (w.toGo > 0 ? `목표까지 ${num(w.toGo, 1)}kg` : '목표 도달') : '기록 필요',
          hero: true,
        })}
        ${hasModule(state, 'glucose') ? tile({
          label: `공복혈당 (${g.days}일 평균)`,
          value: g.byCtx.fasting.avg != null ? num(g.byCtx.fasting.avg, 0) : '—',
          unit: 'mg/dL',
          sub: g.byCtx.fasting.tir != null ? `범위 내 ${num(g.byCtx.fasting.tir, 0)}%` : '기록 필요',
        }) : ''}
        ${hasModule(state, 'labs') ? tile({
          label: 'LDL 콜레스테롤',
          value: l.latest?.ldl != null ? num(l.latest.ldl, 0) : '—',
          unit: 'mg/dL',
          sub: l.daysSince != null ? `${l.daysSince}일 전 검사` : '검사 기록 없음',
        }) : ''}
        ${hasModule(state, 'pain') ? tile({
          label: worstPain ? `${worstPain.area.label} 통증 (7일 평균)` : '통증 (7일 평균)',
          value: worstPain?.avg != null ? num(worstPain.avg, 1) : '—',
          unit: '/10',
          sub: `무통증일 ${p.goodDays}/${p.days}일`,
        }) : ''}
      </div>

      <div class="card">
        <div class="card-head"><h2>목표 ${esc(num(w.target, 0))}kg 진행률</h2>
          <span class="meta">${w.progress != null ? `${num(w.progress, 0)}%` : '시작 체중 입력 필요'}</span></div>
        ${bar(w.progress ?? 0, { good: (w.progress ?? 0) >= 100 })}
        <div class="sub" style="font-size:12.5px;color:var(--ink-2)">
          ${w.start != null ? `시작 ${esc(num(w.start, 1))}kg → 현재 ${esc(num(w.trend, 1))}kg → 목표 ${esc(num(w.target, 0))}kg` : '체중을 기록하면 진행률이 계산됩니다.'}
          ${w.perWeek != null ? ` · 최근 추세 주당 ${esc(signed(w.perWeek, 2))}kg` : ''}
          ${w.weeksLeft != null ? ` · 이 속도면 약 ${esc(num(w.weeksLeft, 0))}주 후 도달` : ''}
        </div>
        ${w.perWeek != null && w.perWeek < -(state.targets.weightPaceKgPerWeek + 0.3)
          ? `<div class="note warn" style="margin-top:8px">감량 속도가 주당 ${esc(num(-w.perWeek, 2))}kg입니다. 목표 상한(${esc(num(state.targets.weightPaceKgPerWeek, 1))}kg)보다 빠릅니다 — 근손실·탈모·담석 위험이 올라가니 단백질과 수면을 먼저 확보하세요.</div>` : ''}
      </div>

      ${painCard(state)}
      ${quickCard(state)}
      ${routineCard(state)}

      <div class="section-title">전체 관리</div>
      <div class="card" style="padding:4px 14px">
        <div class="row"><a class="grow" href="#/weight" style="color:var(--ink)">체중 · 체성분 · 허리둘레</a><span class="when">${state.weight.length}건</span></div>
        ${hasModule(state, 'glucose') ? `<div class="row"><a class="grow" href="#/glucose" style="color:var(--ink)">혈당</a><span class="when">${state.glucose.length}건</span></div>` : ''}
        ${hasModule(state, 'pain') ? `<div class="row"><a class="grow" href="#/pain" style="color:var(--ink)">통증 · 처방 운동</a><span class="when">${state.pain.length}건</span></div>` : ''}
        ${hasModule(state, 'labs') ? `<div class="row"><a class="grow" href="#/labs" style="color:var(--ink)">혈액검사 · 혈압</a><span class="when">${state.labs.length}건</span></div>` : ''}
        <div class="row"><a class="grow" href="#/report" style="color:var(--ink)">주간 리포트 · 내 몸 패턴</a><span class="when">${num(adherence(state), 0)}% 이행</span></div>
        <div class="row"><a class="grow" href="#/settings" style="color:var(--ink)">목표치 · 백업</a><span class="when">설정</span></div>
      </div>
      ${hasModule(state, 'glucose') && g.latest ? `<p class="empty">마지막 혈당 기록: ${esc(fmtDateTime(g.latest.ts))} · ${esc(num(g.latest.value, 0))}mg/dL</p>` : ''}
    `;
  },

  mount(root, state, ctx) {
    root.querySelector('[data-install]')?.addEventListener('click', async () => {
      const r = await install.promptInstall();
      if (r.ok) toast('설치했습니다. 홈 화면에서 열어 보세요');
    });
    root.querySelector('[data-install-dismiss]')?.addEventListener('click', () => {
      install.dismiss();
      ctx.rerender();
    });

    root.querySelectorAll('[data-mission-go]').forEach((b) => b.addEventListener('click', () => {
      location.hash = b.dataset.missionGo;
    }));

    if (shouldCelebrate(state)) {
      const card = root.querySelector('[data-mission]');
      card?.classList.add('celebrate');
      toast(`오늘 미션 완료! +${POINTS.perDay}p`);
      markCelebrated(state);
    }

    root.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => {
      skipToday(state, b.dataset.skip);
      ctx.rerender();
    }));

    root.querySelectorAll('[data-routine]').forEach((cb) => cb.addEventListener('change', () => {
      toggleRoutine(dateKey(), cb.dataset.routine);
      toast('기록했습니다');
    }));

    const ctxGroup = root.querySelector('[data-ctx-group]');
    ctxGroup?.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      ctxGroup.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true');
    }));

    root.querySelector('[data-quick]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const today = dateKey();
      let saved = 0;
      const kg = f.get('kg');
      if (kg) { upsertWeight({ date: today, kg: Number(kg) }); saved += 1; }
      const glu = f.get('glu');
      if (glu) {
        const sel = ctxGroup?.querySelector('.chip[aria-pressed="true"]')?.dataset.ctx || 'fasting';
        const now = new Date();
        addEntry('glucose', { ts: `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, value: Number(glu), context: sel });
        saved += 1;
      }
      const patch = {};
      if (f.get('steps') !== '') patch.steps = Number(f.get('steps'));
      if (f.get('water') !== '') patch.waterMl = Number(f.get('water'));
      if (f.get('protein') !== '') patch.proteinG = Number(f.get('protein'));
      if (Object.keys(patch).length) { setDay(today, patch); saved += 1; }
      if (!saved) { toast('입력된 값이 없습니다'); return; }
      toast('저장했습니다');
      ctx.rerender();
    });
  },
};
