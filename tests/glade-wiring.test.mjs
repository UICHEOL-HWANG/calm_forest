import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/spaces/glade.js', import.meta.url), 'utf8');

test('glade reads the night rules and reports the night kind on catches', () => {
  assert.match(src, /from '\.\.\/glade\/night\.js'/);
  assert.match(src, /nightNow\(\)\.tune\.dimChance/);
  assert.match(src, /mode: nightNow\(\)\.kind/);
  assert.match(src, /gladeNightSeen/);
});

test('dev overrides only work on a local host', () => {
  assert.match(src, /localhost\|127\\\.0\\\.0\\\.1/);
});

test('glade builds the string lights and counts every catch into them', () => {
  assert.match(src, /from '\.\.\/glade\/string-art\.js'/);
  assert.match(src, /layoutAnchors\(/);
  assert.match(src, /function noteCatch\(/);
  assert.match(src, /awardBadge\('glade_ring'\)/);
  assert.match(src, /trackEvent\('glade_string', \{ step: /);
});

test('string progress is saved only inside hintsSeen', () => {
  assert.match(src, /gladeCaught: r\.caught, gladeSeg: r\.seg, gladeString: r\.string/);
  assert.doesNotMatch(src, /gameState\.glade/);
});

test('glade runs the swarm and reports how it ended', () => {
  assert.match(src, /from '\.\.\/glade\/swarm\.js'/);
  assert.match(src, /from '\.\.\/glade\/swarm-art\.js'/);
  assert.match(src, /trackEvent\('firefly_swarm', \{ result, combo: swarm\.combo, caught: swarm\.caught, mode: nightNow\(\)\.kind \}\)/);
  assert.match(src, /gladeSwarmSeen/);
});

test('regular fireflies pause while a swarm is out', () => {
  assert.match(src, /gladeBugs\.length < GLADE_MAX && !swarm/);
});

test('new events stay within five parameters', () => {
  for (const m of src.matchAll(/trackEvent\('(glade_string|firefly_swarm)', \{([^}]*)\}/g)) assert.ok(m[2].split(',').length <= 5, m[1]);
});

test('a closer regular firefly wins the swing over the swarm', () => {
  assert.match(src, /for \(const bug of gladeBugs\) near\(bug, null\)/);
  assert.match(src, /if \(!best \|\| best\.idx === null\) return false/);
});

test('swarm objects are freed and its first banner only shows while it is out', () => {
  assert.match(src, /o\.traverse\(m => \{ m\.geometry\?\.dispose\(\); m\.material\?\.dispose\(\); \}\)/);
  assert.match(src, /live: \(\) => !!swarm/);
});

test('every catch path gets the catch ceremony', () => {
  const body = src.slice(src.indexOf('function catchBugs('), src.indexOf('function endSwarm('));
  assert.match(body, /catchCeremony\('bugZoom'\)/);
});

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the bug net is handed over when entering the glade', async () => {
  const { ZONE_TOOL, ZONE_PAGE } = await import('../js/data/tools.js');
  assert.equal(ZONE_TOOL.glade, 'net');
  assert.equal(ZONE_PAGE.glade, 'out');
});

test('trees holding the string lights are not chopped or auto-axed', () => {
  assert.match(src, /userData\.holdsString = true/);
  assert.match(read('../js/spaces/fishing.js'), /if \(tree\.userData\.fallen \|\| tree\.userData\.holdsString\) continue;/);
  assert.match(read('../js/game.js'), /if \(tree\.userData\.fallen \|\| tree\.userData\.holdsString\) continue;/);
});

test('stream nights move along one shared phase', () => {
  assert.match(src, /streamPhase \+= dt \* STREAM\.speed/);
  assert.match(src, /streamPoint\(streamPhase - u\.so, GLADE_R - 0\.8\)/);
});

test('fireflies pool light on the floor', () => {
  assert.match(src, /from '\.\.\/glade\/pool-art\.js'/);
  assert.match(src, /updatePools\(poolArt, /);
});

test('swinging at a guarded leader points at the next kid', () => {
  assert.match(src, /swarmObjs\.kids\[nextKid\(swarm\)\]/);
});

test('glade zone hints avoid the em dash', () => {
  const doors = read('../js/spaces/doors.js');
  const line = doors.split('\n').find(l => l.includes('반딧불이') && l.includes('포충망(5)'));
  assert.ok(line && !line.includes('—'), line);
});

test('guidance and foraging ignore trees that hold the string lights', () => {
  assert.match(read('../js/guide/goal-guide.js'), /const standing = \(t\) => !t\.userData\.fallen && !t\.userData\.holdsString;/);
  assert.match(read('../js/game.js'), /for \(const tr of trees\) if \(!tr\.userData\.fallen && !tr\.userData\.holdsString\) treeD/);
});

test('floor pools never get a negative fade', () => {
  assert.match(src, /updatePools\(poolArt, [^;]*Math\.max\(0, Math\.min\(1, \(nightLevel - NIGHT_MIN\) \/ 0\.2\)\)\)/);
});
