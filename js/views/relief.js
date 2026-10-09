/* 대처 — "지금 불편하다 → 무엇을 했다 → 어떻게 됐다" 한 바퀴를 닫는 화면.
 *
 * 통증 화면이 "오늘 전체가 몇 점인가"를 묻는다면 여기는 그 순간을 묻는다.
 * 그리고 이 기록만이 답할 수 있는 질문이 하나 있다 — 무엇이 나에게 실제로 먹히나.
 * 남의 평균이 아니라 내 몸에서 나온 숫자라서, 적은 횟수로도 쓸모가 있다.
 * 다만 적을 때 숫자를 들이밀면 우연을 실력으로 착각하므로 n 이 기준 미만이면 감춘다. */
import { PRINCIPLES, RELIEF_ACTIONS, RELIEF_MIN_N, PAIN_AREAS } from '../config.js';
import { painAreas } from '../profile.js';
import { getExercise } from '../exercises.js';
import { esc, num, relDay, fmtDateTime } from '../utils.js';
import { openRelief, startRelief, finishRelief, cancelRelief, removeEntry } from '../store.js';
import { reliefEffects } from '../analysis.js';
import { tile, toast } from '../ui.js';

/* 조치 한 건의 이름 — 운동 사전에 있으면 거기서, 없으면 자기가 들고 있는 label */
function actionName(it) {
  if (it.label) return it.label;
  return getExercise(it.id)?.name || it.id;
}
function nameOfId(id, areaId = null) {
  /* 부위를 알면 그 목록부터, 모르면(효과 표처럼 부위가 섞인 자리) 전 부위를 뒤진다.
   * 못 찾아서 id 가 그대로 나오면 사용자에게는 암호처럼 보인다. */
  const lists = areaId ? [RELIEF_ACTIONS[areaId] || []] : Object.values(RELIEF_ACTIONS);
  for (const list of lists) {
    const found = list.find((a) => a.id === id);
    if (found) return actionName(found);
  }
  return getExercise(id)?.name || id;
}
function areaLabel(id) {
  return PAIN_AREAS.find((a) => a.id === id)?.label || id;
}

/* 부위의 원리 — 운동보다 먼저 온다. 한 번 읽으면 접어 둘 수 있다. */
function principleBlock(areaId) {
  const pr = PRINCIPLES[areaId];
  if (!pr) return '';
  return `<details class="rx-extra" data-principle>
    <summary>왜 이렇게 하나 — ${esc(pr.title)}</summary>
    <p class="rx-why" style="margin:8px 0">${esc(pr.body)}</p>
    <div class="note">${esc(pr.so)}</div>
    <div class="cue-pair">
      <div><span class="cue-k">시키는 말</span><strong>${esc(pr.cue)}</strong></div>
      <div><span class="cue-k">확인하는 말</span><strong>${esc(pr.check)}</strong></div>
    </div>
  </details>`;
}

/* ── 진행 중인 대처가 있을 때 ── */
function openBlock(state, open) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(open.startTs)) / 60000));
  return `
    <div class="card" data-finish="${esc(open.id)}">
      <div class="card-head"><h2>조치 후 어떤가요</h2>
        <span class="meta">${esc(areaLabel(open.areaId))} · ${esc(String(mins))}분 전 시작</span></div>

      <div class="relief-strip">
        <div><span class="cue-k">시작할 때</span><strong class="big-n">${esc(String(open.before))}</strong><span class="unit">/10</span></div>
        <div class="grow"><span class="cue-k">한 조치</span>
          ${(open.actions || []).map((id) => `<span class="chip" aria-pressed="true">${esc(nameOfId(id, open.areaId))}</span>`).join('') || '<span class="note">고른 조치 없음</span>'}</div>
      </div>

      <div class="field" style="margin-top:12px"><label>지금은 몇 점인가요</label>
        <div class="nrs" data-after>
          <div class="nrs-head"><span class="name">${esc(areaLabel(open.areaId))}</span>
            <span class="score" data-after-score>${esc(String(open.before))}</span></div>
          <input type="range" min="0" max="10" step="1" value="${esc(String(open.before))}"
            aria-label="조치 후 통증 점수 0에서 10" />
          <div class="nrs-scale"><span>0 없음</span><span>3 불편</span><span>6 심함</span><span>10 최악</span></div>
        </div>
      </div>

      <div class="field"><label for="rl-note">메모 <span class="unit">선택</span></label>
        <input id="rl-note" data-rl-note type="text" placeholder="예) 걷고 나서 바로 풀림" /></div>

      <button class="btn primary full" data-rl-done>기록하고 닫기</button>
      <button class="btn ghost full" style="margin-top:8px" data-rl-cancel>취소 (이 건 지우기)</button>
      <p class="note">서두르지 않아도 됩니다. 조치를 다 하고 나서,
        <strong>10~30분쯤 지난 뒤</strong>에 적으면 가장 정확합니다.</p>
    </div>`;
}

