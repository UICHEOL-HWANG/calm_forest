import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkNickname, nicknameChecks, NICK_MIN, NICK_MAX } from '../js/nickname-filter.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('한글·영문·숫자로 된 2~10자 이름은 통과', () => {
  for (const ok of ['솔방울', 'Mint', '여우123', 'ab', '가나다라마바사아자차']) {
    assert.deepEqual(checkNickname(ok), { ok: true, nick: ok, fail: null }, ok);
  }
  assert.equal(NICK_MIN, 2);
  assert.equal(NICK_MAX, 10);
});

test('앞뒤 공백은 잘라서 판단한다', () => {
  assert.equal(checkNickname('  솔방울  ').nick, '솔방울');
});

test('너무 짧거나 길면 len', () => {
  assert.equal(checkNickname('').fail, 'len');
  assert.equal(checkNickname('가').fail, 'len');
  assert.equal(checkNickname('가나다라마바사아자차카').fail, 'len');
});

test('띄어쓰기·기호·이모지는 chars', () => {
  for (const bad of ['솔 방울', '여우#1', '🦊여우', 'a_b', '솔방울!']) assert.equal(checkNickname(bad).fail, 'chars', bad);
});

test('자음·모음이 섞이면 jamo, 숫자로만이면 digits', () => {
  assert.equal(checkNickname('ㅋㅋㅋ').fail, 'jamo');
  assert.equal(checkNickname('여우ㅋ').fail, 'jamo');
  assert.equal(checkNickname('12345').fail, 'digits');
});

test('체크리스트용 조건별 결과 — 빈칸은 전부 미충족', () => {
  assert.deepEqual(nicknameChecks(''), { len: false, chars: false, digits: false, clean: false });
  assert.deepEqual(nicknameChecks('솔방울'), { len: true, chars: true, digits: true, clean: true });
  assert.deepEqual(nicknameChecks('ㅋㅋ'), { len: true, chars: false, digits: true, clean: true });
  assert.equal(nicknameChecks('123').digits, false);
});

test('금칙어는 blocked', () => {
  assert.equal(checkNickname('시발').fail, 'blocked');
});

test('setNickname 은 직접 지은 이름에 같은 규칙을 건다(자동 소급·기존 이름 유지는 예외)', () => {
  const src = read('js/game.js');
  const fn = src.slice(src.indexOf('function setNickname('), src.indexOf('function setNickname(') + 1400);
  assert.match(fn, /if \(source !== 'auto' && source !== 'keep'\) \{\s*const r = checkNickname\(nick\);/);
});

test('캐릭터 선택 창 — 주사위가 없고, 빈칸에서 시작해 조건을 다 맞춰야 시작 버튼이 켜진다', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /id="nick-roll"/);
  assert.match(html, /id="nick-rules"/);
  assert.match(html, /\$\('char-confirm'\)\.disabled = !ready;/);
  assert.doesNotMatch(html, /nick\.value = nickDirty \? Input\.getNickname\(\) : Input\.genNickname\(selected\);/);
});
