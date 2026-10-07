/* 가벼운 SVG 차트 — 의존성 없음.
 * 규칙: 축은 하나만, 2개 이상 계열이면 범례 + 끝점 직접 라벨, 호버 툴팁 기본 제공,
 *       모든 차트에 표 보기를 함께 둔다(색만으로 정보를 전달하지 않는다). */
import { esc, num, pad } from './utils.js';

const PAD = { t: 14, r: 46, b: 24, l: 38 };

function niceDomain(min, max, pad0 = 0.08) {
  if (min === max) { const d = Math.max(Math.abs(min) * 0.1, 1); return [min - d, max + d]; }
  const span = max - min;
  return [min - span * pad0, max + span * pad0];
}

function fmtTick(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

function shapePath(shape, cx, cy, r) {
  if (shape === 'triangle') {
    return `<polygon points="${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}" />`;
  }
  if (shape === 'square') {
    return `<rect x="${cx - r * 0.85}" y="${cy - r * 0.85}" width="${r * 1.7}" height="${r * 1.7}" rx="1" />`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
}

function buildSVG(cfg, width) {
  const height = cfg.height || 200;
  const series = cfg.series.filter((s) => s.points.length);
  const all = series.flatMap((s) => s.points);
  if (!all.length) {
    return `<div class="chart-empty">기록이 모이면 여기에 추세가 그려집니다.</div>`;
  }
  const xs = all.map((p) => p.x.getTime());
  let x0 = Math.min(...xs); let x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 43200000; x1 += 43200000; }

  const ysRaw = all.map((p) => p.y);
  let ymin = Math.min(...ysRaw); let ymax = Math.max(...ysRaw);
  (cfg.bands || []).forEach((b) => { ymin = Math.min(ymin, b.from); ymax = Math.max(ymax, b.to); });
  (cfg.refLines || []).forEach((r) => { ymin = Math.min(ymin, r.y); ymax = Math.max(ymax, r.y); });
  let [lo, hi] = cfg.yDomain || niceDomain(ymin, ymax);
  if (cfg.yMinZero && lo < 0) lo = 0;

  const iw = Math.max(40, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const sx = (t) => PAD.l + ((t - x0) / (x1 - x0)) * iw;
  const sy = (v) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;

  const parts = [];

  // 목표 범위 띠
  (cfg.bands || []).forEach((b) => {
    const top = sy(b.to); const bot = sy(b.from);
    parts.push(`<rect class="chart-band" x="${PAD.l}" y="${top}" width="${iw}" height="${Math.max(1, bot - top)}" />`);
  });

  // y 눈금 + 격자
  const ticks = cfg.yTicks || 4;
  for (let i = 0; i <= ticks; i += 1) {
    const v = lo + ((hi - lo) * i) / ticks;
    const y = sy(v);
    parts.push(`<line class="chart-grid" x1="${PAD.l}" y1="${y}" x2="${PAD.l + iw}" y2="${y}" />`);
    parts.push(`<text class="chart-axis" x="${PAD.l - 7}" y="${y + 3.5}" text-anchor="end">${esc(num(v, cfg.tickDigits ?? 0))}</text>`);
  }

  // x 눈금
  const xTickCount = width < 340 ? 2 : 3;
  for (let i = 0; i <= xTickCount; i += 1) {
    const t = x0 + ((x1 - x0) * i) / xTickCount;
    const x = sx(t);
    const anchor = i === 0 ? 'start' : i === xTickCount ? 'end' : 'middle';
    parts.push(`<text class="chart-axis" x="${x}" y="${PAD.t + ih + 16}" text-anchor="${anchor}">${fmtTick(new Date(t))}</text>`);
  }

  // 기준선(목표 체중 등)
  (cfg.refLines || []).forEach((r) => {
    const y = sy(r.y);
    parts.push(`<line class="chart-ref" x1="${PAD.l}" y1="${y}" x2="${PAD.l + iw}" y2="${y}" />`);
    if (r.label) parts.push(`<text class="chart-ref-label" x="${PAD.l + iw}" y="${y - 5}" text-anchor="end">${esc(r.label)}</text>`);
  });

  // 계열
  series.forEach((s, si) => {
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    const color = `var(--series-${(s.slot ?? si) + 1})`;
    if (s.type !== 'dots' && pts.length > 1) {
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x.getTime()).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
      parts.push(`<path class="chart-line${s.dashed ? ' is-dashed' : ''}" d="${d}" stroke="${color}" />`);
    }
    if (s.type === 'dots' || pts.length <= 2 || s.markers) {
      pts.forEach((p) => {
        parts.push(`<g class="chart-mark" fill="${color}">${shapePath(s.shape || 'circle', sx(p.x.getTime()), sy(p.y), s.r ?? (s.type === 'dots' ? 4.5 : 3.5))}</g>`);
      });
    }
    // 끝점 직접 라벨 (색 외 두 번째 식별 수단)
    if (s.type !== 'dots' && cfg.endLabels !== false) {
      const last = pts[pts.length - 1];
      parts.push(`<g class="chart-mark" fill="${color}">${shapePath('circle', sx(last.x.getTime()), sy(last.y), 4)}</g>`);
      parts.push(`<text class="chart-end-label" x="${Math.min(sx(last.x.getTime()) + 8, width - 2)}" y="${sy(last.y) + 3.5}">${esc(num(last.y, cfg.labelDigits ?? 1))}</text>`);
    }
  });

  parts.push(`<line class="chart-baseline" x1="${PAD.l}" y1="${PAD.t + ih}" x2="${PAD.l + iw}" y2="${PAD.t + ih}" />`);
  parts.push(`<line class="chart-cursor" x1="0" y1="${PAD.t}" x2="0" y2="${PAD.t + ih}" style="opacity:0" />`);
  parts.push(`<rect class="chart-hit" x="${PAD.l}" y="${PAD.t}" width="${iw}" height="${ih}" fill="transparent" />`);

  return `<svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"
    aria-label="${esc(cfg.aria || '추세 그래프')}">${parts.join('')}</svg>`;
}

function legendHTML(cfg) {
  const series = cfg.series.filter((s) => s.points.length);
  if (series.length < 2) return '';
  return `<div class="chart-legend">${series.map((s, i) => `
    <span class="chart-legend-item"><span class="chart-swatch shape-${s.shape || 'circle'}" style="background:var(--series-${(s.slot ?? i) + 1})"></span>${esc(s.label)}</span>`).join('')}</div>`;
}

function tableHTML(cfg) {
  const series = cfg.series.filter((s) => s.points.length);
  if (!series.length) return '';
  const rows = new Map();
  series.forEach((s, si) => {
    s.points.forEach((p) => {
      const k = `${p.x.getFullYear()}-${pad(p.x.getMonth() + 1)}-${pad(p.x.getDate())} ${pad(p.x.getHours())}:${pad(p.x.getMinutes())}`;
      if (!rows.has(k)) rows.set(k, {});
      rows.get(k)[si] = p.y;
    });
  });
  const keys = [...rows.keys()].sort().reverse().slice(0, 60);
  return `<details class="chart-table">
    <summary>표로 보기 (${keys.length}건)</summary>
    <table><thead><tr><th>시점</th>${series.map((s) => `<th>${esc(s.label)}</th>`).join('')}</tr></thead>
    <tbody>${keys.map((k) => `<tr><td>${esc(k.replace(' 00:00', ''))}</td>${series.map((s, si) => `<td>${rows.get(k)[si] != null ? esc(num(rows.get(k)[si], cfg.labelDigits ?? 1)) : '·'}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </details>`;
}

const ro = new ResizeObserver((entries) => {
  entries.forEach((e) => {
    const mount = e.target;
    const cfg = mount._cfg;
    if (!cfg) return;
    const w = Math.round(e.contentRect.width);
    if (!w || w === mount._w) return;
    mount._w = w;
    paint(mount, cfg, w);
  });
});

function paint(mount, cfg, width) {
  const holder = mount.querySelector('.chart-canvas');
  holder.innerHTML = buildSVG(cfg, width);
  wireHover(mount, cfg, width);
}

function wireHover(mount, cfg, width) {
  const svg = mount.querySelector('.chart-svg');
  if (!svg) return;
  const tip = mount.querySelector('.chart-tip');
  const cursor = svg.querySelector('.chart-cursor');
  const hit = svg.querySelector('.chart-hit');
  const series = cfg.series.filter((s) => s.points.length);
  const all = series.flatMap((s, si) => s.points.map((p) => ({ ...p, si })));
  if (!all.length) return;
  const xs = all.map((p) => p.x.getTime());
  let x0 = Math.min(...xs); let x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 43200000; x1 += 43200000; }
  const iw = Math.max(40, width - PAD.l - PAD.r);
  const toTime = (px) => x0 + ((px - PAD.l) / iw) * (x1 - x0);

  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const t = toTime(px);
    // 가장 가까운 시점 하나를 고르고, 그 시점의 모든 계열 값을 보여준다
    let best = all[0];
    all.forEach((p) => { if (Math.abs(p.x.getTime() - t) < Math.abs(best.x.getTime() - t)) best = p; });
    const window0 = cfg.tipWindowMs ?? 43200000;
    const near = all.filter((p) => Math.abs(p.x.getTime() - best.x.getTime()) <= window0);
    const cx = PAD.l + ((best.x.getTime() - x0) / (x1 - x0)) * iw;
    cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx);
    cursor.style.opacity = '1';
    const d = best.x;
    const head = `${d.getMonth() + 1}월 ${d.getDate()}일${cfg.tipTime ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''}`;
    const lines = near.map((p) => {
      const s = series[p.si];
      return `<div class="tip-row"><span class="chart-swatch" style="background:var(--series-${(s.slot ?? p.si) + 1})"></span>
        <span class="tip-name">${esc(p.label || s.label)}</span>
        <span class="tip-val">${esc(num(p.y, cfg.labelDigits ?? 1))}${esc(cfg.unit || '')}</span></div>`;
    }).join('');
    tip.innerHTML = `<div class="tip-head">${esc(head)}</div>${lines}`;
    tip.style.opacity = '1';
    const tw = tip.offsetWidth || 150;
    tip.style.left = `${Math.max(4, Math.min(cx - tw / 2, width - tw - 4))}px`;
    tip.style.top = `${PAD.t}px`;
  };
  const hide = () => { tip.style.opacity = '0'; cursor.style.opacity = '0'; };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);
}

export function chart(cfg) {
  const id = `c${Math.random().toString(36).slice(2, 8)}`;
  return `<figure class="chart" data-chart="${id}">
    ${cfg.title ? `<figcaption class="chart-title">${esc(cfg.title)}${cfg.subtitle ? `<span class="chart-sub">${esc(cfg.subtitle)}</span>` : ''}</figcaption>` : ''}
    ${legendHTML(cfg)}
    <div class="chart-canvas"><div class="chart-empty">불러오는 중…</div></div>
    <div class="chart-tip" style="opacity:0"></div>
    ${tableHTML(cfg)}
  </figure>`;
}

/* 뷰를 그린 뒤 호출 — data-chart 가 붙은 figure 에 설정을 연결한다 */
export function mountCharts(root, configs) {
  root.querySelectorAll('[data-chart]').forEach((fig, i) => {
    const cfg = configs[i];
    if (!cfg) return;
    fig._cfg = cfg;
    const w = Math.round(fig.getBoundingClientRect().width) || 320;
    fig._w = w;
    paint(fig, cfg, w);
    ro.observe(fig);
  });
}
