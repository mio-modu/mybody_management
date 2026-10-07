/* 혈액검사 · 혈압 — 3개월마다 찍는 좌표. 콜레스테롤 목표가 여기서 판정된다. */
import { LAB_FIELDS } from '../config.js';
import { dateKey, esc, num, signed, fmtDate, parseISO, judge } from '../utils.js';
import { addEntry, removeEntry } from '../store.js';
import { labsSummary } from '../analysis.js';
import { chart, mountCharts } from '../chart.js';
import { tile, badge, toast } from '../ui.js';

/* 색 배정: HDL=계열1(녹) 좋은 쪽, 중성지방=계열2, LDL=계열3 */
const LIPIDS = [
  { id: 'ldl', label: 'LDL', slot: 2 },
  { id: 'tg', label: '중성지방', slot: 1 },
  { id: 'hdl', label: 'HDL', slot: 0 },
];

function buildCharts(state) {
  const rows = [...state.labs].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const cfgs = [];
  const lipidSeries = LIPIDS.map((f) => ({
    id: f.id, label: f.label, slot: f.slot, markers: true,
    points: rows.filter((r) => r[f.id] != null).map((r) => ({ x: parseISO(r.date), y: Number(r[f.id]) })),
  })).filter((s) => s.points.length);

  if (lipidSeries.length) {
    cfgs.push({
      title: '지질 수치 추세',
      subtitle: `단위 mg/dL · 점선은 LDL 목표 ${num(state.targets.ldl, 0)}`,
      height: 200, unit: ' mg/dL', labelDigits: 0, tickDigits: 0, yMinZero: true,
      aria: 'LDL, 중성지방, HDL 추세',
      refLines: [{ y: state.targets.ldl, label: `LDL 목표 ${num(state.targets.ldl, 0)}` }],
      series: lipidSeries,
    });
  }

  const a1c = rows.filter((r) => r.hba1c != null).map((r) => ({ x: parseISO(r.date), y: Number(r.hba1c) }));
  if (a1c.length) {
    cfgs.push({
      title: 'HbA1c 추세',
      subtitle: `단위 % · 목표 ${num(state.targets.hba1c, 1)}% 이하`,
      height: 160, unit: '%', labelDigits: 1, tickDigits: 1,
      aria: '당화혈색소 추세',
      refLines: [{ y: state.targets.hba1c, label: `목표 ${num(state.targets.hba1c, 1)}%` }],
      series: [{ id: 'hba1c', label: 'HbA1c', slot: 0, markers: true, points: a1c }],
    });
  }
  return cfgs;
}

