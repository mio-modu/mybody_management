/* 설정 — 목표치, 알림, 백업. 데이터는 이 기기에만 있으니 백업이 유일한 보험이다. */
import { APP, DEFAULT_TARGETS, DEFAULT_REWARDS, MODULES, PAIN_AREAS } from '../config.js';
import { dateKey, esc } from '../utils.js';
import { setProfile, setTargets, setSettings, setRewards, exportJSON, importJSON, wipeAll, uid,
  listProfiles, switchProfile, addProfile, removeProfile } from '../store.js';
import { download } from '../utils.js';
import { toast, installBlock } from '../ui.js';
import * as install from '../install.js';
import { rewardList, ledger } from '../rewards.js';
import { hasModule } from '../profile.js';

const TARGET_FIELDS = [
  { id: 'weightKg', label: '목표 체중', unit: 'kg', step: 0.5 },
  { id: 'weightPaceKgPerWeek', label: '주당 감량 속도 상한', unit: 'kg/주', step: 0.1 },
  { id: 'waistCm', label: '목표 허리둘레', unit: 'cm', step: 1 },
  { id: 'bodyFatPct', label: '목표 체지방률', unit: '%', step: 0.5 },
  { id: 'hba1c', label: '목표 HbA1c', unit: '%', step: 0.1 },
  { id: 'ldl', label: '목표 LDL 이하', unit: 'mg/dL', step: 5 },
  { id: 'hdlMin', label: '목표 HDL 이상', unit: 'mg/dL', step: 5 },
  { id: 'tg', label: '목표 중성지방 이하', unit: 'mg/dL', step: 10 },
  { id: 'tc', label: '목표 총콜레스테롤 이하', unit: 'mg/dL', step: 10 },
  { id: 'waterMl', label: '하루 물', unit: 'ml', step: 100 },
  { id: 'proteinG', label: '하루 단백질', unit: 'g', step: 5 },
  { id: 'steps', label: '하루 걸음', unit: '보', step: 500 },
  { id: 'sleepH', label: '하루 수면', unit: '시간', step: 0.5 },
  { id: 'painMax', label: '허용 통증 상한', unit: '/10', step: 1 },
];

function bytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

