// 🛡️ 닉네임 금칙어 — 이웃 마을이 닉네임을 남에게 보여 주므로(앱인토스 UGC 자율 관리) 저장 전에 거른다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isNicknameBlocked, normalizeNickname, NICK_BLOCK_PATTERNS } from '../js/nickname-filter.js';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = gameSource();
// js/data/dex.js 는 three 를 import 해서 Node 에서 못 읽는다 → 원문에서 꺼낸다
const NICK_ADJS = JSON.parse(read('js/data/dex.js').match(/export const NICK_ADJS = (\[[^\]]+\]);/)[1].replace(/'/g, '"'));
const ANIMALS_SRC = SRC.slice(SRC.indexOf('const ANIMALS = ['), SRC.indexOf('\n];', SRC.indexOf('const ANIMALS = [')));
const ANIMAL_NAMES = [...ANIMALS_SRC.matchAll(/\{ id: '[a-z]+', name: '([^']+)'/g)].map(m => m[1]);
const EN = Object.fromEntries([...read('js/i18n-en.js').matchAll(/^\s*'([^']+)': '([^']+)',/gm)].map(m => [m[1], m[2]]));

test('정규화: 소문자·공백/문장부호/제로폭 제거·단어 속 숫자 leet·나머지 숫자 제거·반복 접기', () => {
  assert.equal(normalizeNickname('  F.u.C k  '), 'fuck');
  assert.equal(normalizeNickname('시​발'), '시발');
  assert.equal(normalizeNickname('시1발'), '시발');
  assert.equal(normalizeNickname('sh1t'), 'shit');
  assert.equal(normalizeNickname('fuuuuck'), 'fuck');
  assert.equal(normalizeNickname('ｆｕｃｋ'), 'fuck');
  assert.equal(normalizeNickname('Sparkly Bear #4821'), 'sparklybear');   // 태그 숫자는 leet 로 안 바뀐다(글자 사이가 아님)
  assert.equal(normalizeNickname(null), '');
  assert.equal(normalizeNickname('ㅅㅂ'), 'ㅅㅂ');                       // NFKC 가 자모를 조합용으로 바꿔도 호환 자모로 되돌린다
  assert.equal(normalizeNickname('\uFFB5\uFFB2'), 'ㅅㅂ');               // 반각 한글 자모
  assert.equal(normalizeNickname('a'.repeat(100) + 'fuck'), 'a');         // 앞 64자만 본다(정규식 비용 상한 — 서버와 같다)
});

test('막는다 — 한국어 욕설·비하·성적 표현', () => {
  for (const s of ['시발', '씨발', '씨바', '시팔', '씨팔', '쓰발', '병신', '븅신', '개새끼', '개색기', '좆', '존나', '지랄',
    '미친놈', '미친년', '썅년', '느금마', '니애미', '섹스', '보지', '자지', '강간', '창녀', '한남충', '김치녀', '맘충', '틀딱',
    '짱깨', '쪽바리', '깜둥이', '일베', '메갈', '히틀러', '시발점']) {
    assert.equal(isNicknameBlocked(s), true, s);
    assert.equal(isNicknameBlocked(`다정한 ${s} #1234`), true, `문장 속 ${s}`);
  }
});

test('막는다 — 영어 욕설·비하·성적 표현', () => {
  for (const s of ['fuck', 'FuckYou', 'motherfucker', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'nigga', 'faggot',
    'slut', 'whore', 'dick', 'pussy', 'penis', 'porn', 'sexy', 'rape', 'nazi', 'hitler', 'retard', 'bastard']) {
    assert.equal(isNicknameBlocked(s), true, s);
  }
});

test('우회 표기도 막는다 — 띄어쓰기·점·숫자·초성·반복·전각·제로폭', () => {
  for (const s of ['시 발', '시.발', '시1발', '씨~~발', '시이발', 'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅅ ㅂ', 'ㅈㄹ', '병 신', '병1신',
    'f u c k', 'f.u.c.k', 'f_u_c_k', 'fuuuuck', 'f*ck', 'sh1t', 'b1tch', 's3xy', 'ｆｕｃｋ', 'fu​ck', 'p0rn', 'n1gger']) {
    assert.equal(isNicknameBlocked(s), true, s);
  }
});

test('자동 생성 닉네임(형용사 × 동물 × 태그)은 한국어·영어 모두 절대 막지 않는다', () => {
  assert.ok(ANIMAL_NAMES.length >= 6, `동물 이름을 못 읽었다: ${ANIMAL_NAMES}`);
  const animals = [...ANIMAL_NAMES, '여행자'];
  const tags = [1000, 1234, 3554, 4821, 5318, 6969, 7777, 9999];
  for (const adj of NICK_ADJS) for (const a of animals) for (const tag of tags) {
    const ko = `${adj} ${a} #${tag}`;
    assert.equal(isNicknameBlocked(ko), false, ko);
    assert.ok(EN[adj] && EN[a], `영어 번역 없음: ${adj} / ${a}`);
    const en = `${EN[adj]} ${EN[a]} #${tag}`;
    assert.equal(isNicknameBlocked(en), false, en);
  }
});

test('태그 전 범위(1000~9999)도 안전', () => {
  for (let tag = 1000; tag <= 9999; tag++) {
    assert.equal(isNicknameBlocked(`숲속의 곰 #${tag}`), false);
    assert.equal(isNicknameBlocked(`Woodland Bear #${tag}`), false);
  }
});

test('평범한 닉네임은 통과', () => {
  for (const s of ['이름 없는 여행자', '시바견', '시바', '새끼고양이', '보지마', '자지마', '미친듯이 귀여운', '고양이 집사', '해달',
    'Shiitake', 'Peacock', 'Sussex', 'Classic Grass', 'Cocoa', 'Traveler', 'Sleepy Panda', 'Grape',
    '버섯 따는 토끼', '별 헤는 밤', '13', 'ab']) {
    assert.equal(isNicknameBlocked(s), false, s);
  }
});

test('패턴은 정규화된(반복 접힌) 문자열 기준 · Postgres ARE 와 같게 해석되는 문법만', () => {
  assert.ok(NICK_BLOCK_PATTERNS.length >= 30);
  for (const p of NICK_BLOCK_PATTERNS) {
    assert.doesNotMatch(p, /(.)\1/, `반복 글자: ${p}`);
    assert.doesNotThrow(() => new RegExp(p));
    assert.doesNotMatch(p, /\(\?<|\\/, `lookbehind·역슬래시 금지: ${p}`);
  }
});

test('setNickname: 금칙어면 저장하지 않고 이유 문구 + nickname_set_blocked 트래킹', () => {
  const at = SRC.indexOf('function setNickname(');
  const fn = SRC.slice(at, SRC.indexOf('\n}\n', at));
  assert.match(fn, /if \(isNicknameBlocked\(nick\)\) \{\s*trackEvent\('nickname_set_blocked', \{ len: nick\.length \}\);[^\n]*\n\s*return \{ ok: false, msg: '쓸 수 없는 말이 들어 있어요' \};/);
  assert.ok(fn.indexOf('isNicknameBlocked') < fn.indexOf('gameState.nickname = nick'), '저장 전에 걸러야 한다');
  assert.match(SRC, /import \{ isNicknameBlocked \} from '\.\/nickname-filter\.js';/);
  assert.equal(EN['쓸 수 없는 말이 들어 있어요'], 'That name contains a blocked word');
  // 호출부(캐릭터 모달)는 실패 msg 를 토스트로 보여 준다
  assert.match(read('index.html'), /const nr = Input\.setNickname\([^)]*\);[^\n]*\n\s*if \(!nr\.ok\) \{ ui\.toast\(nr\.msg\);/);
});
