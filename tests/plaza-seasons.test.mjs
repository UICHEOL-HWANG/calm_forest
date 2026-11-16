import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickSeason, datePhase } from '../js/plaza/seasons.js';
import { PLAZA_SEASONS, PLAZA_SEASON, PLAZA_OPENS_KST } from '../js/data/plaza.js';

const at = (iso) => Date.parse(iso);

test('pickSeason: 겨울 시작 전엔 수확제(지금 동작 그대로)', () => {
  assert.equal(pickSeason(at('2026-11-15T12:00:00+09:00')).id, 'harvest-2026');
  assert.equal(pickSeason(at('2026-12-17T23:59:59+09:00')).id, 'harvest-2026');
  assert.equal(pickSeason(at('2026-09-01T00:00:00+09:00')).id, 'harvest-2026');
});

test('pickSeason: 12/18 00:00 KST 부터 겨울, 끝난 뒤에도 마지막 시즌', () => {
  assert.equal(pickSeason(at('2026-12-18T00:00:00+09:00')).kind, 'winter');
  assert.equal(pickSeason(at('2027-02-01T00:00:00+09:00')).id, 'winter-2026');
});

test('pickSeason: ?plazaSeason= 덮어쓰기, 모르는 id 는 마지막 시즌 정의를 빌린다', () => {
  assert.equal(pickSeason(at('2026-11-15T00:00:00+09:00'), 'winter-2026').id, 'winter-2026');
  const t = pickSeason(at('2026-11-15T00:00:00+09:00'), 'wtest-1');
  assert.deepEqual({ id: t.id, kind: t.kind, guests: t.guests }, { id: 'wtest-1', kind: 'winter', guests: true });
});

test('datePhase: KST 자정 경계', () => {
  const w = PLAZA_SEASONS[1];
  assert.equal(datePhase(w, at('2026-12-17T23:59:59+09:00')), 'before');
  assert.equal(datePhase(w, at('2026-12-18T00:00:00+09:00')), 'active');
  assert.equal(datePhase(w, at('2026-12-31T23:59:59+09:00')), 'active');
  assert.equal(datePhase(w, at('2027-01-01T00:00:00+09:00')), 'after');
});

test('수확제 상수는 그대로이고 목록 첫 시즌과 같다', () => {
  assert.equal(PLAZA_SEASONS[0].id, PLAZA_SEASON);
  assert.equal(PLAZA_SEASONS[0].opensKst, PLAZA_OPENS_KST);
  const opens = PLAZA_SEASONS.map(s => Date.parse(`${s.opensKst}T00:00:00+09:00`));
  assert.deepEqual(opens, [...opens].sort((a, b) => a - b));
});

test('index.js 는 시즌을 pickSeason 으로 고른다', () => {
  const src = readFileSync(new URL('../js/plaza/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes('const DEF = pickSeason(Date.now(), SEASON_OVERRIDE);'));
  assert.ok(src.includes('export const SEASON = DEF.id;'));
  assert.ok(!src.includes('|| PLAZA_SEASON'));
});
