import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARD_COPY, INTRO_CARDS, hasBatchim, bannerLine, bannerTick, introNeeded, BANNER_FAR } from '../js/auction/onboard.js';

const t = s => s;
const DAY = '2026-11-10';
const base = { open: true, day: DAY, joined: false, ready: true, far: true };
const fresh = { lastDate: '', wins: 0, bannerDate: '', introSeen: false };

test('the approved copy is used exactly', () => {
  assert.equal(ONBOARD_COPY.ico, '🔨');
  assert.equal(ONBOARD_COPY.title, '저녁 경매가 열렸어요');
  assert.equal(ONBOARD_COPY.follow, '화살표를 따라가요!');
  assert.deepEqual(INTRO_CARDS.map(c => [c.ico, c.title, c.sub, c.btn]), [
    ['🔨', '저녁마다 경매가 열려요', '경매품 한 점이 무대에 올라와요', '다음'],
    ['🔔', '버튼으로 값을 불러요', '4초 동안 조용하면 낙찰!', '다음'],
    ['🪙', '하루 한 번 참가해요', '코인이 모자라면 구경만 해요', '알겠어요'],
  ]);
});

test('no em dash or the banned verb in the onboarding copy', () => {
  const all = [ONBOARD_COPY.title, ONBOARD_COPY.follow, ...Object.values(ONBOARD_COPY.line), ...INTRO_CARDS.flatMap(c => [c.title, c.sub, c.btn])];
  for (const s of all) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀/, s);
  }
});

test('hasBatchim reads the last syllable', () => {
  assert.equal(hasBatchim('별 풍향계'), false);
  assert.equal(hasBatchim('달빛 그네'), false);
  assert.equal(hasBatchim('등불 아치'), false);
  assert.equal(hasBatchim('등불'), true);
  assert.equal(hasBatchim('Star Vane'), false);
  assert.equal(hasBatchim(''), false);
});

test('bannerLine picks the object particle', () => {
  assert.equal(bannerLine('별 풍향계', t), '나루터 옆 무대에서 별 풍향계를 겨뤄요');
  assert.equal(bannerLine('등불', t), '나루터 옆 무대에서 등불을 겨뤄요');
});

test('bannerLine translates the template and the item name separately', () => {
  const en = { '나루터 옆 무대에서 {0}를 겨뤄요': 'Bid for the {0} at the stage by the ferry', '별 풍향계': 'Star Vane' };
  assert.equal(bannerLine('별 풍향계', s => en[s] ?? s), 'Bid for the Star Vane at the stage by the ferry');
});

test('banner shows once when the window opens and the player is away', () => {
  const r = bannerTick(fresh, base);
  assert.equal(r.act, 'show');
  assert.equal(r.state.bannerDate, DAY);
  assert.equal(bannerTick(r.state, base).act, null);
});

test('banner waits while the player is busy and does not use up the evening', () => {
  const r = bannerTick(fresh, { ...base, ready: false });
  assert.equal(r.act, null);
  assert.equal(r.state, fresh);
  assert.equal(bannerTick(r.state, base).act, 'show');
});

test('banner is skipped near the stage and after joining today', () => {
  const near = bannerTick(fresh, { ...base, far: false });
  assert.equal(near.act, 'skip');
  assert.equal(near.state.bannerDate, DAY);
  const joined = bannerTick(fresh, { ...base, joined: true });
  assert.equal(joined.act, 'skip');
  assert.equal(joined.state.bannerDate, DAY);
});

test('closing the window clears the mark so the next evening shows again', () => {
  const shown = bannerTick(fresh, base).state;
  const closed = bannerTick(shown, { ...base, open: false });
  assert.equal(closed.act, 'reset');
  assert.equal(closed.state.bannerDate, '');
  assert.equal(closed.state.wins, 0);
  assert.equal(bannerTick(closed.state, base).act, 'show');
  assert.equal(bannerTick(closed.state, { ...base, open: false }).act, null);
});

test('a mark from an older date does not block today', () => {
  assert.equal(bannerTick({ ...fresh, bannerDate: '2026-11-09' }, base).act, 'show');
});

test('bannerTick never mutates the given state', () => {
  const s = Object.freeze({ ...fresh });
  bannerTick(s, base);
  bannerTick(Object.freeze({ ...fresh, bannerDate: DAY }), { ...base, open: false });
});

test('the far threshold matches the approved distance', () => {
  assert.equal(BANNER_FAR, 8);
});

test('intro cards only before the first real join', () => {
  assert.equal(introNeeded(fresh, 'bid'), true);
  assert.equal(introNeeded(fresh, 'watch'), true);
  assert.equal(introNeeded(fresh, 'closed'), false);
  assert.equal(introNeeded(fresh, 'done'), false);
  assert.equal(introNeeded({ ...fresh, introSeen: true }, 'bid'), false);
  assert.equal(introNeeded(undefined, 'bid'), true);
});
