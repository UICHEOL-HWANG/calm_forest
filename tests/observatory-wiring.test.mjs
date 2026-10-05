import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const DOORS = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
const SHADOW = readFileSync(new URL('../js/shadow-scope.js', import.meta.url), 'utf8');

function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('$w getter/setter 와 export 에 atObservatory/observatoryGroup 이 있다', () => {
  assert.match(SRC, /get atObservatory\(\) \{ return atObservatory; \}, set atObservatory\(v\) \{ atObservatory = v; \}/);
  assert.match(SRC, /get observatoryGroup\(\) \{ return observatoryGroup; \}, set observatoryGroup\(v\) \{ observatoryGroup = v; \}/);
  assert.match(SRC, /let atObservatory = false, observatoryGroup = null/);
  assert.match(SRC, /applyCosmetics[\s\S]*atObservatory[\s\S]*atOrchard/);
  assert.match(SRC, /museumGroup[\s\S]*observatoryGroup[\s\S]*nearBench/);
});

test('setSpaceVisible, spaceFlags, toolZoneKey, place 문자열이 천문대를 안다', () => {
  assert.match(bodyOf('setSpaceVisible'), /observatoryGroup\.visible = atObservatory/);
  assert.match(bodyOf('setSpaceVisible'), /!atMuseum && !atObservatory/);
  assert.match(SRC, /_spaceFlags[\s\S]*atObservatory: false/);
  assert.match(bodyOf('spaceFlags'), /_spaceFlags\.atObservatory = atObservatory/);
  assert.match(bodyOf('toolZoneKey'), /if \(atObservatory\) return 'observatory'/);
  assert.match(SRC, /atObservatory \? 'observatory'/);
});

test('handleAction 은 천문대 입장/퇴장과 실내 액션 가드를 처리한다', () => {
  const body = bodyOf('handleAction');
  // 실내에선 문·나가기·망원경만 — 그 밖의 액션은 observatoryAction 이 삼킨다(동작: observatory-interior)
  assert.match(body, /if \(atObservatory \|\| nearDoor === 'observatory'\) return observatoryAction\(nearDoor\)/);
});

test('buildEnvironment 와 VILLAGE_PLACES 에 천문대가 있다', () => {
  assert.match(bodyOf('buildEnvironment'), /spawnObservatoryGate\(\)/);
  assert.match(SRC, /\{ ico: '🔭', name: '천문대',\s*x: OBSERVATORY_GATE\.x, z: OBSERVATORY_GATE\.z, pri: 1 \}/);
});

test('doors.js 는 천문대 문구와 실내 나가기를 처리한다', () => {
  assert.match(DOORS, /atObservatory/);
  assert.match(DOORS, /OBSERVATORY_GATE/);
  assert.match(DOORS, /OBSERVATORY_R/);
  assert.match(DOORS, /nd = 'observatoryexit'; prompt = '🚪 나가기'/);
  assert.match(DOORS, /nd = 'observatory'; prompt = '🌌 별 보러 가기'/);
  assert.match(DOORS, /firstHintBanner\('observatoryGate', '🔭', '천문대'/);
});

test('shadow-scope 와 주변 공간 가드가 atObservatory 를 포함한다', () => {
  assert.match(SHADOW, /'atObservatory'/);
  assert.match(SRC, /outdoorZone\(\) \{ return !indoor[\s\S]*!atObservatory/);
  assert.match(SRC, /coveWater[\s\S]*!atMuseum && !atObservatory/);
  assert.match(SRC, /const off = indoor \|\| atCafe \|\| atMuseum \|\| atObservatory \|\| atMine/);
  assert.match(SRC, /const outdoors = !\(indoor \|\| atCafe \|\| atMuseum \|\| atObservatory/);
});
