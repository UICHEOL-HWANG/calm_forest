import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOutcome, retryDelay, offerReload } from '../js/save-guard.js';

const GAME_SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

//  옛 패턴 검사는 **실제 코드**만 봐야 한다. 주석에 그 패턴을 설명해 둔 곳(방어 코드의 근거 주석)까지
//  잡으면, 왜 막는지 적어 둔 글 때문에 테스트가 깨진다.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const GAME_CODE = stripComments(GAME_SRC);

// 🛡️ 세이브를 못 읽은 채 게임을 시작하면, 30초 뒤 첫 자동저장이 서버의 멀쩡한 마을을 새 게임으로 덮어쓴다.
//   (2026-09-14 2,576코인 → 5코인 / 2026-09-11 208 → 5 — 실제 사고 2건)
//   원인은 "읽기 실패"와 "저장 없음(신규 유저)"이 둘 다 null 로 돌아와 구분이 안 된 것.
//   규칙: 실패는 신규가 아니다. 읽을 때까지 기다리고, 그동안 저장은 잠근다.

test('loadOutcome — 읽기에 성공하면 그 저장으로 시작한다', () => {
  const row = { houseStage: 2, inventory: { coins: 340 } };
  assert.deepEqual(loadOutcome({ online: true, error: null, row }),
    { kind: 'loaded', state: row, canPlay: true, canSave: true });
});

test('loadOutcome — 저장이 없으면 신규 유저다(새 마을 시작 + 저장 허용)', () => {
  assert.deepEqual(loadOutcome({ online: true, error: null, row: null }),
    { kind: 'empty', state: null, canPlay: true, canSave: true });
});

test('loadOutcome — 읽기에 실패하면 신규로 보지 않는다: 입장도 저장도 막는다', () => {
  const o = loadOutcome({ online: true, error: new Error('network'), row: null });
  assert.equal(o.kind, 'failed');
  assert.equal(o.state, null);
  assert.equal(o.canPlay, false);   // ← 새 마을로 시작하지 않는다(사고의 직접 원인)
  assert.equal(o.canSave, false);   // ← 덮어쓰기 원천 차단(두 번째 안전장치)
});

// 🚪 읽기 실패로 입장을 막는 건 "지킬 세이브가 있는" 사람에게만 옳다.
//   signInAsGuest() 는 남은 익명 세션을 지우고 매번 새 계정을 만든다(supabase-client.js).
//   그 계정에는 game_saves 행이 존재할 수 없으므로 잃을 것이 0이다.
//   이들까지 가두면 /rest/v1 장애 한 번에 신규·게스트 입구가 통째로 막힌다(가용성 순증 악화).
test('loadOutcome — 방금 만든 게스트는 읽기 실패해도 들여보낸다(잃을 세이브가 없다)', () => {
  const o = loadOutcome({ online: true, error: new Error('rest down'), row: null, freshGuest: true });
  assert.equal(o.kind, 'failed_fresh');
  assert.equal(o.canPlay, true);    // ← 가두지 않는다
  assert.equal(o.canSave, false);   // ← 그래도 쓰지는 않는다(freshGuest 판정이 틀렸을 때의 방어)
});

test('loadOutcome — freshGuest 라도 읽기에 성공하면 평소와 같다', () => {
  const row = { houseStage: 1 };
  assert.deepEqual(loadOutcome({ online: true, error: null, row, freshGuest: true }),
    { kind: 'loaded', state: row, canPlay: true, canSave: true });
  assert.deepEqual(loadOutcome({ online: true, error: null, row: null, freshGuest: true }),
    { kind: 'empty', state: null, canPlay: true, canSave: true });
});

test('loadOutcome — freshGuest 가 아니면 종전대로 가둔다(기존 유저 보호는 그대로)', () => {
  const o = loadOutcome({ online: true, error: new Error('rest down'), row: null, freshGuest: false });
  assert.equal(o.kind, 'failed');
  assert.equal(o.canPlay, false);
});

test('loadOutcome — 오프라인(게스트·키 미설정)은 실패가 아니다', () => {
  // 서버에 쓰지 않으므로 덮어쓸 것도 없다. 예전처럼 그냥 논다.
  assert.deepEqual(loadOutcome({ online: false, error: null, row: null }),
    { kind: 'offline', state: null, canPlay: true, canSave: true });
});

test('loadOutcome — 오프라인이면 에러가 있어도 오프라인으로 본다', () => {
  assert.equal(loadOutcome({ online: false, error: new Error('x'), row: null }).kind, 'offline');
});

// 🔀 병합 사고 방지 — 이 수정 이전 브랜치(워크트리)들은 아직 옛 코드를 들고 있다:
//      const saved = await loadGame();  if (saved) applySave(saved);
//    새 supabase-client 와 옛 game.js 가 섞여 병합되면, loadGame() 이 돌려주는 판정 객체가
//    **항상 truthy** 라서 읽기 실패마다 applySave({kind:'failed', state:null, …}) 가 돈다.
//    원래 사고(세이브 덮어쓰기)보다 나쁜 형태로 되살아난다. 그 조합을 소스에서 잠근다.
test('game.js — loadGame() 결과를 truthy 검사로 쓰지 않는다(옛 패턴 금지)', () => {
  assert.ok(!/const\s+saved\s*=\s*await\s+loadGame\(\)/.test(GAME_CODE),
    'game.js 에 옛 패턴 `const saved = await loadGame()` 이 남아 있다 — 판정 객체는 항상 truthy 라 실패를 세이브로 착각한다');
  assert.ok(!/if\s*\(\s*saved\s*\)\s*applySave\s*\(\s*saved\s*\)/.test(GAME_CODE),
    'game.js 가 판정 객체를 그대로 applySave 에 넘긴다 — .state 를 넘겨야 한다');
});

