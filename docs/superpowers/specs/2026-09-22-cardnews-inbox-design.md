# 카드뉴스 소재 인박스 — 설계

작성 2026-09-22 · 1단계 (소재 인박스)

## 왜 만드나

지금 카드뉴스 파이프라인의 수동 지점이 넷인데, 그중 셋이 "텍스트를 눈으로 훑고 손으로 옮겨 쓰는" 일이다.

```
[크론 11:00]  topics.mjs ─┐
              news.mjs  ─┴→ topic-filter.mjs → decks/_inbox/YYYY-MM-DD-community.json
                                                     ↓  📧 메일로 통째 전송
① 사람: 메일 읽고 소재 고른다                     ← 웹으로 옮긴다 (이 스펙)
② 사람: decks/deck-NN.json 에 카피를 쓴다         ← Claude 가 맡는다
                                                     ↓
[반자동]  deck-make.mjs ─ generate.mjs / shoot.mjs + theme.mjs → deck.mjs → out/deck-NN/*.png
③ 사람: 결과 7장을 눈으로 검수                    ← 2단계
④ 사람: host.mjs → publish.mjs 로 발행            ← 3단계
```

소재가 메일 본문으로만 오기 때문에 "어제 그 소재"를 다시 찾거나, 여러 건을 묶어 한 편을 구상한 것을 남겨 둘 방법이 없다. 매번 머릿속에서 다시 조립한다.

## 역할 분담 (합의됨)

```
소재 수집(자동 크론) → 웹에서 사람이 고르고 묶는다 → Claude 가 덱 초안을 만든다
                                                  → 웹에서 사람이 다듬고 승인 → 발행
```

이 스펙은 **첫 화살표 하나**만 다룬다.

## 단계 분해

| 단계 | 범위 | 상태 |
|---|---|---|
| **1. 소재 인박스** | 소재를 웹에서 훑고 묶음으로 정리 | **이 스펙** |
| 2. 덱 편집·승인 | headline·theme·img 수정, 미리보기, 승인 | 후속 스펙 |
| 3. 발행 연동 | 승인된 덱을 리포에 반영하고 발행 | 후속 스펙 |

1단계가 공통 토대(스키마·인증·배포·Worker 라우트)를 세우므로 2단계가 그 위에 얹힌다.

## 범위 밖 (의도적으로 뺀 것)

- **덱 편집·미리보기·승인** — 2단계.
- **이미지 일체** — 1단계 데이터는 전부 텍스트다. R2 버킷은 2단계에서 처음 만든다(결정만 내려둠: Worker 바인딩이라 새 시크릿이 0개, 무료 10GB, egress 무료).
- **수집 필터 통계(`dropped`)** — 메일과 로그에 이미 남는다. 필터가 과한지 보고 싶어지면 그때 테이블을 판다.
- **메일 폐지** — 메일은 그대로 둔다. "오늘 소재 왔다"는 신호가 여전히 필요하다. 웹이 안정되면 메일을 "요약 한 줄 + 링크"로 줄이는 것은 별건으로 다룬다.
- **`host.mjs`(KV) 교체** — 발행용 임시 URL은 KV가 정확한 선택이다(몇 분만 살면 되고 TTL 자동 삭제, 새 시크릿 0개). 건드리지 않는다.

## 데이터 모델

수집 JSON은 출처마다 필드가 다르다 — `jobplanet`은 `category`가 있고 url이 없다, `blind`도 url이 없다, `dc`/`mlb`만 url이 있는데 `javascript:;` 같은 값이 섞인다. 통합 테이블 하나로 흡수한다.

