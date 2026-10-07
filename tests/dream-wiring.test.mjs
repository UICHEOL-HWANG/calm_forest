import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🌙 꿈의 숲 배선 — 새 공간을 더할 때 빠뜨리기 쉬운 자리들(스펙 §11·§10)을 소스에서 잠근다.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const GAME = read('js/game.js');
const DOORS = read('js/spaces/doors.js');
const DREAM = read('js/spaces/dream.js');
const HTML = read('index.html');

test('game.js — 플래그·$w·spaceFlags·가시성·이동 한계·미니맵·도구 페이지', () => {
  assert.match(GAME, /let atDream = false;/);
  assert.match(GAME, /get atDream\(\) \{ return atDream; \}, set atDream\(v\) \{ atDream = v; \}/);
  assert.match(GAME, /get sleeping\(\) \{ return sleeping; \}, set sleeping\(v\) \{ sleeping = v; \}/);
  assert.match(GAME, /_spaceFlags\.atDream = atDream/);
  assert.match(GAME, /setDreamVisible\(atDream\)/);
  assert.match(GAME, /\} else if \(atDream\) \{ clampToDream\(player\.position\);/);
  assert.equal((GAME.match(/atDream \? 'dream' : atRiver/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(GAME, /if \(place === 'dream'\) \{[^\n]*\n[^\n]*dreamMinimapMarks\(md\.marks\)/);
  assert.match(GAME, /if \(atDream\) return 'dream';/);
  assert.match(read('js/data/tools.js'), /dream: 'none'/);
});

test('game.js — 루프·입력: 컷신이 카메라를 갖고, 탭·Space·Esc 로 건너뛴다', () => {
  assert.match(GAME, /else if \(updateDreamCut\(dt, t\)\) \{ wantAction = false; \}/);
  assert.match(GAME, /!intro && !dreamCutActive\(\)\) \{\n\s+handleAction\(\);/);
  assert.match(GAME, /if \(dreamCutActive\(\) && \(e\.code === 'Space' \|\| e\.code === 'Escape' \|\| e\.code === 'Enter'\)\) skipDreamCut\(\);/);
  assert.match(GAME, /if \(dreamCutActive\(\)\) \{ skipDreamCut\(\); return; \}/);
  assert.match(GAME, /updateDream\(dt, t\);/);
});

test('game.js — 액션: 꿈속은 깨어나기만, 밤 침대는 선택 창', () => {
  assert.match(GAME, /if \(atDream\) return dreamAction\(nearDoor\);/);
  assert.match(GAME, /if \(nearDoor === 'sleep'\) return openSleepChoice\(\);/);
  assert.doesNotMatch(GAME, /if \(nearDoor === 'sleep'\) return doSleep\(\);/, '밤 침대가 선택 창을 건너뛰면 꿈꾸기에 못 간다');
});

test('game.js — 세이브: 꿈속에서 끊기면 집 앞·아침으로, dream 필드 검증 복원', () => {
  assert.match(GAME, /atDream \? dreamReturnPos\(\) :/);
  assert.match(GAME, /gameState\.timeOfDay = atDream \? WAKE_TIME : timeOfDay;/);
  assert.match(GAME, /gameState\.dream = normalizeDream\(saved\.dream, todayStr\(\)\);/);
  assert.match(GAME, /dream: \{ visits: 0, day: '', got: \[\], total: 0 \}/);
  assert.match(GAME, /bait: 0, shard: 0,/);
});

test('game.js — 꿈속에선 밤이 멈추고, 깨면 💤 자기와 같은 아침(wakeToMorning)', () => {
  assert.match(GAME, /if \(!dayPaused && !atDream\) timeOfDay =/);
  assert.match(GAME, /function wakeToMorning\(\) \{\n\s+timeOfDay = WAKE_TIME;/);
  assert.match(DREAM, /wakeToMorning\(\);/);
});

test('doors.js — 꿈속 프롬프트 분기 · ☁️ 구름 침대(sleep: true)도 침대', () => {
  assert.match(DOORS, /if \(atDream\) \{[^]*?const dp = dreamPrompt\(\);/);
  assert.match(DOORS, /\(def\.id === 'bed' \|\| def\.sleep\) && isNight\(\)/);
  assert.match(DOORS, /dreamNightHint\(\);/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atDream/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atDream/);
});

test('트래킹 — 스펙 §10 이벤트 8종이 전부 소스에 있다', () => {
  const all = DREAM + read('js/spaces/indoor.js');
  for (const ev of ['dream_prompt_shown', 'dream_choice', 'dream_cutscene_end', 'dream_enter', 'dream_shard', 'dream_wake', 'dream_hint', 'decor_buy_shard']) {
    assert.match(all, new RegExp(`trackEvent\\('${ev}'`), `${ev} 가 없다`);
  }
  for (const step of ['night', 'arrive', 'shard', 'wake']) assert.match(DREAM, new RegExp(`dream_hint', \\{ step: '${step}' \\}`), `dream_hint ${step}`);
  for (const choice of ['sleep', 'dream', 'cancel']) assert.match(DREAM, new RegExp(`choice: '${choice}'`));
});

test('트래킹 — GA4 예약 파라미터(source·medium·campaign…)를 쓰지 않는다', () => {
  const calls = DREAM.match(/trackEvent\([^)]*\)/g) || [];
  assert.ok(calls.length >= 8);
  for (const c of calls) assert.doesNotMatch(c, /\b(source|medium|campaign|campaign_id|term|content):/, c);
});

test('index.html — 모달 id 가 -modal 로 끝나 anyModalOpen 이 잡는다 · 꾸미기 메뉴 ✨ 화폐', () => {
  assert.match(HTML, /<div id="dream-modal">/);
  assert.match(HTML, /<div id="dream-arrive-modal">/);
  assert.match(HTML, /pay === 'shard' \? '✨'/);
  assert.match(HTML, /openDreamChoice\(o\) \{/);
  assert.match(HTML, /\$\('dream-skip'\)\.addEventListener\('click', \(\) => Input\.dreamSkip\(\)\)/);
  assert.doesNotMatch(HTML.slice(HTML.indexOf('id="dream-arrive-modal"'), HTML.indexOf('id="dream-arrive-ok"')), /<b>/,
    '문장 안 <b> 는 영어 모드에서 텍스트 노드가 쪼개져 한국어가 남는다');
});

test('꿈 장식 — 카탈로그 4종 · ✨ 결제 · 꿈을 꿔 본 뒤에만 목록에', () => {
  const cat = read('js/data/catalog.js');
  for (const id of ['moonLamp', 'crystalPot', 'starMobile', 'cloudBed']) assert.match(cat, new RegExp(`id: '${id}',[^\\n]*pay: 'shard', dream: true`), id);
  assert.match(cat, /id: 'cloudBed',[^\n]*sleep: true/);
  assert.match(GAME, /\.filter\(d => !d\.dream \|\| \(gameState\.dream\?\.visits \|\| 0\) > 0 \|\| \(kept\[d\.id\] \|\| 0\) > 0\)/);
  assert.match(read('js/spaces/indoor.js'), /pay === 'shard' \? `꿈 조각이 부족해요/);
});
