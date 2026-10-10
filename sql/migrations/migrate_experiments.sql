-- =============================================================
--  🧪 관리자 실험 페이지 (2026-10-11) — dashboards/experiments.html
--
--  cf_experiments          실험 레지스트리(사람이 관리: 상태·가설·사전 기준·기록). 아래 시드는 2026-10-11 기준.
--  cf_experiment_results   실험별 최신 요약 1행 — ml/scripts/experiment_summary.py 가 매일 03:00 BigQuery 에서 계산해 넣는다
--                          (외부 실험처럼 숫자를 사람이 넣을 땐 source = 'manual').
--  cf_admin_experiments()  화면용 RPC — 관리자(cf_is_admin) 또는 유효한 공유 토큰.
--
--  화면 계산(차이·CI·SRM·최소 검출 효과·판정)은 dashboards/js/admin-metrics.js — 여기엔 원재료만 둔다.
-- =============================================================

create table if not exists public.cf_experiments (
  id            text primary key,
  name          text not null,
  kind          text not null check (kind in ('ab', 'multi', 'ext', 'policy')),   -- policy = 무작위 배정 없음(효과 판정 안 함)
  status        text not null check (status in ('plan', 'run', 'obs', 'done')),
  question      text not null,
  unit          text not null,           -- 배정 단위와 비율
  period        text not null,
  prereg        text,                    -- 결과 보기 전에 고정한 기준(문서·날짜)
  metric        text not null,           -- 주 지표 이름
  test          text,                    -- 공식 검정
  need          integer,                 -- 목표 표본(전체). 없으면 null
  decide_after  date,                    -- 이 날 전에는 판정하지 않는다(관측 창)
  confound      text,                    -- 알려진 교란(있으면 판정 대신 경고)
  verdict_note  text,                    -- 사람이 남긴 결론
  char          text not null default 'chick',
  sort          integer not null default 100,
  log           jsonb not null default '[]'::jsonb,   -- [["9/6","배포"], ...]
  updated_at    timestamptz not null default now()
);

create table if not exists public.cf_experiment_results (
  exp_id       text primary key references public.cf_experiments(id) on delete cascade,
  computed_at  timestamptz not null default now(),
  source       text not null default 'bq' check (source in ('bq', 'manual')),
  result       jsonb not null
);

alter table public.cf_experiments enable row level security;
alter table public.cf_experiment_results enable row level security;
revoke all on public.cf_experiments, public.cf_experiment_results from anon, authenticated;
grant select, insert, update on public.cf_experiment_results to service_role;
grant select on public.cf_experiments to service_role;

-- 요약 스크립트가 페르소나 user_id 를 받아 GA4·BQ 에서 뺀다(service role 전용)
grant execute on function public.cf_persona_user_ids() to service_role;

create or replace function public.cf_admin_experiments(token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if public.cf_is_admin() then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_admin_experiments.token and s.expires_at > now();
    allowed := found;
  end if;
  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  return jsonb_build_object(
    'today', (now() at time zone 'Asia/Seoul')::date,
    'experiments', (
      select coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object(
               'result', r.result, 'computed_at', r.computed_at, 'source', r.source) order by e.sort, e.id), '[]'::jsonb)
      from cf_experiments e left join cf_experiment_results r on r.exp_id = e.id
    )
  );
end;
$$;
revoke all on function public.cf_admin_experiments(text) from public;
grant execute on function public.cf_admin_experiments(text) to authenticated, anon;

