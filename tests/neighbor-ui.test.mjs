import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI = readFileSync(new URL('../js/neighbors/ui.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('남이 지은 문자열(닉네임)이 innerHTML 로 들어가지 않는다', () => {
  assert.doesNotMatch(UI, /innerHTML/);
  assert.match(UI, /e\.textContent = text/);
});

test('모달 id 가 -modal 로 끝난다(anyModalOpen 이 잡아 뒤에서 게임이 멈춘다)', () => {
  assert.match(UI, /modal\('nb-pick-modal'\)/);
  assert.match(UI, /modal\('nb-visitors-modal'\)/);
});

test('구경 중엔 도구 바·퀘스트 패널·스토리 칩을 숨긴다', () => {
  assert.match(UI, /body\.neighbor-visit #hotbar, body\.neighbor-visit #quest-panel, body\.neighbor-visit #story-chip \{ display: none !important; \}/);
  assert.match(UI, /document\.body\.classList\.add\('neighbor-visit'\)/);
  assert.match(UI, /document\.body\.classList\.remove\('neighbor-visit'\)/);
});

test('검수된 문구를 글자 그대로 쓴다(스펙 §8)', () => {
  for (const s of ["'오늘의 이웃'", "'같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'", "'❤️ 다녀옴'",
    '`🏡 ${nickname} 의 마을`', "'🚪 내 마을로'", `'"와 줘서 고마워요! 어땠어요?"'`, `'"또 와 줘서 기뻐요!"'`,
    "'어제부터 지금까지'", "'고마워요 🌱'", "'아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요'", '`외 ${view.more}명`']) {
    assert.ok(UI.includes(s), `문구 없음: ${s}`);
  }
});

test('⚙️ 설정에 이웃 공개 토글 — 게스트는 숨김(처음엔 display:none)', () => {
  assert.match(HTML, /<button id="village-public-btn" style="display:none;"><span class="uico">🏡<\/span><span class="ulbl">이웃에게 내 마을 보여 주기<\/span><\/button>/);
  assert.match(HTML, /#village-public-btn\.off \{ opacity: \.5; \}/);
  assert.match(UI, /b\.style\.display = visible \? '' : 'none'/);
});

test('나가기 버튼은 상단 줄 안에 있다(하단 조이스틱 #joy-base 와 안 겹침)', () => {
  assert.doesNotMatch(UI, /#nb-exit \{[^}]*bottom:/);
  assert.match(UI, /top\.append\(exit, el\('div', 'nb-title'\)\)/);
  assert.ok(UI.includes("'🚪 내 마을로'"));
});

test('요청 중(busy)엔 배경 클릭으로 엽서 모달이 닫히지 않고, 긴 닉네임은 줄바꿈된다', () => {
  assert.match(UI, /!\(id === 'nb-pick-modal' && pickerBusy\)/);
  assert.match(UI, /overflow-wrap: anywhere/);
  assert.doesNotMatch(UI, /aria-label', id\)/);
});

test('구경 중엔 상단 좌·우 패널도 숨긴다(상단 줄과 겹침 방지)', () => {
  assert.match(UI, /body\.neighbor-visit #topleft, body\.neighbor-visit #topright \{ display: none !important; \}/);
});

test('💬 집주인 말풍선은 아래(조이스틱·액션 버튼 위) — 위쪽 28% 는 집주인·집을 가렸다', () => {
  assert.match(UI, /#nb-bubble \{[^}]*top: auto; bottom: calc\(222px \+ env\(safe-area-inset-bottom\)\);/);
  assert.doesNotMatch(UI, /#nb-bubble \{[^}]*top: 28%/);
  assert.match(UI, /#nb-bubble::after \{[^}]*bottom: auto; top: -8px;[^}]*border-top: 0; border-bottom: 8px solid #fff;/);
  // 375px 폰: 조이스틱 위 끝 90+120=210 · 액션 버튼 위 끝 96+88=184 → 222 는 둘 다 위
  const joy = HTML.match(/#joy-base \{[^}]*bottom: calc\((\d+)px[^}]*height: (\d+)px/);
  const act = HTML.match(/#action-btn \{[^}]*bottom: calc\((\d+)px[^}]*height: (\d+)px/);
  assert.ok(222 > +joy[1] + +joy[2] && 222 > +act[1] + +act[2]);
});
