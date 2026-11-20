begin;

insert into public.cf_experiments (id, name, kind, status, question, unit, period, prereg, metric, test, need, decide_after, confound, verdict_note, char, sort, log)
values
  ('e6', 'E6 안내 개편', 'ab', 'run',
   '목표 화살표·단계 카드·재료 부족 카드·세계수 판 안내를 켜면(새 안내), 예전 안내보다 첫날 집 3단계(지붕)까지 짓는 기기가 많아지나?',
   '기기 (새 기기 · 예전 안내 20 : 새 안내 80)', '11/11 – 진행 중',
   'dev/active/main-quest-guide/e6-guide-prereg.md · 2026-11-11 고정',
   '첫날 집 3단계(지붕) 완성', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 채택 · 0 걸침 판정 불가 (보조: 2·3장 도달, D1·D7 / 가드레일: 첫날 세션 길이·첫 10분 이탈)',
   null, null, '상인 다가오기·첫 수확 말풍선·세계수 새 가지 자동 선택·베타 A군 튜토리얼 순서는 두 무리 공통 · 예전 안내 무리에는 집 재료 부족 광고 자리가 없다', null, 'bear', 5,
   '[["11/11","사전등록 고정 · 새 기기 20:80 배정 스위치"],["11/12","배포 · exp_guide 기록 시작"]]'::jsonb),
  ('e7', 'E7 이름 미리 채움', 'ab', 'run',
   '캐릭터·이름 화면에서 기본 이름을 미리 채워 처음부터 시작할 수 있게 하면(모바일 세로는 캐릭터 고르기를 위로), 화면을 본 날 캐릭터를 고르고 시작하는 기기가 많아지나?',
   '기기 (새 기기 · 50:50 · 판정은 모바일 웹)', '11/18 – 진행 중',
   'dev/active/e7-name-prefill/e7-name-prefill-plan.md · 2026-11-18 고정',
   '이름 화면을 본 날 캐릭터 선택(모바일 웹)', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 채택 · 0 걸침 판정 불가 · 모바일 웹 무리당 155대 또는 홍보 재개 뒤 4주 중 먼저 (보조: 첫날 첫 행동, 다음 날 재방문)',
   310, null, '모든 경로의 새 기기를 배정하지만 판정은 모바일 웹만 · E5 무리별로도 같이 본다', null, 'cat', 5,
   '[["11/18","사전등록 고정 · 배포(5곳) · exp_name 기록 시작"]]'::jsonb),
  ('prepass', '보상형 광고 프리패스', 'ab', 'run',
   '집 기초 재료(목재)가 모자란 채 집 터에 선 사람에게 광고 보고 모자란 재료를 받는 버튼을 보여 주면, 24시간 안에 집 기초를 완공하는 비율이 오르나?',
   '기기 (앱: Android·iOS·토스 · 50:50 · 집 기초 조건을 만난 기기끼리 비교)', '11/11 – 진행 중 (고정 6주)',
   'docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md §3 · 2026-11-09 고정',
   '조건을 만난 뒤 24시간 안 집 기초 완공(house1)', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 전체 적용 · 0 걸침 유지 여부 사용자 결정 · 가드레일(D1 3%p 넘게 하락) 위반 시 중단',
   null, null, '집 기초 안내(hguide)와 같은 관문 · 소금이 달라 독립 배정 · 다른 광고 자리는 처치 후 선택이라 판정에 쓰지 않는다', null, 'panda', 6,
   '[["11/9","설계·판정 규칙 고정"],["11/11","광고 자리 9곳으로 확대 · prepass_eligible 기록"],["11/12","앱 배포"]]'::jsonb)
on conflict (id) do update set
  name = excluded.name, kind = excluded.kind, status = excluded.status, question = excluded.question, unit = excluded.unit,
  period = excluded.period, prereg = excluded.prereg, metric = excluded.metric, test = excluded.test, need = excluded.need,
  decide_after = excluded.decide_after, confound = excluded.confound, char = excluded.char, sort = excluded.sort,
  log = excluded.log, updated_at = now();

commit;
