// 🧭 첫 실행 설문 카드(시안 A) — 버튼 한 번에 닫힘 · 친구 초대만 코드칸 · 건너뛰기 · 계정 동기화
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeDom } from './helpers/fake-dom.mjs';
import { openSurvey, syncInstallSurvey, bootInstallSurvey } from '../js/install-survey-ui.js';
import { SURVEY_OPTIONS, SURVEY_STORE_KEY } from '../js/install-survey.js';

const t = s => s;
function mount() {
  const doc = fakeDom().document;
  const root = doc.createElement('div'); root.id = 'survey-card'; doc.body.appendChild(root);
  return { doc, root };
}
const btn = (root, value) => root.querySelectorAll('button').find(b => b.attrs?.['data-value'] === value);

test('보기 12개 + 건너뛰기를 그리고 show 클래스로 띄운다(텍스트는 textContent)', () => {
  const { doc, root } = mount();
  openSurvey({ doc, root, t });
  assert.ok(root.classList.contains('show'));
  for (const o of SURVEY_OPTIONS) assert.ok(btn(root, o.value), o.value);
  assert.ok(root.querySelector('.sv-skip'));
  assert.equal(root.querySelector('.sv-code').hidden, true, '코드칸은 처음엔 숨김');
});

test('보기를 누르면 그 값으로 끝나고 카드가 닫힌다', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  btn(root, 'threads').click();
  assert.deepEqual(await s.done, { answer: 'threads', code: null });
  assert.ok(!root.classList.contains('show'));
});

test('건너뛰기', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  root.querySelector('.sv-skip').click();
  assert.deepEqual(await s.done, { skipped: 'skip' });
});

test('🤝 친구 초대 — 코드칸이 열리고, 틀린 코드는 오류·맞는 코드·빈칸은 끝', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  btn(root, 'friend').click();
  const code = root.querySelector('.sv-code');
  assert.equal(code.hidden, false);
  assert.ok(root.classList.contains('show'), '친구 초대는 바로 닫히지 않는다');
  const input = root.querySelector('input'), ok = root.querySelector('.sv-ok'), err = root.querySelector('.sv-err');
  input.value = 'ABCD1234'; ok.click();
  assert.ok(err.textContent.length > 0, '오류 문구');
  assert.ok(root.classList.contains('show'));
  input.value = 'abcd2345'; ok.click();
  assert.deepEqual(await s.done, { answer: 'friend', code: 'ABCD2345' });

  const m2 = mount(); const s2 = openSurvey({ doc: m2.doc, root: m2.root, t });
  btn(m2.root, 'friend').click(); m2.root.querySelector('.sv-ok').click();
  assert.deepEqual(await s2.done, { answer: 'friend', code: null }, '비우고 확인하면 코드 없이');
});

test('한 번만 끝난다(연타해도 첫 답)', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  btn(root, 'search').click(); btn(root, 'other').click(); root.querySelector('.sv-skip').click();
  assert.deepEqual(await s.done, { answer: 'search', code: null });
});

