import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUDGE_TRIGGERS, takeNudge } from '../js/signup-gift/rules.js';
import { nudgeView, BOX, GIFT_NAMES, allCopy } from '../js/signup-gift/copy.js';
import { runSignupGift } from '../js/signup-gift/flow.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('권유는 첫 수확·첫 집 각각 한 번만', () => {
  assert.deepEqual([...NUDGE_TRIGGERS], ['harvest', 'house']);
  const a = takeNudge(undefined, 'harvest');
  assert.equal(a.fire, true);
  assert.deepEqual(a.flags, { harvest: 1 });
  const b = takeNudge(a.flags, 'harvest');
  assert.equal(b.fire, false);
  const c = takeNudge(a.flags, 'house');
  assert.equal(c.fire, true);
  assert.deepEqual(c.flags, { harvest: 1, house: 1 });
  assert.equal(takeNudge({}, 'dex5').fire, false);
});

test('takeNudge 는 받은 객체를 바꾸지 않는다', () => {
  const flags = Object.freeze({ harvest: 1 });
  const out = takeNudge(flags, 'house');
  assert.notEqual(out.flags, flags);
});

test('첫 수확·첫 집 창은 축하 제목과 선물 카드', () => {
  const h = nudgeView({ trigger: 'harvest', platform: 'web', inApp: true });
  assert.equal(h.title, '첫 수확 축하해요!');
  assert.equal(h.gift.title, '셋 중 하나가 랜덤으로 와요');
  assert.equal(h.gift.line, '🪴 화분 · 📮 우편함 · 🏮 등불');
  assert.equal(h.warn, '지금 마을은 이 브라우저에만 저장돼 있어요');
  assert.equal(h.button, '✉️ 이메일로 마을 지키고 선물 받기');
  assert.equal(nudgeView({ trigger: 'house', platform: 'web', inApp: false }).title, '첫 집이 생겼어요!');
  assert.equal(nudgeView({ trigger: 'house', platform: 'web', inApp: false }).button, '로그인하고 선물 받기');
});

test('앱(토스·안드로이드·iOS)은 경고·버튼을 바꾸지 않는다', () => {
  for (const platform of ['toss', 'android', 'ios']) {
    const v = nudgeView({ trigger: 'harvest', platform, inApp: false });
    assert.equal(v.warn, null);
    assert.equal(v.button, null);
    assert.ok(v.gift);
  }
});

test('도감·상점 권유는 제목을 바꾸지 않고 선물 카드만 붙인다', () => {
  const v = nudgeView({ trigger: 'dex5', platform: 'web', inApp: false });
  assert.equal(v.title, null);
  assert.ok(v.gift);
});

test('선물 상자 문구는 3종 모두 있다', () => {
  const ids = REWARD_DECOR.filter(d => d.reward === 'signup').map(d => d.id);
  assert.deepEqual(Object.keys(GIFT_NAMES).sort(), [...ids].sort());
  for (const id of ids) assert.match(BOX.open[id], /이 왔어요!$/);
  assert.equal(BOX.closedTitle, '🎁 가입 선물이 도착했어요');
  assert.equal(BOX.ok, '확인');
});

test('문구에 엠대시·놀다가 없고 전부 영어판이 있다', () => {
  const en = read('../js/i18n-en.js');
  for (const s of allCopy()) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀/, s);
    assert.ok(en.includes(`'${s}'`), `영어판 없음: ${s}`);
  }
  for (const d of REWARD_DECOR.filter(x => x.reward === 'signup')) {
    assert.ok(en.includes(`'${d.name}'`), d.name);
    assert.ok(en.includes(`'${d.desc}'`), d.desc);
  }
});

function deps({ auth = { provider: 'email', isGuest: false }, res = { ok: true, item: 'giftmailbox', new: true } } = {}) {
  const log = { calls: [], resync: [], track: [], shown: [] };
  return {
    log,
    auth,
    call: async (action) => { log.calls.push(action); return res; },
    resync: async (via, o) => { log.resync.push([via, o]); },
    track: (n, p) => log.track.push([n, p]),
    show: (item) => log.shown.push(item),
  };
}

test('게스트·익명·오프라인은 서버를 부르지 않는다', async () => {
  for (const auth of [{ provider: 'anonymous', isGuest: true }, { provider: 'offline', isGuest: true }, null]) {
    const d = deps({ auth });
    assert.equal(await runSignupGift(d), null);
    assert.equal(d.log.calls.length, 0);
  }
});

test('새로 받으면 원장을 다시 맞추고 상자를 띄운다', async () => {
  const d = deps();
  await runSignupGift(d);
  assert.deepEqual(d.log.calls, ['claim']);
  assert.deepEqual(d.log.resync, [['signup_gift', { quiet: true }]]);
  assert.deepEqual(d.log.shown, ['giftmailbox']);
  assert.deepEqual(d.log.track, [['signup_gift_claim', { result: 'new', item: 'giftmailbox' }]]);
});

test('이미 받았거나 거절되면 상자를 띄우지 않는다', async () => {
  const d1 = deps({ res: { ok: true, item: 'giftmailbox', new: false } });
  await runSignupGift(d1);
  assert.deepEqual(d1.log.shown, []);
  assert.deepEqual(d1.log.resync, []);
  const d2 = deps({ res: { ok: false, reason: 'too_early' } });
  await runSignupGift(d2);
  assert.deepEqual(d2.log.track, [['signup_gift_claim', { result: 'too_early', item: '' }]]);
  const d3 = deps({ res: null });
  await runSignupGift(d3);
  assert.deepEqual(d3.log.track, [['signup_gift_claim', { result: 'net_fail', item: '' }]]);
});

test('게임이 첫 수확·첫 집에서 권유를 부른다', () => {
  const farm = read('../js/spaces/farm-auto.js');
  assert.ok(farm.includes("requestSignupNudge(gameState, 'harvest', ui)"));
  const game = read('../js/game.js');
  assert.ok(game.includes("if (next === 1) requestSignupNudge(gameState, 'house', ui)"));
});

test('index.html 이 권유 창에 선물 카드를 그리고 진입 뒤 받기를 부른다', () => {
  const html = read('../index.html');
  assert.ok(html.includes('id="nudge-gift"'));
  assert.ok(html.includes('id="gift-box-modal"'));
  assert.ok(html.includes('nudgeView({ trigger, platform: PLATFORM, inApp: inAppLogin.inApp })'));
  assert.ok(html.includes('signupGiftOnPlay({ auth: authState, track: trackEvent, resync: resyncPurchases, ui })'));
});
