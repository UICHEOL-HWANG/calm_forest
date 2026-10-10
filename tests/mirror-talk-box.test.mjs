import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clueText, clueLine, thanksText, thanksLine, npcName } from '../js/mirror/clues.js';
import { EVENTS, T, bindTracker } from '../js/mirror/track.js';
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// 🪞 B안(2026-10-10 사용자 선택): 말 걸기·돌려주기가 토스트 5초로 사라져 "대화가 안 열린다"로 읽혔다 → 아래 대화 박스
const Q = { n: 1, npc: 'angler', item: 'carrot', spot: 'lamp-l', flipped: false };

test('대사만(clueLine·thanksLine) — 이름 붙은 옛 문장은 이걸 조합한다(문구가 갈라지지 않게)', () => {
  for (const lang of ['ko', 'en']) {
    assert.equal(clueText(Q, lang), `${npcName('angler', lang)}: ${clueLine(Q, lang)}`);
    assert.equal(thanksText(Q, lang), `${npcName('angler', lang)}: ${thanksLine(Q, lang)}`);
    assert.match(clueLine(Q, lang), /^".+"$/);
    assert.match(thanksLine(Q, lang), /^".+"$/);
  }
});

test('트래킹 — mirror_talk_close 는 기존 키만(quest_n·kind·via·elapsed_s)', () => {
  assert.deepEqual(EVENTS.mirror_talk_close, ['quest_n', 'kind', 'via', 'elapsed_s']);
  const got = []; bindTracker((n, p) => got.push([n, p]), { strict: true });
  T.talkClose({ quest_n: 1, kind: 'clue', via: 'action', elapsed_s: 3 });
  assert.deepEqual(got, [['mirror_talk_close', { quest_n: 1, kind: 'clue', via: 'action', elapsed_s: 3 }]]);
  assert.throws(() => T.talkClose({ quest_n: 1, kind: 'bye', via: 'action', elapsed_s: 3 }));
  assert.throws(() => T.talkClose({ quest_n: 1, kind: 'clue', via: 'esc', elapsed_s: 3 }));
  bindTracker(null);
});

test('연결 — 말 걸기·돌려주기는 대화 박스로, 박스가 떠 있으면 액션은 닫기부터', () => {
  const m = src('js/spaces/mirror.js');
  assert.doesNotMatch(m, /ui\.toast\?\.\(clueText\(/, '단서 토스트는 박스로 바뀌었다');
  assert.doesNotMatch(m, /ui\.toast\?\.\(thanksText\(/, '고마워요 토스트도');
  assert.match(m, /openTalk\(q, 'clue'\)/);
  assert.match(m, /openTalk\(a\.q, 'thanks'\)/);
  assert.match(m, /if \(talkOpen\(\)\) return closeTalk\('action'\)/);
  assert.match(m, /closeTalk\('walk'\)/, '멀어지면 닫힌다');
});

test('화면 — 박스 마크업과, 떠 있는 동안 아래 안내 줄을 숨기는 규칙', () => {
  const h = src('index.html');
  assert.match(h, /<div id="mirror-talk"/);
  assert.match(h, /body:has\(#mirror-talk\.show\) #door-prompt, body:has\(#mirror-talk\.show\) #hint, body:has\(#mirror-talk\.show\) #zone-prompt \{ opacity: 0 !important; \}/);
});
