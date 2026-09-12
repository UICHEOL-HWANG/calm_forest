// =============================================================
//  calm forest · 📮 소식함 순수 로직 (DOM·네트워크 없음 — tests/notices.test.mjs)
//  ------------------------------------------------------------
//  notices 행 = { id, title, body, title_en, body_en, target_user_id, reply_to,
//                 created_at, feedback: { message } | null }
//   · target_user_id null = 전체 공지, 값 있으면 그 유저에게만 가는 1:1 답장
//   · feedback 은 reply_to 로 임베드된 원문(본인 글 select 정책이 있어야 값이 온다)
//  읽음 기준은 세이브의 noticeSeenId(마지막으로 본 id) 하나 — 기기 바꿔도 두 번 안 뜬다.
// =============================================================

const QUOTE_MAX = 60;   // 답장 위에 인용하는 원문 길이

/** seenId 보다 큰 id 만 오름차순으로. seenId 가 없으면 전부. */
export function unreadNotices(list, seenId) {
  if (!Array.isArray(list)) return [];
  const since = Number(seenId) || 0;
  return list.filter(n => n && Number(n.id) > since).sort((a, b) => a.id - b.id);
}

/** 언어별 제목·본문. en 이면 *_en 이 비어 있지 않을 때만 영어, 아니면 한국어 폴백(필드별). */
export function pickText(n, lang) {
  const en = lang === 'en';
  return {
    title: (en && n.title_en) ? n.title_en : n.title,
    body:  (en && n.body_en)  ? n.body_en  : n.body,
  };
}

/** 본 것으로 기록할 id — 목록 중 가장 큰 값, 비어 있으면 0. */
export function maxId(list) {
  return (Array.isArray(list) ? list : []).reduce((m, n) => Math.max(m, Number(n?.id) || 0), 0);
}

/** 1:1 답장이면 원문 한 줄(앞 60자, 줄바꿈→공백). 전체 공지거나 원문을 못 읽으면 null. */
export function quoteLine(n) {
  if (!n?.reply_to) return null;
  const raw = n.feedback?.message;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > QUOTE_MAX ? flat.slice(0, QUOTE_MAX) + '…' : flat;
}
