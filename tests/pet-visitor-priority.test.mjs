import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// 🐾 펫 맡기기가 🔍 방문객 살펴보기를 가로채던 버그(2026-10-12).
//   farmActionFirst() 는 방문객이 있으면 false 를 낸다("밭일이 먼저가 아니다") — 그 false 를
//   펫 줄이 "밭일이 없으니 펫에게 맡겨도 된다" 로 읽어 nearDoor = 'pet' 이 잡혔고,
//   handleAction 맨 위의 문 분기(commandPet)가 observeVisitor 보다 먼저 나갔다.
test('🐾 맡기기 프롬프트는 🔍 살펴볼 손님이 있으면 양보한다', () => {
  const line = read('js/spaces/doors.js').split('\n').find(l => l.includes("nearDoor = 'pet'"));
  assert.ok(line, "doors.js 에 nearDoor = 'pet' 줄이 없다");
  assert.ok(line.includes('!visitorTarget()'), `펫 줄에 !visitorTarget() 가드가 없다:\n${line.trim()}`);
});

test('handleAction 에서 펫 문 분기는 방문객 살펴보기보다 앞에 있다 — 그래서 프롬프트 쪽 가드가 필요하다', () => {
  const game = read('js/game.js');
  const pet = game.indexOf("if (nearDoor === 'pet') return commandPet();");
  const visitor = game.indexOf('if (visitorTarget()) return observeVisitor();');
  assert.ok(pet > 0 && visitor > 0, 'handleAction 분기 문자열을 못 찾았다');
  assert.ok(pet < visitor, '순서가 바뀌었다면 이 테스트와 doors.js 가드를 다시 볼 것');
});
