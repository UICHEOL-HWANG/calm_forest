// =============================================================
//  calm forest · 🧭 첫 실행 설문 카드(시안 A) + 계정 동기화 — 규칙은 js/install-survey.js
//  ------------------------------------------------------------
//  openSurvey : #survey-card(로딩 화면의 형제 요소)에 2열 보기 12개·건너뛰기를 그린다.
//               보기 한 번 → 닫힘. 🤝 친구 초대만 코드칸이 열린다. → { done: Promise, close(reason) }
//  bootInstallSurvey: 부팅 때 한 번 — 물을지 판정(안드로이드는 referrer 를 최대 waitMs 기다림) → 카드 →
//               기록(cf_survey)·GA4(install_survey 이벤트·heard_from)·🤝 초대 코드는 cf_invite 에 보관
//  syncInstallSurvey: 로그인 상태가 바뀔 때마다 — 답한 기기에서 온라인 계정마다 install_survey 1행.
//  문자열은 전부 textContent(innerHTML 금지). doc·root·t 는 인자 — 가짜 DOM 으로 테스트한다.
//  (테스트: node --test tests/install-survey-ui.test.mjs)
// =============================================================
import { SURVEY_OPTIONS, SURVEY_STORE_KEY, checkInviteCode, readSurvey, shouldAskSurvey, surveyRecord } from './install-survey.js';
import { INVITE_STORE_KEY } from './referral/rules.js';

const REFERRER_WAIT_MS = 3000;   // 안드로이드 — Play 귀속이 이보다 늦으면 이번엔 안 묻는다(로딩을 붙잡지 않게)

export function openSurvey({ doc, root, t = s => s }) {
  const el = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let finish;
  const done = new Promise(r => { finish = r; });
  let settled = false;
  const end = (result) => {
    if (settled) return;
    settled = true;
    root.classList.remove('show');
    finish(result);
  };

  root.textContent = '';
  const card = el('div', 'sv-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.append(el('h2', null, t('calm forest 를 어디서 알게 되셨어요?')), el('p', 'sv-hint', t('불러오는 동안 하나만 여쭤볼게요 🌿')));

  const grid = el('div', 'sv-grid');
  const code = el('div', 'sv-code');
  code.hidden = true;
  const input = el('input');
  input.setAttribute('placeholder', t('초대 코드 (선택)'));
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('maxlength', '200');   // 초대 링크 통째 붙여넣기도 받는다(checkInviteCode 가 코드만 뽑는다)
  const ok = el('button', 'sv-ok', t('확인'));
  const err = el('p', 'sv-err', '');
  err.setAttribute('role', 'alert');
  input.addEventListener('input', () => { err.textContent = ''; });
  const row = el('div', 'sv-code-row');
  row.append(input, ok);
  code.append(row, err);

  for (const o of SURVEY_OPTIONS) {
    const b = el('button', 'sv-opt', `${o.ico} ${t(o.label)}`);
    b.setAttribute('data-value', o.value);
    b.addEventListener('click', () => {
      if (!o.code) { end({ answer: o.value, code: null }); return; }
      grid.querySelectorAll?.('.sv-opt')?.forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      code.hidden = false;
      input.focus?.();
      input.scrollIntoView?.({ block: 'center' });   // 📱 iOS 웹뷰는 키보드가 떠도 dvh 가 안 줄어 코드칸이 가려질 수 있다
    });
    grid.appendChild(b);
  }
  const submitCode = () => {
    const r = checkInviteCode(input.value);
    if (!r.ok) { err.textContent = t('코드를 다시 확인해 주세요'); return; }
    end({ answer: 'friend', code: r.code });
  };
  ok.addEventListener('click', submitCode);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitCode(); });

  const skip = el('button', 'sv-skip', t('건너뛰기'));
  skip.addEventListener('click', () => end({ skipped: 'skip' }));

  card.append(grid, code, skip);
  root.appendChild(card);
  root.classList.add('show');
  return { done, close: (reason = 'late') => end({ skipped: reason }) };
}

