import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AFF_OUTDOOR, AFF_FRAMES, AFF_OUTDOOR_IDS, AFF_FRAME_IDS, AFF_BOX, affinityDecorOwner } from '../js/data/affinity-decor.js';
import { BEST_ITEMS, frameDecorId } from '../js/data/npc-letters.js';
import { AFFINITY_NPCS } from '../js/affinity/stages.js';

test('야외 단짝 꾸미기 11종은 편지 동봉 id 와 같고, 보관함 지급 표시(quest)가 있다', () => {
  assert.deepEqual([...AFF_OUTDOOR_IDS].sort(), AFFINITY_NPCS.map(n => BEST_ITEMS[n].decor).sort());
  for (const d of AFF_OUTDOOR) {
    assert.equal(d.hidden, true, d.id);
    assert.equal(d.quest, 'affinity', d.id);
    assert.ok(d.name && d.ico && d.desc, d.id);
    assert.ok(AFF_BOX[d.id]?.w > 0 && AFF_BOX[d.id]?.d > 0, `${d.id} 충돌 상자`);
  }
});

test('가족 액자 11개는 실내 작은 소품이고 편지 동봉 id 와 같다', () => {
  assert.deepEqual([...AFF_FRAME_IDS].sort(), AFFINITY_NPCS.map(frameDecorId).sort());
  for (const d of AFF_FRAMES) {
    assert.equal(d.hidden, true, d.id);
    assert.equal(d.sm, true, d.id);
    assert.equal(d.cost, 0, d.id);
    assert.ok(Array.isArray(d.foot) && d.h > 0, d.id);
  }
});

test('꾸미기 id 로 주민을 찾는다', () => {
  assert.equal(affinityDecorOwner('aff_chair'), 'builder');
  assert.equal(affinityDecorOwner('aff_frame_courier'), 'courier');
  assert.equal(affinityDecorOwner('fence'), null);
});

test('이름·설명에 엠대시가 없다', () => {
  for (const d of [...AFF_OUTDOOR, ...AFF_FRAMES]) assert.ok(!`${d.name}${d.desc || ''}`.includes('—'), d.id);
});

test('배치 겹침 검사는 단짝 꾸미기를 실제 발자국 상자로 본다(회전하면 가로세로가 바뀐다)', async () => {
  const { outdoorFootprint } = await import('../js/world/outdoor-overlap.js');
  const a = outdoorFootprint('aff_chair', 0, 0, 0);
  assert.ok(a.x1 !== undefined, '원이 아니라 상자');
  assert.ok(a.x2 - a.x1 > a.z2 - a.z1, '데크는 가로가 길다');
  const b = outdoorFootprint('aff_chair', 0, 0, 1);
  assert.ok(b.z2 - b.z1 > b.x2 - b.x1, '90도 돌리면 세로가 길다');
});
