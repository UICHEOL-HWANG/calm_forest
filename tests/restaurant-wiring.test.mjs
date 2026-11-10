import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const DOORS = read('js/spaces/doors.js');
const SHADOW = read('js/shadow-scope.js');
const DECOR = read('js/spaces/outdoor-decor.js');
const SEA = read('js/spaces/sea.js');
const AUTO = read('js/spaces/farm-auto.js');
const TOOLS = read('js/data/tools.js');
const UNLOCKS = read('js/world/unlocks.js');
const STUB = read('js/spaces/restaurant.js');

function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('let 선언과 $w 접근자와 export 에 atRestaurant/restaurantInGroup 이 있다', () => {
  assert.match(SRC, /let atRestaurant = false, restaurantInGroup = null/);
  assert.match(SRC, /get atRestaurant\(\) \{ return atRestaurant; \}, set atRestaurant\(v\) \{ atRestaurant = v; \}/);
  assert.match(SRC, /get restaurantInGroup\(\) \{ return restaurantInGroup; \}, set restaurantInGroup\(v\) \{ restaurantInGroup = v; \}/);
  assert.match(SRC, /export \{[\s\S]*atRestaurant[\s\S]*\}/);
  assert.match(SRC, /export \{[\s\S]*restaurantInGroup[\s\S]*\}/);
});

test('setSpaceVisible, spaceFlags, toolZoneKey, hintPlace, place 문자열이 식당을 안다', () => {
  assert.match(bodyOf('setSpaceVisible'), /if \(restaurantInGroup\) restaurantInGroup\.visible = atRestaurant/);
  assert.match(bodyOf('setSpaceVisible'), /!atRestaurant/);
  assert.match(SRC, /_spaceFlags = \{[^}]*atRestaurant: false/);
  assert.match(bodyOf('spaceFlags'), /_spaceFlags\.atRestaurant = atRestaurant/);
  assert.match(bodyOf('toolZoneKey'), /if \(atRestaurant\) return 'restaurant'/);
  assert.match(TOOLS, /restaurant: 'none'/);
  assert.match(SRC, /const hintPlace = \(\) => \[[^\]]*atRestaurant/);
  assert.match(SRC, /atRestaurant \? 'restaurant'/);
});

test('비 소리·오라·발자국·우산·도구 안개·계절·비가 식당 안에서 꺼진다', () => {
  assert.match(SRC, /startRainSound\(\)/);
  assert.match(SRC, /!atCafe && !atRestaurant && !atMuseum/);
  assert.match(SRC, /const off = indoor \|\| atCafe \|\| atRestaurant \|\| atMuseum/);
  assert.match(SRC, /const outdoors = !\(indoor \|\| atCafe \|\| atRestaurant/);
  assert.match(SRC, /if \(indoor \|\| atCafe \|\| atRestaurant\) setFogExempt\(heldToolMesh, true\)/);
  assert.match(SRC, /if \(indoor \|\| atCafe \|\| atRestaurant\) setFogExempt\(m, true\)/);
});

test('미니맵, 클램프, 카메라, 조명, 비료가 식당을 안다', () => {
  assert.match(SRC, /place === 'restaurant' \? RESTAURANT/);
  assert.match(SRC, /place === 'restaurant' \? HALL\.half\.x/);
  assert.match(SRC, /atRestaurant\) \{[^\n]*\n[^\n]*RESTAURANT\.x - HALL\.half\.x \+ 0\.7/);
  assert.match(SRC, /HALL\.half\.z - 0\.7/);
  assert.match(SRC, /return !indoor && !atMine && !atCafe && !atRestaurant/);
  assert.match(SRC, /if \(atRestaurant\) \{[\s\S]{0,400}scene\.fog\.color\.setHex\(0xe8d6b8\)/);
  assert.match(SRC, /if \(indoor \|\| atMine \|\| atCafe \|\| atRestaurant \|\|/);
});

test('행동 분기와 dev 훅이 식당 입퇴장을 부른다', () => {
  assert.match(SRC, /if \(nearDoor === 'restaurant'\) return enterRestaurant\(\)/);
  assert.match(SRC, /if \(nearDoor === 'restaurantexit'\) return exitRestaurant\(\)/);
  assert.match(SRC, /restaurant: \[enterRestaurant, exitRestaurant\]/);
  assert.match(SRC, /from '\.\/spaces\/restaurant\.js'/);
});

test('VILLAGE_PLACES, PLACE_UNLOCK, getGameState 가 식당을 안다', () => {
  assert.match(SRC, /\{ ico: '🍽️', name: '식당',\s*x: RESTAURANT_GATE\.x, z: RESTAURANT_GATE\.z, pri: 1 \}/);
  assert.match(SRC, /'식당': 'restaurant'/);
  assert.match(bodyOf('getGameState'), /atRestaurant \? \{ x: RESTAURANT_GATE\.x, z: 24\.4 \}/);
});

test('저장 키: gameState 리터럴과 applySave 와 import', () => {
  assert.match(SRC, /restaurant: defaultRestaurant\(\)/);
  assert.match(SRC, /gameState\.restaurant = sanitizeRestaurant\(saved\.restaurant\)/);
  assert.match(SRC, /import \{[^}]*defaultRestaurant[^}]*sanitizeRestaurant[^}]*\} from '\.\/restaurant\/rules\.js'/);
  assert.match(SRC, /import \{[^}]*RESTAURANT[^}]*HALL[^}]*\} from '\.\/restaurant\/data\.js'/);
});

