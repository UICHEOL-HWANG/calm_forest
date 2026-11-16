import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArbiter, GUIDE_PRIORITY, guideArbiter } from '../js/guide/arbiter.js';

const flag = (v = false) => { let on = v; const f = () => on; f.set = (x) => { on = x; }; return f; };

function full() {
  const a = createArbiter();
  const live = {};
  for (const name of Object.keys(GUIDE_PRIORITY)) { live[name] = flag(); a.register({ name, active: live[name] }); }
  return { a, live };
}

test('priority order runs coach, house, goal, port, restaurant, yard, affinity, weekly, fountain, concert, auction', () => {
  const names = Object.entries(GUIDE_PRIORITY).sort((x, y) => y[1] - x[1]).map(([n]) => n);
  assert.deepEqual(names, ['coach', 'house', 'goal', 'port', 'restaurant', 'yard', 'affinity', 'weekly', 'fountain', 'concert', 'auction']);
});

test('a free arbiter lets every guide show', () => {
  const { a } = full();
  for (const name of Object.keys(GUIDE_PRIORITY)) assert.equal(a.mayShow(name), true);
  assert.equal(a.busy(), false);
});

test('an active guide hides every lower one and none above it', () => {
  const { a, live } = full();
  live.yard.set(true);
  assert.deepEqual(Object.keys(GUIDE_PRIORITY).filter(n => !a.mayShow(n)), ['affinity', 'weekly', 'fountain', 'concert', 'auction']);
  assert.equal(a.mayShow('yard'), true);
  assert.equal(a.busy(), true);
});

test('a lower guide resumes once the higher one ends', () => {
  const { a, live } = full();
  live.goal.set(true);
  live.weekly.set(true);
  assert.equal(a.mayShow('weekly'), false);
  live.goal.set(false);
  assert.equal(a.mayShow('weekly'), true);
});

test('an active lower guide never hides a higher one', () => {
  const { a, live } = full();
  live.auction.set(true);
  live.affinity.set(true);
  assert.equal(a.mayShow('house'), true);
  assert.equal(a.mayShow('affinity'), true);
  assert.equal(a.mayShow('auction'), false);
});

test('wants blocks lower guides the same way active does', () => {
  const a = createArbiter();
  const wants = flag(true);
  a.register({ name: 'house', active: () => false, wants });
  a.register({ name: 'port', active: () => false });
  assert.equal(a.mayShow('port'), false);
  assert.equal(a.anyActive(), false);
  assert.equal(a.busy(), false);
  wants.set(false);
  assert.equal(a.mayShow('port'), true);
});

test('equal priority: the earlier registration wins', () => {
  const a = createArbiter();
  a.register({ name: 'one', priority: 5, active: () => true });
  a.register({ name: 'two', priority: 5, active: () => true });
  assert.equal(a.mayShow('one'), true);
  assert.equal(a.mayShow('two'), false);
});

test('unknown names yield to every claiming guide and never block known ones', () => {
  const a = createArbiter();
  const port = flag();
  a.register({ name: 'port', active: port });
  assert.equal(a.mayShow('nobody'), true);
  port.set(true);
  assert.equal(a.mayShow('nobody'), false);
  assert.equal(a.mayShow('port'), true);
});

test('a known but unregistered name still ranks by the priority table', () => {
  const a = createArbiter();
  a.register({ name: 'yard', active: () => true });
  assert.equal(a.mayShow('house'), true);
  assert.equal(a.mayShow('weekly'), false);
});

test('anyActive can leave one guide out', () => {
  const { a, live } = full();
  live.port.set(true);
  assert.equal(a.anyActive(), true);
  assert.equal(a.anyActive('port'), false);
});

test('registering a name again replaces it and the returned function unregisters', () => {
  const a = createArbiter();
  a.register({ name: 'goal', active: () => true });
  const off = a.register({ name: 'goal', active: () => false });
  assert.equal(a.mayShow('port'), true);
  a.register({ name: 'house', active: () => true });
  assert.equal(a.mayShow('goal'), false);
  off();
  assert.equal(a.mayShow('port'), false);
});

test('a guide never blocks itself', () => {
  const a = createArbiter();
  a.register({ name: 'goal', active: () => true, wants: () => true });
  assert.equal(a.mayShow('goal'), true);
});

test('a guide the player asked for can rise above the goal arrow while it runs', () => {
  const a = createArbiter();
  const goal = flag(true), aff = flag(false), asked = flag(false);
  a.register({ name: 'coach', active: () => false });
  a.register({ name: 'goal', active: goal });
  a.register({ name: 'affinity', priority: () => (asked() ? GUIDE_PRIORITY.goal + 5 : GUIDE_PRIORITY.affinity), active: aff });
  assert.equal(a.mayShow('affinity'), false);
  asked.set(true);
  assert.equal(a.mayShow('affinity'), true);
  aff.set(true);
  assert.equal(a.mayShow('goal'), false);
  assert.equal(a.mayShow('coach'), true);
  asked.set(false);
  assert.equal(a.mayShow('goal'), true);
});

test('the shared arbiter is a single instance', () => {
  assert.equal(typeof guideArbiter.mayShow, 'function');
  assert.equal(typeof guideArbiter.register, 'function');
});
