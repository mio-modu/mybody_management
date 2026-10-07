/* 개인 맞춤 설정값 · 목표 · 프로토콜 라이브러리
 * 숫자 목표는 설정 화면에서 바꿀 수 있고, 여기 값은 "처음 기본값"이다. */

export const APP = {
  name: '마이바디',
  version: '1.0.0',
  storageKey: 'mbm.state.v1',
};

/* ── 목표치 ─────────────────────────────────────────────── */
export const DEFAULT_TARGETS = {
  weightKg: 68,            // 1차 목표 체중
  weightPaceKgPerWeek: 0.5, // 주당 감량 속도 상한(근손실 방지)
  waistCm: 84,
  bodyFatPct: 18,
  glucoseFasting: [70, 99],   // 공복 목표 범위 mg/dL
  glucosePost: [70, 139],     // 식후 2시간 목표 범위
  glucoseRandom: [70, 139],
  hba1c: 5.6,
  ldl: 100,
  hdlMin: 50,
  tg: 150,
  tc: 200,
  tgHdlRatio: 2.0,          // 인슐린 저항성 대리 지표
  waterMl: 2200,
  proteinG: 110,
  steps: 8000,
  sitBlockMin: 50,          // 이 시간 넘게 앉지 않기
  sleepH: 7,
  painMax: 2,               // 통증 NRS 이 이하로 유지
};

/* ── 혈당 측정 맥락 ─────────────────────────────────────── */
export const GLUCOSE_CONTEXTS = [
  { id: 'fasting', label: '공복',      short: '공복', target: 'glucoseFasting', shape: 'circle' },
  { id: 'post2',   label: '식후 2시간', short: '식후', target: 'glucosePost',    shape: 'triangle' },
  { id: 'random',  label: '임의/취침전', short: '임의', target: 'glucoseRandom',  shape: 'square' },
];

/* ── 통증 부위(내 약한 지점) ────────────────────────────── */
export const PAIN_AREAS = [
  { id: 'neck',    label: '목',      primary: true },
  { id: 'lowBack', label: '허리',    primary: true },
  { id: 'shoulder',label: '어깨/등', primary: false },
  { id: 'knee',    label: '무릎',    primary: false },
];

export const PAIN_TRIGGERS = [
  '장시간 앉아 있기', '장시간 서 있기', '노트북/모니터 작업', '스마트폰 고개 숙임',
  '수면 자세', '무거운 것 들기', '운동 과부하', '스트레스', '추위/찬바람', '운전', '원인 모름',
];

/* ── 즉시 진료가 필요한 적색신호 ───────────────────────── */
export const RED_FLAGS = [
  { id: 'rf-radiate', label: '팔·다리로 뻗치는 저림이나 전기 오는 느낌' },
  { id: 'rf-weak',    label: '손·발 힘이 빠짐, 물건을 놓침, 발이 끌림' },
  { id: 'rf-bladder', label: '대소변 조절이 어렵거나 사타구니 감각 저하' },
  { id: 'rf-fever',   label: '38도 이상 발열, 원인 모를 체중 감소' },
  { id: 'rf-trauma',  label: '넘어짐·교통사고 등 외상 직후' },
  { id: 'rf-night',   label: '밤에 깰 정도의 통증, 쉬어도 안 줄어듦' },
];

/* ── 통증 단계(NRS 0-10) ───────────────────────────────── */
export const PAIN_TIERS = [
  { id: 'A', max: 2,  label: '괜찮음 · 강화 단계', tone: 'good',
    intent: '통증이 거의 없다. 지금이 근력과 지지력을 쌓을 때다.' },
  { id: 'B', max: 5,  label: '불편함 · 가동성 단계', tone: 'warning',
    intent: '통증 범위 안에서 움직임을 되찾는 데 집중한다. 무게·강도는 올리지 않는다.' },
  { id: 'C', max: 8,  label: '통증 심함 · 진정 단계', tone: 'serious',
    intent: '자극을 줄이고 통증을 가라앉힌다. 운동보다 자세·휴식 간격이 먼저다.' },
  { id: 'D', max: 10, label: '매우 심함 · 보호 단계', tone: 'critical',
    intent: '통증을 키우는 동작을 모두 멈춘다. 48시간 안에 호전 없으면 진료.' },
];

export function tierFor(score) {
  const s = Number(score) || 0;
  return PAIN_TIERS.find((t) => s <= t.max) || PAIN_TIERS[PAIN_TIERS.length - 1];
}

