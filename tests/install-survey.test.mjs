// 🧭 첫 실행 "어디서 알게 되셨어요?" — 누구에게·무엇을 저장하나(순수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SURVEY_STORE_KEY, SURVEY_OPTIONS, shouldAskSurvey, surveyRecord, readSurvey, checkInviteCode, surveyUserProps,
} from '../js/install-survey.js';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('보기 12개 — 값은 UTM Source 시트 소스 이름과 같고 겹치지 않는다', () => {
  assert.deepEqual(SURVEY_OPTIONS.map(o => o.value),
    ['search', 'store', 'instagram', 'threads', 'youtube', 'x', '1km', 'hithere', 'community', 'word_of_mouth', 'friend', 'other']);
  for (const o of SURVEY_OPTIONS) { assert.ok(o.label && o.ico, o.value); assert.match(o.value, /^[a-z0-9_.-]{1,36}$/); }
  assert.equal(SURVEY_OPTIONS.find(o => o.value === 'friend').code, true, '친구 초대만 코드칸');
  assert.equal(SURVEY_OPTIONS.filter(o => o.code).length, 1);
});

test('shouldAskSurvey — 웹·토스·itch 는 안 묻는다', () => {
  for (const platform of ['web', 'toss', 'itch']) assert.equal(shouldAskSurvey({ platform, stored: null }), false, platform);
});

test('shouldAskSurvey — 한 기기 한 번(답·건너뛰기·늦음 모두 기록되면 끝)', () => {
  for (const stored of [{ answer: 'x' }, { skipped: 'skip' }, { skipped: 'late' }]) {
    assert.equal(shouldAskSurvey({ platform: 'ios', stored }), false);
  }
});

test('shouldAskSurvey — iOS 는 첫 실행 전원', () => {
  assert.equal(shouldAskSurvey({ platform: 'ios', stored: null }), true);
});

test('shouldAskSurvey — 안드로이드는 이번에 새로 읽은 referrer 가 organic·unknown 일 때만', () => {
  const ask = (referrer, fresh = true) => shouldAskSurvey({ platform: 'android', stored: null, referrer, fresh });
  assert.equal(ask({ source: 'organic' }), true);
  assert.equal(ask({ source: 'unknown' }), true);
  assert.equal(ask({ source: 'instagram' }), false, '링크로 온 사람은 이미 안다');
  assert.equal(ask({ source: 'preexisting' }), false, '기능 전 기존 사용자');
  assert.equal(ask({ source: 'organic' }, false), false, '캐시된 값 = 첫 실행이 아니다');
  assert.equal(ask(null), false, '읽기 실패·늦음 — 이번엔 안 묻는다');
});

test('shouldAskSurvey — dev 세션은 ?survey=1 강제일 때만(그때는 기록이 있어도 띄운다)', () => {
  assert.equal(shouldAskSurvey({ platform: 'ios', stored: null, dev: true }), false);
  assert.equal(shouldAskSurvey({ platform: 'web', stored: { answer: 'x' }, dev: true, force: true }), true);
});

test('surveyRecord·readSurvey — 답/건너뛰기 기록, 깨진 값은 null', () => {
  const s = mem();
  s.setItem(SURVEY_STORE_KEY, JSON.stringify(surveyRecord({ answer: 'search', now: 5 })));
  assert.deepEqual(readSurvey(s), { answer: 'search', code: false, ts: 5, synced: [] });
  assert.deepEqual(surveyRecord({ answer: null, skipped: 'skip', now: 6 }), { skipped: 'skip', ts: 6, synced: [] });
  assert.deepEqual(surveyRecord({ answer: 'friend', code: true, now: 7 }).code, true);
  assert.equal(readSurvey(mem({ [SURVEY_STORE_KEY]: '{oops' })), null);
  assert.equal(readSurvey(mem({ [SURVEY_STORE_KEY]: JSON.stringify({ answer: 'hacked<script>' }) })), null, '보기에 없는 값은 버린다');
  assert.equal(readSurvey(null), null);
});

test('checkInviteCode — 비우면 코드 없이 통과, 형식은 친구 초대와 같은 규칙(8자·I O 0 1 없음)', () => {
  assert.deepEqual(checkInviteCode(''), { ok: true, code: null });
  assert.deepEqual(checkInviteCode('  abcd2345 '), { ok: true, code: 'ABCD2345' });
  assert.deepEqual(checkInviteCode('ABCD1234'), { ok: false, code: null }, '1 은 쓰지 않는 글자');
  assert.deepEqual(checkInviteCode('ABC'), { ok: false, code: null });
});

test('surveyUserProps — GA4 사용자 속성 heard_from(답한 사람만)', () => {
  assert.deepEqual(surveyUserProps({ answer: 'threads' }), { heard_from: 'threads' });
  assert.deepEqual(surveyUserProps({ skipped: 'skip' }), {});
  assert.deepEqual(surveyUserProps(null), {});
});

test('checkInviteCode — 초대 링크 전체를 붙여 넣어도 코드를 뽑는다', () => {
  assert.deepEqual(checkInviteCode('https://calmforest.cloud/?invite=abcd2345'), { ok: true, code: 'ABCD2345' });
  assert.deepEqual(checkInviteCode('https://calmforest.cloud/?invite=nope'), { ok: false, code: null });
});
