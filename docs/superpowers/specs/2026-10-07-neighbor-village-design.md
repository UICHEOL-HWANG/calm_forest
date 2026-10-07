# 🏡 이웃 마을 구경하기 (1단계: 앞마당) — 설계

- 날짜: 2026-10-07
- 상태: 사용자 결정 완료(오늘의 이웃 A · 기본 공개 A · 앞마당만 A · 반응+알림+소액 보상 A · 구현 1안 · 화면 A+C 조합) → 스펙 검토 대기
- 화면 시안: `dev/active/neighbor-village/ui-mockup-abc.png` (확정: 고르기 A 엽서 카드 · 반응 C 말풍선 · 알림 A 모달)
- 선행: 📖 스토리 8장 `neighbors`(현재 `soon:true`) — 이 기능으로 해제

## 1. 목적

지금까지의 콘텐츠는 전부 혼자 하는 것이다. 이웃 마을은 **처음으로 다른 플레이어를 보는 축**이다.
- 재방문 동기: "누가 내 마을에 다녀갔나"(받는 쪽) + "오늘의 이웃 3곳"(가는 쪽)
- 꾸미기·프리미엄 스킨의 **보여줄 곳** — 집·장식·옷이 남에게 보인다
- 8장 「이웃의 숲」으로 서사를 닫는다("잎사귀를 받은 건 너 하나가 아니란다")

성공 기준(배포 4주 뒤, 로그인 계정 기준): 주간 활동자 중 방문 경험 30% · 방문자의 반응 남김률 60% · 반응을 받은 사람의 다음날 복귀율이 못 받은 사람보다 높은지(관찰, 인과 아님).

## 2. 범위

**1단계(이 스펙)**: 앞마당 — 집 외관(단계·색·구성품) · 야외 장식 · 집주인 캐릭터(옷·펫). 반응 4종 · 다녀간 이웃 알림 · 방문 보상 · 공개 설정 · 8장 해제.
**2단계(별도)**: 실내 가구 구경. **범위 밖**: 밭·과수원, 자유 입력(방명록), 친구 목록, 신고/차단(자유 입력이 없어서 1단계엔 불필요).

## 3. 사용자 흐름

1. 마을의 **🏡 이웃 마을 가는 길** 팻말 앞에서 액션 → **오늘의 이웃** 창(A 엽서 카드).
   - 이웃 3명: 캐릭터 얼굴 · 닉네임 · `🏡 집 단계 이름 · 🪴 장식 N` · [놀러 가기]. 오늘 이미 다녀온 이웃은 흐리게 + `❤️ 다녀옴` 배지 + [또 보기].
   - 하단 `🪙 오늘 받은 방문 보상 n/3`.
2. [놀러 가기] → 이웃 공간으로 이동(다른 인스턴스와 같은 페이드). 상단 `🏡 {닉네임} 의 마을`, 좌하단 `🚪 내 마을로`. **도구 바·퀘스트 패널·스토리 칩 숨김**.
3. 집주인 캐릭터 가까이 가면 말풍선(C): `🐰 "와 줘서 고마워요! 어땠어요?"` + 👋 ❤️ 🌸 ⭐.
   - 누르면 토스트 `❤️ 마음을 남겼어요 · 🪙+5`(보상 3회 넘으면 `❤️ 마음을 남겼어요`만). 같은 이웃엔 하루 1회 — 이후 말풍선은 `🐰 "또 와 줘서 기뻐요!"`(버튼 없음).
   - 게스트(익명): 구경은 되고, 반응을 누르면 `🔐 로그인하면 마음을 남길 수 있어요` + 로그인 안내(광장과 같은 규칙).
4. 접속(부팅) 때 내가 마지막으로 확인한 뒤 다녀간 이웃이 있으면 **알림 모달(A)**: `🏡 이웃 3명이 다녀갔어요` / `어제부터 지금까지` / 닉네임·반응 목록(최대 10, 넘으면 `외 N명`) / [고마워요 🌱].
5. 첫 방문을 마치면 📖 8장 완료(🪙150).

