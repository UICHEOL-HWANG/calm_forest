import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY, storyFor, SNOW_CHAPTER } from '../js/story/chapters.js';
import { chapterDone, chapterProgress, migrateStory, STORY_V } from '../js/story/rules.js';

const snowDone = { tree: { branches: { snow: { habitat: true } } } };

test('5장은 눈의 가지이고 STORY·REWORLD 같은 자리다', () => {
  assert.equal(SNOW_CHAPTER, 4);
  assert.equal(STORY[4].id, 'snowbranch');
  assert.equal(storyFor(true)[4].id, 'snowbranch');
  assert.equal(STORY[3].id, 'secret');
  assert.equal(STORY[5].id, 'living');
});

test('5장 판정: 눈의 가지 빈터 완성', () => {
  assert.equal(chapterDone(STORY, 4, {}), false);
  assert.equal(chapterDone(STORY, 4, snowDone), true);
  assert.equal(chapterProgress(STORY, 4, {}), '❄️ 눈의 가지 빈터 0/1');
});

test('migrateStory: 5장 이상 간 옛 세이브만 한 칸 민다, 한 번만, 원본은 그대로', () => {
  const cases = [[0, 0], [3, 3], [4, 4], [5, 6], [7, 8], [8, 9]];
  for (const [ch, want] of cases) {
    const src = { ch, q: 3, started: { home: 1 } };
    const { story, from, to } = migrateStory(src);
    assert.equal(story.ch, want, `ch ${ch}`);
    assert.equal(story.v, STORY_V);
    assert.equal(from, ch);
    assert.equal(to, want);
    assert.equal(src.ch, ch);
    assert.deepEqual(story.started, { home: 1 });
    assert.equal(migrateStory(story).story.ch, want);
  }
});

test('game.js: 새 세이브 story.v · 복원 때 migrateStory · 이전 이벤트 · 토스트 장 번호', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /story: \{ ch: 0, q: 0, started: \{\}, v: STORY_V \}/);
  assert.match(src, /migrateStory\(\{ ch: 0, q: 0, started: \{\}, \.\.\.saved\.story \}\)/);
  assert.match(src, /trackEvent\('story_migrated', \{ from: mig\.from, to: mig\.to \}\)/);
  assert.match(src, /st\.ch === 4 \|\| st\.ch === 8/);
});

test('안내서: 9장 목록과 "이야기 N장 뒤" 해금 숫자가 코드와 같다', () => {
  const ko = readFileSync(new URL('../guide/guide.html', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../guide/guide-en.html', import.meta.url), 'utf8');
  assert.match(ko, /나의 이야기 - 9장/);
  assert.match(ko, /5장 얼어붙은 가지\(설산 썰매지기 · 눈의 가지 빈터 꾸미기, \+90🪙\) → 6장 마을의 살림/);
  assert.match(ko, /9장 이웃의 숲/);
  assert.match(ko, /<small>이야기 7장을 마치면<\/small>/);
  assert.match(ko, /이야기 7장 뒤/);
  assert.equal((ko.match(/이야기 8장을 마치면/g) || []).length, 2);
  assert.match(en, /My Story: 9 chapters/);
  assert.match(en, /Ch\. 5 The Frozen Branch .* → Ch\. 6 Village Life/);
  assert.match(en, /Ch\. 9 Neighboring Forests/);
  assert.equal((en.match(/after story chapter 7/gi) || []).length, 2);
  assert.equal((en.match(/after story chapter 8/gi) || []).length, 2);
});
