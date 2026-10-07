/* 앱 셸 — 라우팅, 테마, 알림, 서비스워커 */
import { APP } from './config.js';
import { getState, setSettings, subscribe } from './store.js';
import { dateKey, timeKey } from './utils.js';
import { pending, currentSlot } from './checkin.js';
import today from './views/today.js';
import weight from './views/weight.js';
import glucose from './views/glucose.js';
import pain from './views/pain.js';
import labs from './views/labs.js';
import report from './views/report.js';
import settings from './views/settings.js';

const ROUTES = {
  '#/today': today,
  '#/weight': weight,
  '#/glucose': glucose,
  '#/pain': pain,
  '#/labs': labs,
  '#/report': report,
  '#/settings': settings,
};

const TABS = [
  { href: '#/today', icon: '◉', label: '홈' },
  { href: '#/weight', icon: '⚖', label: '체중' },
  { href: '#/glucose', icon: '◍', label: '혈당' },
  { href: '#/pain', icon: '✚', label: '통증' },
  { href: '#/report', icon: '▤', label: '리포트' },
];

const view = document.getElementById('view');
const header = document.getElementById('header-title');
const dateEl = document.getElementById('header-date');

function routeKey() {
  const h = location.hash.split('?')[0];
  return ROUTES[h] ? h : '#/today';
}

export function applyTheme() {
  const t = getState().settings.theme || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', dark ? '#201E16' : '#EEECE6');
  }
}

let scrollMemory = {};

function render(scrollTo) {
  const key = routeKey();
  const v = ROUTES[key];
  const state = getState();
  header.textContent = key === '#/today' ? `${APP.name}${state.profile.name ? ` · ${state.profile.name}` : ''}` : v.title;
  const n = pending(state).length;
  dateEl.textContent = `${new Date().getMonth() + 1}/${new Date().getDate()} ${currentSlot().label}${n ? ` · 체크 ${n}` : ''}`;

  view.innerHTML = v.render(state);
  v.mount(view, state, { rerender, applyTheme, toastEl: null });

  document.querySelectorAll('.tabbar a').forEach((a) => {
    const active = a.getAttribute('href') === key || (key === '#/labs' && a.getAttribute('href') === '#/report');
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (scrollTo === 'top') window.scrollTo({ top: 0 });
  else if (typeof scrollTo === 'string' && scrollTo.startsWith('#')) {
    document.querySelector(scrollTo)?.scrollIntoView({ block: 'start' });
  } else if (scrollMemory[key] != null) {
    window.scrollTo({ top: scrollMemory[key] });
  }
}

function rerender(scrollTo) {
  const key = routeKey();
  if (!scrollTo) scrollMemory[key] = window.scrollY;
  render(scrollTo);
}

/* ── 알림: 앱이 열려 있는 동안만 동작한다 (서버 푸시 없음) ── */
function reminderLoop() {
  const fired = new Set();
  const tick = () => {
    const state = getState();
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = timeKey();
    Object.entries(state.settings.reminders || {}).forEach(([slot, time]) => {
      const tag = `${dateKey()}-${slot}`;
      if (time === now && !fired.has(tag)) {
        fired.add(tag);
        const items = pending(state);
        if (!items.length) return;
        new Notification(`${APP.name} · ${currentSlot().label} 체크인`, {
          body: items.map((i) => i.title).join(' / '),
          tag,
        });
      }
    });
  };
  tick();
  setInterval(tick, 30000);
}

function boot() {
  document.querySelector('.tabbar').innerHTML = TABS.map((t) => `
    <a href="${t.href}"><span class="ti" aria-hidden="true">${t.icon}</span>${t.label}</a>`).join('');

  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  if (!location.hash || !ROUTES[location.hash.split('?')[0]]) location.hash = '#/today';
  render('top');

  window.addEventListener('hashchange', () => render('top'));
  document.getElementById('settings-btn').addEventListener('click', () => { location.hash = '#/settings'; });

  // 날짜가 바뀌면(자정 넘김) 체크인을 새로 계산한다
  let lastDay = dateKey();
  setInterval(() => {
    if (dateKey() !== lastDay) { lastDay = dateKey(); render('top'); }
  }, 60000);

  // 앱으로 돌아올 때 최신 상태로
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { setSettings({ lastSeen: new Date().toISOString() }); render(); }
  });

  reminderLoop();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW 등록 실패', e));
    });
  }
}

subscribe(() => {
  const n = pending(getState()).length;
  dateEl.textContent = `${new Date().getMonth() + 1}/${new Date().getDate()} ${currentSlot().label}${n ? ` · 체크 ${n}` : ''}`;
});

boot();
