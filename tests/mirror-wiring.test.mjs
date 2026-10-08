import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// 🪞 거울 마을 배선 — 새 공간을 더할 때 빠뜨리기 쉬운 자리들을 소스에서 잠근다(dream-wiring 과 같은 목록)
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const GAME = read('js/game.js'), DOORS = read('js/spaces/doors.js'), HTML = read('index.html');

test('game.js — 플래그·$w·spaceFlags·가시성·이동 한계·place·도구', () => {
  assert.match(GAME, /let atMirror = false;/);
  assert.match(GAME, /get atMirror\(\) \{ return atMirror; \}, set atMirror\(v\) \{ atMirror = v; \}/);
  assert.match(GAME, /_spaceFlags\.atMirror = atMirror/);
  assert.match(GAME, /setMirrorVisible\(atMirror\)/);
  assert.match(GAME, /\} else if \(atMirror\) \{ clampToMirror\(player\.position\);/);
  assert.equal((GAME.match(/atMirror \? 'mirror' : atDream/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(GAME, /if \(place === 'mirror'\) \{[^\n]*\n[^\n]*mirrorMinimapMarks\(md\.marks\)/);
  assert.match(GAME, /if \(atMirror\) return 'mirror';/);
  assert.match(read('js/data/tools.js'), /mirror: 'none'/);
});

test('game.js — 루프·입력: 연출이 카메라를 갖고 탭·Space·Esc·Enter 로 건너뛴다 · 센서 정지', () => {
  assert.match(GAME, /else if \(updateMirrorRide\(dt, t\)\) \{ wantAction = false; \}/);
  assert.match(GAME, /!intro && !dreamCutActive\(\) && !mirrorRideActive\(\)\) \{\n\s+handleAction\(\);/);
  assert.match(GAME, /if \(mirrorRideActive\(\) && \(e\.code === 'Space' \|\| e\.code === 'Escape' \|\| e\.code === 'Enter'\)\) skipMirrorRide\(\);/);
  assert.match(GAME, /if \(mirrorRideActive\(\)\) \{ skipMirrorRide\(\); return; \}/);
  assert.match(GAME, /dreamSkip\(\) \{ skipDreamCut\(\); skipMirrorRide\(\); \}/);
  assert.match(GAME, /updateMirror\(dt, t\);/);
  assert.match(GAME, /syncVillageCarriage\(inVillage2\(\)\);/);
  assert.match(GAME, /if \(!dreamCutActive\(\) && !mirrorRideActive\(\)\) sampleFrame\(/);
});

test('game.js — 액션·세이브·시간 정지·조명·그림자·나무 제외', () => {
  assert.match(GAME, /if \(atMirror \|\| nearDoor === 'mirrorgo'\) return mirrorAction\(nearDoor\);/);
  assert.match(GAME, /\(atMirror \|\| mirrorRideActive\(\)\) \? mirrorReturnPos\(\) : atDream \? dreamReturnPos\(\) :/, '탑승 연출 중 저장도 정류장 앞(마차는 호수 위를 지난다)');
  assert.match(GAME, /gameState\.mirror = normalizeMirror\(saved\.mirror, todayStr\(\)\);/);
  assert.match(GAME, /mirror: \{ visits: 0, day: '', done: 0, hinted: \[\], total: 0 \}/);
  assert.match(GAME, /bait: 0, shard: 0, mirror: 0,/);
  assert.match(GAME, /if \(!dayPaused && !atDream && !atMirror\) timeOfDay =/);
  assert.match(GAME, /if \(atMirror\) \{\n\s+hemiLight\.intensity = /);
  assert.match(read('js/shadow-scope.js'), /'atDream', 'atMirror'\]/);
  assert.equal((GAME.match(/dist2D\(\{ x, z \}, MIRROR_STOP\) < 4/g) || []).length, 2, '정류장 주변 나무 제외 2곳');
});

test('doors.js · 고정 목록 · index.html · BGM', () => {
  assert.match(DOORS, /if \(atMirror\) \{[^]*?const mp = mirrorPrompt\(\);/);
  assert.match(DOORS, /const mv = !indoor && mirrorVillagePrompt\(\);/);
  assert.match(DOORS, /\} else if \(mv\) \{/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atMirror/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atMirror/);
  assert.match(read('js/spaces/farm-auto.js'), /atMine \|\| atDream \|\| atMirror;/);
  assert.match(GAME, /const off = indoor \|\| atCafe \|\| atMuseum \|\| atObservatory \|\| atMine \|\| atDream \|\| atMirror;/);
  assert.match(HTML, /d\.place === 'mirror' \? 'rgba\(80,98,154,0\.8\)'/);
  assert.match(HTML, /d\.place === 'mirror' \? '🪞 거울 마을'/);
  assert.match(HTML, /<div id="mirror-arrive-modal">/);
  assert.match(HTML, /'mirror-arrive-modal': 'mirror-arrive-ok'/);
  assert.match(HTML, /#sleep-fade\.mirror \{/);
  assert.match(HTML, /el\.classList\.toggle\('mirror', tint === 'mirror'\)/);
  assert.doesNotMatch(HTML.slice(HTML.indexOf('id="mirror-arrive-modal"'), HTML.indexOf('id="mirror-arrive-ok"')), /<b>/, '문장 안 <b> 는 영어 모드에서 한국어가 남는다');
  assert.match(read('js/sound.js'), /bgmTheme === 'mirror' \? playMirrorBar/);
  assert.match(GAME, /\{ ico: '🚏', name: '정류장', x: MIRROR_STOP\.x, z: MIRROR_STOP\.z/);
});

test('index.html — 꾸미기 메뉴 머리에 🪞 조각 잔량(생긴 뒤에만, ✨ 와 같은 방식)', () => {
  assert.match(HTML, /\(lastInv\.mirror \? `  🪞 \$\{lastInv\.mirror\}` : ''\)/);
});

test('mirror.js — 재탑승해도 힌트 감점 유지 · 자정 넘기면 HUD·말풍선 갱신', () => {
  const M = read('js/spaces/mirror.js');
  assert.match(M, /const hintUsed = new Set\(\);/, '힌트 쓴 의뢰(day:n)는 leaveSpace 뒤에도 기억');
  assert.match(M, /hintUsed\.add\(hintKey\(active\.q\)\)/);
  assert.match(M, /const used = hintUsed\.has\(hintKey\(q\)\);\n\s+active = \{ q, heardAt: performance\.now\(\), hinted: used, hintShown: used \};/);
  assert.match(M, /if \(m\.day !== lastDay\) \{ lastDay = m\.day; lastHud = null; syncHud\(\); refreshWorld\(\); \}/);
});
