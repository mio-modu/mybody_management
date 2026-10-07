/* 시작 설정 — 사람마다 몸도 목표도 아픈 곳도 다르다.
 * 여기서 고른 것만 앱에 남는다. 안 고른 것은 탭에서도 사라진다. */
import { MODULES, PAIN_AREAS, DEFAULT_TARGETS } from '../config.js';
import { esc, num } from '../utils.js';
import { setProfile, setTargets, getState } from '../store.js';
import { toast, installBlock } from '../ui.js';
import * as install from '../install.js';

export default {
  title: '시작하기',
  render(state) {
    const p = state.profile;
    const m = p.modules || {};
    const areas = p.painAreas || [];

    return `
      ${install.shouldOffer() ? `<div class="card install-banner">
        <div class="ib-head">
          <img class="ib-icon" src="./assets/icons/icon-192.png" alt="" />
          <div class="ib-text">
            <div class="ib-title">먼저 홈 화면에 설치하세요</div>
            <div class="ib-sub">${install.isIOS()
              ? '아이폰은 <strong>사파리와 홈 화면 앱의 저장 공간이 따로</strong>입니다. 브라우저에서 먼저 기록하면 설치 후 그 기록이 보이지 않습니다.'
              : '설치하면 주소창 없이 전체 화면으로 열리고, 오프라인에서도 기록됩니다.'}</div>
          </div>
        </div>
        ${installBlock(install)}
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>시작 설정</h2><span class="meta">1분</span></div>
        <div style="font-size:13.5px;color:var(--ink-2)">
          여기서 고른 것만 화면에 남습니다. 나중에 설정에서 언제든 바꿀 수 있고,
          <strong>기록은 이 기기 안에만</strong> 저장됩니다.
        </div>
      </div>

      <form data-onboard>
        <div class="card">
          <div class="card-head"><h2>누구의 기록인가요</h2></div>
          <div class="field"><label for="o-name">이름 또는 호칭</label>
            <input id="o-name" name="name" type="text" maxlength="20" value="${esc(p.name || '')}" placeholder="예: 나, 아버지, 지은" required /></div>
          <div class="grid2">
            <div class="field"><label for="o-height">키 <span class="unit">cm</span></label>
              <input id="o-height" name="heightCm" type="number" step="0.5" min="100" max="230" inputmode="decimal" value="${esc(p.heightCm ?? '')}" /></div>
            <div class="field"><label for="o-birth">출생 연도</label>
              <input id="o-birth" name="birthYear" type="number" step="1" min="1920" max="2020" inputmode="numeric" value="${esc(p.birthYear ?? '')}" /></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>체중 목표</h2><span class="meta">언제든 수정 가능</span></div>
          <div class="grid2">
            <div class="field"><label for="o-start">지금 체중 <span class="unit">kg</span></label>
              <input id="o-start" name="startWeightKg" type="number" step="0.1" min="30" max="250" inputmode="decimal" value="${esc(p.startWeightKg ?? '')}" required /></div>
            <div class="field"><label for="o-target">목표 체중 <span class="unit">kg</span></label>
              <input id="o-target" name="weightKg" type="number" step="0.5" min="30" max="250" inputmode="decimal" value="${esc(state.targets.weightKg ?? DEFAULT_TARGETS.weightKg)}" required /></div>
          </div>
          <div class="note" data-pace>목표를 입력하면 안전한 속도와 예상 기간을 알려드립니다.</div>
        </div>

        <div class="card">
          <div class="card-head"><h2>무엇을 관리할까요</h2><span class="meta">끈 것은 화면에서 사라집니다</span></div>
          ${MODULES.map((mod) => `<label class="check">
            <input type="checkbox" data-module="${esc(mod.id)}" ${mod.fixed ? 'checked disabled' : (m[mod.id] !== false ? 'checked' : '')} />
            <span class="ct"><span class="cl">${esc(mod.label)}${mod.fixed ? ' (기본)' : ''}</span>
              <span class="mh" style="display:block;font-size:11.5px;color:var(--ink-muted)">${esc(mod.desc)}</span></span>
          </label>`).join('')}
        </div>

        <div class="card" data-pain-block>
          <div class="card-head"><h2>아픈 곳이 있나요</h2><span class="meta">고른 부위만 묻습니다</span></div>
          <div class="chips" data-areas>
            ${PAIN_AREAS.map((a) => `<button type="button" class="chip" data-area="${esc(a.id)}"
              aria-pressed="${areas.includes(a.id)}">${esc(a.label)}</button>`).join('')}
          </div>
          <div class="note" style="margin-top:10px">선택한 부위는 점수(0~10)를 물어보고, 그 점수에 맞춰 <strong>그날 할 운동과 피할 것</strong>이 자동으로 바뀝니다.</div>
        </div>

        <div class="card">
          <div class="note">이 앱은 개인 기록·관리 도구입니다. <strong>진단이나 치료를 대신하지 않습니다.</strong>
          팔다리 저림·힘빠짐, 대소변 장애, 발열, 외상 직후 같은 신호가 있으면 운동 대신 진료가 먼저입니다.</div>
          <button class="btn primary full" type="submit" style="margin-top:12px">시작하기</button>
        </div>
      </form>
    `;
  },

  mount(root, state, ctx) {
    root.querySelector('[data-install]')?.addEventListener('click', async () => {
      const r = await install.promptInstall();
      if (r.ok) toast('설치했습니다. 홈 화면 아이콘으로 열어 시작하세요');
      ctx.rerender('top');
    });

    const painBlock = root.querySelector('[data-pain-block]');
    const painToggle = root.querySelector('[data-module="pain"]');
    const syncPain = () => { painBlock.style.display = painToggle.checked ? '' : 'none'; };
    painToggle.addEventListener('change', syncPain);
    syncPain();

    root.querySelectorAll('[data-area]').forEach((c) => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));

    const pace = root.querySelector('[data-pace]');
    const start = root.querySelector('#o-start');
    const target = root.querySelector('#o-target');
    const calc = () => {
      const a = Number(start.value); const b = Number(target.value);
      if (!a || !b) return;
      const diff = a - b;
      if (diff <= 0) { pace.textContent = '목표가 지금 체중과 같거나 더 높습니다. 유지·증량 목표로 기록됩니다.'; return; }
      const weeks = Math.ceil(diff / 0.5);
      pace.innerHTML = `${num(diff, 1)}kg 감량 — 근손실 없이 가는 속도(주당 0.5kg)로 약 <strong>${weeks}주</strong>입니다. 더 빨리 가면 근육과 머리카락이 먼저 빠집니다.`;
    };
    start.addEventListener('input', calc);
    target.addEventListener('input', calc);
    calc();

    root.querySelector('[data-onboard]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const modules = {};
      root.querySelectorAll('[data-module]').forEach((cb) => { modules[cb.dataset.module] = cb.checked; });
      modules.weight = true;
      const picked = [...root.querySelectorAll('[data-area][aria-pressed="true"]')].map((b) => b.dataset.area);
      if (modules.pain && !picked.length) { toast('아픈 곳을 하나 이상 고르거나, 통증 관리를 꺼 주세요'); return; }

      setProfile({
        name: f.get('name') || '',
        heightCm: f.get('heightCm') ? Number(f.get('heightCm')) : null,
        birthYear: f.get('birthYear') ? Number(f.get('birthYear')) : null,
        startWeightKg: Number(f.get('startWeightKg')),
        modules,
        painAreas: picked,
        onboarded: true,
      });
      setTargets({ weightKg: Number(f.get('weightKg')) });
      toast('준비됐습니다');
      location.hash = '#/today';
      ctx.rerender('top');
    });
  },
};
