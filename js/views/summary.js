/* 진료용 요약 1장 — 병원에 들고 갈 종이.
 * 화면용 대시보드가 아니라 "남이 30초 안에 읽는 문서"로 만든다.
 * 판정·진단 문구를 쓰지 않는다. 숫자와 기간, 그리고 내가 느낀 것만 적는다. */
import { GLUCOSE_CONTEXTS, LAB_FIELDS, RED_FLAGS } from '../config.js';
import { esc, num, signed, fmtDate, dateKey, daysAgo, parseISO, movingAverage } from '../utils.js';
import { hasModule, painAreas } from '../profile.js';
import { weightSummary, weightPoints, glucoseSummary, labsSummary, painSummary } from '../analysis.js';
import { painSeries } from '../protocol.js';
import { chart, mountCharts } from '../chart.js';

const DAYS = 90;

function buildCharts(state) {
  const cfgs = [];
  const pts = weightPoints(state, DAYS);
  if (pts.length >= 2) {
    const ma = movingAverage(pts, 7).filter((p) => p.y != null);
    cfgs.push({
      title: `체중 추세 (최근 ${DAYS}일)`,
      height: 150, unit: 'kg', labelDigits: 1, tickDigits: 1,
      aria: '체중 추세',
      refLines: [{ y: state.targets.weightKg, label: `목표 ${num(state.targets.weightKg, 0)}kg` }],
      series: [
        { id: 'raw', label: '일별', slot: 1, type: 'dots', r: 2.2, points: pts },
        { id: 'ma', label: '7일 평균', slot: 0, points: ma },
      ],
    });
  }
  if (hasModule(state, 'pain')) {
    const series = painAreas(state).map((a, i) => ({
      id: a.id, label: a.label, slot: i, markers: true, points: painSeries(state, a.id, DAYS),
    })).filter((s) => s.points.length >= 2);
    if (series.length) {
      cfgs.push({
        title: `통증 추세 (최근 ${DAYS}일)`,
        height: 140, labelDigits: 0, tickDigits: 0, yDomain: [0, 10], yTicks: 5,
        aria: '부위별 통증 추세',
        bands: [{ from: 0, to: state.targets.painMax ?? 2 }],
        series,
      });
    }
  }
  return cfgs;
}