test('close() — 늦게 닫아도(로딩이 먼저 끝난 경우 등) late 로 끝난다', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  s.close('late');
  assert.deepEqual(await s.done, { skipped: 'late' });
});

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('syncInstallSurvey — 답한 기기에서 온라인 계정마다 1번(건너뛴 기록·오프라인은 안 보냄)', async () => {
  const rows = [];
  const insert = async r => { rows.push(r); return { ok: true }; };
  const storage = mem({ [SURVEY_STORE_KEY]: JSON.stringify({ answer: 'friend', code: true, ts: 1, synced: [] }) });
  await syncInstallSurvey({ auth: { online: false, userId: 'u1' }, storage, insert });
  await syncInstallSurvey({ auth: { online: true, userId: 'u1', clientId: 'c1' }, storage, insert });
  await syncInstallSurvey({ auth: { online: true, userId: 'u1', clientId: 'c1' }, storage, insert });
  assert.deepEqual(rows, [{ user_id: 'u1', client_id: 'c1', answer: 'friend', has_code: true }]);
  assert.deepEqual(JSON.parse(storage.getItem(SURVEY_STORE_KEY)).synced, ['u1']);

  const skipped = mem({ [SURVEY_STORE_KEY]: JSON.stringify({ skipped: 'skip', ts: 1, synced: [] }) });
  await syncInstallSurvey({ auth: { online: true, userId: 'u2', clientId: 'c2' }, storage: skipped, insert });
  assert.equal(rows.length, 1);

  const fail = mem({ [SURVEY_STORE_KEY]: JSON.stringify({ answer: 'x', ts: 1, synced: [] }) });
  await syncInstallSurvey({ auth: { online: true, userId: 'u3', clientId: 'c3' }, storage: fail, insert: async () => ({ ok: false }) });
  assert.deepEqual(JSON.parse(fail.getItem(SURVEY_STORE_KEY)).synced, [], '실패면 다음에 다시');
});

// ── 부팅 도우미: 판정 → 카드 → 기록·GA4·초대 코드 보관 ──
function bootEnv(o = {}) {
  const { doc, root } = mount();
  const storage = mem(o.store || {});
  const events = [], props = [];
  return { doc, root, storage, events, props,
    args: { platform: 'ios', storage, doc, root, t, track: (n, p) => events.push([n, p]), setUserProps: () => props.push(1), ...o.args } };
}

test('bootInstallSurvey — iOS 첫 실행: 띄우고 답을 기록·GA4·사용자 속성', async () => {
  const e = bootEnv();
  const p = bootInstallSurvey(e.args);
  await new Promise(r => setTimeout(r, 0));
  btn(e.root, 'search').click();
  assert.equal((await p).answer, 'search');
  const rec = JSON.parse(e.storage.getItem(SURVEY_STORE_KEY));
  assert.equal(rec.answer, 'search');
  assert.deepEqual(e.events, [['install_survey', { action: 'shown' }], ['install_survey', { action: 'answer', answer: 'search', has_code: 0 }]]);
  assert.equal(e.props.length, 1);
});

test('bootInstallSurvey — 친구 초대 코드는 cf_invite 에 보관(로그인 뒤 기존 연결 흐름이 처리)', async () => {
  const e = bootEnv();
  const p = bootInstallSurvey(e.args);
  await new Promise(r => setTimeout(r, 0));
  btn(e.root, 'friend').click();
  e.root.querySelector('input').value = 'abcd2345'; e.root.querySelector('.sv-ok').click();
  await p;
  assert.equal(e.storage.getItem('cf_invite'), 'ABCD2345');
  assert.equal(JSON.parse(e.storage.getItem(SURVEY_STORE_KEY)).code, true);
});

test('bootInstallSurvey — 건너뛰기도 기록(다시 안 묻는다)·이미 기록 있으면 안 띄움', async () => {
  const e = bootEnv();
  const p = bootInstallSurvey(e.args);
  await new Promise(r => setTimeout(r, 0));
  e.root.querySelector('.sv-skip').click();
  assert.equal(await p, null);
  assert.equal(JSON.parse(e.storage.getItem(SURVEY_STORE_KEY)).skipped, 'skip');
  assert.deepEqual(e.events.at(-1), ['install_survey', { action: 'skip' }]);

  const again = bootEnv({ store: { [SURVEY_STORE_KEY]: e.storage.getItem(SURVEY_STORE_KEY) } });
  assert.equal(await bootInstallSurvey(again.args), null);
  assert.ok(!again.root.classList.contains('show'));
  assert.equal(again.events.length, 0);
});

