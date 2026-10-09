/* 프로필에 따라 화면이 달라지는 지점을 한곳에 모았다.
 * 뷰가 state.profile.modules 를 직접 뒤지지 않게 한다. */
import { PAIN_AREAS, DEFAULT_PAIN_AREAS, MODULES, variantKey } from './config.js';

export function hasModule(state, id) {
  if (id === 'weight') return true;             // 체중은 끌 수 없다
  return state?.profile?.modules?.[id] !== false;
}

export function painAreas(state) {
  const ids = state?.profile?.painAreas?.length ? state.profile.painAreas : DEFAULT_PAIN_AREAS;
  return PAIN_AREAS.filter((a) => ids.includes(a.id));
}

export function activeModules(state) {
  return MODULES.filter((m) => hasModule(state, m.id));
}

/* 운동 설명을 펼칠 수 있게 할지. 아는 사람에게는 군더더기라 끌 수 있다. */
export function showHowTo(state) {
  return state?.profile?.showHowTo !== false;
}

export function displayName(state) {
  return state?.profile?.name?.trim() || '';
}

export function needsOnboarding(state) {
  return !state?.profile?.onboarded;
}

/* 허리는 협착/디스크로 처방이 갈린다. 고르지 않았으면 양쪽에 안전한 것만 쓴다. */
export function lowBackType(state) {
  return state?.profile?.lowBackType || 'unknown';
}

/* 부위 → 처방을 찾을 키. 아형이 없는 부위는 부위 id 그대로다. */
export function areaKey(state, areaId) {
  return variantKey(areaId, lowBackType(state));
}
