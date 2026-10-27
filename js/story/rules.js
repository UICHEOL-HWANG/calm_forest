// 📖 메인 이야기 판정 — 순수 함수(상태 s = gameState 모양을 인자로 받는다). 장 표는 ./chapters.js
//   진행은 전부 기존 상태에서 파생한다(새 카운터는 의뢰 수 story.q 하나뿐).
const num = (v) => Number(v) || 0;
const count = (o) => Object.keys(o || {}).length;
const frac = (have, need) => `${Math.min(have, need)}/${need}`;
const trees = (s) => (s.orchard?.trees || []).length;
const branchHab = (s, id) => !!s?.tree?.branches?.[id]?.habitat;
const BRANCH_NAME = { water: '물의 가지', farm: '밭의 가지', kitchen: '부엌의 가지', forest: '숲의 가지', snow: '눈의 가지' };
const gated = (rule, ids) => ({ done: rule.done, progress: s => { const miss = ids.find(id => !branchHab(s, id)); return miss ? `🌳 ${BRANCH_NAME[miss]} 빈터 0/1` : rule.progress(s); } });

export const STORY_RULES = {
  home:      { done: s => num(s.houseStage) >= 3,                 progress: s => `공사 ${frac(num(s.houseStage), 3)}` },
  // 🌉 해금 켜짐(새 세이브)의 1장 — 집을 짓고, 무너진 다리를 고쳐 할아버지를 만난다(다리 수리는 집 완성이 먼저라 플래그 하나로 충분)
  homeBridge: { done: s => !!s.unlocks?.flags?.bridge,
               progress: s => `공사 ${frac(num(s.houseStage), 3)} · 다리 ${s.unlocks?.flags?.bridge ? 1 : 0}/1` },
  friends:   { done: s => num(s.story?.q) >= 3,                   progress: s => `의뢰 ${frac(num(s.story?.q), 3)}` },
  taste:     { done: s => num(s.kitchen?.cooked) >= 1 && num(s.cafe?.served) >= 1,
               progress: s => `요리 ${frac(num(s.kitchen?.cooked), 1)} · 서빙 ${frac(num(s.cafe?.served), 1)}` },
  secret:    { done: s => num(s.mist?.purifyTotal) >= 1,          progress: s => `정화 ${frac(num(s.mist?.purifyTotal), 1)}` },
  living:    { done: s => num(s.farm?.stage) >= 2 && trees(s) >= 1,
               progress: s => `밭 ${frac(num(s.farm?.stage), 2)} · 나무 ${frac(trees(s), 1)}` },
  memory:    { done: s => count(s.museum?.special) >= 1,          progress: s => `특별 진열 ${frac(count(s.museum?.special), 1)}` },
  stars:     { done: s => count(s.star?.cleared) >= 1,            progress: s => `별자리 ${frac(count(s.star?.cleared), 1)}` },
  neighbors: { done: s => num(s.neighbors?.visited) >= 1,         progress: s => `방문 ${frac(num(s.neighbors?.visited), 1)}` },   // 🏡 이웃 마을 첫 방문(js/spaces/neighbor.js exitNeighbor)
  branchWater: { done: s => branchHab(s, 'water'), progress: s => `💧 물의 가지 빈터 ${branchHab(s, 'water') ? 1 : 0}/1` },
  snowbranch: { done: s => branchHab(s, 'snow'), progress: s => `❄️ 눈의 가지 빈터 ${branchHab(s, 'snow') ? 1 : 0}/1` },
};
STORY_RULES.tasteGated = gated(STORY_RULES.taste, ['farm', 'kitchen']);
STORY_RULES.secretGated = gated(STORY_RULES.secret, ['farm', 'kitchen', 'forest']);
STORY_RULES.livingGated = gated(STORY_RULES.living, ['farm']);

export const STORY_V = 2;
const INSERTED_AT = 4;

export function migrateStory(story) {
  const from = num(story?.ch);
  if (num(story?.v) >= STORY_V) return { story: { ...story, v: STORY_V }, from, to: from };
  const to = from > INSERTED_AT ? from + 1 : from;
  return { story: { ...story, ch: to, v: STORY_V }, from, to };
}

/**
 * 🌉 1·2장을 「세계수를 지키는 법」 판으로 볼까 — 해금 켜짐 + 새 세이브(legacy 아님).
 *   chapters.js storyFor(이 값) 으로 장 표를 고른다. 꺼짐·옛 세이브(unlocks 없음 포함)는 false = 예전 이야기 그대로.
 */
export function storyReworld(s, unlocksOn) {
  return !!unlocksOn && !!s?.unlocks && !s.unlocks.legacy;
}

export const isSoon = (story, i) => !!story[i]?.soon;

export function chapterDone(story, i, s) {
  const c = story[i];
  if (!c || c.soon) return false;
  return !!STORY_RULES[c.rule || c.id]?.done(s);
}

export function chapterProgress(story, i, s) {
  const c = story[i];
  return c ? (STORY_RULES[c.rule || c.id]?.progress(s) || '') : '';
}

/** 지금 장(s.story.ch)부터 연속으로 조건이 찬 장 인덱스 — syncStory 가 차례로 완료 처리한다. */
export function pendingChapters(story, s) {
  const out = [];
  for (let i = num(s.story?.ch); i < story.length && chapterDone(story, i, s); i++) out.push(i);
  return out;
}

/** index.html(스토리 칩·모달)이 렌더할 뷰. 지금 장이 soon 이면 allDone — 할 수 없는 목표를 칩에 띄우지 않는다. */
export function buildStoryView(story, s) {
  const ch = num(s.story?.ch);
  return {
    ch,
    allDone: ch >= story.length || isSoon(story, ch),
    chapters: story.map((c, i) => ({
      n: i + 1, ico: c.ico, title: c.title, goal: c.goal,
      line: i < ch ? c.done : c.start,
      state: i < ch ? 'done' : c.soon ? 'soon' : i === ch ? 'now' : 'lock',
      progress: i === ch && !c.soon ? chapterProgress(story, i, s) : null,
    })),
  };
}

/** [GA4] 장 시작(started[id] = 시각)부터 지금까지 시간 — 0.1시간 단위. 옛 세이브의 1·없음·시계 역행은 null(파라미터 생략). */
export function hoursSince(startedAt, now) {
  const t = Number(startedAt);
  if (!Number.isFinite(t) || t < 1e12 || now < t) return null;
  return Math.round((now - t) / 360000) / 10;
}
