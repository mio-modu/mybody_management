/* 개인 맞춤 설정값 · 목표 · 프로토콜 라이브러리
 * 숫자 목표는 설정 화면에서 바꿀 수 있고, 여기 값은 "처음 기본값"이다. */

export const APP = {
  name: '마이바디',
  version: '1.0.0',
  storageKey: 'mbm.state.v1',
  /* 공유할 때 쓰는 정본 주소. 기록은 주소마다 따로 저장되므로
   * 사본이 여럿이어도 남에게 보내는 링크는 하나여야 한다.
   * 직접 호스팅한다면 이 값을 자기 주소로 바꾸거나 빈 문자열로 둔다
   * (빈 문자열이면 지금 열려 있는 주소를 쓴다). */
  siteUrl: 'https://mybodymanagement.vercel.app',
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

/* ── 관리 모듈 ───────────────────────────────────────────
 * 사람마다 관리할 것이 다르다. 체중은 공통, 나머지는 켜고 끈다.
 * 꺼진 모듈은 탭·체크인·미션·리포트에서 통째로 사라진다. */
export const MODULES = [
  { id: 'weight',  label: '체중 · 체성분', desc: '목표 체중, 허리둘레, BMI', fixed: true },
  { id: 'glucose', label: '혈당',          desc: '공복·식후 혈당, 범위 내 비율' },
  { id: 'labs',    label: '혈액검사 · 혈압', desc: '콜레스테롤, HbA1c, 간수치' },
  { id: 'pain',    label: '통증 · 재활',    desc: '아픈 곳 점수와 그날의 처방 운동' },
];

export const DEFAULT_MODULES = { weight: true, glucose: true, labs: true, pain: true };
export const DEFAULT_PAIN_AREAS = ['neck', 'lowBack'];

/* ── 혈당 측정 맥락 ─────────────────────────────────────── */
export const GLUCOSE_CONTEXTS = [
  { id: 'fasting', label: '공복',      short: '공복', target: 'glucoseFasting', shape: 'circle' },
  { id: 'post2',   label: '식후 2시간', short: '식후', target: 'glucosePost',    shape: 'triangle' },
  { id: 'random',  label: '임의/취침전', short: '임의', target: 'glucoseRandom',  shape: 'square' },
];

/* ── 통증 부위(내 약한 지점) ────────────────────────────── */
export const PAIN_AREAS = [
  { id: 'neck',    label: '목',       primary: true,  radiates: 'upper' },
  { id: 'lowBack', label: '허리',     primary: true,  radiates: 'lower' },
  { id: 'shoulder',label: '어깨/등',  primary: false, radiates: 'upper' },
  { id: 'thumb',   label: '손 · 엄지', primary: false },
  { id: 'knee',    label: '무릎',     primary: false },
];

/* ── 저림이 어디까지 내려오는가 ──────────────────────────
 * 통증 점수보다 정확한 지표다. 아픈 정도는 그날 컨디션에 흔들리지만
 * 저리는 "범위"는 잘 안 속는다.
 *   손끝 쪽으로 더 내려가면 → 나빠지는 중
 *   어깨 쪽으로 올라오면   → 좋아지는 중 */
export const RADIATION = {
  upper: ['없음', '목·어깨에만', '팔 위쪽까지', '팔꿈치까지', '손목까지', '손끝까지'],
  lower: ['없음', '허리에만', '엉덩이까지', '허벅지까지', '무릎 아래까지', '발끝까지'],
};

export const PAIN_TRIGGERS = [
  '장시간 앉아 있기', '장시간 서 있기', '노트북/모니터 작업', '스마트폰 고개 숙임',
  '수면 자세', '무거운 것 들기', '운동 과부하', '스트레스', '추위/찬바람', '운전', '원인 모름',
  '고개 젖히고 돌아보기', '집는 동작(병뚜껑·열쇠)', '이 악물기', '한쪽으로 가방 들기',
];

/* ── 부위별로 "하지 않는 것" ─────────────────────────────
 * 운동을 더하는 것보다 자극을 빼는 것이 먼저 효과가 난다.
 * 그래서 처방 화면에 운동과 같이 띄운다. */
export const AVOID_LIST = {
  neck: [
    { what: '고개를 젖히고 동시에 돌리기', why: '신경 나가는 구멍이 가장 좁아지는 자세',
      how: '후진할 때는 카메라·미러를 쓰고, 꼭 봐야 하면 목이 아니라 몸통째 돈다' },
    { what: '휴대폰을 내려다보기', why: '하루 중 가장 긴 시간이라 합이 가장 크다',
      how: '눈높이로 든다' },
    { what: '가방을 아픈 쪽 어깨에 걸기', why: '어깨가 눌리면 신경이 아래로 당겨진다',
      how: '반대쪽으로 옮기거나 등에 멘다' },
    { what: '높은 베개', why: '자는 동안 목이 꺾인 채로 굳는다',
      how: '누웠을 때 목이 수평이 되는 높이. 옆으로 잘 때 아픈 팔을 몸 아래 깔지 않는다' },
  ],
  thumb: [
    { what: '엄지와 검지 끝으로 작은 것 집기', why: '손끝 힘이 밑동 관절에서 열 배 넘게 커진다',
      how: '손 전체로 감싸거나, 고무밴드를 감아 굵게 만들어 쥔다' },
    { what: '병뚜껑·열쇠 비틀기', why: '돌리는 힘이 관절면을 갈아낸다',
      how: '오프너를 쓰거나 반대 손으로 돌린다' },
    { what: '엄지로 휴대폰 받치기', why: '약한 힘이라도 오래 걸리면 쌓인다',
      how: '손바닥에 올리거나 링홀더·그립을 쓴다' },
  ],
  'lowBack:stenosis': [
    { what: '오래 서 있기', why: '선 자세에서 통로가 가장 좁아진다',
      how: '한 발을 낮은 받침에 올리거나, 중간중간 앉는다' },
    { what: '허리를 뒤로 젖히기', why: '젖힐수록 좁아진다',
      how: '높은 선반은 발판을 쓰고 고개와 허리를 젖히지 않는다' },
    { what: '쉬지 않고 멀리 걷기', why: '걷다 보면 다리가 저리고 무거워진다',
      how: '저리기 전에 앉아서 1~2분 숙여 쉬고 다시 걷는다 — 총 거리가 늘어난다' },
  ],
  'lowBack:disc': [
    { what: '허리를 굽혀 물건 들기', why: '디스크 압력이 가장 커지는 동작',
      how: '무릎을 굽혀 앉았다 일어난다' },
    { what: '한 자세로 오래 앉기', why: '앉기가 서기보다 압력이 크다',
      how: '20~30분마다 일어난다' },
    { what: '아침에 일어나자마자 굽히기', why: '밤새 물을 머금어 디스크가 가장 불리한 때다',
      how: '일어나고 한 시간은 굽히는 일을 미룬다' },
  ],
  lowBack: [
    { what: '허리를 굽혀 물건 들기', why: '어느 쪽이든 부담이 큰 동작',
      how: '무릎을 굽혀 앉았다 일어난다' },
    { what: '한 자세로 오래 앉아 있기', why: '앉기가 서기보다 디스크 압력이 크다',
      how: '20~30분마다 일어난다' },
  ],
  shoulder: [
    { what: '팔을 머리 위로 반복해서 올리기', why: '좁은 공간에서 힘줄이 쓸린다',
      how: '어깨높이 아래에서 처리한다' },
    { what: '아픈 쪽으로 누워 자기', why: '밤새 눌린다',
      how: '반대로 눕고 팔 아래 베개를 받친다' },
  ],
  knee: [
    { what: '쪼그려 앉기 · 양반다리', why: '무릎이 가장 깊게 접히는 자세',
      how: '의자를 쓴다' },
    { what: '내리막·계단 내려가기', why: '내려갈 때 무릎에 걸리는 힘이 더 크다',
      how: '평지로 돌아가거나 난간을 쓴다' },
  ],
};

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

/* ── 부위 × 단계별 처방 ────────────────────────────────
 * core 는 "오늘 이것만 해도 된다" — 최대 3개. extra 는 여유 있을 때만.
 * 전부 맨몸 + 의자 + 벽으로 된다. 도구가 필요한 운동은 넣지 않았다.
 * id 는 js/exercises.js 의 설명과 이어진다. id 가 없는 항목은 운동이 아니라 지침이다.
 * min 은 대략 걸리는 분. 오늘 총 몇 분인지 화면에 보여 주려고 적어 둔다. */
export const PROTOCOLS = {
  /* 목은 두 묶음으로 나눈다.
   *   space — 신경이 나가는 구멍을 넓히는 자세. 이게 본진이다.
   *   glide — 들러붙은 신경을 미끄러뜨린다. 보조다. 공간이 먼저다.
   * 늘리는 것과 미끄러뜨리는 것은 다르다. 늘리면 신경 속 혈관이 같이 좁아진다. */
  neck: {
    A: {
      core: [
        { id: 'wall-occiput', group: 'space', dose: '3초 × 6회', min: 2, why: '벽이 막아 줘서 끄덕이지 않고 평행이동만 남는다' },
        { id: 'scap-depress', group: 'space', dose: '10초 × 10회', min: 2, why: '어깨가 내려가면 그 밑 통로가 열린다' },
        { id: 'nerve-glide-arm', group: 'glide', dose: '천천히 10회 왕복', min: 2, why: '들러붙지 않게 미끄러뜨린다' },
      ],
      extra: [
        { id: 'walk-tall', group: 'space', dose: '걸을 때 1분씩', min: 0, why: '따로 시간 내지 않고 걷는 김에' },
        { id: 'towel-row', group: 'space', dose: '15회 × 3세트', min: 3, why: '등이 버텨 주면 목이 일을 덜 한다' },
        { id: 'wall-angel', group: 'space', dose: '10회 × 2세트', min: 2, why: '말린 어깨를 펴 목의 부담을 줄인다' },
        { id: 'thoracic-ext-chair', group: 'space', dose: '10회', min: 2, why: '등이 굽으면 목이 대신 꺾인다' },
      ],
    },
    B: {
      core: [
        { id: 'wall-occiput', group: 'space', dose: '3초 × 6회 (살짝만)', min: 2, why: '힘은 30%면 충분하다. 세게 하면 목 앞이 끌려 들어온다' },
        { id: 'tongue-set', group: 'space', dose: '수시로', min: 1, why: '이를 물고 있으면 턱이 잠겨 머리가 대신 돈다' },
        { id: 'nerve-glide-arm', group: 'glide', dose: '천천히 10회 왕복', min: 2, why: '저리면 범위를 줄인다. 끝에서 멈추지 않는다' },
      ],
      extra: [
        { id: 'scap-depress', group: 'space', dose: '10초 × 8회', min: 2, why: '어깨를 귀에서 멀리' },
        { id: 'thoracic-rotation', group: 'space', dose: '좌우 10회', min: 2, why: '목 대신 등이 돌게 만든다' },
        { id: 'neck-isometric', group: 'space', dose: '방향별 5초 × 5회', min: 3, why: '움직이지 않고 힘만 줘서 안전하게' },
      ],
    },
    C: {
      core: [
        { id: 'breathing', dose: '5분', min: 5, why: '통증이 심한 날의 1순위' },
        { id: 'stand-break', dose: '20분마다', min: 0, why: '같은 자세 유지가 가장 큰 자극원' },
        { id: 'screen-height', group: 'space', dose: '지금 바로', min: 3, why: '운동보다 원인 제거가 먼저다' },
      ],
      extra: [
        { id: 'wall-occiput', group: 'space', dose: '3초 × 4회 (아주 가볍게)', min: 1, why: '통증 0~2 범위 안에서만' },
        { id: 'nerve-glide-arm', group: 'glide', dose: '5회 왕복 (좁은 범위)', min: 1, why: '예민한 날은 절반만. 끝나고 저림이 남으면 과한 것' },
      ],
    },
    D: {
      core: [
        { id: 'breathing', dose: '5분 × 2회', min: 10, why: '지금은 가라앉히는 것이 전부다' },
        { dose: '통증을 키우는 동작 전면 중단', min: 0, why: '보호가 치료인 단계', name: '자극 끊기' },
      ],
      extra: [
        { id: 'screen-height', dose: '지금 바로', min: 3, why: '누운 자세·베개 높이도 함께 점검' },
        { dose: '48시간 안에 호전 없으면 진료', min: 0, why: '단순 근긴장이 아닐 수 있다', name: '진료 기준' },
      ],
    },
  },
  lowBack: {
    A: {
      core: [
        { id: 'bird-dog', dose: '좌우 8회 × 3세트', min: 4, why: '허리를 고정한 채 팔다리를 쓰는 연습' },
        { id: 'glute-bridge', dose: '15회 × 3세트', min: 3, why: '엉덩이가 일하면 허리가 쉰다' },
        { id: 'hip-hinge', dose: '10회 × 3세트', min: 3, why: '물건 들 때 허리를 지키는 동작' },
      ],
      extra: [
        { id: 'mcgill-curlup', dose: '8회 × 3세트', min: 3, why: '허리를 굽히지 않고 복부를 쓴다' },
        { id: 'side-plank', dose: '좌우 20초 × 3', min: 3, why: '옆면 지지대 강화' },
        { id: 'walk-short', dose: '20분 × 1~2회', min: 20, why: '디스크 영양 공급' },
      ],
    },
    B: {
      core: [
        { id: 'dead-bug', dose: '좌우 8회 × 3세트', min: 4, why: '허리에 가장 안전한 코어 운동' },
        { id: 'glute-bridge', dose: '12회 × 3세트', min: 3, why: '통증 없는 범위의 강화' },
        { id: 'hip-flexor-stretch', dose: '좌우 30초 × 2', min: 2, why: '앉아 있는 시간의 반작용' },
      ],
      extra: [
        { id: 'cat-cow', dose: '10회', min: 2, why: '척추 마디를 푼다' },
        { id: 'hamstring-stretch', dose: '좌우 30초 × 2', min: 2, why: '뒤쪽이 짧으면 허리가 당긴다' },
        { id: 'walk-short', dose: '20분 × 1~2회', min: 20, why: '한 번에 길게보다 나눠서' },
      ],
    },
    C: {
      core: [
        { id: 'breathing', dose: '5분', min: 5, why: '보호성 근경직을 먼저 푼다' },
        { id: 'knee-to-chest', dose: '좌우 20초 × 3', min: 2, why: '편한 쪽만, 통증 없는 범위' },
        { id: 'walk-short', dose: '10분 × 2~3회', min: 20, why: '누워만 있으면 더 굳는다' },
      ],
      extra: [
        { id: 'pelvic-tilt', dose: '10회', min: 2, why: '아주 작은 움직임부터' },
        { id: 'stand-break', dose: '앉는 시간 20분 제한', min: 0, why: '앉기는 디스크 압력이 가장 크다' },
      ],
    },
    D: {
      core: [
        { id: 'breathing', dose: '5분 × 2회', min: 10, why: '지금은 가라앉히는 것이 전부다' },
        { id: 'pelvic-tilt', dose: '5회 (아주 작게)', min: 1, why: '완전히 멈추면 더 굳는다' },
      ],
      extra: [
        { dose: '1~2일, 완전한 침상안식은 금지', min: 0, name: '상대적 휴식', why: '2일 넘게 누워 있으면 회복이 늦어진다' },
        { dose: '진료 고려 · 적색신호 재확인', min: 0, name: '진료 기준', why: '신경 압박 배제가 먼저다' },
      ],
    },
  },

  shoulder: {
    A: {
      core: [
        { id: 'prone-y', dose: '10회 × 3세트', min: 3, why: '어깨 뒤와 등을 함께 쓴다' },
        { id: 'wall-angel', dose: '10회 × 2세트', min: 2, why: '어깨뼈가 제대로 돌게 만든다' },
      ],
      extra: [{ id: 'towel-row', dose: '15회 × 3세트', min: 3, why: '등 상부 강화' }],
    },
    B: {
      core: [
        { id: 'pendulum', dose: '30초 × 3', min: 2, why: '힘을 주지 않고 관절만 움직인다' },
        { id: 'isometric-er', dose: '5초 × 10회', min: 2, why: '움직이지 않고 회전근개에 자극' },
      ],
      extra: [{ id: 'wall-angel', dose: '8회 (가볍게)', min: 2, why: '통증 없는 범위까지만' }],
    },
    C: {
      core: [
        { id: 'pendulum', dose: '30초 × 2', min: 1, why: '무부하 가동만 남긴다' },
        { id: 'breathing', dose: '5분', min: 5, why: '긴장 완화' },
      ],
      extra: [{ id: 'stand-break', dose: '자세 자주 바꾸기', min: 0, why: '한 자세 고정이 자극원' }],
    },
    D: {
      core: [{ dose: '사용 중단 · 진료 고려', min: 0, name: '팔 쓰지 않기', why: '구조적 손상 배제가 먼저다' }],
      extra: [],
    },
  },

  knee: {
    A: {
      core: [
        { id: 'step-up', dose: '좌우 10회 × 3', min: 4, why: '계단에서 쓰는 힘을 그대로 기른다' },
        { id: 'wall-sit', dose: '30초 × 3', min: 3, why: '무릎을 덜 움직이고 힘을 키운다' },
      ],
      extra: [{ id: 'hip-abduction', dose: '좌우 15회 × 2', min: 3, why: '무릎 축 정렬' }],
    },
    B: {
      core: [
        { id: 'isometric-knee-ext', dose: '20초 × 5회', min: 3, why: '아픈 날에도 되는 근력 운동' },
        { id: 'hip-abduction', dose: '좌우 15회 × 3', min: 4, why: '엉덩이 옆이 약하면 무릎이 무너진다' },
      ],
      extra: [{ id: 'wall-sit', dose: '20초 × 2 (얕게)', min: 2, why: '통증 없는 깊이까지만' }],
    },
    C: {
      core: [
        { id: 'walk-short', dose: '평지 10분 × 2회', min: 20, why: '계단·경사는 피한다' },
        { id: 'isometric-knee-ext', dose: '20초 × 3회', min: 2, why: '부담 없이 힘만 유지' },
      ],
      extra: [],
    },
    D: {
      core: [{ dose: '체중 부하 최소화 · 진료', min: 0, name: '무릎에 체중 싣지 않기', why: '손상 배제가 먼저다' }],
      extra: [],
    },
  },
  /* 엄지 밑동(손목과 만나는 관절)은 집는 동작에서 손끝 힘의 열 배 넘게 받는다.
   * 그래서 쉬는 것만으로는 안 줄어든다 — 받치거나 동작을 바꿔야 한다.
   * 가장 효과가 큰 순서: 보조기 → 집는 방식 → 운동. */
  thumb: {
    A: {
      core: [
        { id: 'thumb-fdi', dose: '10초 × 10회', min: 2, why: '늘어난 인대 대신 관절을 잡아 주는 근육' },
        { id: 'thumb-c-hold', dose: '10초 × 10회', min: 2, why: '쥐는 모양 그대로 버티게 한다' },
        { id: 'finger-spread', dose: '5초 × 20회', min: 2, why: '쥐기만 하는 하루의 균형을 맞춘다' },
      ],
      extra: [
        { id: 'pinch-swap', dose: '늘', min: 0, why: '좋아져도 집는 습관은 그대로 간다' },
      ],
    },
    B: {
      core: [
        { id: 'thumb-brace', dose: '아픈 일 할 때 + 잘 때', min: 1, why: '가장 싸고 가장 빨리 체감된다' },
        { id: 'pinch-swap', dose: '늘', min: 0, why: '끝으로 집는 동작에서 레버가 최대가 된다' },
        { id: 'thumb-fdi', dose: '10초 × 10회', min: 2, why: '관절을 조여 주는 근육을 깨운다' },
      ],
      extra: [
        { id: 'thumb-c-hold', dose: '10초 × 8회', min: 2, why: '아프지 않은 선까지만' },
        { id: 'finger-spread', dose: '5초 × 15회', min: 2, why: '손 전체를 편다' },
      ],
    },
    C: {
      core: [
        { id: 'thumb-brace', dose: '깨어 있는 동안 대부분 + 잘 때', min: 1, why: '지금은 받치는 것이 1순위' },
        { id: 'pinch-swap', dose: '늘', min: 0, why: '자극을 빼는 것이 운동보다 먼저다' },
      ],
      extra: [
        { id: 'finger-spread', dose: '5초 × 10회 (아프지 않게)', min: 1, why: '굳지 않을 만큼만' },
      ],
    },
    D: {
      core: [
        { dose: '집는 동작 전면 중단 · 보조기 착용', min: 0, name: '엄지에 힘 싣지 않기', why: '지금은 보호가 전부다' },
        { dose: '엑스레이 확인', min: 0, name: '정형외과 (수부 전공)', why: '어긋난 채 붙었는지가 앞으로를 완전히 바꾼다' },
      ],
      extra: [],
    },
  },
};

/* ── 부위마다 원리 한 줄 ──────────────────────────────
 * 운동 목록만 주면 상황이 바뀔 때 못 쓴다. 원리는 한 문장인데 무한히 적용된다.
 * 셋이 전부 같은 말을 한다 — 증상이 있는 자리는 원인이 있는 자리가 아니다. */
export const PRINCIPLES = {
  neck: {
    title: '줄의 길이는 정해져 있다',
    body: '목에서 손끝까지 가는 신경은 길이가 정해진 한 가닥 줄이다. '
        + '한쪽에서 더 필요하면 다른 쪽에서 빌려오고, 빌릴 데가 없으면 늘어난다. '
        + '머리가 앞으로 나와 있으면 가만히 있어도 이미 여유를 써버린 상태라, 조금만 움직여도 끝에 닿는다.',
    so: '아픈 곳은 팔인데 원인은 목에 있다. 팔을 주물러서는 바뀌지 않는다.',
    cue: '뒤통수를 천장 쪽으로 밀어 올린다',
    check: '키가 1cm 커졌나',
  },
  shoulder: {
    title: '앞이 짧고 뒤가 길다',
    body: '어깨가 말리면 가슴 앞 작은 근육이 짧아져 날개뼈를 앞으로 끌어당긴다. '
        + '날개뼈 사이 근육은 그걸 되잡느라 늘어난 채로 종일 일한다. '
        + '늘어난 채 일하는 근육이 가장 빨리 지친다.',
    so: '아픈 곳은 뒤인데 짧은 곳은 앞이다. 뒤를 늘리면 더 나빠진다.',
    cue: '어깨를 뒷주머니에 넣는다',
    check: '어깨가 으쓱 올라가지 않았나',
  },
  thumb: {
    title: '손끝 힘이 받침점에서 열 배가 된다',
    body: '엄지 밑동 관절은 엄지라는 지렛대의 받침점이다. '
        + '손끝에서 1만큼 집으면 이 관절에는 10이 넘게 걸린다. '
        + '문 열고 숟가락 들고 휴대폰 쥐는 것까지 전부 집는 동작이라, 쉬겠다고 마음먹어도 쉬어지지 않는다.',
    so: '쉬는 것으로는 안 줄어든다. 받치거나 집는 방식을 바꿔야 한다.',
    cue: '끝으로 집지 말고 손 전체로 감싼다',
    check: '엄지 밑동에 힘이 안 실리나',
  },
  'lowBack:stenosis': {
    title: '좁아진 통로는 자세에 따라 넓어졌다 좁아진다',
    body: '협착은 공간이 실제로 좁아진 것이라 자세로 되돌릴 수 없다. '
        + '그런데 그 공간은 허리를 펴면 더 좁아지고, 앞으로 숙이면 넓어진다. '
        + '그래서 서거나 걸을 때 아프고 앉거나 숙이면 몇 분 안에 풀린다.',
    so: '되찾는 문제가 아니라 좁은 공간을 덜 쓰는 문제다. 치료가 아니라 운영이다.',
    cue: '오래 서지 말고, 힘들면 앞으로 기대 쉰다',
    check: '숙이면 몇 분 안에 풀리나',
  },
  'lowBack:disc': {
    title: '앉아 있는 것이 허리에 가장 큰 압력이다',
    body: '디스크는 굽힌 자세에서 뒤쪽으로 밀린다. 앉기는 서기보다 압력이 크고, '
        + '굽혀서 드는 동작에서 가장 커진다. 협착과 반대로 펴는 쪽이 대체로 편하다.',
    so: '늘리기보다 앉는 시간을 끊고, 드는 동작을 고관절로 옮기는 쪽이 먼저다.',
    cue: '허리를 굽히지 말고 엉덩이를 뒤로 보낸다',
    check: '등이 평평하게 유지되나',
  },
  lowBack: {
    title: '허리는 굽히는 곳이 아니라 버티는 곳이다',
    body: '굽히고 비트는 일은 원래 고관절이 한다. '
        + '고관절이 뻣뻣하면 그 일이 허리로 넘어오고, 허리는 버티는 구조라 그 일에 약하다.',
    so: '허리를 늘리기보다 고관절을 쓰고 허리를 버티게 하는 쪽이 먼저다.',
    cue: '허리를 굽히지 말고 엉덩이를 뒤로 보낸다',
    check: '등이 평평하게 유지되나',
  },
  knee: {
    title: '무릎은 위아래가 시킨 일을 받는다',
    body: '무릎은 거의 한 방향으로만 움직이는 관절이다. '
        + '엉덩이가 약하거나 발이 무너지면 그 비틀림이 전부 무릎으로 간다.',
    so: '아픈 곳은 무릎인데 할 일은 엉덩이에 있는 경우가 많다.',
    cue: '무릎이 안쪽으로 모이지 않게 한다',
    check: '무릎이 두 번째 발가락 방향을 보나',
  },
};

/* ── 허리는 아형을 나눈다 ────────────────────────────
 * 협착과 디스크는 편해지는 방향이 정반대다. 하나로 뭉쳐 처방하면 절반은 반드시 틀린다.
 * 모르면 'unknown' 으로 두고, 앱이 그 사실을 숨기지 않는다. */
export const LOWBACK_TYPES = [
  { id: 'unknown', label: '아직 모름', desc: '확인 전입니다. 양쪽에 다 안전한 것만 보여드립니다' },
  { id: 'stenosis', label: '협착 쪽', desc: '서거나 걸을 때 아프고, 앞으로 숙이거나 앉으면 풀린다' },
  { id: 'disc', label: '디스크 쪽', desc: '앉아 있거나 굽힐 때 아프고, 서거나 펴면 풀린다' },
];

/* 아형이 있는 부위는 'lowBack:stenosis' 같은 키로 찾는다 */
export function variantKey(areaId, type) {
  if (areaId !== 'lowBack') return areaId;
  return type && type !== 'unknown' ? `lowBack:${type}` : 'lowBack';
}

/* ── 지금 불편할 때 바로 하는 조치 ──────────────────────
 * 매일 하는 처방과 다르다. 1~3분짜리, 그 자리에서 되는 것만.
 * id 가 EXERCISES 에 있으면 이름과 설명을 거기서 가져오고,
 * label 을 직접 가진 항목은 운동이 아니라 행동이다. */
export const RELIEF_ACTIONS = {
  neck: [
    { id: 'rl-overhead', label: '아픈 쪽 팔을 머리 위에 올리기', dose: '30초~1분', min: 1,
      why: '신경이 느슨해지는 자세. 팔을 올리면 편해지는 사람에게 가장 빠르다' },
    { id: 'wall-occiput', dose: '3초 × 5회', min: 1, why: '구멍을 여는 자세로 리셋' },
    { id: 'scap-depress', dose: '10초 × 5회', min: 1, why: '어깨를 내려 통로를 연다' },
    { id: 'rl-stand', label: '일어나서 1분 걷기', dose: '1분', min: 1,
      why: '같은 자세를 끊는 것만으로 줄어드는 경우가 많다' },
    { id: 'nerve-glide-arm', dose: '좁은 범위로 5회', min: 1, why: '저리면 하지 않는다' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12,
      why: '주무르는 것과 효과는 비슷한데 자극이 훨씬 적다' },
  ],
  shoulder: [
    { id: 'rl-door', label: '문틀에 팔 걸고 가슴 열기', dose: '좌우 20초', min: 1,
      why: '짧아진 앞쪽을 푼다. 뒤를 늘리는 게 아니다' },
    { id: 'scap-depress', dose: '10초 × 5회', min: 1, why: '어깨를 뒷주머니에' },
    { id: 'rl-stand', label: '일어나서 1분 걷기', dose: '1분', min: 1, why: '같은 자세 끊기' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12, why: '자극이 적은 완화' },
  ],
  thumb: [
    { id: 'thumb-brace', dose: '지금 차기', min: 1, why: '가장 빨리 체감된다' },
    { id: 'rl-rest-pinch', label: '집는 동작 30분 쉬기', dose: '30분', min: 0,
      why: '지금 아프면 자극을 빼는 것이 먼저다' },
    { id: 'finger-spread', dose: '5초 × 10회', min: 1, why: '쥐기만 한 손을 편다' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12, why: '뻣뻣할 때' },
  ],
  'lowBack:stenosis': [
    { id: 'rl-sit', label: '앉아서 앞으로 살짝 숙이기', dose: '1~2분', min: 2,
      why: '숙이면 통로가 넓어진다. 협착에서 가장 빠른 완화다' },
    { id: 'knee-to-chest', dose: '좌우 20초 × 2', min: 2, why: '허리를 둥글게 해 공간을 연다' },
    { id: 'rl-lean', label: '카트·난간에 기대서 걷기', dose: '걸을 때', min: 0,
      why: '상체를 앞으로 기대면 더 멀리 걸을 수 있다' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12, why: '근긴장이 섞였을 때' },
  ],
  'lowBack:disc': [
    { id: 'rl-stand', label: '일어나서 1분 걷기', dose: '1분', min: 1,
      why: '앉아 있는 것이 디스크에 압력이 가장 크다' },
    { id: 'rl-prone', label: '엎드려 팔꿈치로 상체 받치기', dose: '1~2분', min: 2,
      why: '펴는 쪽이 대체로 편하다. 저리면 바로 멈춘다' },
    { id: 'pelvic-tilt', dose: '10회', min: 2, why: '가볍게 움직여 푼다' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12, why: '근긴장이 섞였을 때' },
  ],
  lowBack: [
    { id: 'rl-stand', label: '일어나서 1분 걷기', dose: '1분', min: 1,
      why: '자세를 끊는 것은 어느 쪽이든 안전하다' },
    { id: 'cat-cow', dose: '10회', min: 2, why: '아프지 않은 범위에서만' },
    { id: 'pelvic-tilt', dose: '10회', min: 2, why: '가볍게 움직여 푼다' },
    { id: 'rl-heat', label: '따뜻하게 하기', dose: '10~15분', min: 12, why: '근긴장이 섞였을 때' },
  ],
  knee: [
    { id: 'rl-stand', label: '자세 바꾸기', dose: '1분', min: 1, why: '같은 각도로 오래 두지 않는다' },
    { id: 'isometric-knee-ext', dose: '20초 × 3회', min: 2, why: '부담 없이 힘만 유지' },
    { id: 'rl-elevate', label: '다리 올리고 쉬기', dose: '10분', min: 10, why: '부었을 때' },
  ],
};

/* ── 다음에 무엇이 그림을 바꾸는가 ──────────────────
 * 앱이 할 수 있는 일에는 끝이 있다. 그 선을 숨기지 않는다.
 * 자세와 부하는 추측으로 시작해도 손해가 없지만,
 * 구조를 모르면 처방이 통째로 틀릴 수 있는 부위가 있다. */
export const NEXT_STEP = {
  neck: { need: false, what: '4주 뒤 다시 재기',
    why: '자세로 바뀌는 부분은 2~4주에 방향이 보입니다. 변화가 없으면 그때 영상 검사입니다.' },
  shoulder: { need: false, what: '4주 뒤 다시 재기',
    why: '양쪽이 대칭으로 불편하면 자세 부하 쪽입니다. 한쪽만이면 다른 이야기입니다.' },
  thumb: { need: true, what: '엑스레이 한 장',
    why: '늘어난 인대 · 닳은 관절 · 어긋난 채 붙은 것 — 셋 중 어느 쪽인지로 할 일이 완전히 달라집니다. '
       + '어긋난 경우는 기다릴수록 닳기 때문에, 여기서는 기다리는 것이 손해입니다.' },
  lowBack: { need: true, what: '협착인지 디스크인지 확인',
    why: '둘은 편해지는 방향이 정반대입니다. 모르는 채로 고르면 절반은 틀립니다. '
       + '이미 받은 검사 기록이 있으면 어느 마디인지만 찾아도 됩니다.' },
  knee: { need: false, what: '6주 뒤 다시 재기',
    why: '붓거나 걸리는 느낌이 있으면 그 전에 진료를 보세요.' },
};

/* 조치 효과를 판단하려면 몇 번은 쌓여야 한다. 그 전에는 숫자를 말하지 않는다. */
export const RELIEF_MIN_N = 3;

/* 한 번에 보여 줄 운동 수 — 많으면 아무것도 안 하게 된다 */
export const RX_LIMITS = {
  topAreaCore: 3,   // 가장 아픈 부위
  otherAreaCore: 2, // 나머지 부위
  totalCore: 6,     // 전체 상한
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
export function coreMissions(profile = {}) {
  const m = profile.modules || DEFAULT_MODULES;
  const list = [];
  if (m.pain !== false) {
    list.push({ id: 'm-body', label: '몸 상태 한 번 기록', hint: '아픈 곳 점수 1회면 충분', route: '#/pain' });
  }
  list.push({ id: 'm-routine', label: '루틴 5개 이상 체크', hint: '완벽하지 않아도 된다', route: '#/today' });
  list.push({
    id: 'm-number',
    label: '숫자 1개 이상 남기기',
    hint: m.glucose !== false ? '체중 또는 혈당 아무거나' : '오늘 체중 한 번',
    route: '#/today',
  });
  if (m.pain === false) {
    list.push({ id: 'm-move', label: '움직임 기록', hint: '걸음 수 또는 물 섭취량', route: '#/today' });
  }
  return list;
}

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
