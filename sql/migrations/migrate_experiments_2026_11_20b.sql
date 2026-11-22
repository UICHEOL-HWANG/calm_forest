begin;

update public.cf_experiments set
  name = '메타 광고 3주차 · 웹 경유 vs 스토어 직행',
  kind = 'ext',
  status = 'run',
  question = '광고를 누른 사람을 웹(calmforest.cloud 첫 화면)으로 보내는 것과 스토어로 바로 보내는 것(/app) 중, 같은 돈으로 Android 설치를 더 데려오는 쪽은?',
  unit = '사람 (메타 실험 화면 광고 세트 비교 50:50 · 세트당 하루 1만 원 · Android·iOS 모두 노출)',
  period = '11/20 18:00 – 11/27 23:59',
  prereg = 'dev/active/meta-channel-ab/meta-channel-ab-design.html · 2026-11-16 초안 (11/20 변경: 7일 집행·영상 교체 없음)',
  metric = 'R = 스토어 직행 ÷ 웹 경유 (클릭 후 7일 안 Android 설치 ÷ Android 광고비 × 1만)',
  test = 'R ≥ 0.8 이면 스토어 직행으로 전환 · R < 0.8 이면 웹 경유 유지 · R 의 95% CI 가 0.8 을 걸치면 운영 결정으로 기록 (0.8 은 제안값, 확정 전)',
  need = null,
  decide_after = '2026-12-04',
  confound = '집행 기간 내내 E5(로그인 화면 게스트 우선)가 같이 돌아 웹 경유로 온 사람은 로그인 화면 두 무리로 다시 나뉜다 · iOS 는 광고비 6% 라 참고만',
  verdict_note = null,
  log = '[["11/7","원래 3주차(승자 vs C군 영상 클릭률) 예정"],["11/11","원래 3주차 보류 — 게임 개선·광고 붙이기 작업"],["11/16","3주차를 웹 경유 vs 스토어 직행으로 다시 설계"],["11/20","7일 집행 시작(18:00) · 영상 3편 한 광고에 함께"],["12/4","마지막 날 클릭의 7일 설치 창이 닫힌 뒤 판정 1회"]]'::jsonb,
  updated_at = now()
where id = 'ads_h7';

commit;
