/* 통증 — 물어보고(기록), 판단하고(단계), 조절한다(처방). 이 앱의 핵심 화면. */
import { PAIN_TRIGGERS, RED_FLAGS, RADIATION, AVOID_LIST, PAIN_AREAS } from '../config.js';
import { painAreas, showHowTo } from '../profile.js';
import { getExercise, videoSearchUrl } from '../exercises.js';
import { poseSVG } from '../poses.js';
import { dateKey, timeKey, esc, num, relDay } from '../utils.js';
import { addEntry, removeEntry, toggleRoutine } from '../store.js';
import { buildPrescription, painSeries, painDirection } from '../protocol.js';
import { painSummary } from '../analysis.js';
import { chart, mountCharts } from '../chart.js';
import { tile, nrs, toast } from '../ui.js';

let rangeDays = 30;

/* 저림이 어디까지 내려오는가 — 통증 점수보다 정확한 지표다.
 * 손끝 쪽으로 내려가면 나빠지는 중, 올라오면 좋아지는 중. */
function radiationPicker(area, value) {
  const scale = RADIATION[area.radiates];
  if (!scale) return '';
  const v = Number(value) || 0;
  return `<div class="field" data-rad-for="${esc(area.id)}" style="margin:-4px 0 14px">
    <label>${esc(area.label)} 저림이 어디까지 <span class="unit">내려갈수록 나빠짐</span></label>
    <div class="chips">
      ${scale.map((lbl, i) => `<button type="button" class="chip" data-rad="${esc(area.id)}" data-rad-v="${i}"
        aria-pressed="${i === v}">${esc(lbl)}</button>`).join('')}
    </div></div>`;
}

/* 같은 부위의 저림 범위가 최근에 어느 쪽으로 움직였나 */
function radiationTrend(state, areaId) {
  const vals = state.pain
    .filter((r) => r.radiation && r.radiation[areaId] != null)
    .slice(-6)
    .map((r) => Number(r.radiation[areaId]));
  if (vals.length < 2) return null;
  const first = vals[0], last = vals[vals.length - 1];
  if (last > first) return { dir: 'worse', text: '더 내려왔습니다 — 그날 한 것을 줄이세요' };
  if (last < first) return { dir: 'better', text: '올라왔습니다 — 좋아지는 방향입니다' };
  return { dir: 'same', text: '그대로입니다' };
}

/* 운동을 더하기 전에 자극을 뺀다 */
function avoidBlock(areaIds) {
  const picked = areaIds.map((id) => [id, AVOID_LIST[id]]).filter(([, v]) => v && v.length);
  if (!picked.length) return '';
  return `<details class="rx-extra"><summary>하지 않을 것 ${picked.reduce((n, [, v]) => n + v.length, 0)}가지</summary>
    ${picked.map(([id, list]) => {
      const area = PAIN_AREAS.find((a) => a.id === id);
      return `<div class="section-title" style="margin-top:10px">${esc(area?.label || id)}</div>
        ${list.map((x) => `<div class="rx">
          <div class="rx-name">${esc(x.what)}</div>
          <div class="rx-why">${esc(x.why)}</div>
          <div class="rx-why"><strong>대신</strong> ${esc(x.how)}</div>
        </div>`).join('')}`;
    }).join('')}
  </details>`;
}

function buildCharts(state) {
  const series = painAreas(state).map((a, i) => ({
    id: a.id, label: a.label, slot: i, markers: true,
    points: painSeries(state, a.id, rangeDays),
  })).filter((s) => s.points.length);
  return [{
    title: '통증 추세',
    subtitle: `최근 ${rangeDays}일 · 0(없음)~10(최악) · 목표 ${state.targets.painMax} 이하`,
    height: 200,
    labelDigits: 0,
    tickDigits: 0,
    yDomain: [0, 10],
    yTicks: 5,
    tipTime: true,
    aria: '부위별 통증 점수 추세',
    bands: [{ from: 0, to: state.targets.painMax }],
    series,
  }];
}

