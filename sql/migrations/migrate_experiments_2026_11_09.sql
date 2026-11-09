begin;

delete from public.cf_experiments where id = 'ads_w1';

update public.cf_experiments set log = '[["10/12","배포 · 신규 기기 50:50 배정 시작"],["10/13","앱 배너 켬 — 처치가 배너를 더 일찍 본다(개정 2 보고 층)"],["10/23","온보딩 개편 배포 · 개정 2 고정(층: 배너·배정 시각·유입·광고 주차)"],["10/24","메타 광고 유입 시작"],["10/31","광고 2주차 시작 · E5(로그인 화면 게스트 우선) 가동 — 앱 안 브라우저 유입 구성이 바뀜"],["11/3","집 기초 안내 실험 가동 — E1 과 독립 배정"]]'::jsonb,
  updated_at = now()
 where id = 'e1';

insert into public.cf_experiments (id, name, kind, status, question, unit, period, prereg, metric, test, need, decide_after, confound, verdict_note, char, sort, log)
values
  ('e5', 'E5 로그인 화면 게스트 우선', 'ab', 'obs',
   '앱 안 브라우저로 처음 온 사람에게 게스트 입장을 흰 큰 버튼("바로 시작하기")으로 올리면, 로그인 화면을 본 날 게임에 들어가는 비율이 오르나?',
   '기기 (웹 · 앱 안 브라우저 · 새 기기 · 50:50)', '10/31 – 11/6',
   'dev/active/metrics-framework/login-guest-first-prereg.md · 2026-10-27 고정 (+개정 1, 10/28)',
   '로그인 화면을 본 날 게임 진입', '기기 부트스트랩 2,000회 95% CI — 하한 > 0 채택 · 0 걸침 판정 불가 (가드레일: 스토어 배지 클릭)',
   230, '2026-11-07', null, null, 'dog', 5,
   '[["10/27","사전등록 고정 · 시안 A(자리 바꾸기) 승인"],["10/28","개정 1 · 2주차 예산 절반 → 무리당 약 115대, 검출 가능 최소 효과 약 +15%p"],["10/31","시작(광고 2주차) · 새 기기 50:50"],["11/6","관측 끝 · 11/7 판정 1회(기간 연장 없음)"]]'::jsonb),
  ('hguide', '집 기초 안내', 'ab', 'run',
   '나무 5개를 모아 집을 지을 수 있게 된 순간 집 터로 시선을 이끌어 주면(카메라 줌 + 나침반), 24시간 안에 첫 집 기초를 완공하는 비율이 오르나?',
   '기기 (나무 5개를 모은 기기 · 50:50 · E1 과 독립)', '11/3 – 진행 중',
   null, '24시간 안 첫 집 기초 완공', '두 비율 차이 — 사전등록 없음 · 방향만 본다',
   null, null, null, null, 'chick', 6,
   '[["11/3","집 터 안내 대상 기록 시작(house_guide_eligible)"],["11/4","안내 연출 첫 노출 기록"]]'::jsonb),
  ('gift_path', '가입 선물 이어가기 경로', 'policy', 'run',
   '게스트로 하다가 가입 선물 안내를 보고 이메일로 이어가는 사람은 어느 단계에서 끊기나? 무작위 배정이 없어 단계별 숫자만 본다.',
   '기기 (설명용 · 무작위 없음)', '10/30 – 진행 중',
   null, '단계별 도달 기기 수', '없음 — 설명용 숫자',
   null, null, null, null, 'fox', 7,
   '[["10/30","가입 선물 안내 노출(login_nudge) 기록 시작"],["10/31","E5 시작 — 안내를 본 기기 중 E5 배정 기기는 0대라 무리별로 나눠 볼 수 없음"]]'::jsonb),
  ('ads_h1', '메타 광고 1주차 · 할로윈 vs 일반', 'ext', 'obs',
   'H1: 1주차에 할로윈 영상이 일반 영상보다 클릭률(CTR)이 높나? (첫 플레이율이 크게 낮으면 채택 보류)',
   '광고 노출 (메타 A/B 사용자 분할 50:50 · 세트당 하루 1만 원)', '10/24 – 10/30',
   'dev/active/meta-ads-launch/parts/02-goals-hypotheses.md · H1',
   'CTR (링크 클릭 ÷ 노출)', '두 비율 차이 양측 5% (메타 실험 도구 보고 지표는 CPC) · 메타 전달 알고리즘이 지면을 골라 인과 해석은 제한',
   null, '2026-10-31', null, null, 'bear', 8,
   '[["10/23","게시 · 실험 w1_general_vs_halloween 예약"],["10/24","집행 시작 (A = 할로윈 · B = 일반)"],["10/30","1주차 종료 · 웹 유입 일반 298 대 할로윈 135 · 시작당 비용 약 1,001원 대 2,218원 · D1 17.2% 대 4.2%"],["10/31","H1 판정에 쓸 노출·클릭 숫자 수동 입력 대기"]]'::jsonb),
  ('ads_h6', '메타 광고 2주차 · 제너럴 심화 바다 vs 일반', 'ext', 'obs',
   'H6: 2주차에 제너럴 심화 바다 각도(B군)가 제너럴 심화 일반 각도보다 클릭률(CTR)이 높나?',
   '광고 노출 (메타 A/B 사용자 분할 50:50 · 세트당 하루 5천 원)', '10/31 – 11/6',
   'dev/active/meta-ads-launch/parts/02-goals-hypotheses.md · H6 (사전등록 수정 2026-10-30)',
   'CTR (링크 클릭 ÷ 노출)', '두 비율 차이 양측 5% · 1.0% 대 1.5% 이상만 구분 · 메타 전달 알고리즘이 지면을 골라 인과 해석은 제한',
   null, '2026-11-07', null, null, 'panda', 9,
   '[["10/30","사전등록 수정 · B군을 수집·도감 대신 바다터로 · 일반 영상도 개편된 나룻배로 갱신"],["10/31","집행 시작 (w2_general_origin_v2 vs w2_general_sea_v2) · E5 와 같이 시작해 로그인 화면 두 무리에 소재가 섞임"],["11/7","H6 판정 1회 → 숫자 수동 입력"]]'::jsonb),
  ('ads_h7', '메타 광고 3주차 · 승자 vs C군', 'ext', 'plan',
   'H7: 3주차에 C군(한정 장식 또는 집 꾸미기)이 그때까지의 승자보다 클릭률(CTR)이 높나?',
   '광고 노출 (메타 A/B 사용자 분할 50:50 · 세트당 하루 5천 원)', '11/7 – 11/13',
   'dev/active/meta-ads-launch/parts/02-goals-hypotheses.md · H7',
   'CTR (링크 클릭 ÷ 노출)', '두 비율 차이 양측 5% · 1.0% 대 1.5% 이상만 구분',
   null, '2026-11-14', null, null, 'rabbit', 9,
   '[["11/7","3주차 예정 시작 (승자 vs C군)"],["11/14","H7 판정 1회"]]'::jsonb)
