import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const HTML = read('index.html');
const FILES = ['js/game.js', ...readdirSync(new URL('../js/spaces/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `js/spaces/${f}`)];
const CALLS = FILES.flatMap((f) => {
  const src = read(f);
  const out = [];
  const re = /firstHint\('([\w]+)'|firstHint\('buff_'/g;
  let m;
  while ((m = re.exec(src))) out.push({ f, key: m[1] || 'buff', chunk: src.slice(m.index, m.index + 900) });
  return out;
});

test('첫 안내 카드는 15곳', () => {
  assert.equal(CALLS.length, 15, CALLS.map((c) => c.key).join(','));
});

test('15곳 모두 새 틀(조작 칸 steps) — 긴 문장 본문은 쓰지 않는다', () => {
  for (const c of CALLS) {
    assert.match(c.chunk, /steps: \[/, `${c.f} ${c.key}`);
    assert.doesNotMatch(c.chunk.slice(0, c.chunk.indexOf('steps: [')), /\\n·/, `${c.f} ${c.key}`);
  }
});

test('모바일·PC 조작 이름은 {A} 자리표시 하나로 — 숫자키·(액션) 표기 없음', () => {
  for (const c of CALLS) {
    const body = c.chunk.slice(c.chunk.indexOf('steps: ['), c.chunk.indexOf('})') + 1);
    assert.doesNotMatch(body, /\(액션\)|\(Space\)|숫자 \d/, `${c.f} ${c.key}`);
  }
  assert.match(HTML, /const ak = TOUCH \? '⭕' : 'Space';/);
  assert.match(HTML, /\.replace\(\/\\\{A\\\}\/g, ak\)/);
});

test('카드 틀은 .tut-card 를 유지(E1 이 이걸로 열린 카드를 찾는다)하고 전부 textContent', () => {
  assert.match(HTML, /<div id="hint-modal">\s*<div class="tut-card">/);
  assert.match(HTML, /<div id="hint-steps"><\/div>/);
  const fn = HTML.slice(HTML.indexOf('showHintModal({'), HTML.indexOf('showNotices('));
  assert.doesNotMatch(fn, /innerHTML = [^'"`]*(label|note|chip)/);
});

test('조작 칸·주의·칩 문구는 영어 사전에 있다({A}·변수는 {0} 패턴)', () => {
  const norm = (s) => s.replace(/\{A\}/g, '{0}');
  const has = (s) => !!EN[s] || !!EN[norm(s)];
  for (const c of CALLS) {
    const strs = [...c.chunk.matchAll(/(?:label|note|chip): '([^']+)'/g)].map((m) => m[1]);
    for (const s of strs) assert.ok(has(s), `${c.key}: ${s}`);
  }
});

test('엠대시 없음', () => {
  for (const c of CALLS) {
    const head = c.chunk.slice(0, c.chunk.indexOf('})') + 2);
    assert.doesNotMatch(head, /—/, c.key);
  }
});
