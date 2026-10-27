import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY, STORY_REWORLD, storyFor } from '../js/story/chapters.js';
import { STORY_RULES, chapterDone, chapterProgress, pendingChapters, isSoon, buildStoryView, storyReworld } from '../js/story/rules.js';

const base = (o = {}) => ({
  houseStage: 0, story: { ch: 0, q: 0, started: {} }, kitchen: { cooked: 0 }, cafe: { served: 0 },
  mist: { purifyTotal: 0 }, farm: { stage: 1 }, orchard: { trees: [] }, museum: { special: {} },
  star: { cleared: {} }, ...o,
});
const ch4Done = (o = {}) => base({ houseStage: 3, story: { ch: 4, q: 3, started: {} }, kitchen: { cooked: 1 },
  cafe: { served: 1 }, mist: { purifyTotal: 1 }, ...o });

test('STORY: 9장, id 고유, 순서, 잠긴 장 없음', () => {
  assert.deepEqual(STORY.map(c => c.id), ['home', 'friends', 'taste', 'secret', 'snowbranch', 'living', 'memory', 'stars', 'neighbors']);
  assert.ok(STORY.every(c => !c.soon));
  assert.deepEqual(STORY.slice(4).map(c => c.reward.coins), [90, 100, 120, 120, 150]);
  for (const c of STORY) assert.ok(STORY_RULES[c.id], `규칙 없음: ${c.id}`);
  assert.equal(STORY[8].done, '이웃 마을에 다녀왔어요. 숲은 생각보다 넓어요.');
  assert.doesNotMatch(readFileSync(new URL('../js/story/chapters.js', import.meta.url), 'utf8'), /문구 검수 대기/);
});

test('기존 1~4장 판정·진행 문구는 그대로', () => {
  assert.equal(chapterDone(STORY, 0, base({ houseStage: 3 })), true);
  assert.equal(chapterProgress(STORY, 0, base({ houseStage: 5 })), '공사 3/3');
  assert.equal(chapterProgress(STORY, 1, base({ story: { ch: 1, q: 2 } })), '의뢰 2/3');
  assert.equal(chapterProgress(STORY, 2, base({ kitchen: { cooked: 2 } })), '요리 1/1 · 서빙 0/1');
  assert.equal(chapterProgress(STORY, 3, base()), '정화 0/1');
});

const snow = { tree: { branches: { snow: { habitat: true } } } };

test('6장 living: 밭 2단계 AND 나무 1그루', () => {
  const tree = [{ x: 0, z: 0 }];
  assert.equal(chapterDone(STORY, 5, ch4Done({ farm: { stage: 2 } })), false);
  assert.equal(chapterDone(STORY, 5, ch4Done({ orchard: { trees: tree } })), false);
  assert.equal(chapterDone(STORY, 5, ch4Done({ farm: { stage: 2 }, orchard: { trees: tree } })), true);
  assert.equal(chapterProgress(STORY, 5, ch4Done({ farm: { stage: 3 } })), '밭 2/2 · 나무 0/1');
});

test('7장 memory · 8장 stars: 1개 이상', () => {
  assert.equal(chapterDone(STORY, 6, ch4Done()), false);
  assert.equal(chapterDone(STORY, 6, ch4Done({ museum: { special: { rain_fish: { id: 'carp', at: 1 } } } })), true);
  assert.equal(chapterProgress(STORY, 6, ch4Done()), '특별 진열 0/1');
  assert.equal(chapterDone(STORY, 7, ch4Done({ star: { cleared: { big_dipper: '2026-10-07' } } })), true);
  assert.equal(chapterProgress(STORY, 7, ch4Done()), '별자리 0/1');
});

test('9장 neighbors: 이웃 마을 방문 1회 · 범위 밖은 false', () => {
  assert.equal(isSoon(STORY, 8), false);
  assert.equal(chapterDone(STORY, 8, ch4Done()), false);
  assert.equal(chapterDone(STORY, 8, ch4Done({ neighbors: { visited: 1, seenAt: 0 } })), true);
  assert.equal(chapterProgress(STORY, 8, ch4Done()), '방문 0/1');
  assert.equal(chapterProgress(STORY, 8, ch4Done({ neighbors: { visited: 3 } })), '방문 1/1');
  assert.equal(chapterDone(STORY, 99, ch4Done()), false);
});

test('pendingChapters: 4장 완료자는 눈의 가지에서 멈추고, 다 충족이면 [4..8](보상 합 580)', () => {
  const s = ch4Done({ farm: { stage: 2 }, orchard: { trees: [{}] }, museum: { special: { a: {} } }, star: { cleared: { b: 1 } } });
  assert.deepEqual(pendingChapters(STORY, s), []);
  assert.deepEqual(pendingChapters(STORY, { ...s, ...snow }), [4, 5, 6, 7]);
  const all = pendingChapters(STORY, { ...s, ...snow, neighbors: { visited: 1 } });
  assert.deepEqual(all, [4, 5, 6, 7, 8]);
  assert.equal(all.reduce((n, i) => n + STORY[i].reward.coins, 0), 580);
});

