import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitToast, isTwoLine, buffTiles, mistClearTiles, bridgeTiles, BUFF_SHORT } from '../js/ui-cards.js';
import { gameSource } from './helpers/game-source.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = gameSource();
const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const BUFF_META = {
  speed: { ico: '👟', name: '빠른 발' }, luck: { ico: '🍀', name: '낚시 행운' },
  chop: { ico: '🪓', name: '벌목 보너스' }, mine: { ico: '⛏️', name: '광부의 힘' },
};

test('splitToast: 앞 이모지는 아이콘, 첫 " · " 앞은 본문, 나머지는 보조 조각', () => {
  assert.deepEqual(splitToast('🔄 밭 도구로 바꿨어요 · 액션만 누르세요'), { ic: '🔄', main: '밭 도구로 바꿨어요', subs: ['액션만 누르세요'] });
  assert.deepEqual(splitToast('🌷 꽃밭 들었어요 · Space로 놓기 · 🧺 보관'), { ic: '🌷', main: '꽃밭 들었어요', subs: ['Space로 놓기', '🧺 보관'] });
  assert.deepEqual(splitToast('재료가 부족해요'), { ic: '', main: '재료가 부족해요', subs: [] });
  assert.deepEqual(splitToast('❄️ 오늘은 눈 오는 날!'), { ic: '❄️', main: '오늘은 눈 오는 날!', subs: [] });
  assert.equal(splitToast('🧑‍🌾 일꾼이 왔어요').ic, '🧑‍🌾');
});

test('isTwoLine: 본문+보조가 24자를 넘으면 보조를 아랫줄로', () => {
  assert.equal(isTwoLine(splitToast('🔄 밭 도구로 바꿨어요 · 액션만 누르세요')), false);
  assert.equal(isTwoLine(splitToast('🍀 낚시 행운 버프가 생겼어요 · 호수 부두에서 희귀 물고기를 노려 보세요')), true);
});

