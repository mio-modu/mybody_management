/* 자세 그림 — 옆모습 선 그림 몇 개를 여러 운동이 나눠 쓴다.
 * 운동마다 다른 그림을 그리면 품질이 들쭉날쭉해지므로, 시작 자세만 정확히 보여준다.
 * 색은 토큰을 쓰므로 라이트·다크 모두에서 읽힌다. */

const FIG = (body) => `<svg class="pose" viewBox="0 0 120 80" aria-hidden="true">${body}</svg>`;
const G = (y) => `<line class="pose-ground" x1="14" y1="${y}" x2="106" y2="${y}" />`;
const HEAD = (x, y) => `<circle class="pose-head" cx="${x}" cy="${y}" r="7" />`;
const L = (d) => `<path class="pose-line" d="${d}" />`;

export const POSES = {
  stand: () => FIG(`${G(72)}${HEAD(58, 14)}${L('M58 21 V44')}${L('M58 27 L55 41')}${L('M58 44 V58 L63 71')}`),

  sit: () => FIG(`${G(72)}
    <path class="pose-prop" d="M44 46 H80 M44 46 V18" />
    ${HEAD(50, 14)}${L('M50 21 V46')}${L('M50 29 L61 43')}${L('M50 46 H76 V71')}`),

  supine: () => FIG(`${G(66)}${HEAD(28, 57)}${L('M35 59 H64')}${L('M64 59 L73 43')}${L('M73 43 L81 63')}${L('M42 59 L46 50')}`),

  quadruped: () => FIG(`${G(66)}${HEAD(26, 34)}${L('M33 37 H72')}${L('M36 37 V64')}${L('M70 37 V50 L63 64')}`),

  sidelying: () => FIG(`${G(62)}${HEAD(26, 48)}${L('M33 50 H68')}${L('M68 50 H88')}${L('M68 50 L84 44')}`),

  prone: () => FIG(`${G(64)}${HEAD(26, 55)}${L('M33 57 H70')}${L('M70 57 H90')}${L('M40 57 L34 48')}${L('M48 57 L44 47')}`),

  wall: () => FIG(`${G(72)}
    <path class="pose-prop" d="M34 6 V72" />
    ${HEAD(45, 14)}${L('M45 21 V44')}${L('M45 27 L37 19')}${L('M45 44 V58 L50 71')}`),

  hinge: () => FIG(`${G(72)}${HEAD(36, 26)}${L('M42 30 L62 40')}${L('M48 33 L45 48')}${L('M62 40 V58 L67 71')}`),

  bridge: () => FIG(`${G(64)}${HEAD(26, 55)}${L('M33 57 L58 44')}${L('M58 44 L72 51')}${L('M72 51 V63')}${L('M38 57 L40 63')}`),

  sideplank: () => FIG(`${G(64)}${HEAD(34, 40)}${L('M30 63 H46')}${L('M36 63 L42 47')}${L('M42 47 L88 63')}`),

  chair: () => FIG(`${G(72)}
    <path class="pose-prop" d="M44 46 H80 M80 46 V72" />
    ${HEAD(50, 14)}${L('M50 21 V46')}${L('M50 27 L63 27')}${L('M50 46 H74 V71')}`),

  walk: () => FIG(`${G(72)}${HEAD(58, 14)}${L('M58 21 V44')}${L('M58 27 L50 38')}${L('M58 27 L66 38')}${L('M58 44 L50 58 L47 71')}${L('M58 44 L67 58 L71 71')}`),
};

export function poseSVG(id) {
  const fn = POSES[id] || POSES.stand;
  return fn();
}
