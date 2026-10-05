import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const OBS = readFileSync(new URL('../js/spaces/observatory.js', import.meta.url), 'utf8');
const DOORS = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');

function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('천문대 실내 망원경 프롬프트는 COPY.lookIn 을 쓴다', () => {
  assert.match(DOORS, /COPY\.lookIn/);
  assert.match(DOORS, /nd = 'telescope'/);
});

test('handleAction 은 telescope 를 startObservatoryLook 으로 보낸다', () => {
  // 분기 자체(telescope → startObservatoryLook)는 observatory-interior 의 observatoryAction 동작 테스트가 본다
  assert.match(bodyOf('handleAction'), /return observatoryAction\(nearDoor\)/);
});

test('천문대 자세 업데이트는 updatePlayer 뒤 매 프레임 호출된다', () => {
  assert.match(SRC, /updatePlayer\(dt, t\); updateMuseumView\(dt\); updateObservatory\(dt, t\); updateCamera\(dt\)/);
});

test('startObservatoryLook 은 위치를 고정하고 700ms 뒤 렌즈 뷰를 연다', () => {
  assert.match(OBS, /export function startObservatoryLook\(\)/);
  assert.match(OBS, /Input\.setAnalog\(0, 0\)/);
  assert.match(OBS, /LOOK_SECONDS = 0\.7/);
  assert.match(OBS, /import\('\.\.\/observatory\/ui\.js'\)/);
  assert.match(OBS, /openStarView/);
});

test('updateObservatory 는 허리를 앞으로 숙인다(rotation.x 양수 = 앞, 도끼질과 같은 규약)', () => {
  assert.match(OBS, /export function updateObservatory\(dt, t\)/);
  assert.match(OBS, /playerAnchor\.rotation\.x = 0\.5 \* k/);
  assert.doesNotMatch(OBS, /playerAnchor\.rotation\.x = -[\d.]+ \* k/);
  assert.match(OBS, /\$w\.armWristK = 0/);
});