## 4. 데이터·서버 (Supabase)

### 4.1 테이블
```sql
village_profiles(
  user_id uuid primary key references auth.users on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),   -- 밖으로 나가는 유일한 식별자
  is_public boolean not null default true,
  updated_at timestamptz not null default now())
village_visits(
  id bigserial primary key,
  visitor uuid not null references auth.users on delete cascade,
  host uuid not null references auth.users on delete cascade,
  day date not null,                                           -- KST 날짜
  emoji text not null check (emoji in ('wave','heart','flower','star')),
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (visitor, host, day), check (visitor <> host))
```
RLS on, 정책 없음(직접 접근 금지) — 전부 SECURITY DEFINER RPC 경유. `revoke all … from public, anon`, 필요한 RPC 만 grant.
`village_profiles` 행은 RPC 가 필요할 때 `insert … on conflict do nothing` 으로 만든다(별도 가입 절차 없음).

### 4.2 RPC (전부 `security definer`, `set search_path = public`, uuid 를 반환하지 않음)
| 함수 | 권한 | 동작 |
|---|---|---|
| `neighbors_today()` | authenticated(익명 포함) | 후보 = 공개 + 비익명 + `game_saves.updated_at` 7일 이내 + `houseStage ≥ 1` + 본인 제외. 정렬 `md5(caller ‖ kst_day ‖ host)` 로 **하루 동안 같은 3명**(새로고침 리롤 불가). 반환 `{public_id, nick, character, house_stage, decor_n, visited_today, reacted_emoji}` ×≤3 + `rewarded_today` |
| `neighbor_showcase(p_public_id)` | anon·authenticated | 공개 계정이면 **허용 목록만** 담은 jsonb, 아니면 null (§4.3) |
| `neighbor_react(p_public_id, p_emoji)` | authenticated, `auth.jwt()->>'is_anonymous'` 이면 거절 `reason:'login'` | 오늘 그 집에 처음이면 insert. `rewarded = (오늘 내가 rewarded 한 수 < 3)`. 반환 `{ok, reason, rewarded, rewarded_today}` (`reason`: `dup`·`login`·`private`·`self`·`not_found`) |
| `my_visitors(p_since timestamptz)` | authenticated | 나를 다녀간 기록 `{nick, character, emoji, at}` 최신 10건 + `total` |
| `set_village_public(p_on boolean)` | authenticated | 내 공개 여부 저장 |

### 4.3 공개 허용 목록(showcase)
`nickname` · `character` · `cosmetics.equipped` · `pet.kind`(+단계 계산용 `works` 수) · `houseStage` · `houseStyle` · `house.style` · `house.addons` · `outdoor[{id,x,z,rot}]` 중 **집 터 반경 14 이내**(앞마당만) · `coop.built`.
**절대 내보내지 않음**: user_id · inventory · cashOwned · cosmetics.owned · 펫/일꾼 이름(자유 입력) · 저장고·창고·제작 슬롯 · 위치·일일 상태 등 나머지 전부. 허용 목록은 SQL 안에서 키를 하나씩 골라 만든다(`state - '...'` 식 제외 목록 금지 — 새 필드가 자동 노출되는 사고 방지).

### 4.4 Worker
- `GET /api/neighbor?id=<public_id>` → `neighbor_showcase` 프록시, 엣지 캐시 10분, `UUID_RE` 검증. `worker/index.js` 라우트 등록 + `scripts/serve.py` 미러(memory: api-route-wiring).
- `neighbors_today`·`neighbor_react`·`my_visitors`·`set_village_public` 은 유저별이라 캐시 없이 클라이언트가 supabase-js RPC 로 직접 호출.

## 5. 클라이언트

새 코드는 `js/neighbors/` (game.js 는 연결 몇 줄 — memory: split-files-not-gamejs).

