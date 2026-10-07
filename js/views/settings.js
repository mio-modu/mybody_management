/* 설정 — 목표치, 알림, 백업. 데이터는 이 기기에만 있으니 백업이 유일한 보험이다. */
import { APP, DEFAULT_TARGETS } from '../config.js';
import { dateKey, esc } from '../utils.js';
import { setProfile, setTargets, setSettings, exportJSON, importJSON, wipeAll } from '../store.js';
import { download } from '../utils.js';
import { toast } from '../ui.js';

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
        <div class="card-head"><h2>백업 · 복원</h2><span class="meta">현재 ${esc(bytes(size))}</span></div>
        <div class="note">모든 기록은 이 브라우저 안에만 저장됩니다. 서버로 전송되지 않습니다.
        브라우저 데이터를 지우면 함께 사라지니, 주 1회 내보내기를 권합니다.</div>
        <div class="btn-row" style="margin-top:10px">
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

    root.querySelector('[data-export]')?.addEventListener('click', () => {
      download(`mybody-backup-${dateKey()}.json`, exportJSON());
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
