// =============================================================
//  🪞 거울 마을 — 단서·힌트 문장(ko/en 을 여기서 완성한다 → tests/mirror-clues.test.mjs)
//  ------------------------------------------------------------
//  ⚠️ 조합 문장은 i18n 사전 글루(" · ")에 쪼개진다(beta-feedback-r3 함정) — 사전에 넣지 않고 언어별로 완성해 넘긴다.
//  반전 단서는 왼↔오만 바꾼다(거울은 좌우만 뒤집는다). 앞/뒤 자리는 반전 의뢰에 배정되지 않는다(quests.js).
// =============================================================
import { LANDMARKS, spotOf } from './layout.js';
import { ITEMS } from './quests.js';

const SIDE_KO = { left: '왼쪽', right: '오른쪽', front: '앞', back: '뒤' };
const COVER = { ko: { bush: '덤불', rock: '바위', tree: '나무' }, en: { bush: 'bush', rock: 'rock', tree: 'tree' } };
const NPC = { ko: { farmer: '거울 농부 삼촌', angler: '거울 낚시꾼 할아버지', chef: '거울 요리사 판다' }, en: { farmer: 'Mirror Farmer', angler: 'Mirror Angler', chef: 'Mirror Chef Panda' } };
const L = (lang) => (lang === 'en' ? 'en' : 'ko');

export function flipSide(side) { return side === 'left' ? 'right' : side === 'right' ? 'left' : side; }
export function npcName(id, lang) { return NPC[L(lang)][id] ?? id; }
const landmark = (id, lang) => LANDMARKS.find(l => l.id === id)[L(lang)];
const item = (id) => ITEMS.find(i => i.id === id);
/** 주민이 말하는 방향 — 반전 의뢰면 실제의 반대 */
const said = (q) => { const s = spotOf(q.spot).side; return q.flipped ? flipSide(s) : s; };
/** 받침 있으면 '을', 없으면 '를' */
function eulReul(w) { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '을' : '를'; }
/** 영어 위치구 — 왼/오는 to the X of, 앞/뒤는 in front of / behind */
const whereEn = (side, lm) => (side === 'left' || side === 'right' ? `to the ${side} of the ${lm}` : side === 'front' ? `in front of the ${lm}` : `behind the ${lm}`);

/** 단서 대사만(따옴표 포함) — 🪞 대화 박스가 이름과 따로 그린다(B안 2026-10-10) */
export function clueLine(q, lang) {
  const s = spotOf(q.spot), it = item(q.item), side = said(q);
  if (L(lang) === 'en') return `"I lost my ${it.en} under the ${COVER.en[s.cover]} ${whereEn(side, landmark(s.landmark, 'en'))}"`;
  return `"${landmark(s.landmark, 'ko')} ${SIDE_KO[side]} ${COVER.ko[s.cover]} 밑에서 ${it.ko}${eulReul(it.ko)} 잃어버렸어요"`;
}
export function clueText(q, lang) { return `${npcName(q.npc, lang)}: ${clueLine(q, lang)}`; }

export function hintText(q, lang) {
  const s = spotOf(q.spot), en = L(lang) === 'en';
  if (q.flipped) return en ? `🪞 In mirror-speak "${said(q)}" → it really means ${s.side}` : `🪞 거울 말로는 ${SIDE_KO[said(q)]} → 진짜는 ${SIDE_KO[s.side]}이에요`;
  if (en) return `💧 Look again ${whereEn(s.side, landmark(s.landmark, 'en'))}`;
  const w = SIDE_KO[s.side];
  return `💧 ${landmark(s.landmark, 'ko')} ${w}${eulReul(w)} 다시 살펴봐요`;
}

export function clueShort(q, lang) {
  const s = spotOf(q.spot), it = item(q.item), side = said(q);
  return L(lang) === 'en'
    ? `🔍 ${landmark(s.landmark, 'en')} · ${side} · ${COVER.en[s.cover]} · ${it.ico} ${it.en}`
    : `🔍 ${landmark(s.landmark, 'ko')} ${SIDE_KO[side]} ${COVER.ko[s.cover]} 밑 · ${it.ico} ${it.ko}`;
}

// ── 🎁 돌려주기(2026-10-09 — 찾으면 대사로 끝나지 말고 주민에게 가져가 마무리 대사를 듣는다) ──
/** 받침 있으면 a, 없으면 b */
function josa(w, a, b) { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; }
/** 주웠을 때 — 누구에게 가져가는지 */
export function pickedText(q, lang) {
  const it = item(q.item);
  return L(lang) === 'en' ? `${it.ico} Found the ${it.en}! · Take it to ${npcName(q.npc, 'en')}` : `${it.ico} ${it.ko}${josa(it.ko, '을', '를')} 찾았어요 · ${npcName(q.npc, 'ko')}에게 가져다줘요`;
}
/** 들고 다니는 동안 프롬프트 줄 */
export function carryShort(q, lang) {
  const it = item(q.item);
  return L(lang) === 'en' ? `🎁 Bring the ${it.ico} ${it.en} to ${npcName(q.npc, 'en')}` : `🎁 ${npcName(q.npc, 'ko')}에게 ${it.ico} ${it.ko} 가져다주기`;
}
/** 주인 앞 — 누르면 돌려준다 */
export function giveShort(q, lang) {
  const it = item(q.item);
  return L(lang) === 'en' ? `🎁 Give back the ${it.ico} ${it.en}` : `🎁 ${it.ico} ${it.ko} 돌려주기`;
}
/** 마무리 대사 — 주민별 말투(사용자 확정안 2026-10-09) */
const THANKS = {
  farmer: { ko: (w) => `어이쿠, ${w} 여기 있었네! 덕분에 오늘 밭일이 즐겁겠어요`, en: (w) => `Oh my, there's my ${w}! Farm work will be fun today, thanks to you` },
  angler: { ko: (w) => `허허, ${w}${josa(w, '이', '가')} 거기 있었구먼. 고맙네`, en: (w) => `Ho ho, so my ${w} was over there. Thank you kindly` },
  chef:   { ko: (w) => `와, ${w}${josa(w, '이다', '다')}! 고마워요, 다음엔 맛있는 거 해 줄게요`, en: (w) => `Wow, my ${w}! Thank you — I'll cook you something tasty next time` },
};
/** 고마워요 대사만(따옴표 포함) — 대화 박스용 */
export function thanksLine(q, lang) {
  const it = item(q.item), en = L(lang) === 'en', t = THANKS[q.npc] ?? THANKS.farmer;
  return `"${en ? t.en(it.en) : t.ko(it.ko)}"`;
}
export function thanksText(q, lang) { return `${npcName(q.npc, lang)}: ${thanksLine(q, lang)}`; }