export default {
  title: '검사',
  render(state) {
    const l = labsSummary(state);
    const cfgs = buildCharts(state);
    const t = state.targets;

    return `
      <div class="tiles">
        ${tile({ label: 'LDL', value: l.latest?.ldl != null ? num(l.latest.ldl, 0) : '—', unit: 'mg/dL',
          delta: l.latest?.ldl != null && l.prev?.ldl != null ? Number(l.latest.ldl) - Number(l.prev.ldl) : null,
          sub: `목표 ${num(t.ldl, 0)} 이하` })}
        ${tile({ label: '중성지방', value: l.latest?.tg != null ? num(l.latest.tg, 0) : '—', unit: 'mg/dL',
          delta: l.latest?.tg != null && l.prev?.tg != null ? Number(l.latest.tg) - Number(l.prev.tg) : null,
          sub: `목표 ${num(t.tg, 0)} 이하` })}
        ${tile({ label: 'HDL', value: l.latest?.hdl != null ? num(l.latest.hdl, 0) : '—', unit: 'mg/dL',
          delta: l.latest?.hdl != null && l.prev?.hdl != null ? Number(l.latest.hdl) - Number(l.prev.hdl) : null,
          deltaGoodWhen: 'up', sub: `목표 ${num(t.hdlMin, 0)} 이상` })}
        ${tile({ label: '중성지방/HDL 비', value: l.ratio != null ? num(l.ratio, 2) : '—',
          sub: `${num(t.tgHdlRatio, 1)} 이하 권장` })}
      </div>

      ${l.latest ? `<div class="card">
        <div class="card-head"><h2>최근 검사 판정</h2>
          <span class="meta">${esc(fmtDate(l.latest.date, { withYear: true }))} · ${esc(String(l.daysSince))}일 전</span></div>
        ${LAB_FIELDS.filter((f) => l.latest[f.id] != null).map((f) => {
          const j = judge(l.latest[f.id], f.goal(t));
          const prev = l.prev?.[f.id];
          return `<div class="row">
            <span class="grow" style="color:var(--ink)">${esc(f.label)}</span>
            <span class="val">${esc(num(l.latest[f.id], 1))}<small> ${esc(f.unit)}</small></span>
            ${prev != null ? `<span class="when" style="min-width:52px;text-align:right">${esc(signed(Number(l.latest[f.id]) - Number(prev), 1))}</span>` : '<span class="when" style="min-width:52px"></span>'}
            ${badge(j)}
          </div>`;
        }).join('')}
        ${l.nonHdl != null ? `<div class="row"><span class="grow" style="color:var(--ink)">비-HDL 콜레스테롤 (계산값)</span>
          <span class="val">${esc(num(l.nonHdl, 0))}<small> mg/dL</small></span>${badge(judge(l.nonHdl, ['max', t.ldl + 30]))}</div>` : ''}
        ${l.ratio != null ? `<div class="note" style="margin-top:10px">
          중성지방/HDL 비가 ${esc(num(l.ratio, 2))}입니다. ${l.ratio > t.tgHdlRatio
            ? '이 비율이 높으면 인슐린 저항성 쪽을 의심합니다. 체중 감량 + 정제 탄수화물 줄이기가 LDL 약보다 이 숫자를 먼저 움직입니다.'
            : '양호한 범위입니다. 대사 상태가 안정적이라는 신호입니다.'}</div>` : ''}
        ${l.latest.note ? `<div class="note" style="margin-top:8px">${esc(l.latest.note)}</div>` : ''}
      </div>` : `<div class="card"><div class="empty">검사 기록이 없습니다. 가장 최근 건강검진 결과지 숫자를 한 번 넣어두면 목표 판정이 시작됩니다.</div></div>`}

      ${cfgs.length ? `<div class="card flush">
        <div class="card-head"><h2>추세</h2><span class="meta">${state.labs.length}회 검사</span></div>
        ${cfgs.map((c) => chart(c)).join('')}
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>검사 결과 추가</h2><span class="meta">아는 항목만</span></div>
        <form data-lab-form>
          <div class="field"><label for="l-date">검사 날짜</label>
            <input id="l-date" name="date" type="date" value="${dateKey()}" max="${dateKey()}" required /></div>
          <div class="grid2">
            ${LAB_FIELDS.map((f) => `<div class="field">
              <label for="l-${esc(f.id)}">${esc(f.label)} <span class="unit">${esc(f.unit)}</span></label>
              <input id="l-${esc(f.id)}" name="${esc(f.id)}" type="number" step="0.1" min="0" inputmode="decimal" />
            </div>`).join('')}
          </div>
          <div class="field"><label for="l-note">메모 (검사 기관, 복약 상태 등)</label>
            <input id="l-note" name="note" type="text" maxlength="160" /></div>
          <button class="btn primary full" type="submit">저장</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>검사 이력</h2></div>
        ${l.history.length ? [...l.history].reverse().map((r) => `<div class="row">
          <span class="when">${esc(fmtDate(r.date, { withYear: true }))}</span>
          <span class="grow" style="color:var(--ink)">${LAB_FIELDS.filter((f) => r[f.id] != null).slice(0, 4).map((f) => `${esc(f.label)} ${esc(num(r[f.id], 1))}`).join(' · ')}</span>
          <button class="del" data-del="${esc(r.id)}" aria-label="삭제">✕</button>
        </div>`).join('') : '<div class="empty">없습니다.</div>'}
      </div>

      <div class="note">LDL은 약 없이도 포화지방 줄이기·체중 감량·수용성 식이섬유(오트, 보리, 차전자피)로 10~20% 내려갑니다.
      중성지방은 술과 정제 탄수화물에 가장 민감합니다. 다음 검사는 ${l.daysSince != null ? `${esc(String(Math.max(0, 90 - l.daysSince)))}일 후` : '3개월 뒤'}가 적당합니다.</div>
    `;
  },

  mount(root, state, ctx) {
    mountCharts(root, buildCharts(state));

    root.querySelector('[data-lab-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const entry = { date: f.get('date') };
      let any = false;
      LAB_FIELDS.forEach((fd) => {
        if (f.get(fd.id) !== '' && f.get(fd.id) != null) { entry[fd.id] = Number(f.get(fd.id)); any = true; }
      });
      if (f.get('note')) entry.note = f.get('note');
      if (!any) { toast('입력된 수치가 없습니다'); return; }
      addEntry('labs', entry);
      toast('검사 결과를 저장했습니다');
      ctx.rerender('top');
    });

    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 검사 기록을 삭제할까요?')) return;
      removeEntry('labs', b.dataset.del);
      ctx.rerender();
    }));
  },
};
