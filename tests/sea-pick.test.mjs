import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEA_PICK_TITLE, SEA_MODES, NEW_BADGE, SOON_LABEL, isNewMode, withTried, withLast, pickCards } from '../js/forage/pick.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('approved copy (2026-10-27): title 1, card copy set 가, order fish → mudflat → dive', () => {
  assert.equal(SEA_PICK_TITLE, '오늘은 바다에서 뭐 할까요?');
  assert.deepEqual(SEA_MODES.map(m => [m.mode, m.ico, m.name, m.line, m.tag, m.meta]), [
    ['fish', '🎣', '대어 낚시', '버티고 당겨서 대어 낚기', '손맛', '🏆 오늘의 참치 순위'],
    ['mudflat', '🐚', '갯벌 캐기', '밀물 전에 조개 가득 캐기', '수집', '⏱️ 밀물까지 1분'],
    ['dive', '🤿', '잠수', '숨 참고 바닷속 보물 줍기', '탐험', '🫧 숨 세 번'],
  ]);
  assert.equal(NEW_BADGE, '새로 생겼어요');
  assert.equal(SOON_LABEL, '곧 열려요');
  for (const s of [SEA_PICK_TITLE, ...SEA_MODES.flatMap(m => [m.name, m.line, m.tag, m.meta])]) assert.doesNotMatch(s, /—/);
});

test('NEW badge shows on the new modes until they are actually played, never on fishing', () => {
  const [fish, mud, dive] = SEA_MODES;
  assert.equal(isNewMode(fish, undefined), false);
  assert.equal(isNewMode(mud, undefined), true);
  assert.equal(isNewMode(dive, { tried: { mudflat: true } }), true);
  assert.equal(isNewMode(mud, { tried: { mudflat: true } }), false);
});

test('save helpers return new objects and keep other fields', () => {
  const before = { tried: { dive: true }, last: 'dive', keep: 1 };
  const a = withTried(before, 'mudflat');
  assert.deepEqual(before, { tried: { dive: true }, last: 'dive', keep: 1 });
  assert.deepEqual(a, { tried: { dive: true, mudflat: true }, last: 'dive', keep: 1 });
  assert.deepEqual(withLast(undefined, 'fish'), { tried: {}, last: 'fish' });
});

test('cards carry NEW and readiness per mode', () => {
  const cards = pickCards({ tried: { dive: true } }, { fish: true });
  assert.deepEqual(cards.map(c => [c.mode, c.isNew, c.ready]), [['fish', false, true], ['mudflat', true, false], ['dive', false, false]]);
});

test('sea gate opens the picker; the picker tracks and dispatches by mode', () => {
  const game = read('js/game.js');
  assert.match(game, /if \(nearDoor === 'sea'\) return openSeaPick\(\);/);
  assert.match(game, /import \{ openSeaPick \} from '\.\/spaces\/sea-pick\.js';/);
  const pick = read('js/spaces/sea-pick.js');
  assert.match(pick, /trackEvent\('sea_mode_pick', pickEventParams\(/);
  assert.match(pick, /fish: \(\) => enterSea\(\)/);
  assert.match(pick, /mode: 'cancel'/);
  const html = read('index.html');
  assert.match(html, /<div id="sea-pick-modal">/);
  assert.match(html, /openSeaPick\(o\) \{/);
  assert.match(html, /#sea-pick-modal \{[^}]*container-type: size/);
});

test('picker copy translates to English', async () => {
  globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
  const { t, setLang } = await import('../js/i18n.js');
  setLang('en');
  for (const ko of [SEA_PICK_TITLE, NEW_BADGE, SOON_LABEL, ...SEA_MODES.flatMap(m => [m.name, m.line, m.tag, m.meta])]) {
    assert.doesNotMatch(t(ko), /[가-힣]/, ko);
  }
});