```sql
create schema if not exists cardnews;

create table cardnews.bundles (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users default auth.uid(),
  title       text not null,                      -- 예: "명절 스트레스"
  memo        text not null default '',           -- 한 줄. Claude 가 초안 잡을 때 읽는다
  status      text not null default 'draft'
              check (status in ('draft','ready')), -- 2단계에서 값 추가
  created_at  timestamptz not null default now()
);

create table cardnews.topics (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users default auth.uid(),
  collected_on  date not null,                    -- 2026-09-22
  source        text not null
                check (source in ('jobplanet','blind','dc','mlb','news')),
  category      text,                             -- 잡플래닛만 채워진다
  title         text not null,
  excerpt       text not null default '',         -- 빈 문자열이 실제로 온다
  url           text,                             -- dc·mlb 만
  bundle_id     uuid references cardnews.bundles on delete set null,
  dismissed     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (owner, collected_on, source, title)
);

create index on cardnews.topics (owner, collected_on);
create index on cardnews.topics (bundle_id);
```

`bundles`를 먼저 만든다 — `topics.bundle_id`가 참조한다.

### 설계 근거

**`unique (owner, collected_on, source, title)`** — 크론이 하루에 여러 번 깨어난다(부팅·로그인마다 `RunAtLoad`). 이 제약이 없으면 같은 소재가 중복으로 쌓인다. 업로드는 반드시 `upsert`로 한다.

**`picked` 상태를 두지 않는다** — "골랐다"는 `bundle_id is not null`로 알 수 있어 중복이다. 실제로 필요한 건 "안 쓸래"라서 `dismissed` 불리언 하나면 된다.

**한 소재는 한 묶음에만** (FK 하나, 조인 테이블 없음). 하루 20건에 묶음 하나가 카드뉴스 한 편이라 같은 소재를 두 편에 쓰는 일은 거의 없다. 필요해지면 조인 테이블로 승격한다.

**`cardnews` 스키마로 분리** — 게임 데이터(`public`)와 섞지 않는다. sim 스키마를 분리한 것과 같은 방향이다.

**`url`은 수집 단계에서 정제한다** — `javascript:;` 처럼 http(s)로 시작하지 않는 값은 `null`로 넣는다. DB에 쓰레기를 들이지 않는다.

**`source`에 `news` 포함** — 지금 크론은 `topics.mjs`(커뮤니티)만 올리지만 `news.mjs`(뉴스)가 같은 테이블을 쓸 것이므로 check 제약에 미리 넣어 둔다. 제약을 나중에 고치는 것보다 싸다.

### RLS

Worker가 service key로 붙더라도 심층 방어로 켠다.

```sql
alter table cardnews.topics  enable row level security;
alter table cardnews.bundles enable row level security;

create policy topics_own  on cardnews.topics
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy bundles_own on cardnews.bundles
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
```

`auth.uid()`를 서브쿼리로 감싸는 것은 매 행 함수 호출을 피하기 위해서다(기존 규칙과 동일).

## API

브라우저는 Supabase에 직접 붙지 않는다. Worker만 부른다. 기존 `functions/api/` 패턴(파일 하나 = 라우트 하나, kebab-case)을 따른다.

| 파일 | 메서드 | 하는 일 |
|---|---|---|
| `functions/api/cards-topics.js` | `GET ?date=YYYY-MM-DD` | 그날 소재 목록(묶음 정보 조인) |
| | `PATCH` `{id, dismissed}` | 숨김 토글 |
| `functions/api/cards-bundles.js` | `GET` | 묶음 목록 |
| | `POST` `{title, memo, topic_ids[]}` | 묶음 생성 + 소재 연결 |
| | `PATCH` `{id, title?, memo?, status?}` | 묶음 수정 |
| `functions/api/cards-ingest.js` | `POST` | 크론이 수집 결과 upsert |

### 인증이 둘로 갈린다

- **브라우저 → Worker**: Supabase Auth 구글 로그인 세션의 JWT를 `Authorization: Bearer`로 보낸다. Worker가 검증하고 `owner`를 거기서 꺼낸다. 클라이언트가 보낸 `owner`는 믿지 않는다.
- **크론 → `cards-ingest`**: 사람이 아니므로 사용자 JWT가 없다. 별도 시크릿 헤더를 쓴다(`CARDNEWS_INGEST_SECRET`). 이 라우트만 JWT 검증을 건너뛰고 시크릿을 검사한다. `owner`는 Worker 환경변수 `CARDNEWS_OWNER_UID`에 둔 계정 uuid를 쓴다 — 크론에는 로그인한 사용자가 없으므로 `auth.uid()` 기본값을 쓸 수 없다.

