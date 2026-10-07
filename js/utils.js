/* 날짜 · 통계 · 포맷 유틸 */

export const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeKey(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isoNow(d = new Date()) {
  return `${dateKey(d)}T${timeKey(d)}`;
}

export function parseISO(s) {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function diffDays(a, b) {
  return Math.round((a - b) / 86400000);
}

export function fmtDate(s, { withYear = false } = {}) {
  const d = parseISO(s);
  if (!d) return '—';
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return withYear ? `${d.getFullYear()}. ${base}` : base;
}

export function fmtDateTime(s) {
  const d = parseISO(s);
  if (!d) return '—';
  return `${fmtDate(s)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relDay(s) {
  const d = parseISO(s);
  if (!d) return '—';
  const n = diffDays(new Date(new Date().setHours(0, 0, 0, 0)), new Date(d.setHours(0, 0, 0, 0)));
  if (n === 0) return '오늘';
  if (n === 1) return '어제';
  if (n === 2) return '그제';
  if (n < 0) return `${-n}일 후`;
  return `${n}일 전`;
}

export function num(v, digits = 1) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return n.toFixed(digits).replace(/\.0+$/, '');
}

export function signed(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const s = n > 0 ? '+' : n < 0 ? '−' : '±';
  return `${s}${Math.abs(n).toFixed(digits).replace(/\.0+$/, '')}`;
}

/* ── 통계 ─────────────────────────────────────────────── */
export const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export function movingAverage(points, window = 7) {
  // points: [{x: Date, y: number}] — 날짜 간격이 들쭉날쭉해도 "최근 window일" 기준으로 평균
  return points.map((p) => {
    const from = p.x.getTime() - (window - 1) * 86400000;
    const vals = points.filter((q) => q.x.getTime() >= from && q.x.getTime() <= p.x.getTime()).map((q) => q.y);
    return { x: p.x, y: mean(vals) };
  });
}

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx; const dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/* 단순 선형회귀 기울기 (단위: y/일) */
export function slopePerDay(points) {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x.getTime() / 86400000);
  const ys = points.map((p) => p.y);
  const mx = mean(xs); const my = mean(ys);
  let num2 = 0; let den = 0;
  xs.forEach((x, i) => { num2 += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den === 0 ? null : num2 / den;
}

/* 평균혈당(mg/dL) → 추정 HbA1c(%) : ADAG 공식 */
export const eA1c = (avgGlucose) => (avgGlucose == null ? null : (avgGlucose + 46.7) / 28.7);

/* ── 목표 대비 판정 → 상태색 역할 ───────────────────────── */
export function judge(value, goal) {
  if (value == null || value === '' || !goal) return { tone: 'muted', icon: '·', label: '기록 없음' };
  const v = Number(value);
  const [kind, a] = goal;
  if (kind === 'max') {
    if (v <= a) return { tone: 'good', icon: '✓', label: '목표 달성' };
    if (v <= a * 1.15) return { tone: 'warning', icon: '!', label: '목표 초과' };
    return { tone: 'critical', icon: '✕', label: '많이 초과' };
  }
  if (kind === 'min') {
    if (v >= a) return { tone: 'good', icon: '✓', label: '목표 달성' };
    if (v >= a * 0.85) return { tone: 'warning', icon: '!', label: '목표 미달' };
    return { tone: 'critical', icon: '✕', label: '많이 부족' };
  }
  const [lo, hi] = a;
  if (v >= lo && v <= hi) return { tone: 'good', icon: '✓', label: '범위 내' };
  if (v < lo) return { tone: v < lo * 0.8 ? 'critical' : 'warning', icon: '↓', label: '범위 아래' };
  return { tone: v > hi * 1.25 ? 'critical' : 'warning', icon: '↑', label: '범위 초과' };
}

/* ── HTML 안전 처리 ───────────────────────────────────── */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
