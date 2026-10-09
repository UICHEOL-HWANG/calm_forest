// tests/referral-rules.test.mjs — 🤝 친구 초대 클라이언트 규칙(js/referral/rules.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readInviteParam, shouldBind, tierView, inviteUrl, bindMessage, keepPendingAfter, TIERS, MSG,
} from '../js/referral/rules.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

test('readInviteParam — ?invite= 를 대문자로, 형식이 틀리면 null', () => {
  assert.equal(readInviteParam('?invite=abcd2345'), 'ABCD2345');
  assert.equal(readInviteParam('?lang=en&invite=ABCD2345'), 'ABCD2345');
  assert.equal(readInviteParam('?invite=ABCD0O11'), null, '0·O·1·I 는 코드에 없다');
  assert.equal(readInviteParam('?invite=<script>'), null);
  assert.equal(readInviteParam('?ref=ABCD2345'), null, '?ref 는 GA 캠페인용 — 초대 코드가 아니다');
  assert.equal(readInviteParam(''), null);
});

test('shouldBind — 코드가 있고 로그인 계정(게스트·오프라인 아님)일 때만', () => {
  assert.equal(shouldBind({ pendingCode: 'ABCD2345', isGuest: false, provider: 'google' }), true);
  assert.equal(shouldBind({ pendingCode: 'ABCD2345', isGuest: true, provider: 'anonymous' }), false);
  assert.equal(shouldBind({ pendingCode: 'ABCD2345', isGuest: false, provider: 'offline' }), false);
  assert.equal(shouldBind({ pendingCode: null, isGuest: false, provider: 'toss' }), false);
});

test('단계 — 1·3·5명 · 보상 id 가 카탈로그/보상 장식에 있다', () => {
  assert.deepEqual(TIERS.map(t => [t.need, t.item]), [[1, 'tools_star'], [3, 'friendarch'], [5, 'friend_wing']]);
  assert.ok(findItem('tools_star') && findItem('friend_wing'));
  assert.ok(REWARD_DECOR.some(d => d.id === 'friendarch'));
  assert.deepEqual(tierView(3).map(t => t.done), [true, true, false]);
  assert.deepEqual(tierView(0).map(t => t.done), [false, false, false]);
});

test('inviteUrl — 웹 오리진의 ?invite= 링크(토스·앱 유저가 보내도 웹으로 열린다)', () => {
  assert.equal(inviteUrl('ABCD2345'), 'https://calmforest.cloud/?invite=ABCD2345');
});

test('bindMessage — 결과별 문구, 조용히 넘길 것은 null', () => {
  assert.equal(bindMessage({ ok: true }), MSG.bindOk);
  assert.equal(bindMessage({ ok: false, reason: 'not_new' }), MSG.notNew);
  assert.equal(bindMessage({ ok: false, reason: 'self' }), MSG.self);
  for (const r of ['bad_code', 'too_many', 'inviter_full', 'cycle']) assert.equal(bindMessage({ ok: false, reason: r }), MSG.invalid, r);
  assert.equal(bindMessage({ ok: false, reason: 'already_bound' }), null);
  assert.equal(bindMessage(null), null, '네트워크 실패 — 다음에 다시');
});

test('keepPendingAfter — 네트워크 실패만 코드를 남겨 다음 부팅에 다시 시도', () => {
  assert.equal(keepPendingAfter(null), true);
  assert.equal(keepPendingAfter({ error: 'upstream' }), true);
  assert.equal(keepPendingAfter({ ok: true }), false);
  assert.equal(keepPendingAfter({ ok: false, reason: 'not_new' }), false);
});

test('새 문구는 영어 사전에 있다', async () => {
  const { readFileSync } = await import('node:fs');
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  // 줄바꿈이 든 문구(banner)는 사전 원문에 \n 이스케이프로 적혀 있다
  for (const v of Object.values(MSG)) assert.ok(en.includes(`'${v.replace(/\n/g, '\\n')}'`), v);
});
