/* 홈 화면에 앱으로 설치하기
 *
 * 안드로이드·크롬: beforeinstallprompt 를 잡아 뒀다가 버튼을 눌렀을 때 띄운다.
 * 아이폰·사파리: 설치 API 가 없다. 공유 → 홈 화면에 추가를 안내한다.
 * 이미 설치해서 standalone 으로 열렸으면 아무것도 보여주지 않는다. */

let deferred = null;
const listeners = new Set();

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
}

export function isSafari() {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPR/.test(ua);
}

export const canPrompt = () => deferred != null;

/* 설치 버튼을 보여줄 상황인가 — 이미 깔았으면 보여주지 않는다 */
export function shouldOffer() {
  if (isStandalone()) return false;
  return canPrompt() || isIOS();
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = () => listeners.forEach((fn) => fn());

export async function promptInstall() {
  if (!deferred) return { ok: false, reason: 'no-prompt' };
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return { ok: outcome === 'accepted', outcome };
}

/* 아이폰은 버튼이 없다 — 손으로 하는 두 단계를 적어 준다 */
export function manualSteps() {
  if (isIOS()) {
    return isSafari()
      ? ['사파리 아래쪽 <strong>공유 버튼</strong>(↑) 누르기', '메뉴를 내려 <strong>홈 화면에 추가</strong> 선택', '오른쪽 위 <strong>추가</strong> 누르기']
      : ['아이폰은 <strong>사파리에서만</strong> 설치됩니다. 이 주소를 사파리로 열어 주세요.', '사파리 공유 버튼(↑) → <strong>홈 화면에 추가</strong>'];
  }
  return ['브라우저 <strong>메뉴(⋮)</strong> 열기', '<strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong> 선택'];
}

export function init() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try { localStorage.setItem('mbm.installed', '1'); } catch { /* 저장 불가여도 동작엔 지장 없다 */ }
    notify();
  });
}

/* 홈 화면 배너를 닫았는지 — 닫으면 다시 묻지 않는다 */
const DISMISS_KEY = 'mbm.installDismissed';
export function dismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
export function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 무시 */ }
  notify();
}