/* ── 새로 시작할 때 ── */
function startBlock(state, areaId) {
  const areas = painAreas(state);
  const list = RELIEF_ACTIONS[areaId] || [];
  return `
    <div class="card" data-start>
      <div class="card-head"><h2>지금 불편한 곳</h2><span class="meta">1분</span></div>

      <div class="chips" data-rl-areas>
        ${areas.map((a) => `<button type="button" class="chip" data-rl-area="${esc(a.id)}"
          aria-pressed="${a.id === areaId}">${esc(a.label)}</button>`).join('')}
      </div>

      ${principleBlock(areaId)}

      <div class="nrs" data-before style="margin-top:12px">
        <div class="nrs-head"><span class="name">지금 몇 점인가</span>
          <span class="score" data-before-score>4</span></div>
        <input type="range" min="0" max="10" step="1" value="4" aria-label="지금 통증 점수 0에서 10" />
        <div class="nrs-scale"><span>0 없음</span><span>3 불편</span><span>6 심함</span><span>10 최악</span></div>
      </div>

      <div class="section-title">무엇을 할까 <span class="unit">하나만 골라도 됩니다</span></div>
      ${list.length ? list.map((it) => {
        const ex = it.label ? null : getExercise(it.id);
        return `<label class="check" data-rl-pick="${esc(it.id)}">
          <input type="checkbox" />
          <span class="ct"><span class="cl">${esc(actionName(it))}
            <span class="unit">${esc(it.dose)}</span></span>
            <span style="display:block;font-size:11.5px;color:var(--ink-muted)">${esc(it.why)}</span>
            ${ex ? `<span style="display:block;font-size:11.5px;color:var(--ink-muted)">${esc(ex.steps[0])}</span>` : ''}
          </span></label>`;
      }).join('') : '<p class="empty">이 부위는 아직 즉시 조치 목록이 없습니다.</p>'}

      <button class="btn primary full" style="margin-top:12px" data-rl-start>시작하기</button>
      <p class="note"><strong>하나만 고르는 쪽이 낫습니다.</strong>
        여러 개를 한 번에 하면 무엇이 효과였는지 알 수 없습니다.</p>
    </div>`;
}

/* ── 무엇이 먹혔나 ── */
function effectBlock(state) {
  const eff = reliefEffects(state);
  if (!eff.n) {
    return `<div class="card"><div class="card-head"><h2>무엇이 먹히나</h2></div>
      <div class="empty">대처를 한 번 기록하면 여기에 쌓입니다.<br/>
        몇 번 모이면 <strong>어떤 조치가 나에게 실제로 통하는지</strong>가 보입니다.</div></div>`;
  }
  const enough = eff.rows.filter((r) => r.n >= RELIEF_MIN_N);
  const thin = eff.rows.filter((r) => r.n < RELIEF_MIN_N);
  return `
    <div class="card">
      <div class="card-head"><h2>무엇이 먹히나</h2><span class="meta">내 기록 ${esc(String(eff.n))}건</span></div>
      ${enough.length ? `
        <div class="reading" style="padding:0 2px">
          <table><thead><tr><th>조치</th><th>횟수</th><th>평균 변화</th><th>좋아진 비율</th></tr></thead>
          <tbody>${enough.map((r) => `<tr>
            <td>${esc(nameOfId(r.id, null) || r.id)}</td>
            <td>${esc(String(r.n))}회</td>
            <td style="color:${r.avg > 0 ? 'var(--good)' : 'var(--ink-muted)'};font-weight:600">
              ${r.avg > 0 ? '−' : ''}${esc(num(Math.abs(r.avg), 1))}점</td>
            <td>${esc(String(Math.round((r.better / r.n) * 100)))}%</td>
          </tr>`).join('')}</tbody></table>
        </div>` : ''}
      ${thin.length ? `<p class="note">${esc(thin.map((r) => `${nameOfId(r.id, null)} ${r.n}회`).join(' · '))}
        — <strong>${esc(String(RELIEF_MIN_N))}회</strong>가 모이면 숫자를 보여드립니다.
        적은 횟수로 판단하면 우연을 실력으로 착각하게 됩니다.</p>` : ''}
      ${eff.avgDrop != null ? `<p class="note">전체 평균 <strong>${esc(num(eff.avgDrop, 1))}점</strong> 내려갔고,
        ${esc(String(Math.round(eff.betterRate * 100)))}%에서 좋아졌습니다.
        <strong>이건 남의 평균이 아니라 손님 몸에서 나온 숫자입니다.</strong></p>` : ''}
    </div>`;
}

