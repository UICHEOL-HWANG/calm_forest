import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { letterView } from '../js/promo-gift/ui.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const lazy = readFileSync(new URL('../js/game-lazy.js', import.meta.url), 'utf8');

test('봉투 1단계 — 게스트는 추신·로그인 버튼, 로그인 유저는 없음, 영어면 label_en', () => {
  const g = letterView({ stage: 1, label: '인스타그램에서 온 초대장', labelEn: 'From Instagram', loggedIn: false }, 'ko');
  assert.equal(g.from, '인스타그램에서 온 초대장');
  assert.equal(g.lines.length, 4);
  assert.ok(g.ps && g.login);
  const m = letterView({ stage: 1, label: 'L', labelEn: 'From Instagram', loggedIn: true }, 'en');
  assert.equal(m.from, 'From Instagram');
  assert.equal(m.ps, null);
  assert.equal(m.login, null);
  assert.equal(letterView({ stage: 1, label: null, labelEn: null, loggedIn: false }, 'ko').from, '숲에서 온 초대장');
});

test('봉투 2단계 — 꾸미기 두 칸, 확인 버튼만', () => {
  const v = letterView({ stage: 2, label: 'L', labelEn: 'E', loggedIn: true }, 'ko');
  assert.deepEqual(v.tiles.map(t => [t.ico, t.name]), [['🎈', '꼬마 열기구'], ['🧳', '여행 가방 더미']]);
  assert.equal(v.take, '확인');
  assert.equal(v.login, null);
});

test('index.html — 마크업·메뉴·부팅·onPlay 순서·로그인 출구', () => {
  for (const id of ['promo-gift-modal', 'promo-gift-seal', 'promo-gift-from', 'promo-gift-title', 'promo-gift-note', 'promo-gift-rule', 'promo-gift-list', 'promo-gift-set', 'promo-gift-ps', 'promo-gift-ok', 'promo-gift-cta', 'gift-code-modal', 'gift-code-title', 'gift-code-input', 'gift-code-msg', 'gift-code-submit', 'gift-code-close', 'gift-code-btn']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.equal(html.split("import('./js/promo-gift/index.js')").length - 1, 1);
  assert.doesNotMatch(html, /from '\.\/js\/promo-gift\/index\.js'/);
  assert.match(html, /promoGift\(\)\.then\(m => m\.bootPromoGift\(\{ track: trackEvent \}\)\)/);
  assert.match(html, /if \(referrerFresh\) promoGift\(\)\.then\(m => m\.linkInstallGift\(referrerP\)\)/);
  assert.match(html, /promoGift\(\)\.then\(m => m\.promoGiftOnPlay\([\s\S]{0,400}\.finally\(\(\) => signupGiftOnPlay\(/);
  assert.match(html, /ui\.connectAccount = \(from\) => nudgeConnect\(from\);/);
  assert.match(html, /\$\('gift-code-btn'\)\.addEventListener\('click', \(\) => promoGift\(\)\.then\(m => m\.openGiftCodeEntry\(/);
});

test('grantItems — 인벤토리에 있는 양의 정수만, 경제 로그·저장·HUD', () => {
  const fn = game.match(/export function grantItems[\s\S]*?\n\}/)[0];
  assert.match(fn, /k in gameState\.inventory/);
  assert.match(fn, /Number\.isInteger\(v\)/);
  assert.match(fn, /logEcon\(source, k, v, gameState\.inventory\[k\]\)/);
  assert.match(fn, /requestSave\(\);/);
  assert.match(fn, /refreshInventoryUI\(\);/);
  assert.match(lazy, /export const grantItems = \(\.\.\.a\) => need\(\)\.game\.grantItems\(\.\.\.a\);/);
});

test('새 코드에 주석이 없다', () => {
  for (const p of ['../js/promo-gift/rules.js', '../js/promo-gift/flow.js', '../js/promo-gift/ui.js', '../js/promo-gift/index.js', '../js/promo-gift/copy.js', '../js/spaces/promo-gift-art.js', '../functions/api/promo-gift.js']) {
    const src = readFileSync(new URL(p, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m, p);
  }
});

test('수동 입력은 서버 확인 뒤에만 저장한다', () => {
  const src = readFileSync(new URL('../js/promo-gift/index.js', import.meta.url), 'utf8');
  assert.match(src, /async function check\(code\)[\s\S]*action: 'check'/);
  assert.match(src, /checkVerdict\(await check\(code\)\)[\s\S]*?captureCode\(\{ storage: s, code, via: 'manual', force: true/);
});
