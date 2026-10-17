import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INTRO_SCORE, INTRO_SCORE_LEN } from '../js/sound-intro.js';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const CAPTIONS = [...src('spaces/prologue.js').matchAll(/\{ at: ([\d.]+), until: ([\d.]+), text: '([^']+)' \}/g)]
  .map(m => ({ at: +m[1], until: +m[2], text: m[3] }));

test('악보는 시간순이고 프롤로그 길이 안에서 끝난다', () => {
  for (let i = 1; i < INTRO_SCORE.length; i++) assert.ok(INTRO_SCORE[i].t >= INTRO_SCORE[i - 1].t, `#${i}`);
  for (const e of INTRO_SCORE) {
    assert.ok(['bell', 'pad', 'vox', 'wind'].includes(e.kind), e.kind);
    assert.ok(e.t >= 0 && e.t + e.dur <= INTRO_SCORE_LEN + 0.01, `${e.kind}@${e.t}`);
    assert.ok(e.vol > 0 && e.vol <= 0.08, `${e.kind}@${e.t} vol`);
  }
  assert.ok(INTRO_SCORE_LEN >= 25.8 && INTRO_SCORE_LEN <= 27);
});

test('자막 다섯 장면과 타이틀마다 소리가 시작된다', () => {
  assert.equal(CAPTIONS.length, 5);
  const starts = INTRO_SCORE.map(e => e.t);
  for (const c of CAPTIONS) assert.ok(starts.some(t => t >= c.at - 0.6 && t < c.until), c.text);
  assert.ok(INTRO_SCORE.some(e => e.t >= 23.4 && e.kind === 'vox'), 'title bloom');
});

test('sound.js: 프롤로그 동안 마을 BGM 은 쉬고, 음악이 켜져 있을 때만 프롤로그 곡을 튼다', () => {
  const s = src('sound.js');
  assert.match(s, /bgmTheme === 'intro'/);
  assert.match(s, /export function startIntroScore\(/);
  assert.match(s, /export function stopIntroScore\(/);
  const fn = s.slice(s.indexOf('export function startIntroScore'), s.indexOf('export function stopIntroScore'));
  assert.match(fn, /musicOn/);
});

test('prologue.js: 시작에 틀고, 끝·건너뛰기에 멈춘다', () => {
  const s = src('spaces/prologue.js');
  const start = s.slice(s.indexOf('export function introStart'), s.indexOf('export function introEnd'));
  const end = s.slice(s.indexOf('export function introEnd'), s.indexOf('export function introEnd') + 1500);
  assert.match(start, /startIntroScore\(\)/);
  assert.match(end, /stopIntroScore\(/);
});
