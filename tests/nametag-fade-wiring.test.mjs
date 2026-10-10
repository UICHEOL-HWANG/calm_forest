import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// 2026-10-10 재현: makeNameTag 는 이름표를 꺼진 채(visible=false·opacity 0) 돌려주고, 켜는 건 updateNPC 의 거리 페이드뿐이다.
//   거울 마을 주민 3명·🏮 반디 요정은 이 루프 밖이라 이름표가 한 번도 보인 적이 없었다 →
//   페르소나 p32/p32b 가 낚시꾼을 농부로, 색이 뒤집힌 판다를 "없다"고 착각(대화가 안 열린다 3판).
test('이름표 페이드는 한 곳(fadeNameTag) — 마을 주민·거울 주민·반디 요정이 같이 쓴다', () => {
  const npc = src('js/spaces/npc.js');
  assert.match(npc, /export function fadeNameTag\(tag, d\)/);
  assert.match(npc, /fadeNameTag\(o\.tag, dist2D\(o\.group\.position, player\.position\)\)/);
});

test('거울 주민 — 이름표를 들고 있다가 매 프레임 거리로 켠다', () => {
  const m = src('js/spaces/mirror.js');
  assert.match(m, /return \{ id, group, spot: s, bubble, tag \}/);
  assert.match(m, /for \(const tw of twins\) fadeNameTag\(tw\.tag, dist2D\(twinWorld\(tw\), player\.position\)\)/);
});

test('반디 요정 — 이름표를 켜는 갱신이 게임 루프에 연결돼 있다', () => {
  const lw = src('js/spaces/light-workshop.js');
  assert.match(lw, /export function updateLightWorkshop\(\)/);
  assert.match(lw, /fadeNameTag\(keeperTag, /);
  assert.match(src('js/game.js'), /updateLightWorkshop\(\);/);
});
