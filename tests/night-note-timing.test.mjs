import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const src = read('../js/spaces/night-visit.js');
const duel = read('../js/duel/index.js');
const html = read('../index.html');
const en = read('../js/i18n-en.js');
const api = read('../functions/api/night-note.js');
const client = read('../js/night-visit.js');

test('접속할 때 쪽지 카드를 띄우지 않는다', () => {
  assert.doesNotMatch(src, /noteCardOpen/);
  assert.doesNotMatch(src, /삼촌이 쪽지를 쓰고 있어요/);
});

test('쪽지는 대결 결과가 나온 뒤 afterDuel 로만 띄운다', () => {
  assert.doesNotMatch(src, /beforeDuel/);
  assert.match(src, /afterDuel\(noteQ, \{ result,/);
});

test('대결 흐름은 win·lose·quit 을 돌려준다', () => {
  assert.match(duel, /return won \? 'win' : 'lose';/);
  assert.match(duel, /return 'quit';/);
});

test('대결에서 이기면 밀착 연출 + 되찾은 작물을 머리 위로', () => {
  assert.match(src, /function winCeremony\(/);
  assert.match(src, /triggerMoment\(true\)/);
  assert.match(src, /showCatchItem\(cropMini\(/);
  assert.match(src, /if \(result === 'win'\) setTimeout\(\(\) => winCeremony\(crops\), \d+\)/);
});

test('쪽지는 아래 대화 시트(C안)로 띄운다', () => {
  assert.match(html, /id="note-sheet"/);
  assert.match(html, /showNoteSheet\(/);
  assert.match(src, /ui\.showNoteSheet\?\.\(/);
});

test('쪽지를 띄우면 GA4 에 남긴다', () => {
  assert.match(src, /trackEvent\('night_note_show', \{ animal, src:/);
});

test('쪽지 API 는 패배 쪽지를 따로 만들고 캐시 키도 나눈다', () => {
  assert.match(api, /kind === 'lose'/);
  assert.match(api, /&kind=\$\{kind\}/);
  assert.match(api, /맞춤법/);
  assert.match(client, /&kind=lose/);
});

test('새 문구는 영어 사전에 있다', () => {
  for (const k of ['눌러서 닫기', '밤손님과 대결!', '이기면 가져간 작물을 되찾아요', '🐾 흔적 살펴보기',
                   '🎃 밭 가까이 허수아비를 세워 봐요', '🪵 밭 둘레에 울타리를 4개 이상 둘러 봐요', '🤝 다음에 이기면 당분간 안 와요']) {
    assert.ok(en.includes(`'${k}':`), k);
  }
});
