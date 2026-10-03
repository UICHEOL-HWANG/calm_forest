import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🌳 정화 실패 후 [다시 도전] — 수호목 앞까지 걸어가야만 재시작이 보여서
//    페르소나 p12 3명 중 2명이 "재시작 버튼이 안 뜬다"며 이탈했다(2026-10-03).
const src = readFileSync(new URL('../js/spaces/mist.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
const fn = (name) => { const i = src.indexOf(`export function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };
const faded = () => { const b = fn('mistEnd'); const i = b.indexOf("result === 'faded'"); return b.slice(i, b.indexOf('clearMistSpirits()', i)); };

test('실패하면 모달의 주 버튼이 🌳 다시 도전 → startPurify', () => {
  assert.match(faded(), /ok: \{ label: '🌳 다시 도전', onClick: retryPurify \}/);
  assert.match(fn('retryPurify'), /startPurify\(\)/);
});

test('다시 도전은 숲을 떠났거나 이미 시작했으면 아무것도 안 한다', () => {
  assert.match(fn('retryPurify'), /if \(!atMist \|\| mist\.active\) return/);
});

test('연습을 안 해봤으면 보조 버튼이 🎓 연습해 보기, 해봤으면 다음에요', () => {
  assert.match(faded(), /st\.practiced \? \{ label: '다음에요' \} : \{ label: '🎓 연습해 보기', onClick: startPractice \}/);
});

test('다시 도전 클릭은 GA4 에 남긴다(재도전 퍼널)', () => {
  assert.match(fn('retryPurify'), /trackEvent\('mist_retry'/);
});

test('새 문구는 영어 사전에 있다', () => {
  for (const k of ['🌳 다시 도전', '수호목이 지쳤어요',
                   '켜둔 등불은 그대로 남아요. 바로 다시 도전해 볼까요?',
                   '켜둔 등불은 그대로 남아요. 바로 다시 도전하거나, 정령 1마리로 연습해 볼 수도 있어요.']) {
    assert.ok(en.includes(`'${k}':`), k);
  }
});