on conflict (id) do update set
  name = excluded.name, kind = excluded.kind, status = excluded.status, question = excluded.question, unit = excluded.unit,
  period = excluded.period, prereg = excluded.prereg, metric = excluded.metric, test = excluded.test, need = excluded.need,
  decide_after = excluded.decide_after, confound = excluded.confound, char = excluded.char, sort = excluded.sort,
  log = excluded.log, updated_at = now();

insert into public.cf_experiment_results (exp_id, source, result)
values
  ('ads_h1', 'manual', '{"type":"prop","compare":["halloween","general"],"arms":[],"notes":[
    "H1 판정용 노출·클릭 숫자는 아직 안 들어왔습니다 — 메타 광고 관리자 숫자를 넣으면 CTR 판정이 계산됩니다(1.0% 대 1.4% 이상만 구분).",
    "관측값(방향만, ml/reports/meta_w1_20261030/REPORT.md): 광고비 일반 66,037원 · 할로윈 66,534원 · 웹 유입 기기 298 대 135 · 게임 시작 66 대 30.",
    "H2 첫 플레이율(시작 ÷ 메타 LPV 역산): 일반 약 24.3% · 할로윈 약 22.6% — 비슷해서 클릭만 낚는 징후는 보이지 않음.",
    "H3 시작당 비용: 일반 약 1,001원 · 할로윈 약 2,218원 — 일반이 쌈(가설과 반대).",
    "D1(참고): 일반 10/58 · 할로윈 1/24 — 표본이 작아 95% 구간이 겹침. 할로윈 유입에는 별도 첫 화면 연출이 있었음.",
    "H4 유령 정원 입장률 · H5 배너 스토어 이동은 아직 집계 전."]}'::jsonb),
  ('ads_h6', 'manual', '{"type":"prop","compare":["b","general"],"arms":[],"notes":[
    "H6 판정용 노출·클릭 숫자는 아직 안 들어왔습니다 — 2주차 메타 숫자를 넣으면 CTR 판정이 계산됩니다(1.0% 대 1.5% 이상만 구분).",
    "탐색 가설 H2~H5 는 1주차와 같은 정의로 2주차에도 봅니다(방향만)."]}'::jsonb)
on conflict (exp_id) do nothing;

commit;
