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
  assert.match(read('js/data/sell-icons.js'), /SELL_ICO_G = \{[^}]*crystal: '🔮'/);
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

test('1층 공통 배너 대신 몹별 첫 만남 카드, 빛 자국은 등불벌레가 굴에 넣을 때', () => {
  const s = read('js/spaces/delve.js');
  assert.doesNotMatch(s, /delve_common/);
  assert.match(s, /firstHint\(`delve_meet_\$\{kind\}`/);
  assert.match(read('js/delve/pest-tactics.js'), /makeTrail\(/);
  assert.match(s, /layTrail\(p, c\)/);
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

test('광부 보상 재지급: 로드 직후와 받기 직후 같은 함수', () => {
  assert.match(src, /refreshTable\('load'\);\s*\n\s*settleMinerRewards\(\);\s*\n\}/);
  assert.ok(src.indexOf("refreshTable('load');\n  settleMinerRewards();") > src.indexOf('gameState.outdoorStored[k] = Math.floor(v)'), '보관함 복원 뒤에 지급해야 덮이지 않는다');
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
  assert.match(s, /counterFor\(p\.sim\) === 'tap'/);
  assert.match(s, /counterFor\(p\.sim\) === 'bait'/);
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
  assert.match(read('index.html'), /#hint-banner \.hb-line \{ word-break: keep-all;[^}]*\}/);
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

test('받아먹기: 광맥은 VEIN_HP, 처음 치면 몹이 기다리고, 깨질 때 catchAtBreak', () => {
  const s = delveSrc();
  assert.match(s, /r\.vein && run\.oreOk \? VEIN_HP : 3/);
  assert.match(s, /run\.lurkAt = /);
  assert.match(s, /catchAtBreak\(/);
});

test('결과가 보인다: 뺏김 토스트, 층 결과 토스트, 기록 키', () => {
  const s = delveSrc();
  assert.match(s, /PEST_COPY\[[^\]]+\]\.took/);
  assert.match(s, /floorTally\(/);
  assert.match(s, /trackEvent\('delve_floor', \{[^}]*kept[^}]*lost[^}]*\}/);
  assert.match(s, /trackEvent\('delve_exit', \{[^}]*kept[^}]*lost[^}]*\}/);
  for (const m of s.matchAll(/trackEvent\('pest_counter', \{([^}]*)\}/g)) assert.match(m[1], /state: /);
});

test('말풍선은 블룸에 안 타는 베이지 배경', () => {
  const art = read('js/delve/pest-art.js');
  const b = art.slice(art.indexOf('export function emojiBubble'), art.indexOf('export function emojiBubble') + 900);
  assert.match(b, /rgba\(226,196,158/);
  assert.match(b, /toneMapped: false/);
});

test('새 문구는 영어 사전에 있다', async () => {
  const { EN } = await import('../js/i18n-en.js');
  const { PEST_COPY } = await import('../js/data/delve.js');
  for (const c of Object.values(PEST_COPY)) {
    for (const k of [c.title, c.line, c.took, ...c.steps.map(x => x.label)]) assert.ok(EN[k], k);
  }
  for (const k of ['수정집게가 버섯을 먹어요 · {0#}초', '도롱뇽이 놀라서 도망가요', '조각을 뱉었어요', '⛏️ 지하 {0#}층 · 지킨 조각 {1#} · 뺏긴 조각 {2#}']) assert.ok(EN[k], k);
});

test('리뷰 반영: 뺏김 토스트가 사다리 토스트에 안 덮이고, 첫 만남 기록은 카드가 뜰 때만, 잠든 박쥐는 고리 없음', () => {
  const s = delveSrc();
  const mine = s.slice(s.indexOf('export function tryDelveMine()'), s.indexOf('const batAlive'));
  assert.ok(mine.indexOf('showLadder()') < mine.indexOf('catchAtBreak('));
  assert.match(s, /if \(gameState\.hintsSeen\[key\]\) return;/);
  assert.match(s, /const liveBat = \(\) => run\.pests\.find\(p => p\.sim\.kind === 'bat' && p\.sim\.grit > 0 && !\['gone', 'sleep'\]\.includes\(p\.sim\.state\)\)/);
  assert.match(s, /method: 'tap', ok: r\.events\.length \? 1 : 0, state: was/);
  assert.match(s, /lurkTurn: /);
});

test('새 몹 연결: 불 끄기·구멍 막기·살살 캐기 문, 굴리 흉내, 버튼 아이콘', () => {
  const s = delveSrc();
  for (const nd of ['delve_dark', 'delve_plug', 'delve_soft']) assert.match(s, new RegExp(`nd === '${nd}'`));
  assert.match(s, /counterFor\(p\.sim\) === 'dark'/);
  assert.match(s, /plugReady\(p\.sim, lp\)/);
  assert.match(s, /rollerAtBreak\(/);
  assert.match(s, /softOk\(/);
  const line = read('index.html').split('\n').find(l => l.includes('doorIcon = /^('));
  for (const e of ['🌑', '🤫', '🪨']) assert.ok(line.split(e).length >= 3, e);
  for (const m of s.matchAll(/trackEvent\('pest_counter', \{([^}]*)\}/g)) assert.match(m[1], /state: /);
});

test('광부 대사: 도롱뇽은 광맥을 캐야 다가온다', async () => {
  const { MINER_STEPS } = await import('../js/data/delve.js');
  const { EN } = await import('../js/i18n-en.js');
  const line = '광맥을 캐면 다가와 기다리지. 그때 톡 쳐서 쫓아 주게';
  assert.ok(MINER_STEPS.find(x => x.id === 'tap').ask.includes(line));
  assert.ok(EN[line]);
});

test('리뷰 반영 2: 대처 버튼이 살살 캐기보다 먼저, 나방 전부, 빛나는 수정·두더지 구멍 배치, 불빛은 나방 상태로', () => {
  const s = delveSrc();
  const prompt = s.slice(s.indexOf('export function delvePrompt()'), s.indexOf('export function handleDelveDoor'));
  assert.ok(prompt.indexOf("counterFor(p.sim) === 'tap'") < prompt.indexOf("nd: 'delve_soft'"));
  const dark = s.slice(s.indexOf("if (nd === 'delve_dark')"), s.indexOf("if (nd === 'delve_plug')"));
  assert.doesNotMatch(dark, /return true;\n    \}\n    return true;/);
  assert.match(s, /makeGlowCrystal\(\)/);
  assert.match(s, /makeMoleHole\(\)/);
  assert.doesNotMatch(s, /darkUntil/);
  assert.match(s, /if \(caught\)|const caught = breakRock\(/);
  const b = read('js/delve/state-badge.js');
  assert.match(b, /new Map\(\)/);
});

test('3차 끈기: 대처 성공마다 repelPest, 기록에 round·streak, 포기는 giveup', () => {
  const s = delveSrc();
  for (const nd of ['delve_tap', 'delve_bait', 'delve_dark', 'delve_plug', 'delve_soft', 'delve_dig']) {
    const b = s.slice(s.indexOf(`if (nd === '${nd}')`), s.indexOf('\n  }\n', s.indexOf(`if (nd === '${nd}')`)));
    assert.match(b, /repel\(/, nd);
  }
  assert.match(s.slice(s.indexOf('function pickUp(c)'), s.indexOf('const TALK_CLOSE_R')), /repel\(bat, was\)/);
  assert.match(s.slice(s.indexOf('function tickMimics'), s.indexOf('function syncHearts')), /repel\(p, 'mimic'\)/);
  assert.match(s.slice(s.indexOf('function repel('), s.indexOf('function breakRock')), /repelPest\(p\.sim\)/);
  const calls = [...s.matchAll(/trackEvent\('pest_counter', \{([^}]*)\}/g)].map(m => m[1]);
  assert.ok(calls.length >= 10);
  for (const c of calls) { assert.match(c, /state: /); assert.match(c, /round/); assert.match(c, /streak/); }
  assert.ok(calls.some(c => /method: 'giveup', ok: 1/.test(c)));
  assert.match(s, /PEST_LINES\.giveup\(/);
});

test('3차 선물·연속·결과: 선물은 몹 목록 밖, 층마다 새 연속, 결과와 delve_exit 에 best', () => {
  const s = delveSrc();
  assert.match(s, /streak: newStreak\(\), gifts: \[\]/);
  assert.match(s, /const world = \{ chunks: run\.chunks, /);
  assert.doesNotMatch(s, /run\.chunks = \[\.\.\.run\.chunks, [^\]]*gift/);
  assert.match(s, /run\.gifts = \[\.\.\.run\.gifts, /);
  assert.match(s, /PEST_LINES\.result\(run\.floor, t\.kept, t\.lost, run\.streak\.best\)/);
  assert.match(s, /trackEvent\('delve_exit', \{[^}]*best: t\.best[^}]*\}/);
  assert.match(s, /streakStep\(run\.streak, ok\)/);
  assert.match(s.slice(s.indexOf('function carryOff'), s.indexOf('const rollHere')), /scoreStreak\(false\)/);
  assert.match(s, /PEST_LINES\.bonus\(step\.cur\)/);
});

test('3차 수법 일부: 살살 고리는 softPeriodFor, 박쥐 고리는 ringSecFor, 하트 줄', () => {
  const s = delveSrc();
  assert.doesNotMatch(s, /SOFT_PERIOD|RING_SEC\b/);
  assert.match(s, /softPeriodFor\(dozer\.sim\)/);
  assert.match(s, /ringSecFor\(/);
  assert.match(s, /makeHearts\(n\)/);
  assert.match(s, /heartCount\(p\.sim\)/);
  assert.ok(s.split('\n').length < 800);
});

test('3차 수법 연결: 몹마다 수법 훅이 delve.js 에서 불린다', () => {
  const s = delveSrc(), t = read('js/delve/pest-tactics.js');
  const loop = s.slice(s.indexOf('export function updateDelve'));
  assert.match(loop, /tacticCues\(prev, pest\)\.forEach\(pestSfx\)/);
  assert.ok(loop.indexOf('tickTactic(p, dt, t)') < loop.indexOf('badgeFor(p.sim, p.peek)'));
  assert.ok(loop.indexOf('p.art.g.visible = ') < loop.indexOf('tickTactic(p, dt, t)'));
  assert.match(loop, /tickFloorTactics\(dt\)/);
  assert.match(s.slice(s.indexOf('function dropChunk'), s.indexOf('function carryOff')), /bounceChunk\(c, liveBat\(\)\.sim\)/);
  assert.match(s.slice(s.indexOf('function breakRock'), s.indexOf('const dozerNear')), /startShuffle\(p, c\)/);
  assert.match(s.slice(s.indexOf('export function tryDelveMine'), s.indexOf('function breakRock')), /if \(ore\) wakePeeker\(i\)/);
  const soft = s.slice(s.indexOf("if (nd === 'delve_soft')"), s.indexOf("if (nd === 'delve_dig_decoy')"));
  assert.ok(soft.indexOf('const woke = wakePeeker(i)') < soft.indexOf('breakRock(i, ok && !woke)'));
  assert.match(soft, /const won = ok && !woke && !caught/);
  assert.match(s, /peekWake\(p\.sim, p\.peek\)/);
  assert.match(s, /PEST_LINES\.peek/);
  const prompt = s.slice(s.indexOf('export function delvePrompt()'), s.indexOf('export function handleDelveDoor'));
  assert.ok(prompt.indexOf('decoyNear(lp, 1.4)') < prompt.indexOf("nd: 'delve_dig'"));
  assert.match(s, /nd === 'delve_dig_decoy'\) return digDecoy\(\)/);
  assert.match(s, /bindTactics\(\{[^}]*newPest: pestEntry/);
  for (const k of ['bubble', 'dust', 'shuffle', 'confused']) assert.match(t, new RegExp(`pestSfx\\('${k}'\\)|sfxLater\\(\\d+, '${k}'\\)`), k);
  for (const e of ['🫧', '🔷', '✨']) assert.ok(t.includes(`makeEmojiMark('${e}'`), e);
  assert.match(t, /moleHoles\(/);
  assert.match(t, /PEST_LINES\.empty/);
  assert.match(t, /createPest\(p\.sim\.kind, [^)]*\{ grit: 1 \}\)/);
  assert.match(t, /trailFadeSec/);
  assert.match(t, /tacticOf\(p\.sim\)\.circle/);
  assert.doesNotMatch(t, /\/\/|\/\*/);
});

test('3차 포기 소리는 대처 소리와 겹치지 않게 늦게', () => {
  const r = delveSrc().slice(delveSrc().indexOf('function repel('), delveSrc().indexOf('function showLadder'));
  assert.match(r, /sfxLater\(300, 'giveUp'\)/);
  assert.match(r, /sfxLater\(650, 'gift'\)/);
});

test('3차 다듬기: 포기 한 번만, 들고 있던 덩이는 뱉고, 늦은 소리는 같은 층에서만', () => {
  const s = delveSrc(), t = read('js/delve/pest-tactics.js');
  assert.match(s, /const batAlive = \(\) => !!liveBat\(\)/);
  assert.match(s, /const liveBat = \(\) => run\.pests\.find\(p => p\.sim\.kind === 'bat' && p\.sim\.grit > 0 && /);
  const r = s.slice(s.indexOf('function repel('), s.indexOf('function showLadder'));
  assert.match(r, /if \(pest\.grit === before\) return/);
  assert.ok(r.indexOf('if (pest.grit === before)') < r.indexOf('const streak = scoreStreak(true)'));
  assert.match(r, /if \(e\.type === 'spit'\) spitChunk\(e\)/);
  const tap = s.slice(s.indexOf("if (nd === 'delve_tap')"), s.indexOf("if (nd === 'delve_bait')"));
  assert.match(tap, /r\.events\.forEach\(spitChunk\)/);
  assert.match(s.slice(s.indexOf('function grantOre'), s.indexOf('function scoreStreak')), /questEvent\('mine', 1\)/);
  assert.doesNotMatch(s, /setTimeout\(\(\) => pestSfx/);
  assert.doesNotMatch(t, /setTimeout\(\(\) => pestSfx/);
  assert.match(t, /export function sfxLater\(ms, key\) \{\s*const here = C\.run\(\);\s*setTimeout\(\(\) => \{ if \(C\.run\(\) === here\) pestSfx\(key\); \}, ms\);/);
  const loop = s.slice(s.indexOf('export function updateDelve'));
  assert.doesNotMatch(loop, /run\.(gifts|chunks)\.filter\(/);
  assert.doesNotMatch(t.slice(t.indexOf('export function tickFloorTactics')), /run\.chunks\.filter\(/);
});