test('game.js — 세이브를 읽었는지 canPlay 로 판정하고, 실패는 계측한다', () => {
  assert.ok(/\.canPlay/.test(GAME_CODE), 'game.js 가 loadGame() 의 canPlay 를 보지 않는다');
  assert.ok(/applySave\(load\.state\)/.test(GAME_CODE), 'game.js 가 load.state 를 applySave 에 넘기지 않는다');
  assert.ok(/save_load_failed/.test(GAME_CODE), '읽기 실패 계측(save_load_failed)이 없다 — 갇힌 사람을 셀 분모가 사라진다');
});

// 🍎 2026-09-17 리뷰 HIGH — saved.orchard.trees 에 null/undefined 항목이 하나만 섞여도
//   `t.kind` 접근에서 throw 했다. applySave() 는 index.html 의 `await enterGame()`(try/catch 없음)
//   경로에서 그대로 호출되므로, 이 한 줄이 던지면 이후의 모든 복원 블록(workers·house.decor·npcs·
//   hintsSeen·character·houseStyle·unlocked·houseStage·plots)이 조용히 실행되지 않고, index.html 쪽의
//   initControls()·30초 자동저장 setInterval 도 같이 스킵된다.
//   ⚠️ 이 테스트는 **소스 텍스트**만 본다 — game.js 는 THREE.js/DOM 의존이라 node 테스트로 import 해
//   실행할 수 없다(이 파일의 다른 game.js 검사들도 전부 같은 이유로 정규식 검사). 즉 "가드 문구가
//   파일에 있는지/없는지"만 증명하며, 런타임에 실제로 안 던지는지는 증명하지 않는다 — 그 증명은
//   같은 로직을 그대로 복제한 별도 스크립트(applySave() 를 import 하지 않음)로 별도 확인했다.
test('game.js — 과수원 나무 복원이 null/undefined 항목에서 안 던지도록 가드한다(HIGH 재발 방지)', () => {
  assert.ok(!/\.filter\(t => FRUITS\.some\(f => f\.id === t\.kind\)\)/.test(GAME_CODE),
    'game.js 에 가드 없는 옛 패턴 `.filter(t => FRUITS.some(f => f.id === t.kind))` 이 남아 있다 — null/undefined 항목에서 throw 한다');
  assert.ok(/\.filter\(t => t && FRUITS\.some\(f => f\.id === t\.kind\)\)/.test(GAME_CODE),
    'game.js 의 과수원 나무 복원에 `t &&` 가드가 없다 — saved.orchard.trees 의 null/undefined 항목에서 throw 할 수 있다');
});

test('supabase-client.js — game_saves 쓰기는 writeSave 한 곳만 지난다', () => {
  const SRC = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  // upsert 호출은 writeSave 안의 한 줄뿐이어야 한다. 늘어나면 빗장을 우회하는 쓰기가 생긴 것이다.
  const upserts = SRC.match(/\.from\(CONFIG\.SAVE_TABLE\)\.upsert\(/g) || [];
  assert.equal(upserts.length, 1,
    `game_saves upsert 가 ${upserts.length} 곳이다 — 저장 잠금을 우회하는 쓰기가 생겼다. writeSave() 를 지나게 고칠 것`);
});

// 🚪 스스로 낫지 않는 실패가 있다(refresh token 폐기·RLS 정책 사고·프로젝트 정지).
//   그 경우 5초마다 영원히 재시도만 하고 유저에겐 나갈 길이 없다 — 로그아웃 버튼은
//   enterGame() 다음 줄에서야 붙고 새로고침해도 같은 루프로 들어온다.
//   새로고침은 세션 갱신부터 다시 타므로, 토큰이 살아 있으면 복구되고 죽었으면
//   로그인 화면이 떠 재로그인으로 이어진다. 한 버튼으로 두 경우가 다 풀린다.
test('offerReload — 처음에는 참고 기다리다가, 오래 끌면 길을 열어 준다', () => {
  assert.equal(offerReload(0), false);
  assert.equal(offerReload(3), false);
  assert.equal(offerReload(5), false);
  assert.equal(offerReload(6), true);    // 약 30초(600·1200·2400·4800·5000·5000ms) 뒤
  assert.equal(offerReload(20), true);   // 한 번 열리면 계속 열려 있다
});

test('retryDelay — 점점 뜸하게, 상한에서 멈춘다(무한 대기라도 서버를 때리지 않게)', () => {
  assert.equal(retryDelay(0), 600);
  assert.ok(retryDelay(1) > retryDelay(0));
  assert.ok(retryDelay(5) > retryDelay(2));
  assert.equal(retryDelay(99), 5000);              // 상한
  assert.ok(retryDelay(99) >= retryDelay(10));     // 단조 증가(줄어들지 않는다)
});
