import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toneOf, toneById, DEFAULT_TONE } from '../js/ui/npc-tone.js';
import { NPCS } from '../js/data/npcs.js';

const HEX = /^#[0-9a-f]{6}$/;
const lum = (hex) => {
  const ch = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('accepts numbers and hex strings alike', () => {
  assert.deepEqual(toneOf(0xe0663c), toneOf('#e0663c'));
  assert.equal(toneOf(0xe0663c).c, '#e0663c');
});

test('every field is a lowercase 6-digit hex', () => {
  for (const v of Object.values(toneOf(0x3f8fd6))) assert.match(v, HEX);
});

test('tint is lighter and deep is darker than the accent', () => {
  const t = toneOf(0x3f8fd6);
  assert.ok(lum(t.t) > lum(t.c));
  assert.ok(lum(t.d) < lum(t.i));
});

test('near-white body falls back to the alternate color', () => {
  assert.equal(toneOf(0xf0ede4, 0xe8a33c).c, '#e8a33c');
});

test('near-white body with near-white alternate uses the default accent', () => {
  assert.equal(toneOf(0xf7f4ee, 0xffffff).c, DEFAULT_TONE.c);
});

test('bad input gives the default tone', () => {
  assert.deepEqual(toneOf(undefined), DEFAULT_TONE);
  assert.deepEqual(toneOf('nope'), DEFAULT_TONE);
});

test('name ink stays readable on the cream box for every resident', () => {
  for (const n of NPCS) {
    const t = toneById(n.id);
    assert.ok(contrast(t.i, '#fffaf1') >= 3.2, `${n.id} ink ${t.i}`);
    assert.ok(contrast(t.i, '#ffffff') >= 3.2, `${n.id} button text`);
  }
});

test('unknown id gives the default tone', () => {
  assert.deepEqual(toneById('nobody'), DEFAULT_TONE);
});

test('all four dialogs share the unified box', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['npc-modal', 'chat-modal', 'merchant-modal']) {
    const at = html.indexOf(`<div id="${id}"`);
    assert.ok(at > 0, id);
    assert.match(html.slice(at, at + 300), /class="[^"]*tk-box/, id);
  }
  assert.match(html, /<div id="mirror-talk"[^>]*class="[^"]*tk-box/);
});

test('first-harvest welcome waits for any open talk box', () => {
  const src = readFileSync(new URL('../js/spaces/e1-start.js', import.meta.url), 'utf8');
  assert.match(src, /\.show > \.tk-box/);
});
