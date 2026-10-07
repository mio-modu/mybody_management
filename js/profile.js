/* 프로필에 따라 화면이 달라지는 지점을 한곳에 모았다.
 * 뷰가 state.profile.modules 를 직접 뒤지지 않게 한다. */
import { PAIN_AREAS, DEFAULT_PAIN_AREAS, MODULES } from './config.js';

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

export function displayName(state) {
  return state?.profile?.name?.trim() || '';
}

export function needsOnboarding(state) {
  return !state?.profile?.onboarded;
}
