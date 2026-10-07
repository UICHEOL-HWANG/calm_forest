// 🛡️ 닉네임 금칙어 — 순수 모듈(DOM·게임 상태 없음)
//   이웃 마을이 닉네임을 다른 유저에게 보여 주므로(앱인토스 UGC 자율 관리 요건) 저장 전에 거른다.
//   서버(sql/migrations/migrate_neighbors_moderation.sql _nb_nick_blocked)도 같은 패턴으로 한 번 더 가린다
//   — 이미 저장된 옛 닉네임·구버전 클라이언트 대비. 패턴 일치는 tests/neighbors-moderation.test.mjs 가 검사한다.
//
// ▶ 판정 = normalizeNickname(닉네임) 에 NICK_BLOCK_PATTERNS 중 하나라도 걸리면 막음.
//   정규화: 앞 64자 → NFKC(전각→반각, 조합용 자모는 호환 자모로 되돌림) → 소문자 → 제로폭 문자 제거 → 공백·문장부호·이모지 제거
//         → 영문 글자 사이에 낀 숫자/기호만 leet 치환(f4ck·sh1t·a$$) → 남은 숫자 제거(시1발·태그 #4821)
//         → 같은 글자 반복을 하나로 접기(fuuuck·씨이이발).
//   ⚠️ 그래서 패턴은 "반복이 접힌" 철자로 쓴다 — asshole → ashole, nigger → niger, pussy → pusy.
//   ⚠️ Postgres ARE 에서도 똑같이 돌아야 하므로 lookbehind·\b·\d 같은 역슬래시 문법을 쓰지 않는다(lookahead 는 둘 다 지원).
//
// ▶ 트레이드오프(목록은 일부러 짧게 — 오탐이 닉네임 짓기를 망치는 쪽이 더 아프다):
//   · '시발'은 막는다 → '시발점'(출발점)도 막힌다. 실제 닉네임에 쓸 일이 드물고, 우회 표기가 압도적으로 많아 감수.
//   · '시바'(시바견)·'새끼'(새끼고양이)·'미친'(미친듯이)·'걸레'(청소 도구)·'홍어'(물고기)·'나치'(바나나치즈)는 막지 않는다.
//     대신 '개새끼'·'미친놈'·'씨바'처럼 욕으로만 쓰이는 묶음만 막는다.
//   · '보지'·'자지'는 막되 뒤에 '마/말'이 오면 통과('보지마'·'자지 말자').
//   · '메갈'은 막되 '메갈로(돈)'은 통과 · 'shit'은 막되 'shiitake'(접으면 shitake)는 통과.
//   · 영어 'sex'는 단어 첫머리·sexy·sexual 만(Sussex·Essex 통과) · 'rape'는 첫머리만(grape·therapist 통과).
//   · 막히는 오탐(감수): Niger/Nigeria(niger) · Scunthorpe(cunt) · Dickens(dick) · pussycat(pusy).
//   · 정규화가 공백을 지우므로 단어 경계를 넘는 우연한 조합도 걸릴 수 있다 — 자동 생성 닉네임(형용사×동물×태그)은
//     한국어·영어 전 조합을 테스트로 고정해 절대 막히지 않게 한다.

export const NICK_BLOCK_PATTERNS = [
  // ── 한국어 욕설 ──
  '[시씨쓰]이?[발빨팔]', '씨[바빠]', '[ㅅㅆ]ㅂ', '[ㅅㅆ]발', '[시씨]ㅂ',
  '[병븅빙]신', '병싄', 'ㅂㅅ',
  '개[새세쉐섀색][끼기키히]', 'ㄱㅅㄲ',
  '좆', '좃', '존나', '지랄', 'ㅈㄹ',
  '미친[놈년새]', '썅', '씹[새쌔년할창]',
  '느금', '니[애에]미', '엠창', 'ㄴㄱㅁ',
  // ── 한국어 성적 표현 ──
  '섹스', '쎅스', '섹수', '보지(?!마|말)', '자지(?!마|말)', '강간', '창녀', '야동', '포르노',
  // ── 한국어 혐오·비하 ──
  '한남충', '맘충', '급식충', '틀딱', '김치녀', '된장녀', '메갈(?!로)', '일베', '짱깨', '쪽바리', '깜둥', '조센징', '히틀러',
  // ── 영어 (반복 접힌 철자) ──
  'f[uv]ck', 'fck', 'shit(?!ake)', 'bia?tch', 'ashole', 'bastard', 'cunt', 'dick', 'pusy', 'slut', 'whore',
  'niger', 'niga', 'fagot', 'retard', 'nazi', 'hitler',
  'penis', 'porn', '^sex', 'sexy', 'sexual', '^rape',
];

const BLOCK_RE = new RegExp(NICK_BLOCK_PATTERNS.join('|'));
// 🛡️ 정규식 비용 상한 — 닉네임은 클라가 쓰는 값이라 길이를 믿지 않는다(서버 _nb_nick_blocked 의 left(…, 64) 와 같다)
export const NICK_CHECK_MAX = 64;
// NFKC 는 호환 자모(ㅅ U+3145)를 조합용 자모(U+1109)로 바꾼다 → 패턴이 쓰는 호환 자모로 되돌린다(서버 translate 와 같은 표)
const JAMO_FROM = [...Array(19)].map((_, i) => String.fromCharCode(0x1100 + i)).join('') + [...Array(21)].map((_, i) => String.fromCharCode(0x1161 + i)).join('');
const JAMO_TO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ' + [...Array(21)].map((_, i) => String.fromCharCode(0x314F + i)).join('');
const JAMO_MAP = Object.fromEntries([...JAMO_FROM].map((c, k) => [c, JAMO_TO[k]]));
const JAMO_RE = /[\u1100-\u1112\u1161-\u1175]/g;
const ZERO_WIDTH = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g;
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

export function normalizeNickname(nick) {
  return [...String(nick ?? '')].slice(0, NICK_CHECK_MAX).join('')
    .normalize('NFKC')                                                            // 전각 ｆｕｃｋ → fuck
    .replace(JAMO_RE, (c) => JAMO_MAP[c])
    .toLowerCase()
    .replace(ZERO_WIDTH, '')
    .replace(/[^a-z0-9@$\uAC00-\uD7A3\u3131-\u318E]/g, '')                      // 공백·문장부호·이모지
    .replace(/(?<=[a-z])[013457@$]+(?=[a-z])/g, (run) => [...run].map((c) => LEET[c]).join(''))
    .replace(/[^a-z\uAC00-\uD7A3\u3131-\u318E]/g, '')                           // 남은 숫자·기호
    .replace(/(.)\1+/g, '$1');                                                  // 반복 접기
}

export function isNicknameBlocked(nick) {
  return BLOCK_RE.test(normalizeNickname(nick));
}
