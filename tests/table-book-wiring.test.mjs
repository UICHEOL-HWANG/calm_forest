import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const b = src('js/table/book-ui.js');
const g = src('js/game.js');

test('한 입은 찬장을 안 건드리고, 버프는 늘리기만 하고, 하루 상태를 다시 본다', () => {
  assert.doesNotMatch(b, /pantry|eatDish|cook_eat/);
  assert.match(b, /export function takeBite\(id, kind = 'free'\)/);
  assert.match(b, /const st = biteStatus\(gameState\.hintsSeen, day\);\n  if \(kind === 'free' && st\.bit\) return false;\n  if \(kind === 'ad' && !st\.adLeft\) return false;/);
  assert.match(b, /gameState\.hintsSeen = kind === 'ad' \? afterBiteAd\(gameState\.hintsSeen, day\) : afterBite\(gameState\.hintsSeen, day\);/);
  assert.match(b, /buffs\[dish\.buff\] = biteBuffEnd\(buffs\[dish\.buff\], clock\.elapsedTime, biteSeconds\(dish\.tier, COOK_TIERS\)\);\n  emitBuffs\(\);/);
  assert.match(b, /trackEvent\('table_bite', \{ recipe: dish\.id, quality: dish\.tier, kind \}\);\n  requestSave\(\);/);
  assert.equal((b.match(/trackEvent\(/g) || []).length, 2);
});

test('요리책: 고리 알림 끄기, 본 표시, 기록, 빈 칸은 재료·화덕·주방 길과 재료 광고', () => {
  assert.match(b, /export function openCookbook\(\)/);
  assert.match(b, /markTableRingSeen\(\);/);
  assert.match(b, /gameState\.hintsSeen\.cookbookSeen = true;/);
  assert.match(b, /trackEvent\('cookbook_open', \{ count: book\.got \}\);/);
  assert.match(b, /if \(!isOpen\('kitchen'\)\) return \{ line: \[\.\.\.pieces, \.\.\.station, C\.kitchenLocked\]\.join\(' · '\) \};/);
  assert.match(b, /guideShortAd\('cook_ingredient', slot\.short, ok => \{ if \(ok\) render\(slot\.id\); \}, CAFE_CAPS\)/);
  assert.match(b, /yardGuidePointTo\('kitchen'\);/);
  assert.doesNotMatch(b, /repeatOpen/);
});

test('한 입 광고는 집이 다 지어지고 광고가 있을 때만, 자리 이름은 table_bite_more', () => {
  assert.match(g, /export function tableBiteAdOffered\(\) \{\n  return repeatOpen\(gameState\.houseStage\) && !!rewarded\?\.offer\('table_bite_more'\);\n\}/);
  assert.match(g, /export function tableBiteAdButton\(id, onDone\) \{\n  if \(!tableBiteAdOffered\(\)\) return null;\n  return rewarded\.button\('table_bite_more', \['광고 보고', ' ', TABLE_COPY\.adMore\], \(\) => takeBite\(id, 'ad'\)/);
  assert.match(b, /if \(st\.adLeft && tableBiteAdOffered\(\)\) row\.append/);
  assert.match(b, /if \(mode === 'ad'\) return \{ line, extra: tableBiteAdButton\(d\.id/);
});

test('수첩 창은 칸 안내 옆에 광고 버튼 같은 덧붙임을 받는다', () => {
  const c = src('js/hud/collection-book.js');
  assert.match(c, /const extra = info\?\.extra \?\? null;/);
  assert.match(c, /if \(extra\) box\.append\(extra\);/);
});

test('주석 없음', () => {
  for (const f of ['js/table/book-ui.js', 'js/table/guide-steps.js', 'js/table/copy.js']) assert.doesNotMatch(src(f), /^\s*\/\//m);
});
