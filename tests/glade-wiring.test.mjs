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
