import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildCamp } from '../js/mountain/camp-art.js';
import { CAMP, DOOR_SPOT, DOOR_R } from '../js/mountain/camp-layout.js';
import { KEEPER_TALK_R } from '../js/mountain/keeper-talk.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('doors: 썰매지기 판정은 출발대·문 뒤에 있다', () => {
  const src = read('js/spaces/doors.js');
  const seg = src.slice(src.indexOf('} else if (atMountain) {'), src.indexOf('} else if (atObservatory)'));
  const iSled = seg.indexOf('sledStartReady()'), iDoor = seg.indexOf('hutDoorReady()'), iKeeper = seg.indexOf('keeperReady()');
  assert.ok(iSled > 0 && iDoor > iSled && iKeeper > iDoor, `${iSled} ${iDoor} ${iKeeper}`);
  assert.match(seg, /nd = 'keepertalk'; prompt = KEEPER_PROMPT;/);
});

test('mountain: 대화·선물·트래킹·말풍선 모드가 배선돼 있다', () => {
  const src = read('js/spaces/mountain.js');
  assert.match(src, /if \(nearDoor === 'keepertalk'\) return talkKeeper\(\);/);
  assert.match(src, /trackEvent\('keeper_talk_open', \{ stage \}\)/);
  assert.match(src, /trackEvent\('keeper_talk_close', \{ stage: done\.stage, via, lines_seen: done\.i \+ 1 \}\)/);
  assert.match(src, /trackEvent\('keeper_gift', \{ item_id: 'worldtree' \}\)/);
  assert.match(src, /keeperBubble\?\.arrive\(keeperWantsTalk\(gameState\) \? 'quest' : 'idle'\)/);
});

test('썰매지기 대화 자리는 산장 문 판정 밖에서도 닿는다', () => {
  const d = Math.hypot(CAMP.keeper.x - DOOR_SPOT.x, CAMP.keeper.z - DOOR_SPOT.z);
  assert.ok(d > DOOR_R, `${d}`);
  assert.ok(KEEPER_TALK_R + DOOR_R > d);
});

test('산장 창 불빛 메시는 따로 있고 처음엔 꺼져 있다', () => {
  const g = buildCamp(THREE);
  const light = g.userData.hutLight;
  assert.ok(light && light.isMesh);
  assert.equal(light.visible, false);
});
