#!/usr/bin/env node
// =============================================================
//  calm forest · 베타 2차 배정 — 이메일 10개 → 번들 A/B × 맵 순서 INSERT SQL
//  ------------------------------------------------------------
//  ▶ node scripts/beta-roster.mjs a@x.com b@x.com ... (4명 이상, 수는 자유)   → SQL 을 stdout 에
//  ▶ 설계: docs/BETA_AB_TEST_PLAN.md 2차 설계 §1
//     번들 반반(홀수면 A 가 하나 더). 맵 순서는 번들과 교차 — 10명이면 A 안 sea_first 3/2, B 안 2/3.
//     그래야 "바다터 먼저" 가 곧 "A군" 이 되지 않는다.
// =============================================================

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** 이메일 N개(4 이상) → 배정 행. rng 를 주면 결정적(테스트·재현용).
 *  번들은 A 가 올림(ceil) — 7명이면 A4/B3. 맵 순서는 A 안에서 sea_first 올림, B 안에서 내림 —
 *  그래야 홀수여도 "바다터 먼저" 가 한 번들에 쏠리지 않는다(10명: A 3/2, B 2/3 · 7명: A 2/2, B 1/2). */
export function assignRoster(emails, rng = Math.random) {
  const list = [...new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean))];
  if (list.length < 4) throw new Error(`테스터는 4명 이상이어야 맵 순서를 엇갈리게 나눌 수 있다 (받은 값: ${list.length})`);
  const order = shuffle(list, rng);
  const nA = Math.ceil(order.length / 2);
  const A = order.slice(0, nA), B = order.slice(nA);
  const tag = (grp, group, seaCount) => group.map((email, i) => ({
    email, grp, map_order: i < seaCount ? 'sea_first' : 'mist_first',
  }));
  return [...tag('A', A, Math.ceil(A.length / 2)), ...tag('B', B, Math.floor(B.length / 2))];
}

/** 배정 행 → SQL 편집기에 붙여 넣을 한 문장. 다시 실행해도 안전(upsert). */
export function rosterSql(rows, note = '2차 2026-09-09') {
  const values = rows.map(r => `  ('${r.email}', '${r.grp}', '${r.map_order}', '${note}')`).join(',\n');
  return `insert into public.beta_testers (email, grp, map_order, note) values\n${values}\n`
       + `on conflict (email) do update set grp = excluded.grp, map_order = excluded.map_order, note = excluded.note;\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const emails = process.argv.slice(2);
  process.stdout.write(rosterSql(assignRoster(emails)));
}
