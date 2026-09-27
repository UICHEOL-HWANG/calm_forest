// tests/plaza-tracking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const EVENTS = ['plaza_view', 'plaza_modal_open', 'plaza_donate', 'plaza_donate_fail', 'plaza_stage_seen',
  'plaza_stall_buy', 'plaza_reward_claim', 'plaza_leaf_convert', 'plaza_invite_deliver', 'plaza_invite_arrive'];
const dir = new URL('../js/plaza/', import.meta.url);
const plazaSrc = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const doc = readFileSync(new URL('../docs/analysis/GA4_GUIDE.md', import.meta.url), 'utf8');

test('광장 이벤트 10종이 코드에서 나가고 GA4_GUIDE 에 적혀 있다', () => {
  for (const e of EVENTS) {
    assert.ok(plazaSrc.includes(`'${e}'`), `js/plaza/ 에서 ${e} 를 안 보낸다`);
    assert.ok(doc.includes(`\`${e}\``), `GA4_GUIDE.md 에 ${e} 가 없다`);
  }
});

test('광장 이벤트는 전부 plaza_ 접두사 — 기존 owl_·quest_ 시계열과 섞이지 않게', () => {
  const sent = [...plazaSrc.matchAll(/trackEvent\('([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(sent.length >= 8);
  assert.deepEqual(sent.filter(n => !n.startsWith('plaza_')), []);
});

test('예약 트래픽 키(source 등)를 파라미터 이름으로 쓰지 않는다', () => {
  assert.ok(!/trackEvent\('plaza_[a-z_]+',\s*\{[^}]*\b(source|medium|campaign|term|content)\s*:/.test(plazaSrc));
});
