/* 혈당 — 맥락(공복/식후/임의)별로 따로 본다. 섞으면 아무 의미가 없다. */
import { GLUCOSE_CONTEXTS } from '../config.js';
import { dateKey, timeKey, esc, num, parseISO, daysAgo, relDay, judge } from '../utils.js';
import { addEntry, removeEntry } from '../store.js';
import { glucoseSummary } from '../analysis.js';
import { chart, mountCharts } from '../chart.js';
import { tile, badge, bar, toast } from '../ui.js';

let rangeDays = 14;

function buildCharts(state) {
  const from = daysAgo(rangeDays).getTime();
  const rows = state.glucose.filter((g) => (parseISO(g.ts)?.getTime() ?? 0) >= from);
  const series = GLUCOSE_CONTEXTS.map((c, i) => ({
    id: c.id,
    label: c.label,
    slot: i,
    shape: c.shape,
    type: 'dots',
    points: rows.filter((r) => r.context === c.id).map((r) => ({ x: parseISO(r.ts), y: Number(r.value), label: c.label })),
  }));
  const [lo, hi] = state.targets.glucoseFasting;
  return [{
    title: '혈당 기록',
    subtitle: `최근 ${rangeDays}일 · 띠는 공복 목표 ${lo}–${hi} mg/dL`,
    height: 220,
    unit: ' mg/dL',
    labelDigits: 0,
    tickDigits: 0,
    tipTime: true,
    tipWindowMs: 5400000,
    endLabels: false,
    aria: '측정 시점별 혈당 산점도',
    bands: [{ from: lo, to: hi }],
    refLines: [{ y: state.targets.glucosePost[1], label: `식후 상한 ${state.targets.glucosePost[1]}` }],
    series,
  }];
}

export default {
  title: '혈당',
  render(state) {
    const g = glucoseSummary(state, rangeDays);
    const cfgs = buildCharts(state);
    const recent = [...state.glucose].reverse().slice(0, 25);
    const now = new Date();

    return `
      <div class="tiles">
        ${GLUCOSE_CONTEXTS.map((c) => {
          const s = g.byCtx[c.id];
          return tile({
            label: `${c.label} 평균`,
            value: s.avg != null ? num(s.avg, 0) : '—',
            unit: 'mg/dL',
            sub: s.n ? `${s.n}회 · 범위 내 ${num(s.tir, 0)}%` : '기록 없음',
          });
        }).join('')}
        ${tile({ label: '추정 HbA1c', value: g.estA1c != null ? num(g.estA1c, 1) : '—', unit: '%', sub: `목표 ${num(state.targets.hba1c, 1)}% 이하` })}
      </div>

      <div class="card">
        <div class="card-head"><h2>목표 범위 내 비율</h2><span class="meta">${g.n}회 측정</span></div>
        ${bar(g.tir ?? 0, { good: (g.tir ?? 0) >= 80 })}
        <div style="font-size:12.5px;color:var(--ink-2)">
          ${g.tir != null ? `최근 ${rangeDays}일 측정 중 ${esc(num(g.tir, 0))}%가 목표 범위 안에 있습니다. 80% 이상을 목표로 하세요.` : '기록이 쌓이면 계산됩니다.'}
        </div>
        ${GLUCOSE_CONTEXTS.map((c) => {
          const s = g.byCtx[c.id];
          if (!s.n) return '';
          const j = judge(s.avg, ['range', s.range]);
          return `<div class="row"><span class="grow">${esc(c.label)} 평균 ${esc(num(s.avg, 0))} (최고 ${esc(num(s.max, 0))})</span>${badge(j)}</div>`;
        }).join('')}
      </div>

      <div class="card flush">
        <div class="card-head"><h2>분포</h2>
          <span class="meta"><span class="seg" data-range>
            ${[7, 14, 30, 90].map((d) => `<button type="button" data-days="${d}" aria-pressed="${d === rangeDays}">${d}일</button>`).join('')}
          </span></span>
        </div>
        ${cfgs.map((c) => chart(c)).join('')}
      </div>

      <div class="card">
        <div class="card-head"><h2>기록 추가</h2></div>
        <form data-glu-form>
          <div class="grid2">
            <div class="field"><label for="g-val">혈당 <span class="unit">mg/dL</span></label>
              <input id="g-val" name="value" type="number" step="1" min="20" max="600" inputmode="numeric" required autofocus /></div>
            <div class="field"><label for="g-time">시각</label>
              <input id="g-time" name="time" type="time" value="${timeKey(now)}" required /></div>
          </div>
          <div class="field"><label for="g-date">날짜</label>
            <input id="g-date" name="date" type="date" value="${dateKey(now)}" max="${dateKey(now)}" required /></div>
          <div class="field"><label>측정 시점</label>
            <div class="chips" data-ctx-group>
              ${GLUCOSE_CONTEXTS.map((c, i) => `<button type="button" class="chip ctx" data-ctx="${esc(c.id)}" aria-pressed="${i === 0}">${esc(c.label)}</button>`).join('')}
            </div></div>
          <div class="field"><label for="g-meal">무엇을 먹었나 (식후일 때)</label>
            <input id="g-meal" name="meal" type="text" maxlength="120" placeholder="예: 흰쌀밥 1공기 + 제육" /></div>
          <button class="btn primary full" type="submit">저장</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>최근 기록</h2><span class="meta">${state.glucose.length}건</span></div>
        ${recent.length ? recent.map((r) => {
          const c = GLUCOSE_CONTEXTS.find((x) => x.id === r.context) || GLUCOSE_CONTEXTS[0];
          const j = judge(r.value, ['range', state.targets[c.target]]);
          return `<div class="row">
            <span class="when">${esc(relDay(r.ts))} ${esc(String(r.ts).slice(11, 16))}</span>
            <span class="val">${esc(num(r.value, 0))}</span>
            ${badge(j)}
            <span class="grow">${esc(c.short)}${r.meal ? ` · ${esc(r.meal)}` : ''}</span>
            <button class="del" data-del="${esc(r.id)}" aria-label="삭제">✕</button>
          </div>`;
        }).join('') : '<div class="empty">기록이 없습니다.</div>'}
      </div>

      <div class="note">식후 혈당은 <strong>첫 숟갈부터 2시간</strong>에 재야 비교가 됩니다. 같은 음식이라도 채소·단백질을 먼저 먹고 탄수화물을 나중에 먹으면 정점이 내려갑니다. 식후 10분 걷기도 같은 효과입니다.</div>
    `;
  },

  mount(root, state, ctx) {
    mountCharts(root, buildCharts(state));

    root.querySelector('[data-range]')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      rangeDays = Number(b.dataset.days);
      ctx.rerender();
    });

    const group = root.querySelector('[data-ctx-group]');
    group?.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      group.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true');
    }));

    root.querySelector('[data-glu-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const context = group?.querySelector('.chip[aria-pressed="true"]')?.dataset.ctx || 'fasting';
      addEntry('glucose', {
        ts: `${f.get('date')}T${f.get('time')}`,
        value: Number(f.get('value')),
        context,
        meal: f.get('meal') || undefined,
      });
      toast('혈당을 저장했습니다');
      ctx.rerender();
    });

    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 기록을 삭제할까요?')) return;
      removeEntry('glucose', b.dataset.del);
      ctx.rerender();
    }));
  },
};