/* ── 부위 × 단계별 처방 ────────────────────────────────── */
export const PROTOCOLS = {
  neck: {
    A: [
      { name: '턱 당기기(친턱)', dose: '10회 × 3세트', why: '깊은 목굽힘근을 깨워 머리 무게를 분산' },
      { name: '밴드 로우', dose: '15회 × 3세트', why: '등 상부가 버텨주면 목이 일을 덜 한다' },
      { name: '월 슬라이드(벽 천사)', dose: '10회 × 2세트', why: '어깨뼈 상방 회전 복구' },
      { name: '흉추 신전(폼롤러)', dose: '10회', why: '등이 굽으면 목이 대신 꺾인다' },
      { name: '상부 승모근 스트레칭', dose: '좌우 30초 × 2', why: '과활성 근육 길이 회복' },
    ],
    B: [
      { name: '친턱(가볍게)', dose: '8회 × 3세트', why: '통증 없는 범위까지만' },
      { name: '목 등척성 6방향', dose: '방향별 5초 × 5회', why: '움직임 없이 안전하게 근신경 자극' },
      { name: '흉추 회전(앉아서)', dose: '좌우 10회', why: '목 대신 등이 돌게 만든다' },
      { name: '어깨 외회전(밴드)', dose: '15회 × 3세트', why: '어깨 안정화' },
      { name: '사각근·상부승모 스트레칭', dose: '좌우 30초 × 2', why: '긴장 완화' },
      { name: '온열 팩', dose: '15분', why: '근긴장형 통증에 효과' },
    ],
    C: [
      { name: '횡격막 호흡 + 이완', dose: '5분', why: '통증 감작과 근긴장을 함께 낮춘다' },
      { name: '친턱(아주 가볍게)', dose: '5회 × 2세트', why: '통증 0~2 범위 안에서만' },
      { name: '온열 후 가벼운 목 회전', dose: '좌우 5회', why: '움직임을 완전히 멈추지는 않는다' },
      { name: '20분마다 일어서기', dose: '하루 종일', why: '같은 자세 유지가 가장 큰 자극원' },
      { name: '모니터 눈높이 재조정', dose: '즉시', why: '원인 제거가 최우선' },
    ],
    D: [
      { name: '통증 유발 동작 전면 중단', dose: '—', why: '지금은 보호가 치료다' },
      { name: '호흡 + 지지된 자세로 휴식', dose: '목 받침 사용', why: '중립 자세 유지' },
      { name: '베개 높이 점검', dose: '즉시', why: '누운 자세가 밤새 자극한다' },
      { name: '48시간 내 호전 없으면 진료', dose: '—', why: '단순 근긴장이 아닐 수 있다' },
    ],
  },
  lowBack: {
    A: [
      { name: '맥길 컬업', dose: '8회 × 3세트', why: '허리를 굽히지 않고 복부를 쓴다' },
      { name: '사이드 플랭크', dose: '좌우 20초 × 3', why: '측면 지지대 강화' },
      { name: '버드독', dose: '좌우 8회 × 3', why: '체간 안정성 + 협응' },
      { name: '힙 힌지(루마니안 데드리프트)', dose: '10회 × 3세트', why: '허리 대신 엉덩이로 들기' },
      { name: '글루트 브리지', dose: '15회 × 3세트', why: '엉덩이가 약하면 허리가 대신 쓴다' },
      { name: '걷기', dose: '30분', why: '디스크 영양 공급' },
    ],
    B: [
      { name: '캣카우', dose: '10회', why: '척추 분절 가동성' },
      { name: '데드버그', dose: '좌우 8회 × 3', why: '허리를 고정한 채 팔다리 움직이기' },
      { name: '글루트 브리지', dose: '12회 × 3세트', why: '통증 없는 강화' },
      { name: '햄스트링 스트레칭', dose: '좌우 30초 × 2', why: '뒤쪽 사슬 긴장 완화' },
      { name: '고관절 굴곡근 스트레칭', dose: '좌우 30초 × 2', why: '앉아 있는 시간의 반작용' },
      { name: '걷기', dose: '20분 × 1~2회', why: '한 번에 길게보다 나눠서' },
    ],
    C: [
      { name: '횡격막 호흡', dose: '5분', why: '보호성 근경직 완화' },
      { name: '무릎 가슴으로 당기기', dose: '좌우 20초 × 3', why: '편안한 쪽만, 통증 없는 범위' },
      { name: '골반 전후 기울이기', dose: '10회', why: '아주 작은 움직임으로 시작' },
      { name: '짧게 자주 걷기', dose: '10분 × 3회', why: '누워만 있으면 더 굳는다' },
      { name: '앉는 시간 20분 제한', dose: '하루 종일', why: '앉기는 허리 디스크 압력 최대' },
    ],
    D: [
      { name: '상대적 휴식(완전 침상안식 금지)', dose: '1~2일', why: '2일 넘는 누워 있기는 회복을 늦춘다' },
      { name: '통증 없는 범위의 최소 움직임', dose: '자주', why: '굳지 않게만' },
      { name: '누운 자세: 무릎 아래 베개', dose: '—', why: '허리 전만 감소' },
      { name: '진료 고려 / 적색신호 확인', dose: '즉시', why: '신경 압박 배제 필요' },
    ],
  },
  shoulder: {
    A: [{ name: '밴드 외회전', dose: '15회 × 3세트', why: '회전근개 강화' },
        { name: '페이스 풀', dose: '15회 × 3세트', why: '후면 어깨' }],
    B: [{ name: '진자 운동', dose: '30초 × 3', why: '무부하 가동' },
        { name: '등척성 외회전', dose: '5초 × 10', why: '통증 없는 자극' }],
    C: [{ name: '통증 범위 내 가동만', dose: '—', why: '자극 최소화' },
        { name: '온열 15분', dose: '—', why: '긴장 완화' }],
    D: [{ name: '사용 중단 + 진료 고려', dose: '—', why: '구조적 손상 배제' }],
  },
  knee: {
    A: [{ name: '스텝업', dose: '좌우 10회 × 3', why: '대퇴사두 + 엉덩이' },
        { name: '벽 스쿼트', dose: '30초 × 3', why: '등척성 근력' }],
    B: [{ name: '등척성 레그 익스텐션', dose: '20초 × 5', why: '통증 완화 효과' },
        { name: '힙 어브덕션', dose: '15회 × 3', why: '무릎 축 정렬' }],
    C: [{ name: '평지 걷기만', dose: '—', why: '계단·경사 회피' },
        { name: '냉찜질 15분', dose: '—', why: '부종 관리' }],
    D: [{ name: '체중 부하 최소화 + 진료', dose: '—', why: '손상 배제' }],
  },
};

