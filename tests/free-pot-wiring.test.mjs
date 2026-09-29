import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };

test('kitchenStart·kitchenFinish 는 dishOf 로 요리를 찾는다(자유 요리도 같은 길)', () => {
  assert.match(fn('kitchenStart'), /dishOf\(id\)/);
  assert.match(fn('kitchenFinish'), /dishOf\(id\)/);
});
test('자유 요리는 도감(cook)에 올리지 않는다', () => {
  assert.match(fn('kitchenFinish'), /if \(!isFreeId\(id\)\) dexDiscover\('cook', id\)/);
});
test('찬장·먹기도 dishOf 를 쓴다(자유 요리를 보관해도 안 깨진다)', () => {
  for (const f of ['pantryView', 'cookResolve', 'pantryEat']) assert.match(fn(f), /dishOf\(/, f);
});
test('자유 요리 결과·시작·먹기에 축 파라미터가 실린다', () => {
  for (const p of ['combo_key', 'taste', 'is_new', 'found', 'buff', 'dur_base']) assert.match(fn('kitchenFinish'), new RegExp(`${p}:`), p);
  for (const p of ['combo_key', 'n_ing', 'stage']) assert.match(fn('kitchenStart'), new RegExp(`${p}:`), p);
  assert.match(fn('eatDish'), /taste:/);
  assert.match(fn('cookResolve'), /taste:/);
});

test('세이브 복원: 찬장의 자유 요리(free:<조합>)를 버리지 않고, 있으면 표를 미리 불러온다', () => {
  const i = src.indexOf('if (Array.isArray(saved.pantry))');
  const blk = src.slice(i, src.indexOf('\n  }\n', i));
  assert.match(blk, /isFreeId\(f\.id\) && freeDishOf\(f\.id\)/);   // 레시피 목록에 없어도 형식이 맞는 자유 요리는 살린다
  assert.match(blk, /loadFreePot\(\)/);
});

import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('주방에 자유 냄비 탭이 있고 표를 지연 로드한다', () => {
  assert.match(html, /id="kt-tab-free"/);
  assert.match(html, /Input\.loadFreePot\(\)/);
  assert.match(html, /function renderFreePot\(/);
});
test('결과 카드가 자유 요리의 맛·평·새 발견을 보여 준다', () => {
  assert.match(html, /res\.free/);
  assert.match(html, /id="mgr-taste"/);
});
test('영어일 때 생성된 이름·평은 _en 을 직접 쓴다', () => {
  assert.match(html, /LANG === 'en' \? res\.free\.judge_en : res\.free\.judge/);
});
test('free_pot_open·free_pot_blocked 트래킹', () => {
  assert.match(src, /trackEvent\('free_pot_open', \{ found[\s\S]{0,80}total[\s\S]{0,80}kinds_have/);
  assert.match(src, /trackEvent\('free_pot_blocked', \{ combo_key: c\.key, recipe_ids:/);
});
test('freePotStart 는 freePotCheck 를 거쳐 kitchenStart 로 들어간다', () => {
  assert.match(src, /freePotStart[\s\S]{0,200}freePotCheck\(ids\)[\s\S]{0,400}kitchenStart\(FREE_PREFIX \+ c\.key\)/);
});

test('확정 문구(🍲 보글보글 냄비) — 탭·버튼·안내·새 발견·발견 수', () => {
  for (const s of ['🍲 보글보글 냄비', '🔥 보글보글 끓이기', '재료를 1~3개 넣고 보글보글 끓여 봐요', '✨NEW']) assert.ok(html.includes(s), s);
  assert.match(html, /끓여 본 요리 \$\{/);
  const EN = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const k of ['🍲 보글보글 냄비', '🔥 보글보글 끓이기', '재료를 1~3개 넣고 보글보글 끓여 봐요', '📖 레시피', '최고의 솜씨', '훌륭한 솜씨', '무난한 솜씨', '아쉬운 솜씨',
    '이건 레시피가 있는 요리예요 — 메뉴에서 만들어 주세요', '재료를 1~3개 골라 주세요']) assert.ok(EN.includes(`'${k}':`), `i18n ${k}`);
});


test('결과 카드는 짧게 — 별 + 한 줄 평 + ✨NEW 배지 + 작은 발견 수(문장 "처음 끓여 본…" 없음)', () => {
  const i = html.indexOf('function showCookResult('), body = html.slice(i, html.indexOf('\n    }\n', i));
  assert.match(body, /✨NEW/);
  assert.doesNotMatch(body, /처음 끓여 본 요리예요/);
  assert.doesNotMatch(body, /'Taste'|'맛'/);                          // "맛" 글자 없이 별만
});
test('자유 요리의 등급 이름은 솜씨 — "아쉬운 맛!"과 맛 ★이 겹치지 않게', () => {
  assert.match(fn('kitchenFinish'), /const tierName = r\.free \? tier\.name\.replace\('맛', '솜씨'\) : tier\.name/);
  assert.match(fn('kitchenFinish'), /tier: \{ id: tier\.id, ico: tier\.ico, name: tierName/);
});

const STAGE = readFileSync(new URL('../js/spaces/kitchen-stage.js', import.meta.url), 'utf8');
test('조리 무대는 재료 모형 — 국물 위·석쇠·노트·퐁당·썰린 반쪽에 이모지 스프라이트를 쓰지 않는다', () => {
  const i = STAGE.indexOf('export function mgSceneStart('), start = STAGE.slice(i, STAGE.indexOf('\n}\n', i));
  assert.match(start, /ingredientModel\(/);
  assert.doesNotMatch(start, /emojiSprite\(/);
  const hit = STAGE.slice(STAGE.indexOf('export function mgChopHit('), STAGE.indexOf('export function mgPotHit('));
  assert.doesNotMatch(hit, /emojiSprite\(/);
  const pot = STAGE.slice(STAGE.indexOf('export function mgPotHit('), STAGE.indexOf('export function updateMgScene('));
  assert.doesNotMatch(pot, /emojiSprite\(/);
  assert.match(html, /Input\.mgSceneStart\(c\.mg, MG\.costKeys, CHOP_N, MG\.grillKey\)/);
  assert.match(fn('kitchenStart'), /keys: stageKeys\(r\)/);
  assert.match(fn('kitchenStart'), /grillKey: grillKeyOf\(r\)/);
});

// 🛟 표 불러오기 실패(모바일 끊김·배포 사이 404) — 실패를 캐시하면 새로고침 전까지 냄비 탭이 죽는다(리뷰 2026-09-29)
test('loadFreePot: 실패하면 다시 시도할 수 있게 비우고, 탭은 안내를 띄우며, 표 없이는 요리를 시작하지 않는다', () => {
  const DISH = readFileSync(new URL('../js/free-pot/dish.js', import.meta.url), 'utf8');
  assert.match(DISH, /loading = null; throw e;/);
  const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(HTML, /try \{ await Input\.loadFreePot\(\); \} catch/);
  const GAME = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(GAME, /loadFreePot\(\)\.catch\(/);
  assert.match(GAME, /if \(!freePotReady\(\)\) return \{ ok: false/);
});