| 파일 | 역할 |
|---|---|
| `js/neighbors/api.js` | RPC·`/api/neighbor` 호출, 실패는 `{ok:false}` 로(조용한 실패 금지 — 토스트) |
| `js/neighbors/sanitize.js` | showcase 응답 검증(모르는 장식 id·NaN 좌표 버림, 장식 최대 40) — 순수, Node 테스트 |
| `js/neighbors/scene.js` | 이웃 공간 짓기·치우기. **넘겨받은 데이터로만** 그린다: `buildHouseModel`·`mountHouseAddons`(js/house) · `outdoorMesh(id)` · `buildCharacterMesh(id, cos)` · `spawnPet`. 집 외관 색은 `applyHouseStyle` 와 같은 표(`PART_COLORS`)를 인자로 |
| `js/neighbors/ui.js` | 오늘의 이웃 창 · 말풍선 반응 · 알림 모달 · 설정 토글 |
| `js/spaces/neighbor.js` | 입장/퇴장(`setSpaceVisible`·카메라·HUD 숨김), 팻말 근접 프롬프트 |

**공간**: `NEIGHBOR = (0,0,700)`(비어 있음, 가장 먼 인스턴스 천문대 540). 바닥·울타리·나무 몇 그루는 고정 세트. 이웃의 집은 공간 중앙, 야외 장식은 `집 터 기준 상대좌표`로 옮겨 놓는다. 집주인 캐릭터는 문 앞.
**내 세이브 보호**: 이웃 공간에서는 `gameState` 를 읽기만 한다. 이웃 데이터는 별도 객체에만 둔다. 퇴장 시 이웃 메시·재질 dispose. 테스트로 "scene.js 가 gameState 를 쓰지 않는다"를 잠근다.
**입구 팻말**: 마을 안 빈터(구현 계획에서 NPC 홈·기존 장소와 겹침 검사로 좌표 확정) + 미니맵·전체 지도 아이콘.

**세이브(새 필드)**: `neighbors: { visited: n, seenAt: ms }` — `visited` 는 8장 판정, `seenAt` 은 알림 기준. 옛 클라이언트는 모르는 최상위 키를 저장할 때 버릴 수 있다 → 최악의 경우 알림이 한 번 더 뜨고 8장 진행이 0 으로 보임. **4곳 동시 배포**로 창을 줄인다.

**8장 해제**: `STORY` 의 `neighbors` 에서 `soon` 제거, `STORY_RULES.neighbors = { done: s => (s.neighbors?.visited||0) >= 1, progress: s => '방문 n/1' }`, 훅 `syncStory('neighbor_visit')`. 8장 done 문구는 §8 에서 검수.

**설정**: ⚙️ 설정에 `🏡 이웃에게 내 마을 보여 주기` 토글(기본 켬). 배포 후 첫 접속에 한 번 `🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요`. 게스트는 후보에 안 들어가므로 토글을 숨긴다.

## 6. 경제

방문 보상 이웃당 🪙5, 하루 3회(🪙15) — 서버가 횟수를 판정, 지급은 `giveReward({coins:5}, 'neighbor_visit', public_id)`. 하루 코인 p50 20 대비 +75% 상한이라 크지만 **로그인 유도 + 매일 접속 이유**가 목적. 4주 뒤 econ_logs 로 재평가.

## 7. 트래킹 (memory: feature-tracking-checklist)

식별자: 이웃 = `public_id`(무작위, PII 아님), 반응 = `wave|heart|flower|star`. GA4 예약어 미사용.

| 이벤트 | 파라미터 |
|---|---|
| `neighbors_open` | `shown`(후보 수 0~3), `rewarded_today`, `via`(sign\|map) |
| `neighbor_visit_start` | `host`(public_id), `slot`(0~2), `revisit`(0/1), `load_ms` |
| `neighbor_react` | `host`, `emoji`, `rewarded`(0/1), `reason`(ok\|dup\|login\|private) |
| `neighbor_visit_end` | `host`, `sec`, `reacted`(0/1) |
| `neighbor_visitors_notice` | `n`, `total` |
| `village_public_toggle` | `on`(0/1) |
| `neighbor_load_fail` | `stage`(today\|showcase\|react), `code` |