> ⚠️ **`worker/index.js`에 라우트 3개를 반드시 등록한다.** `functions/api` 아래 파일을 만들어 두고 등록을 빠뜨려 404가 난 전례가 있다(dex-notes·daily-quests). 등록 없이는 파일이 있어도 안 붙는다.

## 화면

화면은 둘뿐이다.

**① 소재 인박스** (기본)
- 상단: 날짜 선택(기본 오늘), "숨긴 것 보기" 토글
- 본문: 출처별 섹션(잡플래닛·블라인드·디시·엠팍). 한 건이 카드 한 장 — 제목, 접힌 본문, 출처 배지, 동작 둘(**담기** / **숨기기**)
- 트레이: 담은 소재가 쌓인다. 제목과 한 줄 메모를 달아 **묶음으로 저장**

하루 20건을 훑는 화면이라 클릭 수가 곧 품질이다. 담기는 한 번에 끝나야 한다.

`dismissed`는 기본으로 숨기되 토글로 되살릴 수 있게 한다 — 잘못 눌렀을 때 복구가 안 되면 스트레스가 된다.

**② 묶음 목록**
- 묶음과 상태(`draft`/`ready`), 담긴 소재 수
- **초안 요청** → `status='ready'`. Claude 가 읽는 건 이 상태다.

레이아웃(좌우 분할 / 트레이 위치 등)은 구현 전 시안을 렌더해 나란히 비교하고 정한다. PC와 모바일을 같이 본다.

## 크론 변경

`cron-topics.sh`에 업로드 한 단계가 붙는다. 수집(`topics.mjs`) 성공 뒤, 메일 발송 전에 `cards-ingest`로 올린다.

- 업로드 실패가 **메일 발송을 막지 않는다.** 메일이 아직 주 통로다. 실패는 로그에 남기고 계속 진행한다.
- 업로드는 `upsert`라 재시도가 안전하다.
- 시크릿은 리포에 넣지 않는다. 환경파일에서 읽는다.

## 배포

- Cloudflare Pages 새 프로젝트, `cards.calmforest.cloud`
- 게임 사이트와 **별도 배포**다. 게임 릴리스·토스 번들·itch zip 에 딸려가지 않는다.
- 정적 자산 + Worker API. 프론트가 `supabase-js`를 쓰는 곳은 **구글 로그인 한 군데뿐**이다(anon key·URL). 소재·묶음 읽기와 쓰기는 전부 Worker를 거치므로 service key는 프론트에 두지 않는다.

## 검증

구현이 끝났다고 말하기 전에 아래를 실제로 확인한다.

1. 크론을 한 번 돌려 그날 소재가 DB에 들어간다. **두 번 돌려도 행 수가 늘지 않는다**(upsert·unique 확인).
2. `javascript:;` 같은 url이 `null`로 들어간다.
3. 로그인하지 않은 브라우저가 세 라우트를 부르면 401이다.
4. 시크릿 없이 `cards-ingest`를 부르면 401이다.
5. 소재를 담아 묶음을 만들면 `topics.bundle_id`가 채워지고, 묶음을 지우면 소재가 `bundle_id is null`로 살아남는다(`on delete set null`).
6. 숨긴 소재가 기본 목록에서 빠지고 토글로 돌아온다.
7. `worker/index.js` 등록 확인 — 세 라우트 모두 404가 아니다.
8. 모바일 폭에서 인박스가 읽히고 담기가 눌린다.

## 열린 문제

- **소재가 며칠 지나면 어떻게 되나** — 지금은 계속 쌓인다. 하루 20건이면 한 달에 600건이다. 보존 기간이나 아카이브가 필요해지는 시점이 오지만, 규모가 작아 1단계에서는 다루지 않는다.
- **`news.mjs`(뉴스) 연동** — 스키마는 받을 준비가 돼 있으나 크론이 아직 올리지 않는다. 커뮤니티가 자리 잡은 뒤 붙인다.
