# 💬 NPC 대화 시스템 설계

- 작성일: 2026-09-15
- 브랜치(예정): `feat/npc-talk`
- 상태: 설계 확정, 구현 대기

## 1. 무엇을 만드나

퀘스트 창 옆 **[💬 대화하기]** 버튼으로 마을 주민과 3턴짜리 대화를 나눈다.
대사는 Gemini가 만들고, **만든 대사는 버리지 않고 Supabase 풀에 쌓아 돌려 쓴다.**

핵심 성질: **비용이 유저 수가 아니라 NPC 수에 비례한다.** 풀이 차면 생성이 멈추고,
평상시 `/api/npc-talk` 는 순수 읽기 API 가 된다.

## 2. 확정된 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 진입점 | 퀘스트 창 옆 버튼 | 접근성 우선(사용자 결정). NPC 앞 프롬프트 안은 채택 안 함 |
| 대화 형식 | 3턴 **수렴형** — 턴마다 선택지 3·응답 3 | 분기를 살리면 3→9→27 로 터진다. 수렴시키면 세트당 18발화로 선형 |
| 보상 | **없음**(순수 플레이버) | 선물은 재료를 쓰는데 대화는 공짜 — 친밀도를 주면 선물·작업대 루프가 희석된다 |
| 하루 제한 | NPC당 **2세트** | 마을 전체 22번. 소진 연출이 뜰 만큼 빠듯하되 답답하지 않음 |
| 저장 | 엣지 캐시 + **Supabase 누적 풀** | 캐시는 TTL 로 사라짐. 누적은 풀이 맡는다 |
| 대사 성격 | **evergreen 전용**(본문) | 날씨를 본문 키에 넣으면 풀이 4갈래로 쪼개져 채우는 데 4배 걸린다 |
| 날씨 | **첫인사 한 줄만** 별도 풀 | 날씨가 바꾸는 건 말문뿐. 날짜가 안 들어가 1회 생성으로 영구 사용 |
| 생성 주기 | 최초 시딩 1회 + **주 1회 크론** | Cloudflare Cron Triggers. 새 인프라 0 |
| 실패 로깅 | `npc_gen_runs` 테이블(**성공도 기록**) + Workers observability | 실패만 기록하면 "아예 안 돌았다"를 못 잡는다 |
| 소비 기록 | **세이브**(`gameState.talk`) | 보상이 0이라 치팅 유인이 없다. 유저 테이블은 RLS·동기화 비용만 는다 |

## 3. 구조

```
tools/seed-npc-dialogues.mjs ─┐
   (최초 1회, 수동)           ├─→ functions/api/_npc-gen.js ─→ Gemini ─→ Supabase 풀
worker scheduled (주 1회) ────┘        (생성 로직 단일 출처)

게임 ─→ GET /api/npc-talk ─→ 엣지 캐시 ─(miss)─→ Supabase 풀에서 날짜 시드로 2세트
                                              └─(풀 부족)─→ Gemini 폴백
```

생성 로직은 `_npc-gen.js` **한 곳에만** 둔다. 크론과 시딩 스크립트가 같은 함수를
import 한다(`cafe-guests` 의 "로직은 functions/api 에, worker 는 재사용" 규칙과 동일).

## 4. API

```
GET /api/npc-talk?date=YYYY-MM-DD&npc=<id>&lang=ko|en&weather=clear|rain|snow|fog
→ { opener: "비가 오니 밭이 조용하구먼.",
    sets: [ { id, turns: [ { choices: [3], replies: [3] } × 3 ] } × 2 ],
    farewell: "이만 가봐야겠어. 밭이 부르네." }
```

- 캐시 키: **본문은 (date × npc × lang) = 22키/일.** weather 는 캐시 키에 넣지 않는다
  — opener 만 weather 로 갈리고, opener 는 날짜와 무관한 영구 풀에서 뽑는다.
- `npc` 는 `NPCS` 의 id 화이트리스트로만 받는다(프롬프트 인젝션 차단).
- 실패 시 빈 응답 → 게임은 로컬 기본 대사로 조용히 진행.

## 5. 스키마

```sql
-- 대화 본문 풀
create table public.npc_dialogues (
  id           bigint generated always as identity primary key,
  npc_id       text not null,
  lang         text not null check (lang in ('ko','en')),
  turns        jsonb not null,                     -- [{choices:[3], replies:[3]} × 3]
  created_date date not null default (now() at time zone 'Asia/Seoul')::date
);
create index on public.npc_dialogues (npc_id, lang);

-- 날씨 첫인사 풀 (1회 생성, 영구)
create table public.npc_openers (
  id      bigint generated always as identity primary key,
  npc_id  text not null,
  lang    text not null check (lang in ('ko','en')),
  weather text not null check (weather in ('clear','rain','snow','fog')),
  line    text not null
);
create index on public.npc_openers (npc_id, lang, weather);

-- 생성 실행 기록 (성공·실패 모두)
create table public.npc_gen_runs (
  id          bigint generated always as identity primary key,
  ran_at      timestamptz not null default now(),
  source      text not null,                       -- 'cron' | 'seed'
  requested   int  not null,
  inserted    int  not null default 0,
  failed      int  not null default 0,
  error       text,                                -- 첫 실패 메시지, 400자 절단
  duration_ms int
);
```