-- ── 시드(2026-10-11) — 이미 있으면 내용만 갱신. 상태·결론은 이후 SQL 로 직접 고친다 ──
insert into public.cf_experiments (id, name, kind, status, question, unit, period, prereg, metric, test, need, decide_after, confound, verdict_note, char, sort, log)
values
  ('hint', '힌트 배너 개입', 'ab', 'obs',
   '이탈 예측 모델이 "곧 나갈 것"이라고 본 순간 힌트 배너를 띄우면 7일 안에 다시 오나?',
   '세션 (50:50)', '9/6 – 10/6 · 관측 끝 10/13', 'dev/active/metrics-framework/hint-banner-ab-prereg.md · 2026-10-08 고정',
   '7일 내 재방문', 'randomization 10,000회 · 주민 클러스터 부트스트랩 CI', 600, '2026-10-14', null, null, 'panda', 10,
   '[["9/6","배포 · 세션 단위 50:50 배정 시작"],["10/6","배정 종료"],["10/8","사전 기준 고정(결과 보기 전)"],["10/13","7일 관측 끝 → 판정"]]'),
  ('probe', '난이도 probe · 낚시', 'multi', 'run',
   '찌 반응 창을 좁히면(×0.45 · ×0.65 · 기본 ×1.0) 성공률이 얼마나 떨어지나? — 새 기본값을 고르기 위한 곡선',
   '판 (블록 셔플 3팔)', '9/26 – 진행 중', 'docs/superpowers/specs/2026-09-22-difficulty-probe-design.md',
   '성공률(×0.45 − 기본)', '유저 임의효과 계층 로지스틱 · arm 이 처치, dda 는 공변량', 450, null, null, null, 'chick', 20,
   '[["9/23","배포(probe_v=1, 고정 순회)"],["9/26","블록 셔플로 교체(probe_v=2) · 포기 기록 추가"]]'),
  ('reel', '꿈의 숲 릴스 훅', 'ext', 'run',
   '첫 5.7초 훅을 서사형(A)과 2인칭 질문형(B) 중 무엇으로 하면 링크를 더 누르나?',
   '조회 (인스타 A · 스레드 B)', '10/8 – 10/15', '덱 ab 필드 dream-hook-2026-10',
   '링크 클릭률', '두 비율 차이(참고용)', null, '2026-10-15', '플랫폼이 다르다 — 훅 효과와 인스타/스레드 차이가 섞인다', null, 'fox', 30,
   '[["10/8","A 인스타 · B 스레드 발행"],["10/15","7일 집계 → 숫자 수동 입력"]]'),
  ('guide', '리텐션 안내 배너', 'policy', 'run',
   '룰 + 모델 점수로 고른 세션에 다음 할 일을 안내한다 — 무작위 배정이 없어 운영 숫자만 본다.',
   '세션 (전원 적용 · 무작위 없음)', '9/19 – 진행 중', null,
   '7일 내 재방문', '없음 — 무작위 배정이 아니라 차이가 효과가 아니다', null, null, null, null, 'cat', 40,
   '[["9/19","웹 라이브"],["9/26","주간 재학습 DAG 가동"]]'),
  ('beta', '베타 번들 A/B', 'ab', 'done',
   '튜토리얼 재배치 · 3일 보상 ×1.5 · 첫 3회 관대 판정을 묶은 번들 A 가 더 다양하게 놀게 하나?',
   '사람 (명단 5:5)', '9/9 – 9/15', 'docs/beta/BETA_AB_TEST_PLAN.md',
   '해본 활동 가짓수', '평균 차이 — 계획서 판단은 방향만(세 지표가 같은 방향이면 신호)', null, null, null,
   '표본이 작아 방향만 참고 → 일지 건의 반영으로 결론', 'bear', 50,
   '[["9/2","베타 시작"],["9/15","테스트 주간 끝"],["9/19","종료 · 일지 건의 반영"]]'),
  ('meta', '메타 광고 경로', 'ab', 'plan',
   '웹 배너 경유 vs 스토어 직행 — 어느 경로가 설치 후 D7 까지 더 남나?',
   '광고 클릭 (OS별 층화)', '안드로이드·iOS 입점 후', null,
   '설치자 D7 리텐션', '층화 두 비율 차이', 900, null, null, null, 'rabbit', 60,
   '[["10/7","계획: 두 스토어 입점 후 집행"]]')
on conflict (id) do update set
  name = excluded.name, kind = excluded.kind, question = excluded.question, unit = excluded.unit,
  period = excluded.period, prereg = excluded.prereg, metric = excluded.metric, test = excluded.test,
  need = excluded.need, decide_after = excluded.decide_after, confound = excluded.confound,
  char = excluded.char, sort = excluded.sort, updated_at = now();
