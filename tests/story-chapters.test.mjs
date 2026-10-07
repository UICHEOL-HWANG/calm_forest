import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY } from '../js/story/chapters.js';
import { STORY_RULES, chapterDone, chapterProgress, pendingChapters, isSoon, buildStoryView } from '../js/story/rules.js';

const base = (o = {}) => ({
  houseStage: 0, story: { ch: 0, q: 0, started: {} }, kitchen: { cooked: 0 }, cafe: { served: 0 },
  mist: { purifyTotal: 0 }, farm: { stage: 1 }, orchard: { trees: [] }, museum: { special: {} },
  star: { cleared: {} }, ...o,
});
const ch4Done = (o = {}) => base({ houseStage: 3, story: { ch: 4, q: 3, started: {} }, kitchen: { cooked: 1 },
  cafe: { served: 1 }, mist: { purifyTotal: 1 }, ...o });

test('STORY: 8장, id 고유, 순서, 잠긴 장 없음(🏡 이웃 마을 출시)', () => {
  assert.deepEqual(STORY.map(c => c.id), ['home', 'friends', 'taste', 'secret', 'living', 'memory', 'stars', 'neighbors']);
  assert.deepEqual(STORY.map(c => !!c.soon), [false, false, false, false, false, false, false, false]);
  assert.deepEqual(STORY.slice(4).map(c => c.reward.coins), [100, 120, 120, 150]);
  for (const c of STORY) assert.ok(STORY_RULES[c.id], `규칙 없음: ${c.id}`);
  assert.equal(STORY[7].done, '이웃의 마을에 다녀왔어요. 숲은 생각보다 넓고, 생각보다 따뜻해요.');
  assert.doesNotMatch(readFileSync(new URL('../js/story/chapters.js', import.meta.url), 'utf8'), /문구 검수 대기/);   // 8장 문구 승인됨(2026-10-07)
});

test('기존 1~4장 판정·진행 문구는 그대로', () => {
  assert.equal(chapterDone(STORY, 0, base({ houseStage: 3 })), true);
  assert.equal(chapterProgress(STORY, 0, base({ houseStage: 5 })), '공사 3/3');
  assert.equal(chapterProgress(STORY, 1, base({ story: { ch: 1, q: 2 } })), '의뢰 2/3');
  assert.equal(chapterProgress(STORY, 2, base({ kitchen: { cooked: 2 } })), '요리 1/1 · 서빙 0/1');
  assert.equal(chapterProgress(STORY, 3, base()), '정화 0/1');
});

test('5장 living: 밭 2단계 AND 나무 1그루', () => {
  const tree = [{ x: 0, z: 0 }];
  assert.equal(chapterDone(STORY, 4, ch4Done({ farm: { stage: 2 } })), false);
  assert.equal(chapterDone(STORY, 4, ch4Done({ orchard: { trees: tree } })), false);
  assert.equal(chapterDone(STORY, 4, ch4Done({ farm: { stage: 2 }, orchard: { trees: tree } })), true);
  assert.equal(chapterProgress(STORY, 4, ch4Done({ farm: { stage: 3 } })), '밭 2/2 · 나무 0/1');
});

test('6장 memory · 7장 stars: 1개 이상', () => {
  assert.equal(chapterDone(STORY, 5, ch4Done()), false);
  assert.equal(chapterDone(STORY, 5, ch4Done({ museum: { special: { rain_fish: { id: 'carp', at: 1 } } } })), true);
  assert.equal(chapterProgress(STORY, 5, ch4Done()), '특별 진열 0/1');
  assert.equal(chapterDone(STORY, 6, ch4Done({ star: { cleared: { big_dipper: '2026-10-07' } } })), true);
  assert.equal(chapterProgress(STORY, 6, ch4Done()), '별자리 0/1');
});

test('8장 neighbors: 이웃 마을 방문 1회 · 범위 밖은 false', () => {
  assert.equal(isSoon(STORY, 7), false);
  assert.equal(chapterDone(STORY, 7, ch4Done()), false);
  assert.equal(chapterDone(STORY, 7, ch4Done({ neighbors: { visited: 1, seenAt: 0 } })), true);
  assert.equal(chapterProgress(STORY, 7, ch4Done()), '방문 0/1');
  assert.equal(chapterProgress(STORY, 7, ch4Done({ neighbors: { visited: 3 } })), '방문 1/1');
  assert.equal(chapterDone(STORY, 99, ch4Done()), false);
});

test('pendingChapters: 4장 완료자 소급 — 5~8장 다 충족이면 [4,5,6,7](보상 합 490), 방문 전이면 7장에서 멈춘다', () => {
  const s = ch4Done({ farm: { stage: 2 }, orchard: { trees: [{}] }, museum: { special: { a: {} } }, star: { cleared: { b: 1 } } });
  assert.deepEqual(pendingChapters(STORY, s), [4, 5, 6]);
  const all = pendingChapters(STORY, { ...s, neighbors: { visited: 1 } });
  assert.deepEqual(all, [4, 5, 6, 7]);
  assert.equal(all.reduce((n, i) => n + STORY[i].reward.coins, 0), 490);
  assert.deepEqual(pendingChapters(STORY, ch4Done({ museum: { special: { a: {} } } })), []);   // 5장이 막히면 6장도 안 넘어간다
});

test('buildStoryView: 8장이 현재면 칩이 보이고(allDone false) 진행은 방문 n/1', () => {
  const v = buildStoryView(STORY, ch4Done({ story: { ch: 7, q: 3, started: {} } }));
  assert.equal(v.allDone, false);
  assert.equal(v.chapters[7].state, 'now');
  assert.equal(v.chapters[7].progress, '방문 0/1');
  assert.equal(v.chapters[6].state, 'done');
  const v5 = buildStoryView(STORY, ch4Done());
  assert.equal(v5.allDone, false);
  assert.equal(v5.chapters[4].state, 'now');
  assert.equal(v5.chapters[4].progress, '밭 1/2 · 나무 0/1');
  assert.equal(v5.chapters[5].state, 'lock');
  assert.equal(v5.chapters[7].state, 'lock');
  assert.equal(buildStoryView(STORY, base({ story: { ch: 8, q: 3 } })).allDone, true);
});
