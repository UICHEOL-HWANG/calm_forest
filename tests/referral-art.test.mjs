// tests/referral-art.test.mjs — 🤝 친구 초대 보상 조형 배선(소스 검사 — node 는 three 를 못 불러온다)
//  시안: sims/referral-reward-sim.html (도구 B · 날개 A · 하트핀 B · 아치 B, 2026-10-08 사용자 선택)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKIN_TOOLS, TOOL_THEMES } from '../js/cosmetics/tool-skin-rules.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('⭐ star 테마 — 9종 전부 · themeBuilders 에 펼침 · 우산', () => {
  assert.ok(TOOL_THEMES.includes('star'));
  const c = read('../js/cosmetics/tool-skins-crystal.js');
  assert.match(c, /export function crystalThemes\(THREE, K\)/);
  const body = c.slice(c.indexOf('star: {'));
  for (const tool of SKIN_TOOLS) assert.match(body, new RegExp(`\\b${tool}\\(g\\)`), `star.${tool}`);
  const ts = read('../js/cosmetics/tool-skins.js');
  assert.match(ts, /\.\.\.crystalThemes\(THREE, K\)/);
  const umb = ts.slice(ts.indexOf('const UMBRELLAS = {'));
  assert.match(umb.slice(0, umb.indexOf('\n};')), /star:\s*\{/);
  assert.ok(ts.split('\n').length < 800, 'tool-skins.js 800줄 미만 유지');
});

test('⭐ 발광은 작은 보석만 — glow 는 RB.gem 하나', () => {
  const c = read('../js/cosmetics/tool-skins-crystal.js');
  const glows = [...c.matchAll(/glow:\s*([A-Za-z.0-9]+)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(glows)], ['RB.gem']);
  assert.doesNotMatch(c, /TOOL_GRIP\s*=|TOOL_QREST_HOLD\s*=/, '쥐기·모션 상수는 건드리지 않는다');
});

test('🦋💗 날개·하트핀 — art.js BACK/HEAD 표에 연결, 카탈로그 슬롯과 일치', () => {
  const art = read('../js/cosmetics/art.js');
  assert.match(art, /import \{ buildFriendWing, buildFriendPin \} from '\.\/art-friend\.js'/);
  const back = art.slice(art.indexOf('const BACK = {'));
  assert.match(back, /friend_wing: \(g, k\) => buildFriendWing\(THREE, g, k, h\)/);
  const head = art.slice(art.indexOf('const HEAD = {'), art.indexOf('const NECK = {'));
  assert.match(head, /friend_pin: \(g, k\) => buildFriendPin\(THREE, g, k, h\)/);
  assert.equal(findItem('friend_wing').anchor, 'back');
  assert.equal(findItem('friend_pin').earSafe, 'low');
  const f = read('../js/cosmetics/art-friend.js');
  assert.doesNotMatch(f, /from '\.\/art\.js'/, 'art.js 를 import 하면 순환');
});

test('💗 하트핀은 귀보다 앞·눈보다 옆(방향 벡터 범위) · 시안보다 크게', async () => {
  const { PIN_DIR, PIN_SCALE } = await import('../js/cosmetics/art-friend.js');
  const n = Math.hypot(PIN_DIR.x, PIN_DIR.y, PIN_DIR.z), d = { x: PIN_DIR.x / n, y: PIN_DIR.y / n, z: PIN_DIR.z / n };
  assert.ok(d.z > 0.3, '귀(z≤0.04·HR)보다 앞');
  assert.ok(d.x > 0.6, '눈(x≈0.38·HR)보다 옆');
  assert.ok(d.y < 0.5, '낮게(earSafe low)');
  assert.ok(PIN_SCALE > 1.3, '시안(1.3)보다 크게 — 구분이 안 된다는 피드백');
});

test('🌈 아치 — outdoorMesh 훅 · 걸어서 통과(충돌체 목록에 없음) · 드로우콜 3', () => {
  assert.ok(REWARD_DECOR.some(d => d.id === 'friendarch'));
  const a = read('../js/spaces/friend-arch-art.js');
  assert.match(a, /export const FRIEND_ARCH_ID = 'friendarch'/);
  assert.match(a, /export function buildFriendArch\(T, onNight = null\)/);
  const build = a.slice(a.indexOf('export function buildFriendArch'));
  assert.equal((build.match(/g\.add\(/g) || []).length, 3, '몸체·리본·반짝이 세 덩이');
  const gs = read('../js/game.js');
  assert.match(gs, /import \{ FRIEND_ARCH_ID, buildFriendArch \} from '\.\/spaces\/friend-arch-art\.js'/);
  const om = gs.slice(gs.indexOf('function outdoorMesh(id)'));
  assert.match(om.slice(0, 20000), /id === FRIEND_ARCH_ID\) \{[^\n]*\n\s*g\.add\(buildFriendArch\(THREE, \(m\) => houseWindows\.push\(m\)\)\)/);
  const solidLine = gs.split('\n').find(l => l.includes("solid = ['fence'"));
  assert.ok(solidLine && !solidLine.includes('friendarch'));
});

test('🧪 시안은 게임 모듈을 import 한다(복제본 없음)', () => {
  const sim = read('../sims/referral-reward-sim.html');
  assert.match(sim, /from '\.\.\/js\/cosmetics\/tool-skins\.js'/);
  assert.match(sim, /from '\.\.\/js\/cosmetics\/art\.js'/);
  assert.match(sim, /from '\.\.\/js\/spaces\/friend-arch-art\.js'/);
});