function topTriggers(state, days = 30) {
  const from = daysAgo(days).getTime();
  const count = new Map();
  state.pain
    .filter((p) => (parseISO(p.ts)?.getTime() ?? 0) >= from)
    .forEach((p) => (p.triggers || []).forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function redFlagHistory(state) {
  const from = daysAgo(DAYS).getTime();
  return state.pain
    .filter((p) => (parseISO(p.ts)?.getTime() ?? 0) >= from && (p.redFlags || []).length)
    .map((p) => ({ date: String(p.ts).slice(0, 10), labels: p.redFlags.map((id) => RED_FLAGS.find((f) => f.id === id)?.label).filter(Boolean) }));
}

export default {
  title: '진료용 요약',
  render(state) {
    const p = state.profile;
    const age = p.birthYear ? new Date().getFullYear() - Number(p.birthYear) : null;
    const w = weightSummary(state);
    const g = glucoseSummary(state, DAYS);
    const l = labsSummary(state);
    const pain7 = painSummary(state, 7);
    const pain30 = painSummary(state, 30);
    const cfgs = buildCharts(state);
    const triggers = topTriggers(state);
    const flags = redFlagHistory(state);
    const waist = [...state.weight].reverse().find((x) => x.waist != null);

    return `
      <div class="no-print" style="margin-bottom:12px">
        <div class="btn-row">
          <button class="btn primary" data-print>인쇄 · PDF로 저장</button>
          <a class="btn ghost" href="#/report">돌아가기</a>
        </div>
        <div class="note" style="margin-top:10px">진료 전에 인쇄해 가거나, 인쇄 화면에서 <strong>PDF로 저장</strong>해 두세요.
        아이폰은 공유 → 프린트 → 미리보기를 두 손가락으로 벌리면 PDF가 됩니다.</div>
      </div>

      <article class="sheet">
        <header class="sheet-head">
          <div>
            <h1>건강 기록 요약</h1>
            <p class="sheet-sub">
              ${esc(p.name || '본인')}${age ? ` · 만 ${age}세` : ''}${p.heightCm ? ` · ${esc(num(p.heightCm, 0))}cm` : ''}
              · 기간 ${esc(fmtDate(dateKey(daysAgo(DAYS)), { withYear: true }))} ~ ${esc(fmtDate(dateKey(), { withYear: true }))}
            </p>
          </div>
          <p class="sheet-sub">출력 ${esc(fmtDate(dateKey(), { withYear: true }))}</p>
        </header>

        <section class="sheet-sec">
          <h2>체중</h2>
          <table class="sheet-table">
            <tbody>
              <tr><th>현재 (7일 평균)</th><td><strong>${esc(num(w.trend, 1))} kg</strong>${w.bmi != null ? ` · BMI ${esc(num(w.bmi, 1))}` : ''}</td>
                  <th>목표</th><td>${esc(num(w.target, 0))} kg</td></tr>
              <tr><th>시작 체중</th><td>${w.start != null ? `${esc(num(w.start, 1))} kg` : '—'}</td>
                  <th>목표까지</th><td>${w.toGo != null && w.toGo > 0 ? `${esc(num(w.toGo, 1))} kg` : '도달'}</td></tr>
              <tr><th>최근 30일 변화</th><td>${w.thirtyDayDelta != null ? `${esc(signed(w.thirtyDayDelta, 1))} kg` : '—'}</td>
                  <th>주당 추세</th><td>${w.perWeek != null ? `${esc(signed(w.perWeek, 2))} kg` : '—'}</td></tr>
              ${waist ? `<tr><th>허리둘레</th><td>${esc(num(waist.waist, 1))} cm</td><th>측정일</th><td>${esc(fmtDate(waist.date))}</td></tr>` : ''}
            </tbody>
          </table>
          <p class="sheet-note">기록 ${esc(String(state.weight.length))}회. 아침 기상 직후 같은 조건에서 측정.</p>
        </section>

        ${hasModule(state, 'glucose') && g.n ? `<section class="sheet-sec">
          <h2>혈당 <span class="sheet-span">최근 ${DAYS}일 · ${esc(String(g.n))}회 측정</span></h2>
          <table class="sheet-table">
            <thead><tr><th>측정 시점</th><th>횟수</th><th>평균</th><th>최저~최고</th><th>목표 범위 내</th></tr></thead>
            <tbody>
              ${GLUCOSE_CONTEXTS.filter((c) => g.byCtx[c.id].n).map((c) => {
                const s = g.byCtx[c.id];
                return `<tr><th>${esc(c.label)}</th><td>${esc(String(s.n))}회</td>
                  <td><strong>${esc(num(s.avg, 0))}</strong></td>
                  <td>${esc(num(s.min, 0))}~${esc(num(s.max, 0))}</td>
                  <td>${esc(num(s.tir, 0))}% (${esc(String(s.range[0]))}–${esc(String(s.range[1]))})</td></tr>`;
              }).join('')}
            </tbody>
          </table>
          <p class="sheet-note">자가 측정 기기 값입니다. 전체 평균 ${esc(num(g.avg, 0))} mg/dL
            ${g.estA1c != null ? ` · 평균혈당으로 환산한 당화혈색소 추정치 ${esc(num(g.estA1c, 1))}%` : ''}.</p>
        </section>` : ''}

        ${hasModule(state, 'labs') && l.latest ? `<section class="sheet-sec">
          <h2>혈액검사 · 혈압 <span class="sheet-span">${esc(fmtDate(l.latest.date, { withYear: true }))}${l.prev ? ` (이전 ${esc(fmtDate(l.prev.date, { withYear: true }))})` : ''}</span></h2>
          <table class="sheet-table">
            <thead><tr><th>항목</th><th>최근</th><th>이전</th><th>변화</th><th>내 목표</th></tr></thead>
            <tbody>
              ${LAB_FIELDS.filter((f) => l.latest[f.id] != null).map((f) => {
                const cur = Number(l.latest[f.id]);
                const prev = l.prev?.[f.id] != null ? Number(l.prev[f.id]) : null;
                const goal = f.goal(state.targets);
                const goalText = goal[0] === 'max' ? `${goal[1]} 이하` : goal[0] === 'min' ? `${goal[1]} 이상` : `${goal[1][0]}–${goal[1][1]}`;
                return `<tr><th>${esc(f.label)}</th>
                  <td><strong>${esc(num(cur, 1))}</strong> ${esc(f.unit)}</td>
                  <td>${prev != null ? esc(num(prev, 1)) : '—'}</td>
                  <td>${prev != null ? esc(signed(cur - prev, 1)) : '—'}</td>
                  <td>${esc(goalText)}</td></tr>`;
              }).join('')}
              ${l.ratio != null ? `<tr><th>중성지방/HDL 비 (계산값)</th><td colspan="3"><strong>${esc(num(l.ratio, 2))}</strong></td><td>${esc(num(state.targets.tgHdlRatio, 1))} 이하</td></tr>` : ''}
            </tbody>
          </table>
          ${l.latest.note ? `<p class="sheet-note">메모: ${esc(l.latest.note)}</p>` : ''}
        </section>` : ''}

        ${hasModule(state, 'pain') && pain30.n ? `<section class="sheet-sec">
          <h2>통증 <span class="sheet-span">0(없음)~10(최악) 자가 평가 · 최근 30일 ${esc(String(pain30.n))}회 기록</span></h2>
          <table class="sheet-table">
            <thead><tr><th>부위</th><th>최근 7일 평균</th><th>30일 평균</th><th>30일 최고</th></tr></thead>
            <tbody>
              ${painAreas(state).map((a) => {
                const s7 = pain7.byArea[a.id]; const s30 = pain30.byArea[a.id];
                if (!s30 || !s30.n) return '';
                return `<tr><th>${esc(a.label)}</th>
                  <td><strong>${s7?.avg != null ? esc(num(s7.avg, 1)) : '—'}</strong></td>
                  <td>${esc(num(s30.avg, 1))}</td>
                  <td>${esc(num(s30.max, 0))}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
          ${triggers.length ? `<p class="sheet-note">본인이 꼽은 유발 요인(최근 30일):
            ${triggers.map(([t, n]) => `${esc(t)} ${esc(String(n))}회`).join(' · ')}</p>` : ''}
          ${flags.length ? `<p class="sheet-alert"><strong>확인 요청</strong> — 아래 신호를 스스로 체크한 날이 있습니다.
            ${flags.slice(0, 4).map((f) => `${esc(fmtDate(f.date))} ${esc(f.labels.join(', '))}`).join(' / ')}</p>` : ''}
        </section>` : ''}

        ${cfgs.length ? `<section class="sheet-sec sheet-charts">
          ${cfgs.map((c) => chart(c)).join('')}
        </section>` : ''}

        ${p.memo ? `<section class="sheet-sec">
          <h2>복약 · 참고 사항</h2>
          <p class="sheet-note" style="white-space:pre-wrap">${esc(p.memo)}</p>
        </section>` : ''}

        <footer class="sheet-foot">
          개인 기록 앱에서 사용자가 직접 입력·측정한 값입니다. 의료기관의 검사 결과나 진단이 아니며,
          판독과 판단은 진료하시는 분께 맡깁니다.
        </footer>
      </article>
    `;
  },

  mount(root, state) {
    mountCharts(root, buildCharts(state));
    root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  },
};
