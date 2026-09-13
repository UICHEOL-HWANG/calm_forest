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

/**
 * 펼친 채로 보여줄 소식 id 들. 나머지는 제목 한 줄로 접는다.
 *   · 안 읽은 소식(id > seenId)은 전부 펼친다 — 새로 온 건 읽으라고 띄우는 거니까.
 *   · 다 읽은 상태(소식함을 다시 열었을 때)면 가장 최근 하나만 펼친다 — 전부 접힌 화면은 빈칸처럼 보인다.
 * 공지 하나가 200자를 넘어서, 쌓이면 본문을 전부 펼쳐 잇는 방식은 스크롤 벽이 된다.
 */
export function expandedIds(list, seenId) {
  const rows = (Array.isArray(list) ? list : []).filter(n => n && Number.isFinite(Number(n.id)));
  if (!rows.length) return [];
  const since = Number(seenId) || 0;
  const unread = rows.filter(n => Number(n.id) > since).map(n => Number(n.id));
  if (unread.length) return unread;
  return [maxId(rows)];
}

/** 1:1 답장이면 원문 한 줄(앞 60자, 줄바꿈→공백). 전체 공지거나 원문을 못 읽으면 null. */
export function quoteLine(n) {
  if (!n?.reply_to) return null;
  const raw = n.feedback?.message;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > QUOTE_MAX ? flat.slice(0, QUOTE_MAX) + '…' : flat;
}

/**
 * 본문 텍스트 → 문단/표. DB 는 그냥 텍스트고, 줄에 '|' 가 있으면 표 행으로 읽는 규칙 하나뿐이다
 * (게임 소식함과 관리자 미리보기가 같은 함수를 써서 보이는 모양이 어긋나지 않는다).
 *   · lead   : 표 앞의 문단들 · tail : 표 뒤의 문단들 (빈 줄은 버림)
 *   · header : 첫 '|' 줄 — 단, '|' 줄이 둘 이상일 때만 머리로 쓴다(한 줄뿐이면 그냥 행)
 *   · rows   : 나머지 '|' 줄, 셀은 앞뒤 공백 제거. 셀 수는 줄마다 달라도 그대로 둔다
 */
export function parseBody(text) {
  const out = { lead: [], header: null, rows: [], tail: [] };
  if (typeof text !== 'string') return out;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const table = lines.filter(l => l.includes('|')).map(l => l.split('|').map(c => c.trim()));
  let seenTable = false;
  for (const l of lines) {
    if (l.includes('|')) { seenTable = true; continue; }
    (seenTable ? out.tail : out.lead).push(l);
  }
  if (table.length >= 2) { out.header = table[0]; out.rows = table.slice(1); }
  else out.rows = table;
  return out;
}