DB: `village_visits` 자체가 원장(누가 누구를 언제 어떤 반응으로). econ_logs 는 `neighbor_visit` 출처로 기존 원장이 기록.

서버 원장 2종(`sql/migrations/migrate_neighbors_ledger.sql`, RLS on·정책 없음·RPC 로만):

| 원장 | 언제 남나 | 쓰임 |
|---|---|---|
| `village_views` | 입장 `neighbor_view_start`(게스트 포함 `is_guest`, `slot`·`revisit`) → 퇴장 `neighbor_view_end`(GA4 `neighbor_visit_end` 와 같은 `sec`·`reacted`, sec 0~3600). 방문자당 하루 30행 상한 | 반응 없는 방문까지 센다 — 성공 기준 「주간 활동자 중 방문 경험」의 분자(GA4 는 광고 차단으로 빠질 수 있음). 탭을 닫으면 `ended_at`·`sec` 이 null(머문 시간은 닫힌 행만) |
| `moderation_log` | `admin_village_moderate` 가 플래그를 실제로 바꾼 호출마다(`hide`·`unhide`·`hide_nick`·`unhide_nick`, 둘 다면 `+`), before/after 플래그 | 앱인토스 UGC 자율 관리 증빙. 관리자 화면 「최근 조치」(`admin_moderation_log`, uuid 없음) |

실패는 GA4 `neighbor_load_fail` `stage=view_start|view_end`.
다음날 BQ 재검증: 위 7종 적재·`host` 값이 uuid 형식·dev 세션 제외.

## 8. 문구

검수 완료(2026-10-07): `오늘의 이웃` · `같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요` · `놀러 가기` · `또 보기` · `❤️ 다녀옴` · `🪙 오늘 받은 방문 보상 n/3` · `🏡 {닉네임} 의 마을` · `🚪 내 마을로` · `"와 줘서 고마워요! 어땠어요?"` · `❤️ 마음을 남겼어요 · 🪙+5` · `이웃 3명이 다녀갔어요` · `어제부터 지금까지` · `고마워요 🌱`

**미검수(구현 계획 전에 검수)**: 팻말 `🏡 이웃 마을 가는 길` · 재방문 말풍선 `"또 와 줘서 기뻐요!"` · 게스트 `🔐 로그인하면 마음을 남길 수 있어요` · 후보 0명 `아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요` · 설정 토글 `🏡 이웃에게 내 마을 보여 주기` · 첫 안내 `🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요` · 8장 done 문구 · 개인정보처리방침 추가 문단 · 영어 전부.

## 9. 테스트

- Node: `sanitize.js`(모르는 id·좌표·개수 상한·반경 14) · 8장 규칙 · 보상 표시 · `scene.js` 가 `gameState` 에 쓰지 않음(소스 검사) · i18n 키 · 배선(worker 라우트·serve.py 미러).
- SQL 셀프테스트 `sql/tests/neighbors_selftest.sql`(광장 패턴): 비공개 제외 · 익명 반응 거절 · 하루 1회 · 보상 3회 상한 · 본인 제외 · showcase 에 uuid/inventory 없음 · 날짜 고정 정렬.
- 브라우저: 두 계정(테스트 계정 — 끝나면 삭제)으로 방문·반응·알림 왕복, PC·폰, 영어.

## 10. 배포 전 확인

- 개인정보처리방침(`pages/privacy.html`) 공개 항목 갱신 — **배포와 동시에**.
- 앱인토스 정책: 유저 간 상호작용(UGC) 조항 확인 — 자유 입력 없음·정해진 반응만이라 해당 가능성 낮지만 출시 전 문서 확인.
- DDL 은 사용자가 SQL Editor 에서 실행(Supabase MCP 는 읽기 전용).
- 4곳 동시 배포(새 세이브 필드).

## 11. 2단계 메모

실내 구경: `buildRoom`/`placeDecor` 가 전역에 쓰므로 `decorMesh(id)`(순수)로 따로 배치하는 실내 렌더러가 필요. showcase 에 `house.decor` 추가.