test('버프 4종 모두 짧은 효과·어디서 문구가 있다(catalog 의 버프 id 와 일치)', () => {
  const ids = [...read('js/data/catalog.js').match(/export const BUFF_META = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+(\w+):\s+\{/gm)].map(m => m[1]);
  assert.deepEqual(Object.keys(BUFF_SHORT).sort(), ids.sort());
  for (const [k, m] of Object.entries(BUFF_SHORT)) {
    assert.ok(m.effect && m.where, k);
    assert.ok(m.effect.length <= 20, `${k} effect ${m.effect}`);
  }
});

test('buffTiles: 제목 "○○ 버프"·효과·남은 시간·어디서·요리 팁', () => {
  const tiles = buffTiles('luck', BUFF_META.luck, 72);
  assert.equal(tiles[0].k, 'hero');
  assert.equal(tiles[0].title, '낚시 행운 버프');
  assert.ok(tiles.some(x => x.label === BUFF_SHORT.luck.effect));
  assert.ok(tiles.some(x => x.label === '⏱️ 72초' && x.tone === 'gold'));
  assert.ok(tiles.some(x => x.label === '🍳 요리하면 다시 · 등급이 좋으면 더 오래'));
});

test('안개 정화·다리 카드: 숫자는 인자에서', () => {
  const m = mistClearTiles(6);
  assert.ok(m.some(x => x.label === '+6 ✨'));
  assert.ok(m.some(x => x.label === '✨ 정령 등불'));
  const b = bridgeTiles({ wood: 10, stone: 5 });
  assert.equal(b[0].k, 'quote');
  assert.deepEqual(b[1].chips, ['🪵 10', '🪨 5']);
});

test('토스트는 다크 바로 그리고, 쪼개기 전에 통째로 번역한다', () => {
  assert.match(html, /renderToast\(el, t\(msg\)/);
  assert.match(html, /#toast\.panel \{[^}]*background: rgba\(28,44,35,\.92\)/);
});

test('hint 모달이 칸 카드(body.tiles)를 받는다', () => {
  assert.match(html, /<div id="hint-tiles" class="dc-grid"/);
  assert.match(html, /card\?\.tiles/);
});

test('바뀐 문구가 코드에 들어 있고 옛 긴 문구는 없다', () => {
  const all = src + html + read('js/spaces/mist.js') + read('js/spaces/river.js') + read('js/boat/result-card.js') + read('js/spaces/farm-auto.js') + read('js/spaces/orchard-actions.js') + read('js/spaces/cooking.js');
  for (const s of ['들었어요 · ', '· 🧺 보관', '오늘은 ${BOAT_RUNS_PER_DAY}번 다 탔어요', '내일 새 물길이 열려요',
    '🔄 밭 도구로 바꿨어요 · 액션만 누르세요', '🔄 나무 도구로 바꿨어요 · 🪓 베기만 따로',
    '일 연속 출석하면 지을 수 있어요!', '📸 사진첩 가득 · 지우면 더 담겨요', '🎒 주운 건 그대로 · 🛶 배는 내일 멀쩡해요',
    '원을 따라 <b>일정하게</b> 돌려요<br>빠르기보다 고르기', '링에 맞춰 <b>같은 박자로</b> 6번<br>연타하면 뭉개져요']) {
    assert.ok(all.includes(s), s);
  }
  for (const s of ['원하는 곳에서', '밭에 맞는 도구로 바꿨어요', '여기에 닭장을 지을 수 있어요', '오래된 사진을 지우면',
    '정령들이 하늘로 돌아가고', '요리 타이밍(등급)이 좋을수록', '내일 새로운 물길(코스)이 열려요']) {
    assert.ok(!all.includes(s), s);
  }
});

test('로그인 권유는 칸 카드: 경고 칸 + 플랫폼별 해결 칸', () => {
  assert.match(html, /<div id="nudge-modal">\s*<div class="tut-card daily-card">/);
  assert.match(html, /id="nudge-warn"[^>]*>나가면 도감·코인·마을이 사라져요</);
  assert.ok(!html.includes('게스트로 나가면 모은 도감·코인·마을이 사라져요'));
});

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

test('영어 모드: 새 문구에 한국어가 안 남는다', () => {
  const strs = [
    ...Object.entries(BUFF_META).flatMap(([k, m]) => buffTiles(k, m, 30).flatMap(x => [x.tag, x.title, x.label, x.desc, x.text, ...(x.chips || [])])),
    ...mistClearTiles(6).flatMap(x => [x.tag, x.title, x.label, x.desc]),
    ...bridgeTiles({ wood: 10, stone: 5 }).flatMap(x => [x.tag, x.title, x.label, x.desc, x.text]),
    '🌷 꽃밭 들었어요 · Space로 놓기 · 🧺 보관', '🌷 꽃밭 · Space로 놓기', '🌷 꽃밭 · ⭕로 놓기', '🌷 꽃밭 들었어요 · ⭕로 놓기 · 🧺 보관',
    '오늘은 3번 다 탔어요', '내일 새 물길이 열려요', '🔄 밭 도구로 바꿨어요 · 액션만 누르세요', '🔄 나무 도구로 바꿨어요 · 🪓 베기만 따로',
    '🔥 2일 연속 출석하면 지을 수 있어요!', '📸 사진첩 가득 · 지우면 더 담겨요', '🎒 주운 건 그대로 · 🛶 배는 내일 멀쩡해요',
    '나가면 도감·코인·마을이 사라져요', '🔒 로그인하면 어느 기기서든 이어서', '🔒 이메일로 가입하면 지금 마을 그대로',
    '🔒 토스 계정 연결하면 영구 보존', '🔒 플레이 게임즈 연결하면 기기를 바꿔도 이어서', '🔒 게임 센터 연결하면 기기를 바꿔도 이어서', '로그인 후 구매 가능',
    '원을 따라 <b>일정하게</b> 돌려요<br>빠르기보다 고르기', '링에 맞춰 <b>같은 박자로</b> 6번<br>연타하면 뭉개져요',
  ].filter(Boolean);
  const left = strs.filter(s => /[가-힣]/.test(t(s))).map(s => `${s} → ${t(s)}`);
  assert.deepEqual(left, []);
});

test('영어 모드: 가공 설명은 <b>·<br> 조각마다 번역된다(DOM 은 텍스트 노드 단위)', () => {
  for (const tip of ['원을 따라 <b>일정하게</b> 돌려요<br>빠르기보다 고르기', '링에 맞춰 <b>같은 박자로</b> 6번<br>연타하면 뭉개져요']) {
    const out = tip.split(/<[^>]+>/).filter(x => x.trim()).map(x => t(x.trim())).join('|');
    assert.ok(!/[가-힣]/.test(out), out);
  }
});
