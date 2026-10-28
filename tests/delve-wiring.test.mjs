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
  assert.match(read('js/data/dex.js'), /\{ id: 'gem',\s+name: '보석', ico: '💎' \},\n\s*\{ id: 'crystal', name: '수정', ico: '🔮' \}/);
  assert.match(read('js/spaces/delve.js'), /^\s*dexDiscover\('ore', c\.ore\);$/m);
  assert.doesNotMatch(read('js/spaces/delve.js'), /!== 'crystal'/);
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
});

test('광부 카드는 맨 위 고정, 입퇴장 때 패널 갱신, 진행은 저장', () => {
  assert.match(read('js/spaces/npc.js'), /pinId: views\.find\(v => v\.id === 'delve_miner' \|\| v\.id === 'delve_job'\)/);
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

test('상자는 보물상자 규칙(rollChest·chestGive) 재사용, 열면 noteChest', () => {
  assert.match(src, /rollChest\(/);
  assert.match(src, /chestGive\(/);
  assert.match(src, /noteChest\(gameState\.delve, run\.floor\)/);
});

test('광부 보상 지급 훅: grantCosmetic·grantDecor 가 $w 로 노출되고 모르는 id 는 무시', () => {
  assert.match(src, /get grantCosmetic\(\)/);
  assert.match(src, /get grantDecor\(\)/);
  assert.match(src, /function grantCosmetic\(id\)[\s\S]{0,300}findItem\(id\)/);
  assert.match(src, /function grantDecor\(id\)[\s\S]{0,300}DECOR\.some/);
});

const delveSrc = () => read('js/spaces/delve.js');
const block = (s, from) => s.match(new RegExp(`${from}[\\s\\S]*?\\n  \\}\\n`))[0];

test('승강기: 정류장이 있으면 두 버튼 안내(가장 깊은 곳 / 1층부터), 없으면 바로 1층', () => {
  const b = block(delveSrc(), "if \\(nd === 'delve_lift'\\)");
  assert.match(b, /liftTargets\(gameState\.delve\)/);
  assert.match(b, /showHintModal\?\.\(\{[\s\S]*ico: '🛗', title: '승강기', body: '어디로 갈까요\?'/);
  assert.match(b, /alt: \{ label: '🪜 1층부터'/);
  assert.match(b, /onClick: \(\) => go\(deepest\)/);
  assert.match(b, /onClick: \(\) => go\(1\)/);
  assert.match(b, /if \(deepest === 1\) \{ go\(1\); return true; \}/);
  assert.match(b, /trackEvent\('delve_enter', \{ floor, [^}]*\}\); enterFloor\(floor, 'lift'\)/);
  const en = read('js/i18n-en.js');
  for (const k of ["'승강기'", "'어디로 갈까요?'", "'🪜 1층부터'", "'🛗 지하 {0#}층'"]) assert.ok(en.includes(k), k);
});

test('광부 보상 재지급: 로드 직후와 받기 직후 같은 함수', () => {
  assert.match(src, /refreshPond\('load'\);\s*\n\s*settleMinerRewards\(\);\s*\n\}/);
  assert.ok(src.indexOf("refreshPond('load');\n  settleMinerRewards();") > src.indexOf('gameState.outdoorStored[k] = Math.floor(v)'), '보관함 복원 뒤에 지급해야 덮이지 않는다');
  assert.match(block(delveSrc(), "if \\(nd === 'delve_miner_claim'\\)"), /settleMinerRewards\(\)/);
  assert.match(delveSrc(), /export function settleMinerRewards[\s\S]*?owedMinerRewards\(gameState\.delve, gameState\.cosmetics\.owned\)[\s\S]*?granted: \{ \.\.\.gameState\.delve\.granted, \[id\]: true \}/);
});

test('벽은 InstancedMesh 하나, 카메라 쪽 줄은 낮은 턱', () => {
  const s = delveSrc();
  assert.match(s, /new THREE\.InstancedMesh\(wallGeo, wallMat/);
  assert.doesNotMatch(s, /new THREE\.Mesh\(wallGeo, wallMat\)/);
});

test('빛 자국은 잡은 자리에서 굴까지, 층마다 자원 정리', () => {
  const s = delveSrc();
  assert.match(s, /grabAt = \{ x: /);
  assert.doesNotMatch(s, /pest\.spawn\.x/);
  assert.match(s.match(/function clearRoom\(\)[\s\S]*?\n}\n/)[0], /disposeObj\(group\)/);
  const dz = s.match(/function disposeObj\(root\)[\s\S]*?\n}\n/)[0];
  for (const k of [/geometry\?\.dispose\(\)/, /map\?\.dispose\(\)/, /m\.dispose\(\)/]) assert.match(dz, k);
  assert.match(s, /disposeObj\(p\.bubble\)/);
});

test('하루 일감 진행은 gameState.delve.job 에 저장', () => {
  const s = delveSrc();
  assert.doesNotMatch(s, /jobToday/);
  assert.match(s, /bumpJob\(gameState\.delve, todayStr\(\)\)/);
  assert.match(s, /jobProgress\(gameState\.delve, todayStr\(\)\)/);
});

test('미니맵: 지하에서는 0층 표시 대신 지하 표시', () => {
  assert.match(src, /place === 'mine' && delveFloorNow\(\) > 0/);
  assert.match(src, /delveMinimapMarks\(\)/);
  assert.match(delveSrc(), /export function delveMinimapMarks/);
});

test('GA4: delve_floor 에 sec·rocks, delve_step 에 sec, 도망 중 도롱뇽은 톡 치기 없음', () => {
  const s = delveSrc();
  assert.match(s, /trackEvent\('delve_floor', \{ floor, via, stops: [^}]*sec: [^}]*rocks: [^}]*\}/);
  for (const m of s.matchAll(/trackEvent\('delve_step', \{([^}]*)\}/g)) assert.match(m[1], /sec: /);
  assert.match(s, /started: true, startedAt: Date\.now\(\)/);
  assert.match(s, /p\.sim\.kind === 'axolotl' && !\['gone', 'flee'\]\.includes\(p\.sim\.state\)/);
});

test('되찾기는 조각마다 제 광석(reclaimGive), 성공 뒤 패널 갱신', () => {
  const b = block(delveSrc(), "if \\(nd === 'delve_dig'\\)");
  assert.match(b, /reclaimGive\(run\.stash\)/);
  assert.match(b, /refreshQuestPanel/);
  assert.match(block(delveSrc(), "if \\(nd === 'delve_tap'\\)"), /refreshQuestPanel/);
  assert.match(block(delveSrc(), "if \\(nd === 'delve_bait'\\)"), /refreshQuestPanel/);
  assert.match(delveSrc().match(/export function enterFloor[\s\S]*?\n}\n/)[0], /refreshQuestPanel/);
});

test('배너 줄은 낱말 단위로 줄바꿈, 캡처 스크립트에 개인 경로 없음, 안 쓰는 import 없음', () => {
  assert.match(read('index.html'), /#hint-banner \.hb-line \{ word-break: keep-all; \}/);
  assert.doesNotMatch(read('dev/archive/cave-delve/mockup/impl/capture-impl.mjs'), /\/private\/tmp|\/Users\//);
  assert.doesNotMatch(delveSrc().split('\n').slice(0, 5).join('\n'), /\bclock\b/);
  assert.match(src, /\} from '\.\/spaces\/mine\.js';   \/\/ 📦 ⛏️ 채굴 동굴/);
});

test('광부 아저씨는 충돌체가 있어 통과할 수 없다', () => {
  const src = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('function placeMiner()'), src.indexOf('export function settleMinerRewards'));
  assert.match(body, /solidCircle\(minerMesh\.position\.x, minerMesh\.position\.z, MINER_R\)/);
});

test('의뢰는 입장이 아니라 광부와 첫 대화가 끝날 때 시작한다', () => {
  const d = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  const m = readFileSync(new URL('../js/spaces/mine.js', import.meta.url), 'utf8');
  assert.doesNotMatch(m, /started: true/);
  assert.match(d, /m\.kind === 'meet'\) \{\s*playMinerLines\(m\.lines, \(\) => \{\s*gameState\.delve = \{ \.\.\.gameState\.delve, started: true/);
});

test('받기 뒤 고맙네 토스트 대신 다음 의뢰 대화가 이어진다', () => {
  const d = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  assert.doesNotMatch(d, /고맙네! 다음 일을 부탁하지/);
  assert.match(d, /playMinerLines\(minerTalk\.next\(c\.delve\.stage\)\)/);
});

test('지하에서도 위층처럼 곡괭이질·줍기 효과음이 난다', () => {
  const d = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  const mine = d.slice(d.indexOf('export function tryDelveMine()'), d.indexOf('const batAlive'));
  assert.match(mine, /Sound\.chop\(\)/);
  const pick = d.slice(d.indexOf('function pickUp(c)'), d.indexOf('function pickUp(c)') + 600);
  assert.match(pick, /Sound\.harvest\(\)/);
});

test('광부는 해금(miner) 전엔 동굴에 없고, 승강기는 세계수 광산 가지로 안내한다', () => {
  const d = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  assert.match(d, /function syncMinerPresence\(\)/);
  assert.match(d, /isOpen\('miner'\)/);
  assert.match(d, /광산의 가지를 채우면 광부 아저씨가 돌아와요/);
});
