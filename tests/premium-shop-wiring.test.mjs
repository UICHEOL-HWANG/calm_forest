import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('가게가 premiumRowMode 로 행을 고르고 hidden 이면 그리지 않는다', () => {
  assert.match(cafe, /import \{ premiumRowMode, slotVisible, gatedRow \} from '\.\.\/shop\/premium-row\.js'/);
  assert.match(cafe, /mode === 'hidden'\) continue/);
  assert.match(cafe, /trackEvent\('premium_row_view'/);
  assert.match(cafe, /const sb = shopButton\(it, gameState\.cosmetics\);\s*\n\s*if \(sb\)/);
});

test('새 문구는 영어 사전에 있다', () => {
  for (const k of ['로그인하면 살 수 있어요', '지금은 살 수 없어요']) assert.ok(en.includes(`'${k}'`), k);
});

test('🧥 스킨 탭 — 가게(이펙트 뒤·펫 앞)와 옷장(이펙트 뒤) · 빈 탭 숨김', () => {
  const ward = readFileSync(new URL('../js/spaces/wardrobe.js', import.meta.url), 'utf8');
  assert.match(cafe, /\['trail', '✨ 이펙트'\], \['skin', '🧥 스킨'\], \['tools', '🪓 도구'\], \['pet', '🐾 펫'\]/);   // 🪓 도구 세트(2026-10-02)는 스킨 뒤
  assert.match(ward, /\['trail', '✨ 이펙트'\], \['skin', '🧥 스킨'\], \['tools', '🪓 도구'\]\]/);
  assert.match(cafe, /slotVisible\(itemsOf\(id\), rowCtx\)/);
});
test('i18n — 스킨 문구 통문장 등재', () => {
  for (const k of ['🧥 스킨', '숲의 정령', '플러시 인형', '밤이면 몸속에서 반딧불이 떠다녀요', '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑', 'PREMIUM · 전신 스킨', '바로 입어보기'])
    assert.ok(en.includes(`'${k}'`), k);
});

test('🧥 6탭 — 가게·옷장 탭 줄이 nowrap + wrap 규칙을 가진다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /#cos-tabs \.sh-tab, #wd-slots \.sh-tab \{[^}]*white-space: nowrap/);
  assert.match(html, /#cos-tabs, #wd-slots \{ flex-wrap: wrap; \}/);
});

test('🎃 시즌 태그 · premium_row_view 에 sale 파라미터', () => {
  assert.match(cafe, /saleTagOf\(it\)/);
  assert.match(cafe, /trackEvent\('premium_row_view', \{ item_id: it\.id, mode, \.\.\.\(it\.sale \? \{ sale: it\.sale \} : \{\}\) \}\)/);
});
