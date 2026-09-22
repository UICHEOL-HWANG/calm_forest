// =============================================================
//  calm forest · 🗂️ 수집 JSON → DB 행 정규화 (순수 함수)
//  ------------------------------------------------------------
//  topics.mjs 가 뱉는 { date, sources:{...}, dropped } 를 topics 테이블
//  행 배열로 접는다. 네트워크도 DB 도 건드리지 않는다 — 그래서 테스트가 싸다.
//
//  ⚠️ 출처마다 필드가 다르다(실측):
//     jobplanet {category,title,excerpt} · blind {title,excerpt}
//     dc·mlb    {title,url,excerpt}  ← url 자리에 'javascript:;' 가 온다
// =============================================================

// DB 의 check 제약과 같은 목록이어야 한다. 여기 없는 출처는 통째로 버린다
// (오타 난 키가 조용히 DB 로 흘러드는 것을 막는다).
export const SOURCES = ['jobplanet', 'blind', 'dc', 'mlb', 'news'];

/** http(s) 로 시작하는 것만 URL 로 인정한다. 나머지는 null — DB 에 쓰레기를 들이지 않는다 */
export function cleanUrl(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

/**
 * @param raw  topics.mjs 출력 { date, sources, dropped }
 * @param collectedOn 'YYYY-MM-DD' — raw.date 를 믿지 않고 호출자가 정한다
 *                    (크론이 자정을 넘겨 돌 수 있다)
 */
export function normalizeTopics(raw, { collectedOn }) {
  const sources = (raw && raw.sources) || {};
  const rows = [];
  // 한 배치 안의 중복을 미리 접는다 — upsert 는 같은 충돌 키를 한 문장에서
  // 두 번 건드리면 통째로 실패한다(ON CONFLICT DO UPDATE ... second time).
  const seen = new Set();

  for (const source of SOURCES) {
    const items = sources[source];
    if (!Array.isArray(items)) continue;

    for (const it of items) {
      const title = typeof it?.title === 'string' ? it.title.trim() : '';
      if (!title) continue;                      // 제목 없는 건 소재가 아니다

      const key = JSON.stringify([source, title]);
      if (seen.has(key)) continue;
      seen.add(key);

      const category = typeof it?.category === 'string' && it.category.trim()
        ? it.category.trim() : null;
      const excerpt = typeof it?.excerpt === 'string' ? it.excerpt.trim() : '';

      rows.push({
        collected_on: collectedOn,
        source,
        category,
        title,
        excerpt,                                  // NOT NULL 컬럼 — null 대신 ''
        url: cleanUrl(it?.url),
      });
    }
  }
  return rows;
}
