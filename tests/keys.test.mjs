import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKeyState, isEditableTarget } from '../js/keys.js';

const ev = (code, target = null) => ({ code, target });

test('keydown/keyup 으로 눌림 상태가 바뀐다', () => {
  const ks = createKeyState();
  ks.down(ev('KeyW'));
  assert.equal(ks.isDown('KeyW'), true);
  ks.up(ev('KeyW'));
  assert.equal(ks.isDown('KeyW'), false);
});

test('reset 은 모든 키를 뗀 상태로 만든다 (포커스 손실·모달 오픈용)', () => {
  const ks = createKeyState();
  ks.down(ev('KeyW')); ks.down(ev('ArrowLeft'));
  ks.reset();
  assert.equal(ks.isDown('KeyW'), false);
  assert.equal(ks.isDown('ArrowLeft'), false);
  assert.equal(ks.anyDown(), false);
});

test('입력칸(input/textarea/contenteditable) 에서 온 keydown 은 게임 키로 안 잡힌다', () => {
  const ks = createKeyState();
  ks.down(ev('KeyW', { tagName: 'INPUT', isContentEditable: false }));
  ks.down(ev('KeyA', { tagName: 'TEXTAREA', isContentEditable: false }));
  ks.down(ev('KeyS', { tagName: 'DIV', isContentEditable: true }));
  assert.equal(ks.anyDown(), false);
  assert.equal(ks.down(ev('ArrowLeft', { tagName: 'INPUT', isContentEditable: false })), false, 'down 은 무시했음을 false 로 알린다(preventDefault 판단용)');
});

test('입력칸에서 떼는 keyup 은 그래도 상태를 푼다 (칸에 포커스가 옮겨간 채 떼도 안 걸림)', () => {
  const ks = createKeyState();
  ks.down(ev('KeyW'));
  ks.up(ev('KeyW', { tagName: 'INPUT', isContentEditable: false }));
  assert.equal(ks.isDown('KeyW'), false);
});

test('isEditableTarget 판정', () => {
  assert.equal(isEditableTarget(null), false);
  assert.equal(isEditableTarget({ tagName: 'CANVAS', isContentEditable: false }), false);
  assert.equal(isEditableTarget({ tagName: 'INPUT', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'SELECT', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'P', isContentEditable: true }), true);
});

test('moveAxes: WASD/방향키 합산, blocked 면 0', () => {
  const ks = createKeyState();
  ks.down(ev('KeyW')); ks.down(ev('ArrowRight'));
  assert.deepEqual(ks.moveAxes(), { mx: 1, mz: -1 });
  assert.deepEqual(ks.moveAxes(true), { mx: 0, mz: 0 });
});