RLS: 세 테이블 모두 정책을 만들지 않는다 = anon·authenticated 는 읽기도 쓰기도 불가.
**읽기**는 `security definer` rpc 로만 연다(anon 실행 허용).
**쓰기**는 RLS 를 우회하는 `service_role` 로만 — 워커 크론과 시딩 스크립트.

⚠️ 쓰기에 **`SUPABASE_SERVICE_KEY` 시크릿 1개가 필요하다.** `cafe_guests` 는
authenticated 쓰기를 열어 뒀지만 그건 분석용 기록이라 오염돼도 분석만 더러워진다.
이 테이블은 **게임 화면에 그대로 뜨는 콘텐츠**라, 공개 anon 키로 쓰기가 열리면
누구나 아무 문장이나 띄울 수 있다(전연령 등급 심사 리스크).
키 자체는 `toss-auth` 가 이미 쓰는 것과 같아 새로 발급할 건 없고 `wrangler secret put` 한 번.

읽기 rpc 3개: `npc_dialogue_pick(npc, lang, seed, n)` · `npc_opener_pick(npc, lang, weather, seed)` ·
`npc_pool_counts()`. 쓰기는 rpc 없이 service_role REST 직행.

## 6. 뽑기 — 매일 바뀌되 AI 를 안 부른다

풀은 고정인데 뽑는 건 매일 바뀐다. `todayStr()` 를 시드로 **결정적 선택**:

```
풀: 농부 30세트(고정)  →  9/15: 7·22번   9/16: 3·15번   9/17: 28·11번
```

같은 날 접속한 모두가 같은 2세트를 본다(엣지 캐시와 자동 일치).

## 7. 생성 주기

| 시점 | 무엇 | 양 |
|---|---|---|
| 최초 1회(수동) | `node tools/seed-npc-dialogues.mjs --sets 30 --openers` | 660세트 + 264줄 |
| 주 1회 크론 | 일요일 04:00 KST (`0 19 * * 0` UTC) | (npc 11 × lang 2) × 3세트 = 66세트/주 |
| 정지 | NPC·언어당 **100세트 상한** | 약 7개월 후 자동 정지 |

상한이 없으면 DB 가 무한히 커지고 뽑기 쿼리가 느려지고 요금이 계속 나간다.

크론 실패는 재시도하지 않는다 — 풀에 대사가 이미 있어 게임은 멀쩡하다. 다음 주에 다시 시도.

## 8. 게임 쪽

**소비 기록(세이브)**

```js
gameState.talk = { date: '2026-09-15', used: { farmer: 1, angler: 2 } }
```

`todayStr()` 이 바뀌면 리셋. 복원은 기존 패턴 그대로 `if (saved.talk)` —
읽기 실패를 신규로 오인해 덮어쓰지 않게 한다(세이브 덮어쓰기 사고 교훈).

**소진 연출**

2세트를 다 쓴 NPC 에게 말을 걸면 `farewell` 이 뜬다. NPC 별 고정 문구이고,
잔소리가 아니라 **자연스러운 작별**로 쓴다(힐링 게임 톤 보존).
문구 후보는 구현 전 별도로 검수받는다.

**i18n**

`t()` 는 한국어 원문 키 사전이라 생성 대사에는 닿지 않는다.
대사는 `lang` 파라미터로 **서버가 언어별로** 내려준다. 사전에 넣지 않는다.

**모바일 HUD**

`#quest-panel` 은 이미 화면 높이를 보고 표시 건수를 줄이고 있다(`questPanelTop()`).
버튼을 얹으면 그 계산에 같이 반영해야 한다. 모바일 3단 레이아웃 규칙을 지킨다.

## 9. 놓치기 쉬운 곳

- [ ] `worker/index.js` 에 `/api/npc-talk` 라우트 **등록**(빠뜨리면 404 — 전례 있음)
- [ ] `scripts/serve.py` 로컬 미러(`daily-quests` 주석: "한쪽만 고치지 마세요")
- [ ] `wrangler.jsonc` 에 `triggers.crons` + `observability.enabled`
- [ ] GA4 트래킹을 구현과 같이 — `npc_id`·세트 index·턴 index·소진 여부

## 10. 트래킹

| 이벤트 | 파라미터 | 왜 |
|---|---|---|
| `npc_talk_open` | `npc_id`, `set_index` | 누구와 얼마나 대화하나 |
| `npc_talk_turn` | `npc_id`, `turn`, `choice` | 중간 이탈 지점 |
| `npc_talk_done` | `npc_id`, `duration_ms` | 끝까지 보나 |
| `npc_talk_exhausted` | `npc_id` | 소진 연출 도달률 |

**성공 기준:** 대화를 연 유저의 재방문율이 안 연 유저보다 높은가.
높지 않으면 콘텐츠를 늘리지 말고 접는다.

## 11. 테스트

- `_npc-gen.js` 순수 함수(프롬프트 조립·응답 검증·상한 판정) 단위 테스트
- 날짜 시드 뽑기가 **결정적**인지(같은 날짜 → 같은 세트)
- 풀 부족 시 Gemini 폴백 경로
- 소비 카운터 날짜 리셋
- 세이브 복원에서 `talk` 누락 시 기존 세이브가 안 깨지는지