export default {
  title: '설정',
  render(state) {
    const t = state.targets;
    const p = state.profile;
    const size = (() => { try { return new Blob([JSON.stringify(state)]).size; } catch { return 0; } })();

    return `
      <div class="card">
        <div class="card-head"><h2>프로필</h2><span class="meta">한 기기에서 여러 명</span></div>
        <div class="note">가족이 각자 쓸 수 있습니다. 프로필마다 목표·기록·포인트가 완전히 따로 갑니다.</div>
        <div style="margin-top:10px">
          ${listProfiles().map((pr) => `<div class="reward">
            <span class="rt">${esc(pr.name)}${pr.active ? ' <span class="badge good" style="margin-left:4px"><span class="dot"></span>✓ 사용 중</span>' : ''}</span>
            <span class="rc" style="color:var(--ink-muted)">${esc(String(pr.entries))}건</span>
            ${pr.active ? '' : `<button class="btn sm" data-switch="${esc(pr.id)}">전환</button>
              <button class="del" data-pdel="${esc(pr.id)}" aria-label="삭제">✕</button>`}
          </div>`).join('')}
        </div>
        <form data-padd style="margin-top:12px">
          <div class="field"><label for="p-new">새 프로필 이름</label>
            <input id="p-new" name="name" type="text" maxlength="20" placeholder="예: 어머니" required /></div>
          <button class="btn full" type="submit">프로필 추가하고 설정 시작</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>내 몸 설정</h2><span class="meta">끈 것은 화면에서 사라집니다</span></div>
        ${MODULES.map((mod) => (mod.fixed ? `<div class="check is-fixed">
          <span class="ck-lock" aria-hidden="true">✓</span>
          <span class="ct"><span class="cl">${esc(mod.label)}</span>
            <span style="display:block;font-size:11.5px;color:var(--ink-muted)">${esc(mod.desc)}</span></span>
          <span class="tag">항상 켬</span>
        </div>` : `<label class="check">
          <input type="checkbox" data-module="${esc(mod.id)}" ${hasModule(state, mod.id) ? 'checked' : ''} />
          <span class="ct"><span class="cl">${esc(mod.label)}</span>
            <span style="display:block;font-size:11.5px;color:var(--ink-muted)">${esc(mod.desc)}</span></span>
        </label>`)).join('')}
        <div class="section-title" data-areas-title>아픈 곳</div>
        <div class="chips" data-areas>
          ${PAIN_AREAS.map((a) => `<button type="button" class="chip" data-area="${esc(a.id)}"
            aria-pressed="${(p.painAreas || []).includes(a.id)}">${esc(a.label)}</button>`).join('')}
        </div>
        <button class="btn primary full" style="margin-top:12px" data-body-save>내 몸 설정 저장</button>
      </div>

      <div class="card">
        <div class="card-head"><h2>내 정보</h2><span class="meta">계산 기준값</span></div>
        <form data-profile>
          <div class="grid2">
            <div class="field"><label for="s-name">이름 / 호칭</label>
              <input id="s-name" name="name" type="text" maxlength="20" value="${esc(p.name || '')}" /></div>
            <div class="field"><label for="s-height">키 <span class="unit">cm</span></label>
              <input id="s-height" name="heightCm" type="number" step="0.5" min="100" max="230" value="${esc(p.heightCm ?? '')}" /></div>
            <div class="field"><label for="s-start">시작 체중 <span class="unit">kg</span></label>
              <input id="s-start" name="startWeightKg" type="number" step="0.1" min="30" max="250" value="${esc(p.startWeightKg ?? '')}" /></div>
            <div class="field"><label for="s-birth">출생 연도</label>
              <input id="s-birth" name="birthYear" type="number" step="1" min="1920" max="2020" value="${esc(p.birthYear ?? '')}" /></div>
          </div>
          <div class="field"><label for="s-memo">참고 사항 (복약, 진단, 주의)</label>
            <textarea id="s-memo" name="memo" rows="3" maxlength="500">${esc(p.memo || '')}</textarea></div>
          <button class="btn primary full" type="submit">내 정보 저장</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>목표치</h2><span class="meta">판정 기준</span></div>
        <form data-targets>
          <div class="grid2">
            ${TARGET_FIELDS.map((f) => `<div class="field">
              <label for="t-${esc(f.id)}">${esc(f.label)} <span class="unit">${esc(f.unit)}</span></label>
              <input id="t-${esc(f.id)}" name="${esc(f.id)}" type="number" step="${f.step}" min="0" value="${esc(t[f.id] ?? '')}" />
            </div>`).join('')}
          </div>
          <div class="section-title">혈당 목표 범위 (mg/dL)</div>
          <div class="grid2">
            <div class="field"><label for="t-gf0">공복 하한</label>
              <input id="t-gf0" name="gf0" type="number" step="1" value="${esc(t.glucoseFasting[0])}" /></div>
            <div class="field"><label for="t-gf1">공복 상한</label>
              <input id="t-gf1" name="gf1" type="number" step="1" value="${esc(t.glucoseFasting[1])}" /></div>
            <div class="field"><label for="t-gp0">식후 하한</label>
              <input id="t-gp0" name="gp0" type="number" step="1" value="${esc(t.glucosePost[0])}" /></div>
            <div class="field"><label for="t-gp1">식후 상한</label>
              <input id="t-gp1" name="gp1" type="number" step="1" value="${esc(t.glucosePost[1])}" /></div>
          </div>
          <div class="btn-row">
            <button class="btn primary" type="submit">목표 저장</button>
            <button class="btn ghost" type="button" data-reset-targets>기본값으로</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>내 보상</h2><span class="meta">잔액 ${esc(String(ledger(state).balance))}p</span></div>
        <div class="note">기본값은 예시입니다. <strong>진짜로 받고 싶은 것</strong>으로 바꿔야 미션이 작동합니다.
        미션 하루 = ${esc(String(10))}p, 연속 7일마다 +30p. 한 주 열심히 하면 100p 정도 모입니다.</div>
        <div style="margin-top:10px">
          ${rewardList(state).map((r) => `<div class="reward">
            <span class="rt">${esc(r.title)}</span>
            <span class="rc">${esc(String(r.cost))}p</span>
            <button class="del" data-rw-del="${esc(r.id)}" aria-label="삭제">✕</button>
          </div>`).join('')}
        </div>
        <form data-rw-form style="margin-top:12px">
          <div class="grid2">
            <div class="field"><label for="rw-title">보상 이름</label>
              <input id="rw-title" name="title" type="text" maxlength="40" placeholder="예: 단골집 삼겹살" required /></div>
            <div class="field"><label for="rw-cost">필요 포인트</label>
              <input id="rw-cost" name="cost" type="number" step="10" min="10" max="5000" inputmode="numeric" value="100" required /></div>
          </div>
          <div class="btn-row">
            <button class="btn primary" type="submit">보상 추가</button>
            <button class="btn ghost" type="button" data-rw-reset>기본 목록으로</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>화면 · 알림</h2></div>
        <div class="field"><label>테마</label>
          <div class="seg" data-theme-seg>
            ${[['auto', '시스템'], ['light', '밝게'], ['dark', '어둡게']].map(([v, l]) => `
              <button type="button" data-theme="${v}" aria-pressed="${state.settings.theme === v}">${l}</button>`).join('')}
          </div></div>
        <form data-reminders>
          <div class="grid3">
            ${[['morning', '아침'], ['midday', '낮'], ['evening', '저녁']].map(([k, l]) => `
              <div class="field"><label for="r-${k}">${l} 알림</label>
                <input id="r-${k}" name="${k}" type="time" value="${esc(state.settings.reminders[k])}" /></div>`).join('')}
          </div>
          <div class="btn-row">
            <button class="btn primary" type="submit">알림 시각 저장</button>
            <button class="btn" type="button" data-notify-test>알림 권한 허용 / 테스트</button>
          </div>
        </form>
        <div class="note" style="margin-top:10px">PWA는 서버 없이 동작하므로 <strong>앱이 열려 있는 동안</strong>에만 알림이 뜹니다.
        확실하게 챙기려면 휴대폰 기본 알람을 위 시각에 맞춰두고, 알람이 울리면 앱을 열어 체크인하세요.</div>
      </div>

      <div class="card">
        <div class="card-head"><h2>앱으로 설치</h2>
          <span class="meta">${install.isStandalone() ? '설치됨' : '홈 화면'}</span></div>
        <div class="note">설치하면 주소창 없이 전체 화면으로 열리고, 비행기 모드에서도 기록할 수 있습니다.
        아이콘을 길게 누르면 통증·혈당·체중 기록으로 바로 가는 바로가기도 나옵니다.</div>
        <div style="margin-top:10px">${installBlock(install)}</div>
      </div>

      <div class="card">
        <div class="card-head"><h2>공유</h2><span class="meta">가족 · 지인에게</span></div>
        <div class="note">받는 사람도 각자 자기 폰에 설치해 각자의 기록을 남깁니다.
        내 기록이 함께 가지 않습니다.</div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn primary" type="button" data-share>소개 링크 보내기</button>
          <a class="btn ghost" href="./landing/index.html">소개 페이지 보기</a>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>백업 · 복원</h2><span class="meta">현재 ${esc(bytes(size))}</span></div>
        <div class="note">모든 기록은 이 브라우저 안에만 저장됩니다. 서버로 전송되지 않습니다.
        브라우저 데이터를 지우면 함께 사라지니, 주 1회 내보내기를 권합니다.</div>
        <div class="field" style="margin-top:10px"><label>
          <input type="checkbox" data-export-one style="width:auto;min-height:auto" /> 지금 프로필만 내보내기 (끄면 전체)
        </label></div>
        <div class="btn-row">
          <button class="btn primary" data-export>JSON으로 내보내기</button>
          <label class="btn" for="import-file">파일에서 가져오기</label>
          <input id="import-file" type="file" accept="application/json,.json" hidden />
        </div>
        <div class="field" style="margin-top:10px"><label>
          <input type="checkbox" data-merge style="width:auto;min-height:auto" /> 기존 기록과 합치기 (끄면 전체 교체)
        </label></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>초기화</h2></div>
        <div class="btn-row">
          <button class="btn danger" data-wipe>모든 기록 삭제</button>
        </div>
      </div>

      <p class="empty">${esc(APP.name)} v${esc(APP.version)} · 기록 시작 ${esc(String(state.createdAt).slice(0, 10))}<br/>
      이 앱은 개인 기록·관리 도구입니다. 진단이나 치료를 대신하지 않습니다.</p>
    `;
  },

  mount(root, state, ctx) {
    root.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => {
      switchProfile(b.dataset.switch);
      toast('프로필을 전환했습니다');
      location.hash = '#/today';
      ctx.rerender('top');
    }));

    root.querySelectorAll('[data-pdel]').forEach((b) => b.addEventListener('click', () => {
      const target = listProfiles().find((x) => x.id === b.dataset.pdel);
      if (!confirm(`「${target?.name}」 프로필과 그 기록을 모두 지웁니다. 되돌릴 수 없습니다. 계속할까요?`)) return;
      removeProfile(b.dataset.pdel);
      toast('프로필을 삭제했습니다');
      ctx.rerender();
    }));

    root.querySelector('[data-padd]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      addProfile(new FormData(e.target).get('name') || '');
      location.hash = '#/start';
      ctx.rerender('top');
    });

    const painToggle = root.querySelector('[data-module="pain"]');
    const areasTitle = root.querySelector('[data-areas-title]');
    const areasBox = root.querySelector('[data-areas]');
    const syncAreas = () => {
      const on = painToggle?.checked;
      if (areasTitle) areasTitle.style.display = on ? '' : 'none';
      if (areasBox) areasBox.style.display = on ? '' : 'none';
    };
    painToggle?.addEventListener('change', syncAreas);
    syncAreas();

    root.querySelectorAll('[data-area]').forEach((c) => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));

    root.querySelector('[data-body-save]')?.addEventListener('click', () => {
      const modules = {};
      root.querySelectorAll('[data-module]').forEach((cb) => { modules[cb.dataset.module] = cb.checked; });
      modules.weight = true;
      const picked = [...root.querySelectorAll('[data-area][aria-pressed="true"]')].map((b) => b.dataset.area);
      if (modules.pain && !picked.length) { toast('아픈 곳을 하나 이상 고르거나, 통증 관리를 꺼 주세요'); return; }
      setProfile({ modules, painAreas: picked });
      toast('내 몸 설정을 저장했습니다');
      ctx.rerender();
    });

    root.querySelector('[data-profile]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      setProfile({
        name: f.get('name') || '',
        heightCm: f.get('heightCm') ? Number(f.get('heightCm')) : null,
        startWeightKg: f.get('startWeightKg') ? Number(f.get('startWeightKg')) : null,
        birthYear: f.get('birthYear') ? Number(f.get('birthYear')) : null,
        memo: f.get('memo') || '',
      });
      toast('내 정보를 저장했습니다');
      ctx.rerender();
    });

    root.querySelector('[data-targets]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const patch = {};
      TARGET_FIELDS.forEach((fd) => { if (f.get(fd.id) !== '') patch[fd.id] = Number(f.get(fd.id)); });
      patch.glucoseFasting = [Number(f.get('gf0')), Number(f.get('gf1'))];
      patch.glucosePost = [Number(f.get('gp0')), Number(f.get('gp1'))];
      patch.glucoseRandom = patch.glucosePost;
      setTargets(patch);
      toast('목표를 저장했습니다');
      ctx.rerender();
    });

    root.querySelector('[data-reset-targets]')?.addEventListener('click', () => {
      if (!confirm('목표치를 기본값으로 되돌릴까요? 기록은 지워지지 않습니다.')) return;
      setTargets({ ...DEFAULT_TARGETS });
      toast('기본값으로 되돌렸습니다');
      ctx.rerender();
    });

    root.querySelector('[data-rw-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const next = [...rewardList(state), { id: `rw-${uid()}`, title: f.get('title'), cost: Number(f.get('cost')) }];
      setRewards({ custom: next });
      toast('보상을 추가했습니다');
      ctx.rerender();
    });

    root.querySelectorAll('[data-rw-del]').forEach((b) => b.addEventListener('click', () => {
      const next = rewardList(state).filter((r) => r.id !== b.dataset.rwDel);
      if (!next.length) { toast('보상은 최소 1개 남겨야 합니다'); return; }
      setRewards({ custom: next });
      ctx.rerender();
    }));

    root.querySelector('[data-rw-reset]')?.addEventListener('click', () => {
      if (!confirm('보상 목록을 기본값으로 되돌릴까요? 모은 포인트는 그대로입니다.')) return;
      setRewards({ custom: DEFAULT_REWARDS.map((r) => ({ ...r })) });
      toast('기본 목록으로 되돌렸습니다');
      ctx.rerender();
    });

    root.querySelector('[data-theme-seg]')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      setSettings({ theme: b.dataset.theme });
      ctx.applyTheme();
      ctx.rerender();
    });

    root.querySelector('[data-reminders]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      setSettings({ reminders: { morning: f.get('morning'), midday: f.get('midday'), evening: f.get('evening') } });
      toast('알림 시각을 저장했습니다');
    });

    root.querySelector('[data-notify-test]')?.addEventListener('click', async () => {
      if (!('Notification' in window)) { toast('이 브라우저는 알림을 지원하지 않습니다'); return; }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification('마이바디', { body: '체크인 알림이 이렇게 표시됩니다.' });
      else toast('알림이 허용되지 않았습니다');
    });

    root.querySelector('[data-install]')?.addEventListener('click', async () => {
      const r = await install.promptInstall();
      if (r.ok) toast('설치했습니다. 홈 화면에서 열어 보세요');
      ctx.rerender();
    });

    root.querySelector('[data-share]')?.addEventListener('click', async () => {
      const base = location.href.split('#')[0].replace(/index\.html$/, '');
      const url = `${base}landing/`;
      const payload = { title: '마이바디', text: '체중·혈당·통증을 한 화면에서 관리하는 앱이야. 설치도 가입도 없어.', url };
      try {
        if (navigator.share) { await navigator.share(payload); return; }
        await navigator.clipboard.writeText(url);
        toast('링크를 복사했습니다');
      } catch (err) {
        if (err?.name !== 'AbortError') prompt('이 주소를 보내세요', url);
      }
    });

    root.querySelector('[data-export]')?.addEventListener('click', () => {
      const one = root.querySelector('[data-export-one]')?.checked;
      download(`mybody-backup-${dateKey()}.json`, exportJSON({ allProfiles: !one }));
      toast('백업 파일을 내려받았습니다');
    });

    root.querySelector('#import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const merge = root.querySelector('[data-merge]')?.checked;
      if (!merge && !confirm('현재 기록을 모두 교체합니다. 계속할까요?')) { e.target.value = ''; return; }
      try {
        importJSON(await file.text(), { merge });
        toast('가져왔습니다');
        ctx.rerender('top');
      } catch (err) {
        alert(`가져오기 실패: ${err.message}`);
      }
      e.target.value = '';
    });

    root.querySelector('[data-wipe]')?.addEventListener('click', () => {
      if (!confirm('모든 기록을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
      if (!confirm('정말 삭제할까요? 먼저 백업을 받는 것을 권합니다.')) return;
      wipeAll();
      toast('초기화했습니다');
      ctx.rerender('top');
    });
  },
};
