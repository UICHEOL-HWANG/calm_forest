import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chapterShotDue, CHAPTER_SHOT_HOLD, SHOT_HOLD } from '../js/world/tree-shot.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('index.html');
const wt = read('js/spaces/world-tree.js');

test('1장 조망샷은 해금 켜진 새 세이브의 1장에서 한 번만', () => {
  assert.equal(chapterShotDue({ story: { ch: 0 }, hintsSeen: {} }, true), true);
  assert.equal(chapterShotDue({ story: { ch: 0 }, hintsSeen: {} }, false), false);
  assert.equal(chapterShotDue({ story: { ch: 1 }, hintsSeen: {} }, true), false);
  assert.equal(chapterShotDue({ story: { ch: 0 }, hintsSeen: { treeShot_chapter1: true } }, true), false);
  assert.equal(chapterShotDue({}, true), true);
});

test('1장 조망샷은 제목·대사를 읽을 만큼 오래 머문다', () => {
  assert.ok(CHAPTER_SHOT_HOLD >= SHOT_HOLD * 2);
});

test('튜토리얼 코치 카드에는 1장 목표 줄이 없다', () => {
  assert.doesNotMatch(html, /id="coach-goal"/);
  assert.doesNotMatch(html, /renderCoachGoal/);
  assert.match(html, /body\.coaching #story-chip, body\.spot-on #story-chip \{ display: none !important; \}/);
});

test('튜토리얼이 끝나면 1장 조망샷 뒤로 후속 안내를 미룬다', () => {
  const end = html.slice(html.indexOf('function endCoach(done)'), html.indexOf('function showLoginStatus'));
  assert.match(end, /if \(!Input\.queueChapterShot\?\.\(after\)\) after\(\);/);
  const after = end.slice(end.indexOf('const after'), end.indexOf('queueChapterShot'));
  for (const f of ['nudgeGuideOnce()', 'Input.orchardQuestAfterTutorial?.()', 'offerPush()']) assert.ok(after.includes(f), f);
});

test('1장 조망샷: 띠·장 제목·🦉 대사는 STORY_REWORLD 에서 · 연출 중 HUD 숨김 · 끝나면 칩 반짝임', () => {
  assert.match(wt, /export function queueChapterShot\(after\)/);
  assert.match(wt, /STORY_REWORLD\.home\.title/);
  assert.match(wt, /STORY_REWORLD\.home\.start/);
  assert.match(wt, /classList\.add\('cine-open'\)/);
  assert.match(wt, /ui\.flashStoryChip\?\.\(\)/);
  assert.match(html, /body\.cine-open #story-chip/);
  assert.match(html, /flashStoryChip\(\)/);
  assert.match(read('js/game.js'), /queueChapterShot\(after\) \{ return queueChapterShot\(after\); \}/);
});

test('마을 밖에서 튜토리얼이 끝나면 후속 안내는 8초 뒤 먼저 내보내고 1장 연출은 마을에 돌아올 때까지 남는다(집 안 졸업은 나올 때까지 기다린다)', () => {
  assert.match(wt, /q\.kind === 'chapter' && q\.after && !Input\.isIndoor\?\.\(\) && performance\.now\(\) - q\.at > CHAPTER_WAIT_MS\) \{ const after = q\.after; q\.after = null; after\(\); \}/);
  assert.doesNotMatch(wt, /CHAPTER_WAIT_MS\) \{ shotQueue\.shift\(\)/);
});