/* ── 매일 기본 루틴(체중·혈당·통증을 동시에 건드리는 것만) ─ */
export const ROUTINE = [
  { id: 'r-water',   slot: 'allday', label: '물 2.2L 나눠 마시기', tag: '대사' },
  { id: 'r-protein', slot: 'allday', label: '끼니마다 단백질 30g 이상', tag: '체중' },
  { id: 'r-walk10',  slot: 'after-meal', label: '식후 10분 걷기 (혈당 스파이크 차단)', tag: '혈당' },
  { id: 'r-carblast',slot: 'meal', label: '채소·단백질 먼저, 탄수화물 마지막', tag: '혈당' },
  { id: 'r-break',   slot: 'allday', label: '50분마다 일어나 1분 움직이기', tag: '통증' },
  { id: 'r-rx',      slot: 'evening', label: '오늘의 통증 처방 운동 수행', tag: '통증' },
  { id: 'r-steps',   slot: 'evening', label: '8,000보 달성', tag: '체중' },
  { id: 'r-sleep',   slot: 'night', label: '7시간 수면 확보 (취침 시각 지키기)', tag: '회복' },
  { id: 'r-nosnack', slot: 'night', label: '취침 3시간 전 금식', tag: '혈당' },
];

/* ── 혈액검사 항목 ─────────────────────────────────────── */
export const LAB_FIELDS = [
  { id: 'tc',   label: '총콜레스테롤', unit: 'mg/dL', goal: (t) => ['max', t.tc] },
  { id: 'ldl',  label: 'LDL',          unit: 'mg/dL', goal: (t) => ['max', t.ldl] },
  { id: 'hdl',  label: 'HDL',          unit: 'mg/dL', goal: (t) => ['min', t.hdlMin] },
  { id: 'tg',   label: '중성지방',      unit: 'mg/dL', goal: (t) => ['max', t.tg] },
  { id: 'hba1c',label: 'HbA1c',        unit: '%',     goal: (t) => ['max', t.hba1c] },
  { id: 'glu',  label: '공복혈당(검사)', unit: 'mg/dL', goal: (t) => ['range', t.glucoseFasting] },
  { id: 'alt',  label: 'ALT',          unit: 'U/L',   goal: () => ['max', 40] },
  { id: 'ast',  label: 'AST',          unit: 'U/L',   goal: () => ['max', 40] },
  { id: 'ggt',  label: 'GGT',          unit: 'U/L',   goal: () => ['max', 60] },
  { id: 'cr',   label: '크레아티닌',    unit: 'mg/dL', goal: () => ['max', 1.3] },
  { id: 'ua',   label: '요산',          unit: 'mg/dL', goal: () => ['max', 7.0] },
  { id: 'crp',  label: 'hs-CRP',       unit: 'mg/L',  goal: () => ['max', 1.0] },
  { id: 'bpSys',label: '수축기 혈압',    unit: 'mmHg',  goal: () => ['max', 120] },
  { id: 'bpDia',label: '이완기 혈압',    unit: 'mmHg',  goal: () => ['max', 80] },
];

