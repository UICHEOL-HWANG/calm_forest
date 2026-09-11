import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 📜 퀘스트 수행 방법(QUEST_HOW) 은 퀘스트 유형(QUEST_TYPES) 과 짝이 맞아야 한다.
//   빠지면 `QUEST_HOW[q.type] || ''` 가 조용히 빈 문자열을 돌려주고 :empty 가 흔적 없이 감춰서
//   "어쩌라는 건지 모르겠다"(베타 피드백) 상태로 되돌아간다 — 실패가 눈에 안 보이는 함정이라 테스트로 잠근다.
//   game.js 는 브라우저 전역(THREE·document)에 의존해 import 할 수 없어 원문을 파싱한다.
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

function block(startRe, endMark) {
  const i = SRC.search(startRe);
  assert.ok(i >= 0, `${startRe} 를 js/game.js 에서 못 찾음 — 상수 이름이 바뀌었나?`);
  const j = SRC.indexOf(endMark, i);
  assert.ok(j > i, `${startRe} 의 끝(${endMark})을 못 찾음`);
  return SRC.slice(i, j);
}

const questTypes = [...block(/^const QUEST_TYPES = new Set\(\[/m, '\n]);').matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
const howKeys = [...block(/^const QUEST_HOW = \{/m, '\n};').matchAll(/^\s{2}([a-z_]+):/gm)].map(m => m[1]);

test('QUEST_TYPES 를 모두 파싱했다', () => {
  assert.ok(questTypes.length >= 15, `유형 ${questTypes.length}개만 파싱됨`);
  assert.ok(questTypes.includes('plant') && questTypes.includes('collect_wood'));
});

test('모든 퀘스트 유형에 수행 방법 안내가 있다', () => {
  const missing = questTypes.filter(t => !howKeys.includes(t));
  assert.deepEqual(missing, [], `QUEST_HOW 에 빠진 유형: ${missing.join(', ')}`);
});

test('쓰이지 않는 수행 방법 안내가 남아 있지 않다', () => {
  const dead = howKeys.filter(k => !questTypes.includes(k));
  assert.deepEqual(dead, [], `QUEST_TYPES 에 없는 죽은 키: ${dead.join(', ')}`);
});

test('수행 방법 안내는 "어디서" 를 말한다(이모지로 시작)', () => {
  const body = block(/^const QUEST_HOW = \{/m, '\n};');
  for (const k of howKeys) {
    const line = body.match(new RegExp(`^\\s{2}${k}:\\s*'([^']+)'`, 'm'));
    assert.ok(line, `${k} 문구를 못 읽음`);
    assert.ok(/^[^\x00-\x7F]/.test(line[1]), `${k}: 장소/도구 이모지로 시작해야 한다 — "${line[1]}"`);
  }
});
