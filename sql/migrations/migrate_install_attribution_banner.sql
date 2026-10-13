-- =============================================================
--  calm forest · 📲 install_attribution — 웹 앱 유도 배너 연결 컬럼 (2026-10-13)
--  ------------------------------------------------------------
--  실행: pg8000 풀러로 직접(파일 전체 한 번에). 멱등.
--  ⚠️ 이 컬럼을 보내는 안드로이드 앱(js/install-referrer-boot.js) 보다 먼저 적용 — 없으면 insert 가 실패한다
--     (실패는 재시도되지만 그동안 행이 안 쌓인다). 옛 앱은 이 컬럼을 안 보내므로 기본값으로 들어간다.
--
--  ▶ content : referrer 의 utm_content — 메타 광고 소재 팔(hook_a·hook_b). 없으면 '(none)'
--  ▶ jid     : 웹 여정 ID(js/app-banner.js, localStorage cf_first_touch) — 웹 GA4 app_banner_click.jid 와 조인해
--              "배너를 누른 사람이 실제로 설치했다"를 사람 단위로 잇는다. 없으면 ''
-- =============================================================

alter table public.install_attribution add column if not exists content text not null default '(none)';
alter table public.install_attribution add column if not exists jid     text not null default '';

alter table public.install_attribution drop constraint if exists install_attribution_banner_len_chk;
alter table public.install_attribution add constraint install_attribution_banner_len_chk
  check (length(content) <= 40 and length(jid) <= 32);

create index if not exists idx_install_attr_jid on public.install_attribution (jid) where jid <> '';
