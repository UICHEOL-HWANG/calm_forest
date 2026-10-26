begin;

insert into public.cf_experiments (id, name, kind, status, question, unit, period, prereg, metric, test, need, decide_after, confound, verdict_note, char, sort, log)
values
  ('e1', 'E1 첫 5분 수확', 'ab', 'run',
   '신규가 다 자란 밭 앞에서 시작하면(안내 카드 3장 포함) 5분 안에 첫 획득을 하는 비율이 오르나?',
   '기기 (웹·토스 각각 50:50 · 신규만)', '10/12 – 진행 중 · 최대 12주',
   'dev/active/metrics-framework/first5min-harvest-experiment-prereg.md · 2026-10-12 고정 (+개정 1·2, 10/23 고정)',
   '5분 안 첫 획득', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 채택 · 0 걸침 판정 불가', 200, null, null, null, 'rabbit', 1,
   '[["10/12","배포 · 신규 기기 50:50 배정 시작"],["10/13","앱 배너 켬 — 처치가 배너를 더 일찍 본다(개정 2 보고 층)"],["10/23","온보딩 개편 배포 · 개정 2 고정(층: 배너·배정 시각·유입·광고 주차)"],["10/24","메타 광고 유입 시작"]]'),
  ('e2', 'E2 로그인 건너뛰기', 'ab', 'done',
   '웹 첫 방문에서 로그인 화면을 건너뛰고 바로 게스트로 들어가면 첫 세션에 플레이 행동을 하는 비율이 오르나?',
   '기기 (웹 첫 방문 · 50:50)', '10/12 – 10/17',
   'dev/active/metrics-framework/web-entry-experiment-prereg.md · 2026-10-12 고정',
   '첫 세션 플레이 행동', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 채택', 122, null, null,
   '목표 122대 전에 종료 — 판정하지 않음. 종료 뒤 로그인 화면 먼저(대조 동작)로 복귀, 이미 키운 게스트 마을은 재방문 때 이어감.', 'dog', 2,
   '[["10/12","배포 · 웹 첫 방문 기기 50:50"],["10/17","종료 결정(하루 신규 4~8명을 E1·E2·E3 가 나눠 써 표본이 안 참)"],["10/19","로그인 화면 먼저로 복귀"]]'),
  ('e3', 'E3 공간 연결 · 마당 연못', 'ab', 'run',
   '미니게임 결과가 내 마당에 남으면(첫 물고기 → 연못) 그 뒤 7일 안에 다시 오는 비율이 오르나?',
   '기기 (배포 뒤 새 기기 · 50:50)', '10/16 – 진행 중 · 광고 시작(10/24)부터 최대 12주',
   'dev/active/metrics-framework/space-link-experiment-prereg.md · 2026-10-16 고정',
   'T+1~7일 재방문 (첫 물고기 잡은 기기)', '기기 부트스트랩 2,000회 · 플랫폼 층화 95% CI — 하한 > 0 채택', 190, null, null, null, 'cat', 3,
   '[["10/16","배포 · 새 기기 50:50 (기존 기기는 전원 on, 분석 제외)"],["10/24","메타 광고 유입 시작 — 하루 배정 92대"]]'),
  ('e4', 'E4 세계수 해금', 'ab', 'plan',
   '빈 마을에서 세계수를 살리며 이웃을 되찾게 하면(해금 켬) 처음부터 다 열린 마을보다 7일 안 재방문이 오르나? (첫날 이탈은 가드레일)',
   '기기 (새 기기 · 50:50 예정)', '초안 · 배정 스위치 미배포',
   'dev/active/metrics-framework/world-unlocks-experiment-prereg.md · 초안(고정 전)',
   '1~7일차 재방문', '미정 — 기저율 확정 후', 300, null, null, null, 'fox', 4,
   '[["10/17","초안 · 지금은 전원 해금 켬(CONFIG.UNLOCKS)"]]'),
  ('ads_w1', '메타 광고 1주차 소재', 'ext', 'run',
   '할로윈 소재가 일반 소재보다 광고를 더 누르게 하나? (첫 플레이율이 크게 낮으면 채택 보류)',
   '광고 노출 (메타 A/B 사용자 분할 50:50 · 세트당 하루 1만 원)', '10/24 – 10/30',
   'dev/active/meta-ads-launch/ · 판정 10/31 1회',
   'CTR (링크 클릭 ÷ 노출)', '두 비율 차이 양측 5% (메타 실험 도구 보고 지표는 CPC) · 메타 전달 알고리즘이 지면을 골라 인과 해석은 제한', null, '2026-10-31', null, null, 'bear', 5,
   '[["10/23","게시 · 실험 w1_general_vs_halloween 예약"],["10/24","집행 시작 (A = 할로윈 · B = 일반)"],["10/31","판정 1회 → 숫자 수동 입력"]]'),
  ('banner', '앱 배너 홀드아웃', 'ab', 'run',
   '웹 앱 유도 배너를 보여 주면 다음 날 다시 오는 비율이 달라지나? (사전등록 없음 · 방향만)',
   '기기 (90:10 홀드아웃 · 웹 안드로이드·iOS)', '10/13 – 진행 중', null,
   'D1 재방문(웹)', '기술 통계 — 홀드아웃이 작아 판정하지 않음', null, null, null, null, 'chick', 7,
   '[["10/13","배너 켬 · 기기 해시 10% 홀드아웃"]]')
on conflict (id) do update set
  name = excluded.name, kind = excluded.kind, status = excluded.status, question = excluded.question, unit = excluded.unit,
  period = excluded.period, prereg = excluded.prereg, metric = excluded.metric, test = excluded.test,
  need = excluded.need, decide_after = excluded.decide_after, confound = excluded.confound,
  verdict_note = excluded.verdict_note, char = excluded.char, sort = excluded.sort, log = excluded.log, updated_at = now();

update public.cf_experiments set status = 'done', sort = 10, need = null,
  verdict_note = '판정 불가 — 7일 재방문 56% vs 56%. ±15%p 보다 작은 효과는 이 표본으로 못 가린다. 재방문 레버로 기대하지 않고 E1·E2 를 먼저 본다 (METRICS_FRAMEWORK §5-5).',
  log = log || '[["10/12","G2 판정: 판정 불가"],["10/26","화면 집계 수정 — 세션 기록이 없는 14개 누락·itch 2개 혼입 → 문서 판정과 일치"]]'::jsonb,
  updated_at = now()
 where id = 'hint' and status <> 'done';

update public.cf_experiments set status = 'done', sort = 60,
  verdict_note = '계획 변경(10/11~10/22) — 경로 A/B 대신 소재 A/B(메타 광고 1주차)와 앱 배너 홀드아웃으로 나눠 진행.',
  log = log || '[["10/22","3주 소재 A/B 구조로 대체"]]'::jsonb,
  updated_at = now()
 where id = 'meta' and status <> 'done';

update public.cf_experiments set status = 'obs', sort = 30, updated_at = now()
 where id = 'reel' and status = 'run';

commit;