const save = (storage, key, value) => { try { storage?.setItem(key, value); } catch { /* 저장소 없음 */ } };

/** → 답({answer, code}) | null(안 물음·건너뜀·늦음). 어떤 실패도 부팅을 막지 않는다 */
export async function bootInstallSurvey({ platform, storage, doc, root, t, track, setUserProps,
  referrerP = null, fresh = false, dev = false, force = false, waitMs = REFERRER_WAIT_MS }) {
  try {
    const stored = readSurvey(storage);
    let referrer = null;
    if (platform === 'android' && !dev && !stored && fresh) {
      const late = Symbol('late');
      const r = await Promise.race([Promise.resolve(referrerP).catch(() => null), new Promise(res => setTimeout(() => res(late), waitMs))]);
      if (r === late) {
        save(storage, SURVEY_STORE_KEY, JSON.stringify(surveyRecord({ answer: null, skipped: 'late' })));
        track('install_survey', { action: 'late' });
        return null;
      }
      referrer = r;
      if (!referrer) {   // 읽기 실패가 빨리 왔다 — 기록해 두지 않으면 다음 실행(이미 놀던 사람)에 뒤늦게 묻게 된다(생존자 편향)
        save(storage, SURVEY_STORE_KEY, JSON.stringify(surveyRecord({ answer: null, skipped: 'noref' })));
        return null;
      }
    }
    if (!shouldAskSurvey({ platform, stored, referrer, fresh, dev, force })) return null;
    if (!root) return null;
    track('install_survey', { action: 'shown' });
    const result = await openSurvey({ doc, root, t }).done;
    if (!result.answer) {
      save(storage, SURVEY_STORE_KEY, JSON.stringify(surveyRecord({ answer: null, skipped: result.skipped })));
      track('install_survey', { action: result.skipped });
      return null;
    }
    save(storage, SURVEY_STORE_KEY, JSON.stringify(surveyRecord({ answer: result.answer, code: !!result.code })));
    // 로그인 뒤 referralOnPlay 가 그대로 연결 — 링크로 먼저 온 코드가 있으면 그쪽이 정답이라 덮어쓰지 않는다
    if (result.code && !storage?.getItem?.(INVITE_STORE_KEY)) save(storage, INVITE_STORE_KEY, result.code);
    track('install_survey', { action: 'answer', answer: result.answer, has_code: result.code ? 1 : 0 });
    setUserProps?.();
    return result;
  } catch (e) {
    console.warn('[install-survey] skipped', e?.message || e);
    return null;
  }
}

const inFlight = new Set();   // 같은 계정으로 콜백이 연달아 와도 한 번만

/** 답한 기기에서 온라인이 된 계정마다 1행 — 건너뛴 기록은 GA4 이벤트로만 남는다 */
export async function syncInstallSurvey({ auth, storage, insert, platform = null }) {
  if (!auth?.online || !auth.userId) return;
  if (platform && platform !== 'android' && platform !== 'ios') return;   // DB CHECK 와 같음 — dev ?survey=1 웹에서 매번 실패 요청 방지
  const rec = readSurvey(storage);
  if (!rec?.answer) return;
  const synced = Array.isArray(rec.synced) ? rec.synced : [];
  if (synced.includes(auth.userId) || inFlight.has(auth.userId)) return;
  inFlight.add(auth.userId);
  try {
    const r = await insert({ user_id: auth.userId, client_id: auth.clientId, answer: rec.answer, has_code: !!rec.code });
    if (!r?.ok) return;                                             // 실패 — 다음 상태 변경 때 다시
    const latest = readSurvey(storage) || rec;
    const prev = Array.isArray(latest.synced) ? latest.synced : [];
    try { storage.setItem(SURVEY_STORE_KEY, JSON.stringify({ ...latest, synced: [...prev.filter(id => id !== auth.userId), auth.userId] })); } catch { /* 저장소 없음 */ }
  } finally {
    inFlight.delete(auth.userId);
  }
}
