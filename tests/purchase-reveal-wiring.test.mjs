import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const rev = readFileSync(new URL('../js/shop/purchase-reveal.js', import.meta.url), 'utf8');

test('오버레이 마크업과 버튼', () => {
  for (const id of ['buy-reveal', 'br-canvas', 'br-name', 'br-desc', 'br-walk', 'br-close']) assert.match(html, new RegExp(`id="${id}"`), id);
});
test('id 중복 없음(런 결과 창과 br-close 충돌 방지)', () => {
  assert.equal((html.match(/id="br-close"/g) || []).length, 1);
});
test('연출은 reveal-pose 의 시간축·문구를 쓴다', () => {
  assert.match(rev, /from '\.\/reveal-pose\.js'/);
});
test('가게 onGranted 가 프리미엄 현금 구매에 연출을 띄운다', () => {
  assert.match(cafe, /playPurchaseReveal\(\{ itemId: c\.itemId/);
  assert.match(cafe, /trackEvent\('premium_reveal_close'/);
});
test('onGranted — 연출은 저장 뒤, try 안에서(장식이 지급 저장을 막지 않는다)', () => {
  const body = cafe.slice(cafe.indexOf('function onGranted('));
  const save = body.indexOf('requestSave()'), play = body.indexOf('playPurchaseReveal(');
  assert.ok(save > 0 && play > save, 'requestSave 가 먼저');
  assert.match(body.slice(save, play), /try \{\s*(const mode[^\n]*\n\s*)?$/);
});
test('stopPurchaseReveal 이 --br-dim 을 0 으로 되돌린다', () => {
  assert.match(rev, /setProperty\('--br-dim', '0'\)/);
});

test('빛줄기는 진열물(root)에 달지 않는다 — 달면 회전을 따라 중심이 맴돈다 · 캔버스 가장자리는 마스크로 흐린다', () => {
  assert.doesNotMatch(rev, /root\.add\(rays\)/);
  assert.match(rev, /scene\.add\(root,\s*rays\)/);
  assert.match(rev, /disposeTree\(rig\.rays\)/);
  assert.match(html, /#buy-reveal canvas \{[^}]*mask-image: radial-gradient/);
});

test('연출은 가게가 열려 있을 때만 · [바로 걸어보기] 도 열린 가게만 닫는다 · 시작 중 예외면 오버레이를 걷는다', () => {
  assert.match(cafe, /premium && cosShopOpen\(\)\) \{\s*try \{[\s\S]*?playPurchaseReveal/);
  assert.match(cafe, /function closeCosShopForWalk\(\) \{ if \(cosShopOpen\(\)\)/);
  assert.match(rev, /try \{[\s\S]*?start\([^)]*\);\s*\}\s*catch \(e\) \{ stopPurchaseReveal\(\); throw e; \}/);
});

test('B+C — 카드 태그·버튼 문구를 모드에 따라 바꾼다 · 섬광 마크업', () => {
  assert.match(html, /id="br-tag"/);
  assert.match(html, /class="br-flash"/);
  assert.match(rev, /REVEAL_CARD\[mode\]/);
  assert.match(rev, /boxburstPose\(/);
});
test('onGranted — 스킨은 내 캐릭터(스킨 입은)를 진열한다 · 닫기 via wear', () => {
  const body = cafe.slice(cafe.indexOf('function onGranted('));
  assert.match(body, /buildShowcase/);
  assert.match(body, /'wear'/);
});
test('stop — B+C 진열 캐릭터는 재질 공유라 disposeTree 하지 않는다 · 카메라를 A 값으로 되돌린다', () => {
  const s = rev.slice(rev.indexOf('export function stopPurchaseReveal('));
  assert.match(s, /if \(!rig\.extra\) disposeTree\(rig\.root\)/);
  assert.match(s, /camera\?\.position\.set\(0, 1\.1, 1\.9\)/);
});
