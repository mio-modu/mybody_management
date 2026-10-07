/* 검진 결과지 텍스트 → 숫자 추출
 *
 * 병원·검진센터마다 표기가 다르다. 같은 항목을 부르는 이름을 전부 모아 두고,
 * 라벨을 찾은 뒤 그 뒤에 처음 나오는 숫자를 가져온다.
 * "124 (정상 0~130)" 처럼 참고범위가 붙어 있어도 앞의 측정값만 집는다.
 * 말이 안 되는 값은 버린다 — 잘못 집은 숫자가 들어가는 것보다 비어 있는 게 낫다. */

const FIELDS = [
  { id: 'tc',    names: ['총콜레스테롤', '총 콜레스테롤', '총콜레스테롤(TC)', 'totalcholesterol', '콜레스테롤(총)', 'tchol', 'tc'], range: [50, 500] },
  { id: 'ldl',   names: ['ldl콜레스테롤', 'ldl-콜레스테롤', 'ldl콜레스테롤(직접)', '저밀도지단백', '저밀도콜레스테롤', 'ldlc', 'ldl'], range: [10, 400] },
  { id: 'hdl',   names: ['hdl콜레스테롤', 'hdl-콜레스테롤', '고밀도지단백', '고밀도콜레스테롤', 'hdlc', 'hdl'], range: [10, 150] },
  { id: 'tg',    names: ['중성지방', '트리글리세라이드', 'triglyceride', 'tg'], range: [10, 2000] },
  { id: 'hba1c', names: ['당화혈색소', '당화혈색소(hba1c)', 'hba1c', 'a1c', '헤모글로빈a1c'], range: [3, 18] },
  { id: 'glu',   names: ['공복혈당', '공복 혈당', '공복시혈당', '식전혈당', 'glucose', 'fbs', '혈당'], range: [30, 500] },
  { id: 'alt',   names: ['alt', 'sgpt', 'alt(sgpt)', '알라닌아미노전이효소'], range: [1, 1000] },
  { id: 'ast',   names: ['ast', 'sgot', 'ast(sgot)', '아스파르테이트아미노전이효소'], range: [1, 1000] },
  { id: 'ggt',   names: ['감마지티피', '감마gtp', 'γ-gtp', 'ggt', 'r-gtp', '감마글루타밀전이효소'], range: [1, 1000] },
  { id: 'cr',    names: ['크레아티닌', 'creatinine', 'cr'], range: [0.1, 15] },
  { id: 'ua',    names: ['요산', 'uricacid', '요산(ua)'], range: [1, 20] },
  { id: 'crp',   names: ['crp', 'hscrp', 'hs-crp', 'c반응성단백'], range: [0, 100] },
  { id: 'bpSys', names: ['수축기혈압', '수축기', '최고혈압', 'sbp'], range: [60, 260] },
  { id: 'bpDia', names: ['이완기혈압', '이완기', '최저혈압', 'dbp'], range: [30, 180] },
];

/* 라벨을 찾을 때는 공백을 지운 문자열에서 찾고, 숫자는 공백이 살아 있는 원본에서 집는다.
 * 공백을 지운 채로 숫자를 읽으면 "5.9  4.0~5.6" 이 "5.94.0~5.6" 으로 붙어 5 로 읽힌다. */
function compact(line) {
  const chars = [];
  const map = [];
  const lower = line.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const c = lower[i];
    if (/[\s\u00a0,:|·\-_()]/.test(c)) continue;
    chars.push(c);
    map.push(i);
  }
  return { text: chars.join(''), map };
}

const normName = (s) => String(s).toLowerCase().replace(/[\s\u00a0,:|·\-_()]/g, '');

/* 라벨 뒤에서 숫자 하나. 참고범위(0~130)와 날짜는 피한다. */
function firstNumberAfter(line, from) {
  const tail = line.slice(from);
  const cleaned = tail
    .replace(/\d+(?:\.\d+)?\s*[~–—]\s*\d+(?:\.\d+)?/g, ' ')  // 참고범위
    .replace(/20\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}/g, ' ') // 날짜
    .replace(/[<>≤≥]\s*\d+(?:\.\d+)?/g, ' ');                   // "<200" 같은 참고치
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseLabText(text) {
  const found = {};
  const hits = [];
  if (!text || !text.trim()) return { found, hits, lines: 0 };

  const rawLines = String(text).split(/[\n\r]+/).filter((l) => l.trim());

  // 혈압이 "120/80" 한 덩어리로 적히는 경우
  const bp = String(text).match(/(?:혈\s*압[^0-9]{0,8})?(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bp) {
    const sys = Number(bp[1]); const dia = Number(bp[2]);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 180 && sys > dia) {
      found.bpSys = sys; found.bpDia = dia;
      hits.push({ id: 'bpSys', value: sys, line: bp[0] });
      hits.push({ id: 'bpDia', value: dia, line: bp[0] });
    }
  }

  rawLines.forEach((line) => {
    const c = compact(line);
    FIELDS.forEach((f) => {
      if (found[f.id] != null) return;
      // 긴 이름부터 맞춰야 'tc' 가 'hdl콜레스테롤' 안에서 먼저 걸리지 않는다
      const names = [...f.names].sort((a, b) => b.length - a.length);
      for (const name of names) {
        const key = normName(name);
        if (!key) continue;
        const at = c.text.indexOf(key);
        if (at < 0) continue;
        const endInOriginal = (c.map[at + key.length - 1] ?? -1) + 1;
        let v = firstNumberAfter(line, endInOriginal);
        if (v == null) v = firstNumberAfter(line, 0);
        if (v == null) continue;
        if (v < f.range[0] || v > f.range[1]) continue;
        found[f.id] = v;
        hits.push({ id: f.id, value: v, line: line.trim().slice(0, 60) });
        break;
      }
    });
  });

  return { found, hits, lines: rawLines.length };
}

/* 결과지에 적힌 검사 날짜를 찾아본다 — 2026-10-07 / 2026.10.07 / 2026년 10월 7일 */
export function parseLabDate(text) {
  if (!text) return null;
  const m = String(text).match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const pad = (x) => String(x).padStart(2, '0');
  const iso = `${y}-${pad(mo)}-${pad(d)}`;
  return Number.isNaN(new Date(`${iso}T00:00`).getTime()) ? null : iso;
}

export { FIELDS as PARSE_FIELDS };