/* 처방 한 줄. 설명 보기가 켜져 있고 사전에 있는 운동이면 눌러서 펼칠 수 있다. */
function rxItem(it, { how }) {
  const ex = it.id ? getExercise(it.id) : null;
  const name = ex ? ex.name : (it.name || '');
  const head = `<span class="rx-name">${esc(name)}</span>
    <span class="rx-dose">${esc(it.dose)}</span>`;
  const why = it.why ? `<div class="rx-why">${esc(it.why)}</div>` : '';

  if (!ex || !how) {
    return `<div class="rx"><div class="rx-top">${head}</div>${why}</div>`;
  }

  return `<details class="rx is-open-able">
    <summary><div class="rx-top">${head}<span class="rx-chev" aria-hidden="true">⌄</span></div>${why}</summary>
    <div class="rx-how">
      <div class="how-grid">
        <div class="how-pose">${poseSVG(ex.pose)}</div>
        <ol class="how-steps">${ex.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
      </div>
      <div class="how-note good"><strong>이 느낌이면 맞다</strong> ${esc(ex.feel)}</div>
      <div class="how-note warn"><strong>흔한 실수</strong> ${esc(ex.mistake)}</div>
      ${ex.note ? `<div class="how-note"><strong>헷갈리는 곳</strong> ${esc(ex.note)}</div>` : ''}
      <a class="btn sm ghost how-video" href="${esc(videoSearchUrl(it.id))}" target="_blank" rel="noopener noreferrer">영상으로 보기 ↗</a>
    </div>
  </details>`;
}

function prescriptionBlock(state) {
  const rx = buildPrescription(state);
  if (!rx.entry.ts) {
    return `<div class="card"><div class="empty">통증을 한 번 기록하면 그 점수에 맞춘 운동이 여기 뜹니다.</div></div>`;
  }
  const how = showHowTo(state);
  const day = state.days[dateKey()] || { done: [] };
  const shown = rx.perArea.filter((a) => a.core.length);
  const extras = rx.perArea.filter((a) => a.extra.length);
  const time = rx.coreMinutes + (rx.walkMinutes ? ` + 걷기 ${rx.walkMinutes}` : '');

  return `
    ${rx.hasRedFlag ? `<div class="card"><div class="note alert">
      <strong>⚠ 진료가 먼저입니다</strong><br/>
      체크한 항목: ${rx.redFlags.map((f) => esc(f.label)).join(' / ')}<br/>
      이건 자가 운동으로 다룰 범위가 아닙니다. 신경 압박이나 다른 원인을 먼저 배제해야 합니다.
      그 전까지는 통증을 키우는 동작을 모두 멈추세요.
    </div></div>` : ''}

    <div class="card">
      <div class="card-head"><h2>오늘의 처방</h2>
        <span class="meta">${esc(relDay(rx.entry.ts))} ${esc(String(rx.entry.ts).slice(11, 16))} 기준</span></div>
      <div class="rx-summary">
        <span class="rx-count">${esc(String(rx.coreCount))}가지</span>
        <span class="rx-time">약 ${esc(String(time))}분</span>
        ${how ? '<span class="rx-hint">운동 이름을 누르면 하는 법이 펼쳐집니다</span>' : ''}
      </div>
      <div class="note ${rx.tier.tone === 'good' ? '' : 'warn'}">
        <strong>${esc(rx.tier.label)}</strong> — ${esc(rx.tier.intent)}</div>

      ${shown.map((a) => `
        <div class="section-title">${esc(a.area.label)} · ${esc(String(a.score))}/10 · ${esc(a.tier.label)}
          ${a.adjusted ? ' · <span style="color:var(--serious)">악화 추세라 강도를 낮췄습니다</span>' : ''}</div>
        ${a.core.map((it) => rxItem(it, { how })).join('')}
      `).join('')}

      ${extras.length ? `<details class="rx-extra">
        <summary>여유 있으면 더 (${esc(String(rx.extraCount))}가지)</summary>
        ${extras.map((a) => `
          <div class="section-title">${esc(a.area.label)}</div>
          ${a.extra.map((it) => rxItem(it, { how })).join('')}
        `).join('')}
      </details>` : ''}

      ${shown.map((a) => {
        const t = radiationTrend(state, a.area.id);
        if (!t) return '';
        const tone = t.dir === 'worse' ? 'alert' : t.dir === 'better' ? '' : 'warn';
        return `<div class="note ${tone}" style="margin-top:10px">
          <strong>${esc(a.area.label)} 저림 범위</strong> — ${esc(t.text)}
          <br/><span class="rx-why">아픈 정도보다 이 범위가 정확한 지표입니다.</span></div>`;
      }).join('')}

      ${avoidBlock(shown.map((a) => a.area.id))}

      ${rx.cautions.length ? `<div class="section-title">오늘 피할 것 · 바꿀 것</div>
        ${rx.cautions.map((c) => `<div class="row"><span class="grow" style="white-space:normal;color:var(--ink)">${esc(c)}</span></div>`).join('')}` : ''}

      <div class="section-title">지금 1분 (앉아 있다가 바로)</div>
      <div class="chips">${rx.micro.map((m) => `<span class="chip" aria-pressed="false">${esc(m)}</span>`).join('')}</div>

      <label class="check is-task" style="margin-top:12px;border-top:1px solid var(--border)">
        <input type="checkbox" data-routine="r-rx" ${day.done?.includes('r-rx') ? 'checked' : ''} />
        <span class="ct"><span class="cl">오늘 처방 운동 완료</span></span>
      </label>
    </div>`;
}

