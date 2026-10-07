/* 작은 UI 조각들 */
import { esc, num, signed } from './utils.js';

export function tile({ label, value, unit = '', sub = '', delta = null, deltaGoodWhen = 'down', hero = false }) {
  let d = '';
  if (delta != null && !Number.isNaN(Number(delta))) {
    const v = Number(delta);
    const good = deltaGoodWhen === 'down' ? v < 0 : v > 0;
    const cls = Math.abs(v) < 0.05 ? 'delta-flat' : good ? 'delta-good' : 'delta-bad';
    d = `<span class="${cls}">${esc(signed(v, 1))}</span>`;
  }
  return `<div class="tile${hero ? ' hero' : ''}">
    <span class="label">${esc(label)}</span>
    <div class="value">${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
    <div class="sub">${d}${d && sub ? ' · ' : ''}${esc(sub)}</div>
  </div>`;
}

export function badge(j) {
  return `<span class="badge ${j.tone}"><span class="dot"></span>${esc(j.icon)} ${esc(j.label)}</span>`;
}

export function bar(pct, { good = false } = {}) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="bar${good ? ' good' : ''}" role="progressbar" aria-valuenow="${p.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 1800);
}

export function nrs(areaId, label, value = 0) {
  return `<div class="nrs" data-nrs="${esc(areaId)}">
    <div class="nrs-head"><span class="name">${esc(label)}</span>
      <span class="score" data-score-for="${esc(areaId)}">${esc(String(value))}</span></div>
    <input type="range" min="0" max="10" step="1" value="${esc(String(value))}" name="pain-${esc(areaId)}"
      aria-label="${esc(label)} 통증 점수 0에서 10" />
    <div class="nrs-scale"><span>0 없음</span><span>3 불편</span><span>6 심함</span><span>10 최악</span></div>
  </div>`;
}

export function statRow(label, value, unit = '', j = null) {
  return `<div class="row"><span class="grow">${esc(label)}</span>
    <span class="val">${esc(num(value, 1))}${unit ? `<small> ${esc(unit)}</small>` : ''}</span>
    ${j ? badge(j) : ''}</div>`;
}

/* 설치 안내 — 버튼을 띄울 수 있으면 버튼, 아이폰이면 손으로 하는 단계 */
export function installBlock(install, { compact = false } = {}) {
  if (install.isStandalone()) {
    return `<div class="note"><strong>앱으로 실행 중입니다.</strong> 홈 화면 아이콘으로 바로 열 수 있습니다.</div>`;
  }
  if (install.canPrompt()) {
    return `<div class="btn-row"><button class="btn primary${compact ? ' sm' : ' full'}" data-install>홈 화면에 앱으로 설치</button></div>`;
  }
  const steps = install.manualSteps();
  return `<ol class="steps-list">${steps.map((t) => `<li>${t}</li>`).join('')}</ol>`;
}
