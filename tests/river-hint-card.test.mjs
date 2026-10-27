import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { riverHintTiles, fillTiles } from '../js/ui-cards.js';

const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const strings = tiles => tiles.flatMap(x => [x.tag, x.title, x.label, x.desc, ...(x.chips || [])]).filter(Boolean);

test('B안 구성: 목표 제목·조작 칩 3개·하루 3번·모으기·급류', () => {
  const tl = riverHintTiles();
  assert.equal(tl[0].k, 'hero');
  assert.equal(tl[0].title, '강 끝까지 내려가기');
  const ctl = tl.find(x => x.tag === '조작');
  assert.equal(ctl.wide, true);
  assert.equal(ctl.label, '🛶 배 앞에서 {A}');
  assert.deepEqual(ctl.chips, ['⬅️➡️ 피하기', '💨 {A} 스퍼트', '{S} 배 스킬']);
  const gold = tl.find(x => x.tone === 'gold');
  assert.equal(gold.label, '3번');
  assert.equal(gold.desc, '내일 새 물길');
  assert.equal(tl.find(x => x.tag === '모으기').desc, '별조각 · 강 재료');
  assert.equal(tl.find(x => x.tone === 'peach').label, '🌊 한 번 완주하면 급류가 열려요');
});

test('fillTiles: 키 자리를 바꾸고 원본은 그대로', () => {
  const tl = riverHintTiles();
  const snap = JSON.stringify(tl);
  const pc = fillTiles(tl, { A: 'Space', S: 'F' });
  const ctl = pc.find(x => x.tag === '조작');
  assert.equal(ctl.label, '🛶 배 앞에서 Space');
  assert.deepEqual(ctl.chips, ['⬅️➡️ 피하기', '💨 Space 스퍼트', 'F 배 스킬']);
  const touch = fillTiles(tl, { A: '⭕', S: '🫧' });
  assert.deepEqual(touch.find(x => x.tag === '조작').chips, ['⬅️➡️ 피하기', '💨 ⭕ 스퍼트', '🫧 배 스킬']);
  assert.equal(JSON.stringify(tl), snap);
  assert.ok(strings(pc).every(s => !/\{[AS]\}/.test(s)));
});

test('영어: PC·휴대폰 문구가 모두 번역된다', () => {
  for (const keys of [{ A: 'Space', S: 'F' }, { A: '⭕', S: '🫧' }]) {
    for (const s of strings(fillTiles(riverHintTiles(), keys))) {
      if (!HAS_KO.test(s)) continue;
      const en = t(s);
      assert.ok(!HAS_KO.test(en), `"${s}" → "${en}"`);
    }
  }
});

test('문구에 엠대시 없음', () => {
  assert.ok(strings(riverHintTiles()).every(s => !s.includes('—')));
});

test('배선: 나루터 첫 안내는 타일, 안내창은 타일 키를 채운다', () => {
  const R = readFileSync(new URL('../js/spaces/river.js', import.meta.url), 'utf8');
  assert.match(R, /firstHint\('riverDock', '🛶', '강 끝까지 내려가기',\s*\{ tiles: riverHintTiles\(\) \}\)/);
  assert.ok(!R.includes("note: '하루 3번'"));
  const H = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const i = H.indexOf('showHintModal({'); const body = H.slice(i, H.indexOf('\n      },', i));
  assert.match(body, /fillTiles\(card\.tiles, \{ A: ak, S: TOUCH \? '🫧' : 'F' \}\)/);
  assert.match(H, /import \{[^}]*fillTiles[^}]*\} from '\.\/js\/ui-cards\.js'/);
});

test('타일 안 이모지 아이콘(span.te)은 줄을 바꾸지 않는다', () => {
  const H = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(H, /\.dc-t span\.te \{ display: inline-block; font-size: inherit; opacity: 1; margin-top: 0; \}/);
});

test('휴대폰 스킬 칩 🫧 는 지금 탈 수 있는 스킬 배가 잠수뿐일 때만 맞다', async () => {
  const { BOATS, liveBoatIds } = await import('../js/boat/boats.js');
  const skills = [...new Set(liveBoatIds().map(id => BOATS[id].skill?.id).filter(Boolean))];
  assert.deepEqual(skills, ['dive'], '스킬 배가 늘면 riverHintTiles 의 {S} 칩과 index.html 의 터치 기호를 다시 정한다');
});
