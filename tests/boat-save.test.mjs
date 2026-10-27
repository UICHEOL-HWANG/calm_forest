import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOAT_V, boatDefaults, restoreBoat, migrateUpgrades } from '../js/boat/save.js';
import { gameSource } from './helpers/game-source.mjs';

test('기본값', () => {
  const d = boatDefaults();
  assert.equal(d.v, BOAT_V);
  assert.deepEqual(d.sel, { boat: 'ferry', bow: null, flag: null, stern: null, crew: null, course: 'calm' });
  assert.deepEqual(d.own, { ferry: 1 });
  assert.deepEqual(d.mat, { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 });
  assert.deepEqual(d.stat, { rapidClears: 0, rapidNightClears: 0, rapidPerfect: 0, nightClears: 0, raftClears: 0, comboBest: 0 });
  assert.deepEqual(d.up, { oar: 0, hull: 0, lamp: 0 });
});

test('강화 이전: oar→순풍 깃발, hull→쇄빙 뱃머리, lamp→뱃종+별 300', () => {
  assert.deepEqual(migrateUpgrades({ oar: 2, hull: 1, lamp: 1 }), {
    parts: { wind: 2, ram: 1, bell: 1 }, equip: { flag: 'wind', bow: 'ram', stern: 'bell' }, refundStar: 300,
  });
  assert.deepEqual(migrateUpgrades({ oar: 0, hull: 0, lamp: 0 }), { parts: {}, equip: {}, refundStar: 0 });
  assert.deepEqual(migrateUpgrades(undefined), { parts: {}, equip: {}, refundStar: 0 });
});

test('옛 세이브(v 없음) 복원: 이전 1회 + 기존 필드 보존', () => {
  const r = restoreBoat({ date: '2026-10-20', count: 2, best: 812, clears: 7, up: { oar: 1, hull: 2, lamp: 1 }, chestDate: '2026-10-19', perfect: 1 });
  assert.equal(r.refundStar, 300);
  assert.equal(r.boat.v, 2);
  assert.deepEqual(r.boat.up, { oar: 1, hull: 2, lamp: 1 });
  assert.deepEqual(r.boat.parts, { wind: 1, ram: 2, bell: 1 });
  assert.equal(r.boat.sel.flag, 'wind'); assert.equal(r.boat.sel.bow, 'ram'); assert.equal(r.boat.sel.stern, 'bell');
  assert.equal(r.boat.clears, 7); assert.equal(r.boat.best, 812); assert.equal(r.boat.perfect, 1);
  assert.equal(r.boat.chestDate, '2026-10-19');
});

test('이미 v2 면 다시 이전하지 않는다', () => {
  const once = restoreBoat({ up: { oar: 0, hull: 0, lamp: 1 } }).boat;
  const twice = restoreBoat(once);
  assert.equal(twice.refundStar, 0);
  assert.deepEqual(twice.boat.parts, once.parts);
});

test('하위 객체가 빠진 v2 세이브도 기본값으로 채운다', () => {
  const r = restoreBoat({ v: 2, own: { ferry: 1, lotus: 1 } }).boat;
  assert.deepEqual(r.mat, { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 });
  assert.equal(r.stat.comboBest, 0);
  assert.equal(r.sel.boat, 'ferry');
  assert.deepEqual(r.mastery, {});
  assert.deepEqual(r.crew, {});
  assert.equal(r.bestRapid, 0);
});

test('가진 적 없는 배·1차에 없는 배를 고른 세이브는 나룻배로', () => {
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1 }, sel: { boat: 'koi' } }).boat.sel.boat, 'ferry');
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1, gourd: 1 }, sel: { boat: 'gourd' } }).boat.sel.boat, 'ferry');
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1, raft: 1 }, sel: { boat: 'raft' } }).boat.sel.boat, 'raft');
});

test('잘못된 숫자는 0 으로, 코스는 calm|rapid 만', () => {
  const r = restoreBoat({ v: 2, mat: { lotus: -3, shell: 'x', driftwood: 4.7 }, sel: { course: 'lava' } }).boat;
  assert.deepEqual(r.mat, { lotus: 0, driftwood: 4, shell: 0, moon_fish: 0 });
  assert.equal(r.sel.course, 'calm');
});

test('restoreBoat 는 입력을 바꾸지 않는다', () => {
  const input = { up: { oar: 1, hull: 0, lamp: 0 } };
  const snap = JSON.stringify(input);
  restoreBoat(input);
  assert.equal(JSON.stringify(input), snap);
});

test('game.js: 기본값·복원·환급 순서', () => {
  const src = gameSource();
  assert.match(src, /boat: boatDefaults\(\),/);
  const inv = src.indexOf('if (saved.inventory)'), rb = src.indexOf('restoreBoat(saved.boat)');
  assert.ok(inv > 0 && rb > inv, '인벤토리 복원 뒤에 나룻배 복원(환급이 덮이지 않게)');
  assert.match(src, /rb\.refundStar/);
});

test('미래 버전(v3) 세이브는 이전을 다시 돌리지 않고 v 를 유지', () => {
  const r = restoreBoat({ v: 3, up: { oar: 0, hull: 0, lamp: 1 }, clears: 4 });
  assert.equal(r.refundStar, 0);
  assert.equal(r.boat.v, 3);
  assert.deepEqual(r.boat.parts, {});
});
