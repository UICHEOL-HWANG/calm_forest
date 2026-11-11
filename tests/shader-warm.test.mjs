import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { warmShaders } from '../js/render/shader-warm.js';

const fake = (parallel) => {
  const calls = [];
  return { calls, extensions: { has: (k) => parallel && k === 'KHR_parallel_shader_compile' },
    compileAsync: (s, c) => { calls.push(['async', s, c]); return Promise.resolve(); },
    compile: (s, c) => { calls.push(['sync', s, c]); } };
};

test('병렬 셰이더 컴파일이 되면 compileAsync, 아니면 compile 로 미리 굽는다', async () => {
  const a = fake(true);
  await warmShaders(a, 'scene', 'cam');
  assert.deepEqual(a.calls, [['async', 'scene', 'cam']]);
  const b = fake(false);
  await warmShaders(b, 'scene', 'cam');
  assert.deepEqual(b.calls, [['sync', 'scene', 'cam']]);
});

test('렌더러가 없거나 실패해도 게임을 막지 않는다', async () => {
  assert.equal(await warmShaders(null, 's', 'c'), false);
  const bad = { extensions: { has: () => true }, compileAsync: () => Promise.reject(new Error('lost')) };
  assert.equal(await warmShaders(bad, 's', 'c'), false);
  const boom = { extensions: { has: () => false }, compile: () => { throw new Error('x'); } };
  assert.equal(await warmShaders(boom, 's', 'c'), false);
});

test('game.js 는 월드 부팅 끝과 플레이 시작 직전에 셰이더를 미리 굽는다', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const boot = game.slice(game.indexOf('export async function bootWorld('), game.indexOf('export async function enterGame('));
  assert.match(boot, /setTimeout\(\(\) => warmShaders\(renderer, scene, camera\), 0\);/);
  assert.match(game, /await warmShaders\(renderer, scene, camera\); await shootMapNow\(\);/);
});