function historyBlock(state) {
  const rows = [...(state.relief || [])].filter((r) => r.after != null).reverse().slice(0, 12);
  if (!rows.length) return '';
  return `<div class="card">
    <div class="card-head"><h2>최근 대처</h2><span class="meta">${esc(String(rows.length))}건</span></div>
    ${rows.map((r) => {
      const drop = Number(r.before) - Number(r.after);
      const tone = drop > 0 ? 'var(--good)' : drop < 0 ? 'var(--serious)' : 'var(--ink-muted)';
      return `<div class="row">
        <span class="meta" style="min-width:74px">${esc(relDay(r.startTs))}</span>
        <span class="grow" style="white-space:normal">
          <strong>${esc(areaLabel(r.areaId))}</strong>
          ${esc((r.actions || []).map((id) => nameOfId(id, r.areaId)).join(', '))}
          ${r.note ? `<span class="note"> · ${esc(r.note)}</span>` : ''}</span>
        <span class="val" style="color:${tone}">${esc(String(r.before))} → ${esc(String(r.after))}</span>
        <button class="btn sm ghost" data-rl-del="${esc(r.id)}" aria-label="삭제">✕</button>
      </div>`;
    }).join('')}
  </div>`;
}

let pickedArea = null;

export default {
  title: '대처',
  render(state) {
    const areas = painAreas(state);
    if (!areas.length) {
      return `<div class="card"><div class="empty">아픈 곳을 먼저 고르세요 — 설정 → 내 몸 설정.</div></div>`;
    }
    const open = openRelief();
    const areaId = open ? open.areaId
      : (areas.some((a) => a.id === pickedArea) ? pickedArea : areas[0].id);
    const eff = reliefEffects(state);
    const todayN = (state.relief || []).filter(
      (r) => r.after != null && String(r.startTs).slice(0, 10) === new Date().toISOString().slice(0, 10),
    ).length;

    return `
      <div class="tiles">
        ${tile({ label: '기록한 대처', value: `${eff.n}`, unit: '건', sub: todayN ? `오늘 ${todayN}건` : '오늘 아직' })}
        ${tile({
          label: '평균 변화',
          value: eff.avgDrop != null ? num(eff.avgDrop, 1) : '—',
          unit: '점',
          sub: eff.n ? '조치 뒤 내려간 폭' : '기록이 모이면 나옵니다',
        })}
      </div>

      ${open ? openBlock(state, open) : startBlock(state, areaId)}
      ${effectBlock(state)}
      ${historyBlock(state)}

      <p class="note">아픈 데를 주무르는 것이 왜 그때뿐인지 — <strong>언제나 증상이 있는 자리만 건드리기 때문입니다.</strong>
        위의 '왜 이렇게 하나'를 한 번 펼쳐 보세요. 조치가 전부 거기서 나옵니다.</p>`;
  },

  mount(root, state, ctx) {
    /* 점수 슬라이더 */
    root.querySelectorAll('.nrs input[type="range"]').forEach((r) => {
      const out = r.closest('.nrs').querySelector('.score');
      r.addEventListener('input', () => { out.textContent = r.value; });
    });

    /* 부위 전환 — 고른 부위에 맞는 조치 목록으로 다시 그린다 */
    root.querySelectorAll('[data-rl-area]').forEach((b) => b.addEventListener('click', () => {
      pickedArea = b.dataset.rlArea;
      ctx.rerender();
    }));

    /* 조치 체크 */
    root.querySelectorAll('[data-rl-pick] input').forEach((cb) => cb.addEventListener('change', () => {
      cb.closest('[data-rl-pick]').setAttribute('data-on', cb.checked ? '1' : '0');
    }));

    root.querySelector('[data-rl-start]')?.addEventListener('click', () => {
      const box = root.querySelector('[data-start]');
      const areaId = box.querySelector('[data-rl-area][aria-pressed="true"]')?.dataset.rlArea;
      const before = Number(box.querySelector('[data-before] input').value);
      const actions = [...box.querySelectorAll('[data-rl-pick]')]
        .filter((l) => l.querySelector('input').checked)
        .map((l) => l.dataset.rlPick);
      if (!actions.length) { toast('무엇을 할지 하나는 고르세요'); return; }
      startRelief({ areaId, before, actions });
      toast('시작했습니다. 하고 나서 다시 와 주세요');
      ctx.rerender();
    });

    root.querySelector('[data-rl-done]')?.addEventListener('click', () => {
      const box = root.querySelector('[data-finish]');
      const id = box.dataset.finish;
      const after = Number(box.querySelector('[data-after] input').value);
      const note = box.querySelector('[data-rl-note]').value.trim();
      finishRelief(id, { after, note });
      toast('기록했습니다');
      ctx.rerender();
    });

    root.querySelector('[data-rl-cancel]')?.addEventListener('click', () => {
      cancelRelief(root.querySelector('[data-finish]').dataset.finish);
      toast('지웠습니다');
      ctx.rerender();
    });

    root.querySelectorAll('[data-rl-del]').forEach((b) => b.addEventListener('click', () => {
      removeEntry('relief', b.dataset.rlDel);
      ctx.rerender();
    }));
  },
};