export default {
  title: '통증',
  render(state) {
    const p = painSummary(state, 7);
    const cfgs = buildCharts(state);
    const recent = [...state.pain].reverse().slice(0, 12);
    const now = new Date();
    const areas = painAreas(state);
    const last = state.pain[state.pain.length - 1];

    return `
      <div class="tiles">
        ${painAreas(state).slice(0, 2).map((a) => {
          const s = p.byArea[a.id];
          const dir = painDirection(state, a.id);
          return tile({
            label: `${a.label} 7일 평균`,
            value: s.avg != null ? num(s.avg, 1) : '—',
            unit: '/10',
            sub: s.n ? `최고 ${num(s.max, 0)} · ${dir.dir === 'worse' ? '악화' : dir.dir === 'better' ? '호전' : '유지'}` : '기록 없음',
          });
        }).join('')}
        ${tile({ label: '무통증일', value: `${p.goodDays}`, unit: `/${p.days}일`, sub: `목표 ${state.targets.painMax} 이하 유지` })}
        ${tile({ label: '기록 횟수', value: `${p.n}`, unit: '회', sub: '최근 7일' })}
      </div>

      ${prescriptionBlock(state)}

      <div class="card" id="pain-form">
        <div class="card-head"><h2>지금 상태 기록</h2><span class="meta">30초</span></div>
        <form data-pain-form>
          ${areas.map((a) => nrs(a.id, a.label, last?.scores?.[a.id] ?? 0)
              + radiationPicker(a, last?.radiation?.[a.id] ?? 0)).join('')}
          <p class="empty" style="padding:4px 0 0">다른 부위를 추가하려면 설정 → 내 몸 설정에서 바꾸세요.</p>

          <div class="field" style="margin-top:14px"><label>무엇 때문에 아픈 것 같나 (복수 선택)</label>
            <div class="chips" data-triggers>
              ${PAIN_TRIGGERS.map((t) => `<button type="button" class="chip" data-trigger="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}
            </div></div>

          <div class="grid2" style="margin-top:12px">
            <div class="field"><label for="p-sleep">수면 <span class="unit">시간</span></label>
              <input id="p-sleep" name="sleepH" type="number" step="0.5" min="0" max="14" inputmode="decimal" value="${last?.sleepH ?? ''}" /></div>
            <div class="field"><label for="p-sit">앉은 시간 <span class="unit">시간</span></label>
              <input id="p-sit" name="sittingH" type="number" step="0.5" min="0" max="20" inputmode="decimal" value="${last?.sittingH ?? ''}" /></div>
            <div class="field"><label for="p-stress">스트레스 <span class="unit">0-10</span></label>
              <input id="p-stress" name="stress" type="number" step="1" min="0" max="10" inputmode="numeric" value="${last?.stress ?? ''}" /></div>
            <div class="field"><label for="p-sq">수면의 질 <span class="unit">0-10</span></label>
              <input id="p-sq" name="sleepQ" type="number" step="1" min="0" max="10" inputmode="numeric" value="${last?.sleepQ ?? ''}" /></div>
          </div>

          <div class="field"><label>아래 중 하나라도 있나? (있으면 운동 대신 진료)</label>
            ${RED_FLAGS.map((f) => `<label class="check">
              <input type="checkbox" data-flag="${esc(f.id)}" />
              <span class="ct"><span class="cl">${esc(f.label)}</span></span></label>`).join('')}
          </div>

          <div class="grid2">
            <div class="field"><label for="p-date">날짜</label>
              <input id="p-date" name="date" type="date" value="${dateKey(now)}" max="${dateKey(now)}" required /></div>
            <div class="field"><label for="p-time">시각</label>
              <input id="p-time" name="time" type="time" value="${timeKey(now)}" required /></div>
          </div>
          <div class="field"><label for="p-note">메모</label>
            <input id="p-note" name="note" type="text" maxlength="160" placeholder="예: 오전 회의 2시간 앉아 있고 나서 뻣뻣함" /></div>
          <button class="btn primary full" type="submit">기록하고 처방 받기</button>
        </form>
      </div>

      <div class="card flush">
        <div class="card-head"><h2>추세</h2>
          <span class="meta"><span class="seg" data-range>
            ${[14, 30, 90].map((d) => `<button type="button" data-days="${d}" aria-pressed="${d === rangeDays}">${d}일</button>`).join('')}
          </span></span>
        </div>
        ${cfgs.map((c) => chart(c)).join('')}
      </div>

      <div class="card">
        <div class="card-head"><h2>기록 이력</h2><span class="meta">${state.pain.length}건</span></div>
        ${recent.length ? recent.map((r) => `<div class="row">
          <span class="when">${esc(relDay(r.ts))} ${esc(String(r.ts).slice(11, 16))}</span>
          <span class="val">${painAreas(state).filter((a) => r.scores?.[a.id] != null).map((a) => `${esc(a.label)} ${esc(String(r.scores[a.id]))}`).join(' / ')}</span>
          <span class="grow">${esc((r.triggers || []).join(', ') || r.note || '')}</span>
          <button class="del" data-del="${esc(r.id)}" aria-label="삭제">✕</button>
        </div>`).join('') : '<div class="empty">기록이 없습니다.</div>'}
      </div>

      <div class="note">통증 점수는 "지금 이 순간"을 적는 숫자입니다. 아침·저녁 두 번만 꾸준히 적으면
      어떤 행동이 목과 허리를 건드리는지 2주 안에 눈에 보입니다. 통증이 3 이상으로 3일 넘게 유지되거나
      5 이상으로 올라가면 운동 강도를 올리지 말고 원인(자세·앉은 시간·수면)을 먼저 바꾸세요.</div>
    `;
  },

  mount(root, state, ctx) {
    mountCharts(root, buildCharts(state));

    root.querySelectorAll('[data-nrs] input[type="range"]').forEach((r) => {
      const areaId = r.closest('[data-nrs]').dataset.nrs;
      const out = root.querySelector(`[data-score-for="${areaId}"]`);
      r.addEventListener('input', () => { out.textContent = r.value; });
    });

    root.querySelectorAll('[data-trigger]').forEach((c) => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));

    root.querySelectorAll('[data-rad]').forEach((c) => c.addEventListener('click', () => {
      const box = c.closest('[data-rad-for]');
      box.querySelectorAll('[data-rad]').forEach((o) => o.setAttribute('aria-pressed', String(o === c)));
    }));

    root.querySelectorAll('.chips .chip:not([data-trigger]):not([data-rad])').forEach((c) => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));

    root.querySelectorAll('[data-routine]').forEach((cb) => cb.addEventListener('change', () => {
      toggleRoutine(dateKey(), cb.dataset.routine);
      toast('기록했습니다');
    }));

    root.querySelector('[data-range]')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      rangeDays = Number(b.dataset.days);
      ctx.rerender();
    });

    root.querySelector('[data-pain-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const f = new FormData(form);
      const scores = {};
      form.querySelectorAll('[data-nrs]').forEach((n) => {
        scores[n.dataset.nrs] = Number(n.querySelector('input[type="range"]').value);
      });
      const radiation = {};
      form.querySelectorAll('[data-rad][aria-pressed="true"]').forEach((b) => {
        radiation[b.dataset.rad] = Number(b.dataset.radV);
      });
      const triggers = [...form.querySelectorAll('[data-trigger][aria-pressed="true"]')].map((b) => b.dataset.trigger);
      const redFlags = [...form.querySelectorAll('[data-flag]')].filter((b) => b.checked).map((b) => b.dataset.flag);
      const entry = { ts: `${f.get('date')}T${f.get('time')}`, scores, radiation, triggers, redFlags };
      ['sleepH', 'sittingH', 'stress', 'sleepQ'].forEach((k) => { if (f.get(k) !== '') entry[k] = Number(f.get(k)); });
      if (f.get('note')) entry.note = f.get('note');
      addEntry('pain', entry);
      toast(redFlags.length ? '기록했습니다 — 적색신호 확인 필요' : '기록했습니다. 처방을 갱신했습니다');
      ctx.rerender('top');
    });

    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 기록을 삭제할까요?')) return;
      removeEntry('pain', b.dataset.del);
      ctx.rerender();
    }));
  },
};