test('bootInstallSurvey — 안드로이드: 새로 읽은 organic 이면 묻고, 링크로 왔거나 캐시면 안 묻는다', async () => {
  const yes = bootEnv({ args: { platform: 'android', fresh: true, referrerP: Promise.resolve({ source: 'organic' }) } });
  const p = bootInstallSurvey(yes.args);
  await new Promise(r => setTimeout(r, 0));
  assert.ok(yes.root.classList.contains('show'));
  yes.root.querySelector('.sv-skip').click(); await p;

  for (const args of [{ fresh: true, referrerP: Promise.resolve({ source: 'instagram' }) },
                      { fresh: false, referrerP: Promise.resolve({ source: 'organic' }) }]) {
    const no = bootEnv({ args: { platform: 'android', ...args } });
    assert.equal(await bootInstallSurvey(no.args), null);
    assert.ok(!no.root.classList.contains('show'));
    assert.equal(no.storage.getItem(SURVEY_STORE_KEY), null, '안 물었으면 기록도 안 남긴다(나중 실행엔 캐시라 어차피 안 묻는다)');
  }
});

test('bootInstallSurvey — 안드로이드 referrer 가 늦으면(대기 상한) 이번엔 안 묻고 late 기록', async () => {
  const e = bootEnv({ args: { platform: 'android', fresh: true, referrerP: new Promise(() => {}), waitMs: 5 } });
  assert.equal(await bootInstallSurvey(e.args), null);
  assert.equal(JSON.parse(e.storage.getItem(SURVEY_STORE_KEY)).skipped, 'late');
  assert.deepEqual(e.events, [['install_survey', { action: 'late' }]]);
});

test('bootInstallSurvey — 링크로 먼저 온 초대 코드(cf_invite)는 설문 입력으로 덮어쓰지 않는다', async () => {
  const e = bootEnv({ store: { cf_invite: 'LINK2345' } });
  const p = bootInstallSurvey(e.args);
  await new Promise(r => setTimeout(r, 0));
  btn(e.root, 'friend').click();
  e.root.querySelector('input').value = 'abcd2345'; e.root.querySelector('.sv-ok').click();
  await p;
  assert.equal(e.storage.getItem('cf_invite'), 'LINK2345');
});

test('syncInstallSurvey — 앱(android·ios)이 아니면 보내지 않는다(DB platform CHECK 위반 반복 방지)', async () => {
  const rows = [];
  const storage = mem({ [SURVEY_STORE_KEY]: JSON.stringify({ answer: 'x', ts: 1, synced: [] }) });
  await syncInstallSurvey({ auth: { online: true, userId: 'u9', clientId: 'c9' }, storage, insert: async r => { rows.push(r); return { ok: true }; }, platform: 'web' });
  assert.equal(rows.length, 0);
});

test('bootInstallSurvey — 안드로이드 referrer 가 빨리 null 이면(읽기 실패) 묻지 않고 noref 기록 — 나중 실행에 뒤늦게 묻지 않게', async () => {
  const e = bootEnv({ args: { platform: 'android', fresh: true, referrerP: Promise.resolve(null) } });
  assert.equal(await bootInstallSurvey(e.args), null);
  assert.equal(JSON.parse(e.storage.getItem(SURVEY_STORE_KEY)).skipped, 'noref');
});

test('친구 초대 — 초대 링크를 통째로 붙여 넣어도 코드를 뽑는다 · 다시 입력하면 오류 문구가 지워진다 · 대화상자 역할', async () => {
  const { doc, root } = mount();
  const s = openSurvey({ doc, root, t });
  assert.equal(root.querySelector('.sv-card').attrs.role, 'dialog');
  btn(root, 'friend').click();
  const input = root.querySelector('input'), err = root.querySelector('.sv-err');
  assert.equal(err.attrs.role, 'alert');
  input.value = 'nope'; root.querySelector('.sv-ok').click();
  assert.ok(err.textContent);
  input.dispatch('input'); assert.equal(err.textContent, '');
  input.value = 'https://calmforest.cloud/?invite=abcd2345'; root.querySelector('.sv-ok').click();
  assert.deepEqual(await s.done, { answer: 'friend', code: 'ABCD2345' });
});
