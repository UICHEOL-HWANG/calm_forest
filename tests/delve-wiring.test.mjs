import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { CRYSTAL_PRICE } from '../js/data/delve.js';

const src = gameSource();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SELL_PRICE = Object.fromEntries([...read('js/data/catalog.js').match(/SELL_PRICE = \{([^}]*)\}/)[1].matchAll(/(\w+):\s*(\d+)/g)].map(m => [m[1], Number(m[2])]));

test('gameState 에 delve 기본값, 로드 때 sanitizeDelve 로 복원', () => {
  assert.match(src, /delve:\s*defaultDelve\(\)/);
  assert.match(src, /gameState\.delve\s*=\s*sanitizeDelve\(saved\.delve\)/);
});

test('수정: 인벤 기본값·라벨·판매가·도감', () => {
  assert.match(src, /gotgam: 0, crystal: 0 \}/);
  assert.match(src, /crystal: '🔮수정'/);
  assert.equal(SELL_PRICE.crystal, CRYSTAL_PRICE);
  assert.match(read('js/data/places.js'), /SELL_ICO_G = \{[^}]*crystal: '🔮'/);
});

test('지하 층 연결: 공간 표시·갱신·이동 제한·문·괭이·0층 광맥', () => {
  assert.match(src, /mineGroup\.visible = atMine && delveFloorNow\(\) === 0/);
  assert.match(src, /updateDelve\(dt, t\)/);
  assert.match(src, /if \(delveFloorNow\(\) > 0\) clampDelve\(player\.position\)/);
  assert.match(src, /handleDelveDoor\(nearDoor\)/);
  assert.match(src, /delveFloorNow\(\) > 0 \? tryDelveMine\(\) : tryMine\(\)/);
  assert.match(read('js/spaces/mine.js'), /rock\.visible = atMine && delveFloorNow\(\) === 0 && !ud\.depleted/);
  assert.match(src, /delveFloorNow\(\) > 0 \? \{ x: MINE_GATE\.x, z: MINE_GATE\.z \+ 2 \}/);
});

test('DELVE 좌표는 다른 공간과 200 이상 떨어진다', () => {
  const text = read('js/data/places.js');
  const vec = (k) => {
    const m = text.match(new RegExp(`export const ${k} = new THREE\\.Vector3\\(([^)]*)\\)`));
    assert.ok(m, k);
    const [x, y, z] = m[1].split(',').map(Number);
    return { x, y, z };
  };
  const d = vec('DELVE');
  for (const k of ['MINE', 'MUSEUM', 'CAFE', 'OBSERVATORY', 'NEIGHBOR', 'NEIGHBOR_INT', 'DREAM', 'MIRROR', 'HALLOWEEN', 'MOUNTAIN', 'RIVER', 'MIST', 'SEA', 'ORCHARD', 'FARM', 'INT']) {
    const o = vec(k);
    assert.ok(Math.hypot(d.x - o.x, d.z - o.z) >= 200, k);
  }
});

test('퀘스트 패널에 광부 카드가 합쳐진다(동굴 안에서만)', () => {
  assert.match(src, /minerCard\(gameState\.delve, gameState\.inventory, atMine\)/);
  assert.match(src, /shouldStartLine\(gameState\.delve/);
});

test('광부 카드는 맨 위 고정, 입퇴장 때 패널 갱신, 진행은 저장', () => {
  assert.match(read('js/spaces/npc.js'), /pinId: views\.some\(v => v\.id === 'delve_miner'\) \? 'delve_miner'/);
  const mine = read('js/spaces/mine.js');
  assert.match(mine.match(/export function enterMine[\s\S]*?\n}\n/)[0], /refreshQuestPanel/);
  assert.match(mine.match(/export function exitMine[\s\S]*?\n}\n/)[0], /refreshQuestPanel/);
  assert.match(read('js/spaces/delve.js').match(/nd === 'delve_miner_claim'[\s\S]*?trackEvent/)[0], /requestSave\(\)/);
});

test('액션 아이콘: 동굴 프롬프트의 첫 이모지가 버튼 아이콘(❗⛏️🍄🛗🪜🧰)', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const line = html.split('\n').find(l => l.includes('doorIcon = /^('));
  for (const e of ['❗', '⛏️', '🍄', '🛗', '🪜', '🧰']) assert.ok(line.split(e).length >= 3, e);
});

test('공통 배너는 1층 첫 진입, 빛 자국은 등불벌레가 굴에 넣을 때', () => {
  assert.match(src, /delve_common/);
  assert.match(src, /makeTrail\(/);
});