test('buildStoryView: 9장이 현재면 칩이 보이고 진행은 방문 n/1', () => {
  const v = buildStoryView(STORY, ch4Done({ story: { ch: 8, q: 3, started: {} } }));
  assert.equal(v.allDone, false);
  assert.equal(v.chapters[8].state, 'now');
  assert.equal(v.chapters[8].progress, '방문 0/1');
  assert.equal(v.chapters[7].state, 'done');
  const v5 = buildStoryView(STORY, ch4Done());
  assert.equal(v5.chapters[4].state, 'now');
  assert.equal(v5.chapters[4].progress, '❄️ 눈의 가지 빈터 0/1');
  assert.equal(v5.chapters[5].state, 'lock');
  assert.equal(buildStoryView(STORY, base({ story: { ch: 9, q: 3 } })).allDone, true);
});

// ── 🌉 1·2장 「세계수를 지키는 법」 — 해금 켜짐 + 새 세이브만 ──
const fresh = (o = {}) => base({ unlocks: { v: 1, legacy: false, flags: {} }, ...o });

test('storyReworld: 해금 켜짐 + 새 세이브만 true — 꺼짐·legacy·필드 없음은 예전 이야기', () => {
  assert.equal(storyReworld(fresh(), true), true);
  assert.equal(storyReworld(fresh(), false), false);
  assert.equal(storyReworld(base({ unlocks: { v: 1, legacy: true, flags: {} } }), true), false);
  assert.equal(storyReworld(base(), true), false);
  assert.equal(storyFor(false), STORY);   // 꺼짐이면 같은 표(객체 그대로) — 기존 유저 이야기 불변
});

test('storyFor(true): id·순서·보상은 같고 1·2장 문구만 바뀐다', () => {
  const R = storyFor(true);
  assert.deepEqual(R.map(c => c.id), STORY.map(c => c.id));
  assert.deepEqual(R.map(c => c.reward), STORY.map(c => c.reward));
  assert.equal(R[0].title, '세계수를 지키는 법');
  assert.equal(R[0].goal, '할아버지 만나기');   // 폰 HUD 칩에서 두 줄로 꺾이지 않게 짧게(2026-10-17)
  assert.equal(R[1].goal, '물의 가지 빈터 꾸미기');
  assert.equal(R[1].rule, 'branchWater');
  assert.notEqual(R[1].start, STORY[1].start);
  assert.deepEqual(R.slice(2).map(c => [c.id, c.title, c.goal, c.done]), STORY.slice(2).map(c => [c.id, c.title, c.goal, c.done]));
  assert.deepEqual(R.slice(2, 4).map(c => c.rule), ['tasteGated', 'secretGated']);
  assert.equal(R[5].rule, 'livingGated');
  assert.deepEqual(R[4], STORY[4]);
  assert.deepEqual(R.slice(6), STORY.slice(6));
  assert.equal(STORY[0].title, '나의 첫 집');   // 원본 표는 안 건드린다
  for (const k of Object.keys(STORY_REWORLD)) assert.ok(STORY.some(c => c.id === k));
});

test('1장(reworld): 집만 지어선 안 끝나고, 다리를 고치면 끝난다', () => {
  const R = storyFor(true);
  assert.equal(chapterDone(R, 0, fresh({ houseStage: 3 })), false);
  assert.equal(chapterProgress(R, 0, fresh({ houseStage: 1 })), '공사 1/3 · 다리 0/1');
  const fixed = fresh({ houseStage: 3, unlocks: { v: 1, legacy: false, flags: { bridge: true } } });
  assert.equal(chapterDone(R, 0, fixed), true);
  assert.equal(chapterProgress(R, 0, fixed), '공사 3/3 · 다리 1/1');
  assert.deepEqual(pendingChapters(R, fresh({ houseStage: 5 })), []);
  assert.deepEqual(pendingChapters(R, { ...fixed, story: { ch: 0, q: 3 } }), [0]);   // 2장은 의뢰 수가 아니라 물의 가지 — 1장과 같이 끝나지 않는다
  const water = { ...fixed, tree: { branches: { water: { habitat: true } } }, story: { ch: 1, q: 0 } };
  assert.deepEqual(pendingChapters(R, water), [1]);
  assert.equal(chapterProgress(R, 1, fixed), '💧 물의 가지 빈터 0/1');
  assert.equal(chapterProgress(R, 2, water), '🌳 밭의 가지 빈터 0/1');
  assert.equal(chapterProgress(R, 3, { ...water, tree: { branches: { water: { habitat: true }, farm: { habitat: true }, kitchen: { habitat: true } } } }), '🌳 숲의 가지 빈터 0/1');
  // 꺼짐(예전 표)에선 같은 상태가 집만으로 끝난다
  assert.equal(chapterDone(STORY, 0, fresh({ houseStage: 3 })), true);
  const v = buildStoryView(R, fresh({ houseStage: 3 }));
  assert.equal(v.chapters[0].title, '세계수를 지키는 법');
  assert.equal(v.chapters[0].progress, '공사 3/3 · 다리 0/1');
  assert.equal(v.chapters[1].title, '첫 번째 가지');
});

test('8·9장: 주인공은 씨앗이 아니다 — "너 혼자가 아니란다"', () => {
  assert.doesNotMatch(STORY[7].done + STORY[8].start, /씨앗/);
  assert.match(STORY[7].done, /너 혼자가 아니란다/);
  assert.match(STORY[8].start, /다른 숲에도 세계수를 지키는 이웃이 있대요/);
});
