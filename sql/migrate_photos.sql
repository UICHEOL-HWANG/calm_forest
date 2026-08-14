-- =============================================================
--  calm forest · 📸 사진첩 메타데이터 테이블 (photos)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 사진 원본(JPEG)은 OCI Object Storage 버킷에, 메타데이터는 여기에.
--    목록·정렬·개수 확인은 이 테이블로(빠르고 RLS 보호),
--    이미지 표시는 서버(/api/photo-urls)가 발급한 presigned URL 로.
--  ▶ 구글 로그인 유저 전용 — 게스트(익명)는 업로드 자체가 서버에서 차단됨.
-- =============================================================

create table if not exists public.photos (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,   -- OCI 오브젝트 키: photos/<user_id>/<ts>.jpg
  weather    text,                   -- 찍은 날 날씨 이모지(카드 정보바와 동일)
  taken_at   timestamptz not null default now()
);

create index if not exists idx_photos_user_taken on public.photos (user_id, taken_at desc);

alter table public.photos enable row level security;

drop policy if exists "own photos select" on public.photos;
create policy "own photos select" on public.photos
  for select using (auth.uid() = user_id);

drop policy if exists "own photos insert" on public.photos;
create policy "own photos insert" on public.photos
  for insert with check (auth.uid() = user_id);

drop policy if exists "own photos delete" on public.photos;
create policy "own photos delete" on public.photos
  for delete using (auth.uid() = user_id);
