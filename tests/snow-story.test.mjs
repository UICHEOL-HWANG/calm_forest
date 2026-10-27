import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY, storyFor, SNOW_CHAPTER } from '../js/story/chapters.js';
import { chapterDone, chapterProgress, migrateStory, remapStory, STORY_V } from '../js/story/rules.js';

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
  assert.equal(chapterProgress(STORY, 4, {}), '🌳 물의 가지 빈터 0/1');
});

test('5장 칩: 앞 가지를 순서대로 알리고 네 가지가 끝나면 눈의 가지로 넘어간다', () => {
  const hab = (...ids) => ({ tree: { branches: Object.fromEntries(ids.map(id => [id, { habitat: true }])) } });
  assert.equal(chapterProgress(STORY, 4, hab('water')), '🌳 밭의 가지 빈터 0/1');
  assert.equal(chapterProgress(STORY, 4, hab('water', 'farm')), '🌳 부엌의 가지 빈터 0/1');
  assert.equal(chapterProgress(STORY, 4, hab('water', 'farm', 'kitchen')), '🌳 숲의 가지 빈터 0/1');
  assert.equal(chapterProgress(STORY, 4, hab('water', 'farm', 'kitchen', 'forest')), '❄️ 눈의 가지 빈터 0/1');
  assert.equal(chapterProgress(STORY, 4, hab('water', 'farm', 'kitchen', 'forest', 'snow')), '❄️ 눈의 가지 빈터 1/1');
  assert.equal(chapterDone(STORY, 4, hab('water', 'farm', 'kitchen', 'forest')), false);
  assert.equal(chapterDone(STORY, 4, hab('snow')), true);
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

test('migrateStory: 더 높은 저장 버전은 낮추지 않는다', () => {
  const { story } = migrateStory({ ch: 6, v: 3 });
  assert.equal(story.v, 3);
  assert.equal(story.ch, 6);
});

test('game.js: 새 세이브 story.v · 복원 때 migrateStory · 이전 이벤트 · 토스트 장 번호', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /story: \{ ch: 0, q: 0, started: \{\}, v: STORY_V \}/);
  assert.match(src, /migrateStory\(\{ ch: 0, q: 0, started: \{\}, \.\.\.saved\.story \}, STORY_IDS\)/);
  assert.match(src, /remapStory\(mig\.story, STORY_IDS\)/);
  assert.match(src, /trackEvent\('story_migrated', \{ from: mig\.from, to: fix\.to \}\)/);
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

const IDS = STORY.map(c => c.id);

test('remapStory: 새 클라이언트 세이브(at 일치)는 그대로다', () => {
  const src = { ch: 4, q: 1, v: 2, at: 'snowbranch', started: {} };
  const out = remapStory(src, IDS);
  assert.deepEqual(out, { story: src, from: 4, to: 4 });
});

test('remapStory: 옛 클라이언트가 8장 표로 ch 를 올렸으면 9장 표 위치로 옮기고 at 을 갱신한다', () => {
  const out = remapStory({ ch: 5, v: 2, at: 'snowbranch', started: { home: 1 } }, IDS);
  assert.equal(out.from, 5);
  assert.equal(out.to, IDS.indexOf('memory'));
  assert.equal(out.story.ch, 6);
  assert.equal(out.story.at, 'memory');
  assert.deepEqual(out.story.started, { home: 1 });
  assert.equal(remapStory(out.story, IDS).story.ch, 6);
});

test('remapStory: 옛 클라이언트가 8장을 모두 끝냈으면 끝(done)으로 옮긴다', () => {
  const out = remapStory({ ch: 8, v: 2, at: 'living' }, IDS);
  assert.equal(out.to, IDS.length);
  assert.equal(out.story.ch, 9);
  assert.equal(out.story.at, 'done');
  assert.equal(remapStory(out.story, IDS).story.ch, 9);
});

test('remapStory: 끝난 세이브(done)는 장이 뒤에 붙어도 다시 옮기지 않는다', () => {
  const appended = [...STORY.map(c => c.id), 'future'];
  const finished = { ch: STORY.length, v: 2, at: 'done' };
  const out = remapStory(finished, appended);
  assert.equal(out.from, STORY.length);
  assert.equal(out.to, STORY.length);
  assert.equal(out.story, finished);
  assert.equal(out.story.ch, STORY.length);
  assert.equal(out.story.at, 'done');
  const mid = { ch: 5, v: 2, at: 'snowbranch' };
  assert.equal(remapStory(mid, IDS).to, IDS.indexOf('memory'));
  assert.equal(remapStory(mid, IDS).story.at, 'memory');
});

test('remapStory: at 이 없으면 건드리지 않는다, 낮은 버전도 건드리지 않는다', () => {
  const noAt = { ch: 5, v: 2, started: {} };
  assert.deepEqual(remapStory(noAt, IDS), { story: noAt, from: 5, to: 5 });
  const old = { ch: 5, v: 1, at: 'snowbranch' };
  assert.deepEqual(remapStory(old, IDS), { story: old, from: 5, to: 5 });
});

test('migrateStory: ids 를 주면 at 을 채우고, 안 주면 채우지 않는다', () => {
  assert.equal(migrateStory({ ch: 5 }, IDS).story.at, 'memory');
  assert.equal(migrateStory({ ch: 4 }, IDS).story.at, 'snowbranch');
  assert.equal(migrateStory({ ch: 8 }, IDS).story.at, 'done');
  assert.equal(migrateStory({ ch: 5 }).story.at, undefined);
  const keep = { ch: 4, v: 2, at: 'snowbranch' };
  assert.equal(migrateStory(keep, IDS).story.at, 'snowbranch');
});

test('remapStory·migrateStory: 입력 객체를 바꾸지 않는다', () => {
  const a = Object.freeze({ ch: 5, v: 2, at: 'snowbranch', started: Object.freeze({}) });
  remapStory(a, IDS);
  const b = Object.freeze({ ch: 5, started: Object.freeze({}) });
  migrateStory(b, IDS);
  assert.equal(a.ch, 5);
  assert.equal(b.ch, 5);
});

test('game.js syncStory: 끝에서 story.at 을 현재 장 id 로 맞춘다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const i = src.indexOf('function syncStory(');
  const fn = src.slice(i, src.indexOf('\n}', i));
  assert.match(fn, /st\.at = STORY\[st\.ch\]\?\.id \?\? 'done'/);
});

test('세계수: 빈터가 완성되면 연출 뒤 syncStory("tree_habitat") 로 5장을 끝낸다', () => {
  const src = readFileSync(new URL('../js/spaces/world-tree.js', import.meta.url), 'utf8');
  assert.match(src, /setTimeout\(\(\) => syncStory\('tree_habitat'\), 2200\)/);
  assert.match(src, /import \{[^}]*\bsyncStory\b[^}]*\} from '\.\.\/game\.js'/);
});

test('프롤로그 세계수는 눈 가지 없이 예전 모습 그대로다', () => {
  const src = readFileSync(new URL('../js/spaces/prologue-set.js', import.meta.url), 'utf8');
  assert.match(src, /const LIMBS_OPENING = Object\.fromEntries\(Object\.entries\(LIMBS\)\.filter\(\(\[id\]\) => id !== 'snow'\)\)/);
  assert.match(src, /buildTreeArt\(THREE, \{[^}]*limbs: LIMBS_OPENING/);
  assert.match(src, /Object\.keys\(LIMBS_OPENING\)/);
  assert.doesNotMatch(src, /Object\.keys\(LIMBS\)/);
});