test('해금 표에 restaurant 가 kitchen+habitat 조건으로 있다', () => {
  assert.match(UNLOCKS, /\{ id: 'restaurant', kind: 'place', when: s => branch\(s, 'kitchen', 'habitat'\) \}/);
});

test('다른 파일들도 atRestaurant 를 안다', () => {
  assert.match(SHADOW, /OUT_OF_REACH_FLAGS = \[[^\]]*'atRestaurant'/);
  assert.match(DOORS, /atRestaurant/);
  assert.match(DOORS, /inVillage2\(\) \{[^\n]*!atRestaurant/);
  assert.match(DECOR, /outdoorZone\(\) \{[^\n]*!atRestaurant/);
  assert.match(SEA, /!atCafe && !atRestaurant/);
  assert.match(AUTO, /const off = indoor \|\| atCafe \|\| atRestaurant/);
});

test('js/spaces/restaurant.js 는 입퇴장 함수를 내보낸다', () => {
  assert.match(STUB, /export function enterRestaurant\(/);
  assert.match(STUB, /export function exitRestaurant\(/);
});

test('마을 배치·실내·프레임·행동·밤 점등이 연결돼 있다', () => {
  assert.match(SRC, /lockFrom\('restaurant'\); spawnRestaurantGate\(\); lockTo\(\);/);
  assert.match(SRC, /buildCafeHall\(\);[^\n]*\n  buildRestaurantHall\(\);/);
  assert.match(SRC, /if \(atRestaurant\) tickRestaurant\(dt\);/);
  assert.match(SRC, /if \(atRestaurant\) \{\n    restaurantAction\(\);\n    return;\n  \}/);
  assert.match(SRC, /updateRestaurantNight\(nightAmt\);/);
  assert.match(SRC, /dist2D\(\{ x, z \}, RESTAURANT_GATE\) < 6/);
  assert.equal((SRC.match(/dist2D\(\{ x, z \}, RESTAURANT_GATE\) < 5\) continue;/g) || []).length, 2);
});

test('문: 마을에서 들어가기, 안에서 나가기와 영업 맥락', () => {
  assert.match(DOORS, /isOpen\('restaurant'\) && nearRestaurantDoor\(player\.position\)/);
  assert.match(DOORS, /nd = 'restaurant'; prompt = RESTAURANT_COPY\.enter;/);
  assert.match(DOORS, /nearRestaurantExit\(player\.position\)\) \{ nd = 'restaurantexit'/);
  assert.match(DOORS, /else prompt = updateRestaurantInteract\(\);/);
});

test('식당 이벤트 파라미터는 5개 이하', () => {
  const src = read('js/restaurant/runtime.js');
  const m = src.match(/trackEvent\('restaurant_service', \{([^}]*)\}/);
  assert.ok(m);
  assert.ok(m[1].split(',').length <= 5);
});
