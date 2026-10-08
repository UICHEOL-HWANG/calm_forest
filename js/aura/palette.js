// =============================================================
//  🏮 오라 팔레트 — AI 도 플레이어도 이 24색 안에서만 고른다(화풍 이탈 차단).
//  id 는 저장·레시피에 남으므로 **절대 바꾸지 않는다**. 색을 바꾸려면 hex 만 고친다.
// =============================================================
const RAW = [
  ['mint', 0x95dcd5, '민트'], ['cream', 0xfff8ec, '크림'], ['pink', 0xf7b6cc, '벚꽃'], ['rose', 0xed93b1, '장미'],
  ['peach', 0xfac2a0, '복숭아'], ['coral', 0xf0997b, '산호'], ['honey', 0xfac775, '꿀'], ['amber', 0xef9f27, '호박빛'],
  ['lemon', 0xf7a65f, '살구'], ['leaf', 0x97c459, '새잎'], ['moss', 0x6cbf7f, '이끼'], ['sage', 0xc0dd97, '세이지'],
  ['sky', 0xb5d4f4, '하늘'], ['lake', 0x85b7eb, '호수'], ['dew', 0x3f78b8, '바다'], ['teal', 0x5dcaa5, '청록'],
  ['lilac', 0xd9c6f5, '라일락'], ['violet', 0xa99ce6, '제비꽃'], ['night', 0x7f77dd, '밤하늘'], ['snow', 0xf1efe8, '눈'],
  ['ash', 0xd3d1c7, '잿빛'], ['cocoa', 0xd8a679, '코코아'], ['berry', 0xd4537e, '산딸기'], ['gold', 0xffd36b, '금빛'],
];
export const AURA_PALETTE = Object.freeze(RAW.map(([id, hex, ko]) => Object.freeze({ id, hex, ko })));
export const PALETTE_IDS = Object.freeze(AURA_PALETTE.map(p => p.id));
export const hexOf = id => (AURA_PALETTE.find(p => p.id === id) || AURA_PALETTE[0]).hex;
