/* 체중 · 체성분 · 허리둘레 */
import { dateKey, esc, num, signed, fmtDate, parseISO, movingAverage, daysAgo } from '../utils.js';
import { removeEntry, upsertWeight } from '../store.js';
import { weightSummary, weightPoints } from '../analysis.js';
import { chart, mountCharts } from '../chart.js';
import { tile, bar, toast } from '../ui.js';

let rangeDays = 90;

function buildCharts(state) {
  const pts = weightPoints(state, rangeDays);
  const ma = movingAverage(pts, 7).filter((p) => p.y != null);
  const waist = state.weight
    .filter((w) => w.waist != null && (parseISO(w.date)?.getTime() ?? 0) >= daysAgo(rangeDays).getTime())
    .map((w) => ({ x: parseISO(w.date), y: Number(w.waist) }));

  const cfgs = [{
    title: '체중 추세',
    subtitle: `최근 ${rangeDays}일 · 점선은 목표 ${num(state.targets.weightKg, 0)}kg`,
    height: 212,
    unit: 'kg',
    labelDigits: 1,
    tickDigits: 1,
    aria: '체중 일별 기록과 7일 이동평균 추세선',
    refLines: [{ y: state.targets.weightKg, label: `목표 ${num(state.targets.weightKg, 0)}kg` }],
    series: [
      { id: 'raw', label: '일별 실측', slot: 1, type: 'dots', r: 2.6, points: pts },
      { id: 'ma', label: '7일 평균', slot: 0, points: ma },
    ],
  }];

  if (waist.length) {
    cfgs.push({
      title: '허리둘레',
      subtitle: `최근 ${rangeDays}일 · 목표 ${num(state.targets.waistCm, 0)}cm`,
      height: 160,
      unit: 'cm',
      labelDigits: 1,
      tickDigits: 0,
      aria: '허리둘레 추세',
      refLines: [{ y: state.targets.waistCm, label: `목표 ${num(state.targets.waistCm, 0)}cm` }],
      series: [{ id: 'waist', label: '허리둘레', slot: 2, points: waist, markers: true }],
    });
  }
  return cfgs;
}

export default {
  title: '체중',
  render(state) {
    const w = weightSummary(state);
    const cfgs = buildCharts(state);
    const recent = [...state.weight].reverse().slice(0, 20);

    return `
      <div class="tiles">
        ${tile({ label: '7일 평균', value: num(w.trend, 1), unit: 'kg', delta: w.sevenDayDelta, sub: '지난주 대비', hero: true })}
        ${tile({ label: '목표까지', value: w.toGo != null ? num(Math.max(0, w.toGo), 1) : '—', unit: 'kg', sub: `목표 ${num(w.target, 0)}kg` })}
        ${tile({ label: '30일 변화', value: w.thirtyDayDelta != null ? signed(w.thirtyDayDelta, 1) : '—', unit: 'kg', sub: w.perWeek != null ? `주당 ${signed(w.perWeek, 2)}kg` : '' })}
        ${tile({ label: 'BMI', value: w.bmi != null ? num(w.bmi, 1) : '—', sub: w.targetBmi != null ? `목표 시 ${num(w.targetBmi, 1)}` : '키 입력 필요' })}
      </div>

      <div class="card">
        <div class="card-head"><h2>목표 진행률</h2><span class="meta">${w.progress != null ? `${num(w.progress, 0)}%` : '—'}</span></div>
        ${bar(w.progress ?? 0, { good: (w.progress ?? 0) >= 100 })}
        <div style="font-size:12.5px;color:var(--ink-2)">
          ${w.weeksLeft != null ? `현재 속도 유지 시 약 ${esc(num(w.weeksLeft, 0))}주 후 ${esc(num(w.target, 0))}kg 도달 예상` : '아직 추세를 계산할 기록이 부족합니다 (최소 3회).'}
        </div>
      </div>

      <div class="card flush">
        <div class="card-head">
          <h2>추세</h2>
          <span class="meta"><span class="seg" data-range>
            ${[30, 90, 365].map((d) => `<button type="button" data-days="${d}" aria-pressed="${d === rangeDays}">${d === 365 ? '1년' : `${d}일`}</button>`).join('')}
          </span></span>
        </div>
        ${cfgs.map((c) => chart(c)).join('')}
      </div>

      <div class="card">
        <div class="card-head"><h2>기록 추가</h2><span class="meta">같은 날은 덮어씁니다</span></div>
        <form data-weight-form>
          <div class="grid2">
            <div class="field"><label for="w-date">날짜</label>
              <input id="w-date" name="date" type="date" value="${dateKey()}" max="${dateKey()}" required /></div>
            <div class="field"><label for="w-kg">체중 <span class="unit">kg</span></label>
              <input id="w-kg" name="kg" type="number" step="0.1" min="30" max="200" inputmode="decimal" required /></div>
            <div class="field"><label for="w-bf">체지방률 <span class="unit">%</span></label>
              <input id="w-bf" name="bodyFat" type="number" step="0.1" min="3" max="60" inputmode="decimal" /></div>
            <div class="field"><label for="w-waist">허리둘레 <span class="unit">cm</span></label>
              <input id="w-waist" name="waist" type="number" step="0.5" min="50" max="160" inputmode="decimal" /></div>
          </div>
          <div class="field"><label for="w-note">메모</label>
            <input id="w-note" name="note" type="text" maxlength="120" placeholder="예: 어제 외식, 소금 과다" /></div>
          <button class="btn primary full" type="submit">저장</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>최근 기록</h2><span class="meta">${state.weight.length}건</span></div>
        ${recent.length ? recent.map((r) => `<div class="row">
          <span class="when">${esc(fmtDate(r.date))}</span>
          <span class="val">${esc(num(r.kg, 1))}<small> kg</small></span>
          <span class="grow">${[r.bodyFat != null ? `체지방 ${num(r.bodyFat, 1)}%` : '', r.waist != null ? `허리 ${num(r.waist, 1)}cm` : '', r.note || ''].filter(Boolean).map(esc).join(' · ')}</span>
          <button class="del" data-del="${esc(r.id)}" aria-label="삭제">✕</button>
        </div>`).join('') : '<div class="empty">기록이 없습니다.</div>'}
      </div>

      <div class="note">같은 시간·같은 조건에서 재는 게 숫자보다 중요합니다. 아침 기상 직후, 화장실 다녀온 뒤, 같은 옷차림. 하루 단위 변동은 대부분 수분이니 <strong>7일 평균</strong>만 보세요.</div>
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

    root.querySelector('[data-weight-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const entry = { date: f.get('date'), kg: Number(f.get('kg')) };
      ['bodyFat', 'waist'].forEach((k) => { if (f.get(k) !== '') entry[k] = Number(f.get(k)); });
      if (f.get('note')) entry.note = f.get('note');
      upsertWeight(entry);
      toast('체중을 저장했습니다');
      ctx.rerender();
    });

    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 기록을 삭제할까요?')) return;
      removeEntry('weight', b.dataset.del);
      ctx.rerender();
    }));
  },
};
