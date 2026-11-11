import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const node = () => {
  const props = {};
  return { textContent: '', classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, contains(c) { return this.set.has(c); } }, style: { background: '', setProperty(k, v) { props[k] = v; } }, dataset: {}, props, addEventListener() {} };
};
const els = { 'mirror-talk': node(), 'mt-face': node(), 'mt-name': node(), 'mt-line': node(), 'mt-next': node() };
globalThis.document = { getElementById: id => els[id] || null };
const { showTalk } = await import('../js/mirror/talk-box.js');

test('a portrait fills the face circle while the colour still sets the tone', () => {
  showTalk({ face: '', color: '#3a7bd5', portrait: 'url(data:image/png;base64,AA) center / 100% no-repeat', name: '수달 어부', line: '안녕', next: '▶' });
  assert.match(els['mt-face'].style.background, /^url\(data:image\/png/);
  assert.ok(els['mirror-talk'].props['--nc']);
});

test('a talk without a portrait clears the previous one', () => {
  showTalk({ face: '⛏️', color: '#8a5a2b', name: '광부', line: '어서 와', next: '▶' });
  assert.equal(els['mt-face'].style.background, '');
  assert.equal(els['mt-face'].textContent, '⛏️');
});

test('the port passes its portrait separately from the tone colour', () => {
  const idx = readFileSync(new URL('../js/port/index.js', import.meta.url), 'utf8');
  assert.match(idx, /showTalk\(\{ face: '', color: badge, portrait: `url\(\$\{npcPortrait\(talk\.id\)\}\) center \/ 100% no-repeat, \$\{badge\}44`/);
});
