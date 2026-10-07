// 📊 메인 이야기 트래킹(2026-10-07) — 장 완료 소요 시간·시작 경로·완료 계기·모달 열람
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hoursSince } from '../js/story/rules.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const body = (text, head) => { const i = text.indexOf(head); assert.ok(i >= 0, `${head} 없음`); return text.slice(i, text.indexOf('\n}', i)); };

test('hoursSince: 시각이면 0.1시간 단위, 옛 세이브의 1·없음·미래값은 null', () => {
  const t0 = Date.UTC(2026, 9, 7, 0, 0, 0);
  assert.equal(hoursSince(t0, t0 + 90 * 60 * 1000), 1.5);
  assert.equal(hoursSince(t0, t0 + 3 * 60 * 1000), 0.1);   // 0.05 반올림
  assert.equal(hoursSince(1, t0), null);                    // 옛 세이브: started[id] = 1
  assert.equal(hoursSince(undefined, t0), null);
  assert.equal(hoursSince(t0 + 1000, t0), null);            // 기기 시계가 뒤로 간 경우
});

test('syncStory: 완료 이벤트에 trigger·hours_since_start, 시작 이벤트에 via, started 는 시각', () => {
  const fn = body(src('js/game.js'), 'function syncStory(');
  assert.match(fn, /function syncStory\(trigger = ''\)/);
  assert.match(fn, /trigger: storyBooted \? \(trigger \|\| 'unknown'\) : 'boot'/);
  assert.match(fn, /hoursSince\(st\.started\[c\.id\]/);
  assert.match(fn, /st\.started\[cur\.id\] = Date\.now\(\)/);
  assert.match(fn, /trackEvent\('story_chapter_start', \{[^}]*via: storyBooted \? 'live' : 'boot'/);
});

test('진행 훅마다 trigger 키를 넘긴다', () => {
  const g = src('js/game.js');
  for (const [file, key] of [
    ['js/game.js', 'special'], ['js/game.js', 'cook'], ['js/game.js', 'quest'], ['js/game.js', 'farm_expand'],
    ['js/spaces/cafe.js', 'serve'], ['js/spaces/house.js', 'house'], ['js/spaces/mist.js', 'purify'],
    ['js/spaces/orchard-actions.js', 'sapling'], ['js/spaces/observatory.js', 'star'],
  ]) assert.match(file === 'js/game.js' ? g : src(file), new RegExp(`syncStory\\('${key}'\\)`), `${file}: ${key}`);
  const calls = [...g.matchAll(/syncStory\(\)/g)].length;
  assert.equal(calls, 1, 'game.js 의 trigger 없는 syncStory() 는 부팅 소급 한 곳뿐이어야 한다');
});

test('④ 이야기 모달 열람 — 칩·온보딩 두 경로', () => {
  const h = src('index.html');
  assert.match(h, /trackEvent\('story_modal_open', \{ ch: [^,]+, via: 'chip' \}\)/);
  assert.match(h, /trackEvent\('story_modal_open', \{ ch: [^,]+, via: 'onboard' \}\)/);
});
