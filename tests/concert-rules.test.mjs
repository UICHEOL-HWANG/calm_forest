import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, CONCERT_DECOR, PAID_PLAYS, SONG_IDS } from '../js/data/concert.js';
import { concertDefault, restoreConcert, starsFor, notesFor, paidLeft, settle, buyPlan, spend, addInstrument, equip, markTutorial } from '../js/concert/rules.js';

const DAY = '2026-11-14', NEXT = '2026-11-15';

test('prices add up to 250 and the base instrument is free', () => {
  const total = [...INSTRUMENTS, ...CONCERT_DECOR].reduce((t, i) => t + i.cost, 0);
  assert.equal(total, 250);
  assert.equal(INSTRUMENTS.find(i => i.id === 'drum').cost, 0);
  assert.equal(CONCERT_DECOR.filter(d => d.kind === 'indoor').length, 3);
  assert.equal(CONCERT_DECOR.filter(d => d.kind === 'outdoor').length, 3);
});

test('default state owns only the drum', () => {
  const s = concertDefault();
  assert.deepEqual(s.owned, ['drum']);
  assert.equal(s.equipped, 'drum');
  assert.equal(s.notes, 0);
  assert.deepEqual(Object.keys(s.best), [...SONG_IDS]);
});

test('restore repairs broken saves', () => {
  assert.deepEqual(restoreConcert(null), concertDefault());
  const s = restoreConcert({ notes: -4, owned: ['guitar', 'laser', 'guitar'], equipped: 'laser', best: { morning: 7, march: 'x' }, day: 5, paid: 99, tutorial: 1 });
  assert.equal(s.notes, 0);
  assert.deepEqual(s.owned, ['drum', 'guitar']);
  assert.equal(s.equipped, 'drum');
  assert.equal(s.best.morning, 1);
  assert.equal(s.best.march, 0);
  assert.equal(s.day, '');
  assert.equal(s.paid, PAID_PLAYS);
  assert.equal(s.tutorial, false);
});

test('stars follow the cut lines and the hard song has a lower third cut', () => {
  assert.equal(starsFor('morning', 0.29), 0);
  assert.equal(starsFor('morning', 0.3), 1);
  assert.equal(starsFor('morning', 0.6), 2);
  assert.equal(starsFor('morning', 0.84), 2);
  assert.equal(starsFor('morning', 0.85), 3);
  assert.equal(starsFor('waltz', 0.8), 3);
  assert.equal(notesFor(0), 1);
  assert.equal(notesFor(3), 4);
});

test('only the first three shows of a day pay notes', () => {
  let s = concertDefault();
  for (let i = 0; i < 3; i++) {
    const r = settle(s, { songId: 'morning', ratio: 0.9, today: DAY });
    assert.equal(r.earned, 4);
    assert.equal(r.left, 2 - i);
    s = r.state;
  }
  assert.equal(s.notes, 12);
  const fourth = settle(s, { songId: 'morning', ratio: 0.9, today: DAY });
  assert.equal(fourth.earned, 0);
  assert.equal(fourth.state.notes, 12);
  assert.equal(paidLeft(fourth.state, DAY), 0);
  assert.equal(paidLeft(fourth.state, NEXT), 3);
  assert.equal(settle(fourth.state, { songId: 'morning', ratio: 0.1, today: NEXT }).earned, 1);
});

test('best keeps the highest ratio per song and settle does not mutate', () => {
  const s0 = concertDefault();
  const a = settle(s0, { songId: 'march', ratio: 0.5, today: DAY });
  assert.equal(a.bestUp, true);
  const b = settle(a.state, { songId: 'march', ratio: 0.4, today: DAY });
  assert.equal(b.bestUp, false);
  assert.equal(b.state.best.march, 0.5);
  assert.equal(s0.notes, 0);
  assert.equal(s0.best.march, 0);
});

test('buyPlan refuses in a fixed order: no art, owned, guest, short', () => {
  const item = { id: 'guitar', cost: 40 };
  const rich = { ...concertDefault(), notes: 40 };
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: true, hasArt: false }), { ok: false, reason: 'soon' });
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: true, hasArt: true }), { ok: false, reason: 'owned' });
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: false, hasArt: true }), { ok: false, reason: 'guest' });
  assert.deepEqual(buyPlan({ ...rich, notes: 31 }, item, { isGuest: false, owned: false, hasArt: true }), { ok: false, reason: 'short', lack: 9 });
  assert.deepEqual(buyPlan(rich, item, { isGuest: false, owned: false, hasArt: true }), { ok: true });
});

test('spend, addInstrument, equip and markTutorial return new states', () => {
  const s = { ...concertDefault(), notes: 40 };
  const t = addInstrument(spend(s, 40), 'guitar');
  assert.equal(t.notes, 0);
  assert.deepEqual(t.owned, ['drum', 'guitar']);
  assert.equal(equip(t, 'guitar').equipped, 'guitar');
  assert.equal(equip(t, 'bass'), t);
  assert.equal(equip(t, 'drum'), t);
  assert.equal(addInstrument(t, 'guitar'), t);
  assert.equal(markTutorial(t).tutorial, true);
  assert.equal(s.notes, 40);
});
