/* 앱 셸 — 라우팅, 테마, 알림, 서비스워커 */
import { APP } from './config.js';
import { getState, setSettings, subscribe } from './store.js';
import { hasModule, needsOnboarding, displayName } from './profile.js';
import * as install from './install.js';
import { toast } from './ui.js';
import { dateKey, timeKey } from './utils.js';
import { pending, currentSlot } from './checkin.js';
import today from './views/today.js';
import weight from './views/weight.js';
import glucose from './views/glucose.js';
import pain from './views/pain.js';
import labs from './views/labs.js';
import report from './views/report.js';
import settings from './views/settings.js';
import onboard from './views/onboard.js';
import summary from './views/summary.js';

const ROUTES = {
  '#/start': onboard,
  '#/today': today,
  '#/weight': weight,
  '#/glucose': glucose,
  '#/pain': pain,
  '#/labs': labs,
  '#/report': report,
  '#/settings': settings,
  '#/summary': summary,
};

const ALL_TABS = [
  { href: '#/today', icon: '◉', label: '홈', module: null },
  { href: '#/weight', icon: '⚖', label: '체중', module: 'weight' },
  { href: '#/glucose', icon: '◍', label: '혈당', module: 'glucose' },
  { href: '#/pain', icon: '✚', label: '통증', module: 'pain' },
  { href: '#/report', icon: '▤', label: '리포트', module: null },
];

/* 켜 둔 모듈의 탭만 깐다 — 쓰지 않는 탭이 자리를 차지하지 않는다 */
function tabsFor(state) {
  return ALL_TABS.filter((t) => !t.module || hasModule(state, t.module));
}

function paintTabs(state) {
  const tabs = tabsFor(state);
  const bar = document.querySelector('.tabbar');
  bar.style.gridTemplateColumns = `repeat(${tabs.length}, 1fr)`;
  bar.innerHTML = tabs.map((t) => `
    <a href="${t.href}"><span class="ti" aria-hidden="true">${t.icon}</span>${t.label}</a>`).join('');
}

const view = document.getElementById('view');
const header = document.getElementById('header-title');
const dateEl = document.getElementById('header-date');

function routeKey() {
  const state = getState();
  if (needsOnboarding(state)) return '#/start';
  const h = location.hash.split('?')[0];
  if (h === '#/start') return '#/today';
  // 꺼 둔 모듈의 화면은 열리지 않는다
  if (h === '#/glucose' && !hasModule(state, 'glucose')) return '#/today';
  if (h === '#/pain' && !hasModule(state, 'pain')) return '#/today';
  if (h === '#/labs' && !hasModule(state, 'labs')) return '#/today';
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

  // 꺼진 모듈이나 온보딩으로 되돌린 경우, 주소도 실제 화면과 맞춘다
  if (location.hash.split('?')[0] !== key) history.replaceState(null, '', key);
  const who = displayName(state);
  header.textContent = key === '#/today' ? `${APP.name}${who ? ` · ${who}` : ''}` : v.title;
  if (key === '#/start') {
    dateEl.textContent = '';
    document.querySelector('.tabbar').style.display = 'none';
    document.getElementById('settings-btn').style.display = 'none';
  } else {
    document.querySelector('.tabbar').style.display = '';
    document.getElementById('settings-btn').style.display = '';
    const n = pending(state).length;
    dateEl.textContent = `${new Date().getMonth() + 1}/${new Date().getDate()} ${currentSlot().label}${n ? ` · 체크 ${n}` : ''}`;
  }
  paintTabs(state);

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
  install.init();
  install.onChange(() => render());

  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  const first = routeKey();
  if (location.hash.split('?')[0] !== first) location.hash = first;
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
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // 새 버전이 올라오면 조용히 받아 두고, 다음에 열 때 적용된다고만 알린다
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              toast('새 버전이 준비됐습니다. 다시 열면 적용됩니다');
            }
          });
        });
      }).catch((e) => console.warn('SW 등록 실패', e));
    });
  }
}

subscribe(() => {
  const st = getState();
  if (needsOnboarding(st)) return;
  const n = pending(st).length;
  dateEl.textContent = `${new Date().getMonth() + 1}/${new Date().getDate()} ${currentSlot().label}${n ? ` · 체크 ${n}` : ''}`;
});

boot();
