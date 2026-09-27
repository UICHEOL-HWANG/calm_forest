import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = { phase: 'active', invited: '', season: 'harvest-2026', tutorialBusy: false, villageSec: 25, modal: false };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('inviteDue: 시즌 중·아직 안 받음·마을 20초·튜토리얼/모달 아님', async () => {
  const { inviteDue } = await import('../js/plaza/invite-rule.js');
  assert.equal(inviteDue(base), true);
  assert.equal(inviteDue({ ...base, phase: 'before' }), false);
  assert.equal(inviteDue({ ...base, phase: 'after' }), false);
  assert.equal(inviteDue({ ...base, invited: 'harvest-2026' }), false);
  assert.equal(inviteDue({ ...base, villageSec: 19 }), false);
  assert.equal(inviteDue({ ...base, tutorialBusy: true }), false);
  assert.equal(inviteDue({ ...base, modal: true }), false);
});

test('inviteDue: 검수(?plaza=) 중엔 조건이 다 맞아도 절대 안 보낸다', async () => {
  const { inviteDue } = await import('../js/plaza/invite-rule.js');
  assert.equal(inviteDue({ ...base, debug: true }), false);
});

test('올빼미 착지 훅: 특별 의뢰 경로는 그대로, 광장은 별도 칸', () => {
  const npc = src('js/spaces/npc.js');
  assert.ok(/export function onOwlLand\(/.test(npc));
  assert.ok(/export function sendOwlToPlayer\(/.test(npc));
  assert.ok(/special:\s*\(o\)\s*=>\s*deliverOwlSpecial\(o\)/.test(npc), '특별 의뢰 착지가 훅 표에 없다');
  assert.ok(/f\.deliver === true \? 'special'/.test(npc), '예전 호출(true)이 특별 의뢰로 매핑돼야 한다');
  assert.ok(!/plaza/i.test(npc), 'npc.js 는 광장을 몰라야 한다 — 훅 등록은 js/plaza/invite.js');
});

test('초대 문구가 확정됐다', () => {
  assert.ok(!src('js/plaza/copy.js').includes('<확정'), 'copy.js 에 미확정 문구가 남았다');
});
