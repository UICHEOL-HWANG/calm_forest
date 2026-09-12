import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  QUEST_GATES, QUEST_LIMITS, REPEAT_POOL, REPEAT_OPEN,
  questAvailable, pickGated, repeatNPCsFor, repeatQuestFor,
} from '../js/quests.js';

// 🦉 의뢰 공급 규칙 — "영원히 못 깨는 의뢰" 를 막는 게 이 모듈의 존재 이유다.
//   닭장을 안 지은 사람에게 🥚달걀 의뢰가 가면 진행도가 영원히 0 이고,
//   그러면 st.idx 가 못 올라가 그날 의뢰 전체가 잠긴다(베타에서 실제로 겪은 사고 유형).
//   game.js 는 브라우저 전역에 의존해 import 할 수 없어 짝 검증만 원문 파싱으로 한다.
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

function block(startRe, endMark) {
  const i = SRC.search(startRe);
  assert.ok(i >= 0, `${startRe} 를 js/game.js 에서 못 찾음 — 상수 이름이 바뀌었나?`);
  const j = SRC.indexOf(endMark, i);
  assert.ok(j > i, `${startRe} 의 끝(${endMark})을 못 찾음`);
  return SRC.slice(i, j);
}
const questTypes = [...block(/^const QUEST_TYPES = new Set\(\[/m, '\n]);').matchAll(/'([a-z_]+)'/g)].map(m => m[1]);

// 전부 열린 세이브 — 게이트가 아무것도 막지 않는 기준 상태
const OPEN = { coopBuilt: true, houseStage: 3, locked: { river: false, sea: false, mist: false } };
const FRESH = { coopBuilt: false, houseStage: 0, locked: { river: true, sea: true, mist: true } };

// ── questAvailable ────────────────────────────────────────────
test('게이트가 없는 목표는 언제나 가능하다', () => {
  for (const t of ['chop', 'plant', 'water', 'harvest', 'fish', 'mine', 'sell', 'cook', 'serve', 'catch', 'forage']) {
    assert.equal(questAvailable(t, FRESH), true, `${t} 는 전제조건이 없어야 한다`);
  }
});

test('닭장을 안 지었으면 🥚달걀 의뢰는 나오지 않는다', () => {
  assert.equal(questAvailable('egg', { ...OPEN, coopBuilt: false }), false);
  assert.equal(questAvailable('egg', OPEN), true);
});

test('잠긴 맵의 목표는 나오지 않는다', () => {
  assert.equal(questAvailable('boat', { ...OPEN, locked: { ...OPEN.locked, river: true } }), false);
  assert.equal(questAvailable('seafish', { ...OPEN, locked: { ...OPEN.locked, sea: true } }), false);
  assert.equal(questAvailable('mist', { ...OPEN, locked: { ...OPEN.locked, mist: true } }), false);
  for (const t of ['boat', 'seafish', 'mist']) assert.equal(questAvailable(t, OPEN), true, `${t} 는 열렸으면 가능해야 한다`);
});

test('집이 없으면 🪵장식 설치 의뢰는 나오지 않는다', () => {
  assert.equal(questAvailable('decor', { ...OPEN, houseStage: 0 }), false);
  assert.equal(questAvailable('decor', { ...OPEN, houseStage: 1 }), true);
});

test('맵 잠금이 다 풀려도 닭장 조건은 계속 일한다', () => {
  // A/B 가 끝나 잠금이 항상 false 가 되어도 이 게이트는 버릴 코드가 아니다
  const unlocked = { coopBuilt: false, houseStage: 3, locked: { river: false, sea: false, mist: false } };
  assert.equal(questAvailable('egg', unlocked), false);
  assert.equal(questAvailable('boat', unlocked), true);
});

test('모르는 목표 종류는 막지 않는다(폴백)', () => {
  assert.equal(questAvailable('nonexistent_type', FRESH), true);
});

// ── pickGated — 게이트를 통과한 것 중에서만 뽑는다 ─────────────
const POOL = [
  { type: 'chop', target: 5 }, { type: 'egg', target: 1 }, { type: 'boat', target: 1 },
  { type: 'fish', target: 3 }, { type: 'mist', target: 1 }, { type: 'forage', target: 5 },
];

test('막힌 목표는 뽑히지 않는다', () => {
  const picked = pickGated(POOL, 4, 12345, FRESH);
  for (const q of picked) assert.ok(!['egg', 'boat', 'mist'].includes(q.type), `막힌 ${q.type} 가 뽑혔다`);
});

test('같은 시드는 같은 결과를 준다(하루 중 의뢰가 바뀌면 진행도가 증발한다)', () => {
  assert.deepEqual(pickGated(POOL, 3, 999, OPEN), pickGated(POOL, 3, 999, OPEN));
});

test('뽑힌 의뢰에 같은 목표가 두 번 들어가지 않는다', () => {
  const picked = pickGated(POOL, 5, 777, OPEN);
  assert.equal(new Set(picked.map(q => q.type)).size, picked.length);
});

test('통과한 게 요청 수보다 적으면 있는 만큼만 준다', () => {
  const picked = pickGated(POOL, 6, 555, FRESH);
  assert.equal(picked.length, 3);   // chop · fish · forage
});

test('원본 풀을 건드리지 않는다(불변)', () => {
  const before = JSON.parse(JSON.stringify(POOL));
  pickGated(POOL, 3, 42, OPEN);
  assert.deepEqual(POOL, before);
});

// ── 하루 1회 제한 콘텐츠의 상한 ────────────────────────────────
test('하루 1회짜리 콘텐츠는 목표 수치 상한이 1이다', () => {
  // 달걀은 하루 한 번만 걷고, 안개 정화도 하루 한 번, 강 달리기는 횟수 제한이 있다.
  // 상한을 안 걸면 그날 안에 물리적으로 못 깨는 의뢰가 된다.
  assert.equal(QUEST_LIMITS.egg, 1);
  assert.equal(QUEST_LIMITS.mist, 1);
  assert.equal(QUEST_LIMITS.boat, 1);
});

test('조각은 일일 주문이 3건이라 상한이 그보다 작다', () => {
  assert.ok(QUEST_LIMITS.carve <= 3, `조각 상한 ${QUEST_LIMITS.carve} — 일일 주문 3건을 넘으면 못 깬다`);
});

// ── 반복 의뢰 ─────────────────────────────────────────────────
const NPC_IDS = ['farmer', 'builder', 'merchant', 'angler', 'chef', 'forager', 'stargazer', 'ferryman', 'rancher'];

test('반복 의뢰는 하루에 정해진 인원만 열린다', () => {
  assert.equal(repeatNPCsFor(NPC_IDS, 12345).length, REPEAT_OPEN);
});

test('같은 날에는 같은 주민이 열린다', () => {
  assert.deepEqual(repeatNPCsFor(NPC_IDS, 20260912), repeatNPCsFor(NPC_IDS, 20260912));
});

test('날이 바뀌면 열리는 주민도 바뀐다', () => {
  const days = [1, 2, 3, 4, 5, 6, 7].map(d => repeatNPCsFor(NPC_IDS, d * 7919).join(','));
  assert.ok(new Set(days).size > 1, '이레 내내 같은 주민만 열린다');
});

test('열린 주민이 중복되지 않는다', () => {
  const open = repeatNPCsFor(NPC_IDS, 31337);
  assert.equal(new Set(open).size, open.length);
});

test('의뢰 올빼미는 반복 의뢰를 내지 않는다(일일 담당)', () => {
  assert.ok(!('courier' in REPEAT_POOL), '올빼미는 일일 의뢰 담당이라 반복 풀에 없어야 한다');
  assert.ok(!repeatNPCsFor([...NPC_IDS, 'courier'], 4242).includes('courier'));
});

test('반복 의뢰는 그 주민의 전문 분야에서 나온다', () => {
  const q = repeatQuestFor('angler', 12345, OPEN);
  assert.ok(REPEAT_POOL.angler.some(p => p.type === q.type), `낚시꾼에게 ${q.type} 의뢰가 나왔다`);
});

test('반복 의뢰도 게이트를 통과한 것만 준다', () => {
  // 수달 사공은 🛶강·🌊바다가 전문인데 둘 다 잠긴 상태 → 잠기지 않은 목표로 떨어져야 한다
  const q = repeatQuestFor('ferryman', 999, FRESH);
  assert.ok(q, '전부 막히면 안 된다 — 잠금 없는 목표가 풀에 있어야 한다');
  assert.equal(questAvailable(q.type, FRESH), true, `잠긴 ${q.type} 가 나왔다`);
});

test('반복 의뢰는 완료 가능한 형태다', () => {
  for (const id of Object.keys(REPEAT_POOL)) {
    const q = repeatQuestFor(id, 2026, OPEN);
    assert.ok(q, `${id} 의 반복 의뢰가 비었다`);
    assert.ok(q.type && q.desc && q.title, `${id}: type·desc·title 이 있어야 패널에 뜬다`);
    assert.ok(Number.isFinite(q.target) && q.target > 0, `${id}: target 이 양의 정수여야 한다`);
    assert.ok(q.reward, `${id}: 보상이 있어야 한다`);
  }
});

// ── game.js 와의 짝 ───────────────────────────────────────────
test('반복 풀의 모든 목표가 game.js 의 QUEST_TYPES 에 있다', () => {
  const used = new Set(Object.values(REPEAT_POOL).flat().map(p => p.type));
  const missing = [...used].filter(t => !questTypes.includes(t));
  assert.deepEqual(missing, [], `QUEST_TYPES 에 없어 영원히 못 깨는 목표: ${missing.join(', ')}`);
});

test('게이트와 상한이 붙은 목표도 QUEST_TYPES 에 있다', () => {
  const declared = new Set([...Object.keys(QUEST_GATES), ...Object.keys(QUEST_LIMITS)]);
  const missing = [...declared].filter(t => !questTypes.includes(t));
  assert.deepEqual(missing, [], `QUEST_TYPES 에 없는 목표에 규칙만 달려 있다: ${missing.join(', ')}`);
});

test('새 목표 7종이 game.js 에 등록되어 있다', () => {
  for (const t of ['carve', 'egg', 'gift', 'decor', 'boat', 'seafish', 'mist']) {
    assert.ok(questTypes.includes(t), `QUEST_TYPES 에 ${t} 가 없다`);
  }
});

// ── 주민 체인의 철칙 ──────────────────────────────────────────
//   체인은 순서가 고정이라, 전제조건이 걸린 목표가 끼면 그 자리에서 영구히 막힌다.
//   닭장을 안 지은 사람은 🥚 의뢰에서, 집이 없는 사람은 🪵 의뢰에서 더 나아갈 수 없다.
//   전제조건이 있는 목표는 일일·반복 풀에만 넣는다(거기선 게이트가 걸러 준다).
test('주민 퀘스트 체인에 전제조건이 걸린 목표가 없다', () => {
  const npcsBlock = block(/^const NPCS = \[/m, '\n];');
  const gated = Object.keys(QUEST_GATES);
  const offenders = [];
  // "id: 'xxx'" 로 주민을 끊고, 각 구간에서 type 을 모은다
  const chunks = npcsBlock.split(/\n  \{/).slice(1);
  for (const chunk of chunks) {
    const id = chunk.match(/id: '([a-z_]+)'/)?.[1] || '?';
    for (const m of chunk.matchAll(/\{ type: '([a-z_]+)'/g)) {
      if (gated.includes(m[1])) offenders.push(`${id}:${m[1]}`);
    }
  }
  assert.deepEqual(offenders, [], `체인에서 영원히 막히는 의뢰: ${offenders.join(', ')}`);
});

test('새 주민 4명이 game.js 에 있다', () => {
  for (const id of ['forager', 'stargazer', 'ferryman', 'rancher']) {
    assert.ok(SRC.includes(`id: '${id}'`), `NPCS 에 ${id} 가 없다`);
    assert.ok(REPEAT_POOL[id], `${id} 의 반복 의뢰 풀이 없다 — 체인을 깨면 다시 조용해진다`);
  }
});

// ── 서버 3곳 동기화 ────────────────────────────────────────────
//   game.js(DAILY_COUNT) · functions/api/daily-quests.js(NEED) · scripts/serve.py(QUEST_NEED) 는
//   같은 개수여야 한다. 서버가 더 적게 보내면 클라이언트의 validDailyQuests 검증에서
//   AI 의뢰가 통째로 버려져 매일 로컬 풀만 나온다(조용한 실패라 눈에 안 띈다).
const API = readFileSync(new URL('../functions/api/daily-quests.js', import.meta.url), 'utf8');
const SERVE = readFileSync(new URL('../scripts/serve.py', import.meta.url), 'utf8');

test('일일 의뢰 개수가 게임·API·로컬 미러에서 같다', () => {
  const game = +SRC.match(/^const DAILY_COUNT = (\d+);/m)[1];
  const api = +API.match(/^const NEED = (\d+);/m)[1];
  const serve = +SERVE.match(/^QUEST_NEED = (\d+)/m)[1];
  assert.equal(api, game, `API NEED ${api} ≠ 게임 DAILY_COUNT ${game}`);
  assert.equal(serve, game, `serve.py QUEST_NEED ${serve} ≠ 게임 DAILY_COUNT ${game}`);
});

test('서버가 내는 목표는 전제조건이 없는 것뿐이다', () => {
  // 서버는 이 세이브의 닭장·집 단계·맵 잠금을 모른다. 상태를 파라미터로 받으면
  // 캐시 키가 (날짜 × 날씨 × 언어 × 단계 × 잠금)으로 갈라져 호출이 폭증한다.
  const apiTypes = [...API.match(/^const QUEST_SPEC = \{[\s\S]*?\n\};/m)[0].matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map(m => m[1]);
  const serveTypes = [...SERVE.match(/^QUEST_SPEC = \{[\s\S]*?\n\}/m)[0].matchAll(/^\s{4}'([a-z_]+)':/gm)].map(m => m[1]);
  const gated = Object.keys(QUEST_GATES);
  assert.deepEqual(apiTypes.filter(t => gated.includes(t)), [], 'API 가 전제조건 있는 목표를 낸다');
  assert.deepEqual(serveTypes.filter(t => gated.includes(t)), [], 'serve.py 가 전제조건 있는 목표를 낸다');
  assert.deepEqual(apiTypes.filter(t => !questTypes.includes(t)), [], 'API 에 게임이 모르는 목표가 있다');
  assert.deepEqual(apiTypes, serveTypes, 'API 와 로컬 미러의 목표 목록이 다르다');
});

test('서버가 내는 목표의 상한이 하루 안에 깰 수 있는 범위다', () => {
  const specBlock = API.match(/^const QUEST_SPEC = \{[\s\S]*?\n\};/m)[0];
  for (const m of specBlock.matchAll(/^\s{2}([a-z_]+):\s*\{ min: (\d+), max: (\d+)/gm)) {
    const [, type, , max] = m;
    const cap = QUEST_LIMITS[type];
    if (cap != null) assert.ok(+max <= cap, `${type} 서버 상한 ${max} > 하루 한도 ${cap} — 그날 못 깨는 의뢰가 된다`);
  }
});

// ── 새 목표 7종의 훅 자리 ──────────────────────────────────────
//   questEvent 를 안 쏘면 의뢰는 만들어지는데 진행도가 영원히 0 이다 — 조용한 실패라 테스트로 잠근다.
//   "어느 함수 안에서 쏘는가" 까지 확인한다. 엉뚱한 곳에서 쏘면 파밍이 되거나(장식 옮기기)
//   실패한 시도까지 성공으로 세어진다(조각 포기·강 난파).
function fnBody(name) {
  const i = SRC.search(new RegExp(`^function ${name}\\(`, 'm'));
  assert.ok(i >= 0, `${name}() 를 못 찾음 — 함수 이름이 바뀌었나?`);
  const j = SRC.indexOf('\n}', i);
  return SRC.slice(i, j);
}

test('🗿 오늘 완성 수는 완성(done)에서만 오르고 날이 바뀌면 리셋된다', () => {
  const body = fnBody('carveFinish');
  assert.match(body, /kind === 'done'[\s\S]{0,80}carvedToday/, '망치거나 포기한 것도 "완성" 으로 센다');
  assert.match(SRC, /st\.date !== today.*st\.carvedToday = 0/, '날이 바뀔 때 오늘 완성 수가 리셋되지 않는다');
});

// 🥚달걀 · 🌫️안개 · 🛶강 은 하루 1회뿐이라 이벤트형이면 "수락 전에 이미 해버린" 사람이 영원히 막힌다
//   (questEvent 는 st.given 이 false 면 세지 않는다). house·serve 와 같이 상태형으로 읽어야 한다.
test('하루 1회 목표는 이벤트가 아니라 오늘의 상태를 읽는다', () => {
  const body = fnBody('refreshCollectQuests');
  assert.match(body, /q\.type === 'egg'[\s\S]{0,120}coop\.collected === todayStr\(\)/, '달걀이 상태형이 아니다');
  assert.match(body, /q\.type === 'mist'[\s\S]{0,160}mist\.purified/, '안개 정화가 상태형이 아니다');
  assert.match(body, /q\.type === 'boat'[\s\S]{0,160}clearsToday/, '강 완주가 상태형이 아니다');
  assert.match(body, /q\.type === 'carve'[\s\S]{0,180}carvedToday/, '조각이 상태형이 아니다');
  // 상태형과 이벤트를 같이 쏘면 이중 계산이 된다
  for (const t of ['egg', 'mist', 'boat', 'carve']) {
    assert.ok(!SRC.includes(`questEvent('${t}')`), `${t} 는 상태형인데 questEvent 도 쏜다 — 이중 계산`);
  }
});

test('🛶 오늘 완주 수는 완주(clear)에서만 오르고 자정에 리셋된다', () => {
  assert.match(SRC, /result === 'clear'\)\s*\{[\s\S]{0,300}clearsToday/, '난파·중도 포기까지 완주로 센다');
  assert.match(fnBody('boatDaily'), /st\.clearsToday = 0/, '자정에 오늘 완주 수가 리셋되지 않는다');
});

test('🪵 장식은 새로 만들어 놓았을 때만 진행한다', () => {
  const body = fnBody('placeOutdoor');
  assert.match(body, /questEvent\('decor'\)/, 'placeOutdoor 안에서 안 쏜다');
  assert.match(body, /!moved && !taken.*questEvent\('decor'\)/s,
    '옮겨 놓기·🧺보관분 꺼내기까지 세면 같은 장식으로 무한히 채울 수 있다');
});

test('🎁 선물은 giveGift 안에서 진행한다', () => {
  assert.match(fnBody('giveGift'), /questEvent\('gift'\)/);
});

test('🌊 바다 물고기는 실제로 낚은 자리에서 진행한다', () => {
  assert.match(SRC, /questEvent\('seafish'\)[\s\S]{0,200}trackEvent\('sea_catch'/,
    '바다 물고기를 실제로 낚은 자리에서 쏘지 않는다');
});

// ── 로그인 전에 의뢰를 뽑지 않는다 ────────────────────────────
//   buildNPCs 는 bootWorld(loadGame 전)에서 돈다. 그때는 authState.variant 가 없어
//   mapLocked() 가 전부 false 로 판정되고, 그 상태로 뽑으면 베타 1일차에게
//   아직 못 가는 🌊바다·🌫️안개 의뢰가 확정돼 그날 의뢰 전체가 잠긴다.
test('buildNPCs 는 의뢰를 뽑지 않는다(로그인 전이라 잠금 판정이 틀린다)', () => {
  const body = fnBody('buildNPCs');
  assert.ok(!/refreshDailyQuests\(\)/.test(body), 'buildNPCs 가 일일 의뢰를 뽑는다');
  assert.ok(!/refreshRepeatQuests\(\)/.test(body), 'buildNPCs 가 반복 의뢰를 연다');
});

// ── 목록을 갈아끼울 땐 포인터도 원점으로 ──────────────────────
//   DAILY_COUNT 를 바꿔 배포하면 개수 검증에 걸려 "진행 중인 사람 전원" 이 재추첨 경로를 탄다.
//   포인터를 안 맞추면 손도 안 댄 의뢰가 절반 차 있고 하던 진행도는 엉뚱한 의뢰로 옮겨간다.
test('오늘 의뢰를 새로 뽑으면 진행 포인터도 리셋한다', () => {
  const body = fnBody('refreshDailyQuests');
  const i = body.indexOf('if (validDailyQuests(st.quests))');
  const j = body.indexOf('pickGated');
  assert.ok(i >= 0 && j > i, 'refreshDailyQuests 구조가 바뀌었다');
  const between = body.slice(i, j);
  assert.match(between, /st\.idx = 0/, '재추첨 직전에 st.idx 를 리셋하지 않는다');
  assert.match(between, /st\.progress = 0/, '재추첨 직전에 st.progress 를 리셋하지 않는다');
  assert.match(between, /st\.special = null/, '개수 기준이 바뀌었는데 ✨특별 의뢰를 남긴다');
});

// ── 풀의 목표 수치가 하루 한도를 넘지 않는다 ──────────────────
//   서버 QUEST_SPEC 만 검사하고 있었는데, 정작 게임 쪽 DAILY_POOL·REPEAT_POOL 은
//   아무도 안 잠그고 있었다. 여기서 넘치면 그날 물리적으로 못 깨는 의뢰가 된다.
test('DAILY_POOL 의 목표 수치가 하루 한도 안이다', () => {
  const pool = block(/^const DAILY_POOL = \[/m, '\n];');
  const over = [];
  for (const m of pool.matchAll(/type: '([a-z_]+)',\s*target: (\d+)/g)) {
    const cap = QUEST_LIMITS[m[1]];
    if (cap != null && +m[2] > cap) over.push(`${m[1]} ${m[2]}>${cap}`);
  }
  assert.deepEqual(over, [], `하루 안에 못 깨는 일일 의뢰: ${over.join(', ')}`);
});

test('REPEAT_POOL 의 목표 수치가 하루 한도 안이다', () => {
  const over = [];
  for (const [id, list] of Object.entries(REPEAT_POOL)) {
    for (const q of list) {
      const cap = QUEST_LIMITS[q.type];
      if (cap != null && q.target > cap) over.push(`${id}:${q.type} ${q.target}>${cap}`);
    }
  }
  assert.deepEqual(over, [], `하루 안에 못 깨는 반복 의뢰: ${over.join(', ')}`);
});
