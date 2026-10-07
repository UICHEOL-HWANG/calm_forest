// =============================================================
//  🏡 이웃 마을 규칙 — 순수 함수(three·game.js 없음, Node 테스트)
//  서버 판정은 sql/migrations/migrate_neighbors.sql. 여기 숫자는 그 파일과 같아야 한다(tests/neighbors-sync).
//  문구는 스펙 §8 검수본 그대로 — 바꾸지 말 것(미검수 문구는 계획서 Global Constraints 참조).
// =============================================================
import { kstDate } from '../kst-date.js';
import { EXPANSIONS, STAGE_NAMES } from '../house-cost.js';
import { stage7ExitPoint } from '../house-stage7.js';

export const REWARD_CAP = 3;          // neighbor_react 의 `v_rew := v_cnt < 3;`
export const REWARD_COINS = 5;        // 토스트 '🪙+5' 와 같은 값
export const NOTICE_MAX = 10;         // my_visitors 의 limit 10
export const HOST_TALK_R = 2.6;       // 집주인 말풍선이 뜨는 거리
export const EMOJI = Object.freeze({ wave: '👋', heart: '❤️', flower: '🌸', star: '⭐' });
export const EMOJI_IDS = Object.freeze(Object.keys(EMOJI));
export const FAIL_TOAST = '연결이 불안정해요. 잠시 후 다시 시도해 주세요.';   // 기존 문구 재사용(js/i18n-en.js)

/** 카드·알림에 쓰는 집 이름 — 4~7단계는 증축표, 1~2단계는 짓는 단계 이름, 3단계는 코티지 */
export function houseLabel(stage) {
  const e = EXPANSIONS.find(x => x.stage === stage);
  if (e) return `${e.ico} ${e.name}`;
  if (stage === 3) return '🏠 코티지';
  return `🪵 ${STAGE_NAMES[stage] || STAGE_NAMES[1]}`;
}

export const pickerMeta = (row) => `${houseLabel(row.house_stage)} · 🪴 장식 ${Math.max(0, row.decor_n | 0)}`;
export const rewardLine = (n) => `🪙 오늘 받은 방문 보상 ${Math.min(REWARD_CAP, Math.max(0, n | 0))}/${REWARD_CAP}`;

/** neighbors_today 목록 → 엽서 카드 행. faceOf(characterId) → 이모지 */
export function pickerRows(list, faceOf) {
  return (Array.isArray(list) ? list : []).slice(0, 3).map((r, slot) => ({
    publicId: r.public_id, slot, face: faceOf(r.character), nick: String(r.nick || ''),
    meta: pickerMeta(r), done: !!r.visited_today, go: r.visited_today ? '또 보기' : '놀러 가기',
  }));
}

/** 집주인이 서는 자리 — js/spaces/house.js houseExitPoint 와 같은 규칙(7단계는 현관 앞 마루, 그 밖은 집 앞 3) */
export function hostSpot(stage, style, origin) {
  return stage >= 7 ? stage7ExitPoint(style, origin) : { x: origin.x, z: origin.z + 3 };
}

/** js/spaces/house.js houseSolidR 와 같은 표(그쪽은 내 세이브를 읽어서 여기서 쓸 수 없다) */
export function houseSolidR(stage) {
  return stage >= 7 ? 3.9 : stage >= 6 ? 2.7 : stage >= 5 ? 2.55 : stage >= 4 ? 2.4 : 2.2;
}

/** neighbor_react 응답 → 화면에서 할 일. bubble 'thanks' = 재방문 말풍선(버튼 없음), null = 그대로 */
export function reactOutcome(res) {
  const r = res && typeof res === 'object' ? res : { ok: false, reason: 'offline' };
  const rewardedToday = Math.max(0, r.rewarded_today | 0);
  if (r.ok) return { reason: 'ok', reward: !!r.rewarded, toast: r.rewarded ? '❤️ 마음을 남겼어요 · 🪙+5' : '❤️ 마음을 남겼어요', bubble: 'thanks', rewardedToday };
  const reason = r.reason || 'offline';
  if (reason === 'dup') return { reason, reward: false, toast: null, bubble: 'thanks', rewardedToday };
  if (reason === 'login') return { reason, reward: false, toast: '🔐 로그인하면 마음을 남길 수 있어요', bubble: null, rewardedToday };
  return { reason, reward: false, toast: FAIL_TOAST, bubble: null, rewardedToday };
}

/** 다녀간 이웃 조회 시작(ms) — 승인 문구 '어제부터 지금까지' 가 거짓이 되지 않게 KST 어제 00:00 보다 앞으로 가지 않는다 */
export function visitorsSince(seenAt, now) {
  const ydayStart = Date.parse(`${kstDate(now - 864e5)}T00:00:00+09:00`);
  return Math.max(Number(seenAt) || 0, ydayStart);
}

/** my_visitors 응답 → 알림 모달 뷰 */
export function noticeView(res, faceOf) {
  const rows = (Array.isArray(res?.list) ? res.list : []).slice(0, NOTICE_MAX)
    .map(v => ({ face: faceOf(v.character), nick: String(v.nick || ''), emoji: EMOJI[v.emoji] || '' }));
  const total = Math.max(rows.length, res?.total | 0);
  return { title: `이웃 ${total}명이 다녀갔어요`, rows, more: Math.max(0, total - rows.length), total };
}

// ── 세이브 필드 neighbors: { visited, seenAt } — 전부 새 객체를 돌려준다 ──
const whole = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
export const neighborsDefault = () => ({ visited: 0, seenAt: 0 });
export function restoreNeighbors(v) {
  const o = v && typeof v === 'object' ? v : {};
  return { visited: whole(o.visited), seenAt: whole(o.seenAt) };
}
export function recordVisit(nb) { const o = restoreNeighbors(nb); return { ...o, visited: o.visited + 1 }; }
export function markSeen(nb, at) { const o = restoreNeighbors(nb); return { ...o, seenAt: Math.max(o.seenAt, whole(at)) }; }