/* ── 시간대별 체크인 슬롯 ──────────────────────────────── */
export const CHECKIN_SLOTS = [
  { id: 'morning', from: 5,  to: 11, label: '아침', asks: ['weight', 'glucoseFasting', 'sleep', 'pain'] },
  { id: 'midday',  from: 11, to: 16, label: '낮',   asks: ['glucosePost', 'sitting', 'painRecheck'] },
  { id: 'evening', from: 16, to: 22, label: '저녁', asks: ['pain', 'routine', 'steps'] },
  { id: 'night',   from: 22, to: 29, label: '밤',   asks: ['routine', 'painRecheck'] },
];

/* ── 오늘의 미션 (보상 판정 기준) ─────────────────────────
 * 전부가 아니라 3개만. 매일 현실적으로 달성 가능해야 보상이 작동한다.
 * 체중·혈당 "수치"가 아니라 "행동"에만 건다 — 결과는 내 통제 밖이라
 * 보상으로 걸면 과속하거나 일찍 포기하게 된다. */
export const CORE_MISSIONS = [
  { id: 'm-body',    label: '몸 상태 한 번 기록',  hint: '목·허리 점수 1회면 충분', route: '#/pain' },
  { id: 'm-routine', label: '루틴 5개 이상 체크',  hint: '완벽하지 않아도 된다',     route: '#/today' },
  { id: 'm-number',  label: '숫자 1개 이상 남기기', hint: '체중 또는 혈당 아무거나',  route: '#/today' },
];

export const POINTS = {
  perDay: 10,        // 미션 3개 달성한 하루
  streakBonus: 30,   // 연속 7일마다 추가
  bonusEvery: 7,
};

/* 기본 보상 목록 — 설정에서 내 것으로 바꾼다.
 * 앱이 주는 가짜 배지보다 "내가 정한 실제 보상"이 훨씬 세게 작동한다. */
export const DEFAULT_REWARDS = [
  { id: 'rw-cafe',   title: '좋아하는 카페에서 디저트', cost: 80 },
  { id: 'rw-movie',  title: '보고 싶던 영화 한 편',     cost: 150 },
  { id: 'rw-book',   title: '사고 싶던 책 / 굿즈',      cost: 250 },
  { id: 'rw-massage',title: '마사지 · 스파 1회',        cost: 400 },
  { id: 'rw-gear',   title: '새 운동화 · 운동 장비',    cost: 700 },
];

/* 마일스톤 뱃지 — 축하용. 포인트와 달리 결과(체중·수치)도 들어간다. */
export const BADGES = [
  { id: 'b-first',   label: '첫 걸음',       desc: '첫 기록을 남겼다' },
  { id: 'b-streak3', label: '3일 연속',      desc: '미션 3일 연속 달성' },
  { id: 'b-streak7', label: '한 주 완주',    desc: '미션 7일 연속 달성' },
  { id: 'b-streak14',label: '2주 연속',      desc: '미션 14일 연속 달성' },
  { id: 'b-streak30',label: '한 달 연속',    desc: '미션 30일 연속 달성' },
  { id: 'b-streak100',label: '100일',        desc: '미션 100일 연속 달성' },
  { id: 'b-pain7',   label: '편안한 한 주',  desc: '7일 내내 통증이 목표 이하' },
  { id: 'b-tir',     label: '혈당 안정',     desc: '2주간 혈당 범위 내 80% 이상' },
  { id: 'b-w1',      label: '-1kg',          desc: '시작 체중에서 1kg 감량' },
  { id: 'b-w3',      label: '-3kg',          desc: '시작 체중에서 3kg 감량' },
  { id: 'b-w5',      label: '-5kg',          desc: '시작 체중에서 5kg 감량' },
  { id: 'b-goal',    label: '목표 도달',     desc: '목표 체중에 도달했다' },
];
