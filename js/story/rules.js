// 📖 메인 이야기 판정 — 순수 함수(상태 s = gameState 모양을 인자로 받는다). 장 표는 ./chapters.js
//   진행은 전부 기존 상태에서 파생한다(새 카운터는 의뢰 수 story.q 하나뿐).
const num = (v) => Number(v) || 0;
const count = (o) => Object.keys(o || {}).length;
const frac = (have, need) => `${Math.min(have, need)}/${need}`;
const trees = (s) => (s.orchard?.trees || []).length;

export const STORY_RULES = {
  home:      { done: s => num(s.houseStage) >= 3,                 progress: s => `공사 ${frac(num(s.houseStage), 3)}` },
  friends:   { done: s => num(s.story?.q) >= 3,                   progress: s => `의뢰 ${frac(num(s.story?.q), 3)}` },
  taste:     { done: s => num(s.kitchen?.cooked) >= 1 && num(s.cafe?.served) >= 1,
               progress: s => `요리 ${frac(num(s.kitchen?.cooked), 1)} · 서빙 ${frac(num(s.cafe?.served), 1)}` },
  secret:    { done: s => num(s.mist?.purifyTotal) >= 1,          progress: s => `정화 ${frac(num(s.mist?.purifyTotal), 1)}` },
  living:    { done: s => num(s.farm?.stage) >= 2 && trees(s) >= 1,
               progress: s => `밭 ${frac(num(s.farm?.stage), 2)} · 나무 ${frac(trees(s), 1)}` },
  memory:    { done: s => count(s.museum?.special) >= 1,          progress: s => `특별 진열 ${frac(count(s.museum?.special), 1)}` },
  stars:     { done: s => count(s.star?.cleared) >= 1,            progress: s => `별자리 ${frac(count(s.star?.cleared), 1)}` },
  neighbors: { done: s => num(s.neighbors?.visited) >= 1,         progress: s => `방문 ${frac(num(s.neighbors?.visited), 1)}` },   // 🏡 이웃 마을 첫 방문(js/spaces/neighbor.js exitNeighbor)
};

export const isSoon = (story, i) => !!story[i]?.soon;

export function chapterDone(story, i, s) {
  const c = story[i];
  if (!c || c.soon) return false;
  return !!STORY_RULES[c.id]?.done(s);
}

export function chapterProgress(story, i, s) {
  const c = story[i];
  return c ? (STORY_RULES[c.id]?.progress(s) || '') : '';
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
