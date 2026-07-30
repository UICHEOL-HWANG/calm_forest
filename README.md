# 🌿 calm forest

동물의 숲 톤의 포근한 로우폴리 3D 브라우저 게임. Vanilla JS + Three.js(WebGL)로 만들었고, **외부 이미지·모델·사운드 파일 없이** 모든 형상·효과음을 코드로 생성합니다.

🎮 **플레이**: https://uicheol-hwang.github.io/calm_forest/

**주요 기능**: 걷기 · 벌목 · 농사(밭갈기/심기/물주기/수확) · 건축(단계 건설) · NPC 3명 & 퀘스트 체인 · 호수/공원/벤치/가로등/꽃밭 환경 · 자연스러운 낮·밤 그라데이션(+수동 조절) · 별·반딧불이·창문 불빛 · 파티클 & 블룸 · 절차적 사운드 · 모바일 터치 · 신규 유저 튜토리얼 · 구글 로그인 · 자동 클라우드 저장 · 개발자 피드백 · 행동 데이터 분석(Supabase/GA4/BigQuery)

기술 스택: **Vanilla JS + Three.js** (프론트) · **Supabase**(Auth/Postgres) · **GA4 + BigQuery**(분석) · **GitHub Pages + Actions**(배포).

## 📁 파일 구조

```
calm_forest/
├─ index.html            # 게임 진입점 · UI · importmap · 오케스트레이션 (루트 유지)
├─ README.md
├─ .env / .env.example / .gitignore
├─ js/                   # 🎮 게임 소스 (ES 모듈)
│  ├─ config.js          #   ⚙️ 설정(키/ID, 로깅 간격) — 여기만 바꾸면 됨
│  ├─ supabase-client.js #   🔐 로그인 · 저장/불러오기 · game_logs 배치 전송
│  ├─ analytics.js       #   📈 GA4 이벤트 + gtag 자동 로딩
│  ├─ logger.js          #   🛰️ 센서 데이터 throttle 수집 + 배치 전송
│  ├─ game.js            #   🌳 3D 씬 · 걷기 · 벌목 · 농사 · 건축 · NPC/퀘스트 · 파티클 · 블룸
│  ├─ controls.js        #   📱 모바일 가상 조이스틱 + 액션 버튼
│  └─ sound.js           #   🔊 절차적 효과음(WebAudio)
├─ dashboards/           # 📊 분석 대시보드 (브라우저에서 열기)
│  ├─ analytics.html     #   본인 데이터: 이동 히트맵·세션·시선
│  └─ admin_analytics.html #  관리자: 전체 유저 합산 통계
├─ sql/                  # 🗄️ Supabase / BigQuery SQL
│  ├─ supabase_setup.sql #   테이블·RLS·분석 뷰 생성 (한 번 실행)
│  ├─ admin_analytics.sql#   관리자 집계 보안함수
│  ├─ analytics_queries.sql # 전체 유저 집계 쿼리 팩 (E: 세그먼트·A/B·pre/post)
│  ├─ bigquery_queries.sql  # BigQuery 쿼리 팩 (GA4 + 6: 행동로그 세그먼트/AB)
│  ├─ quality_checks.sql #   🩺 계측 품질 체크(체험단 전 검증용)
│  ├─ migrate_ab_fields.sql    # (기존 DB) client_id·is_guest·variant 추가+백필
│  └─ migrate_ab_fields_bq.sql # (BigQuery) 동 컬럼 추가+variant 백필
├─ scripts/              # 🔄 Supabase→BigQuery 일일 적재+경량화+익명계정 정리
│  └─ export_to_bq.py
├─ .github/workflows/    # ⚙️ GitHub Actions (Pages 배포 + BQ 파이프라인)
└─ docs/                 # 📚 문서
   ├─ DEPLOY.md          #   🚀 Supabase·GA4·GitHub Pages 배포 가이드
   ├─ GA4_GUIDE.md       #   📈 GA4 설정·탐색 가이드
   └─ DATA_PIPELINE.md   #   🔄 Supabase→BigQuery 파이프라인 + 7일 경량화
```

> 실제 연동(Supabase 키·GA4)과 배포는 **`docs/DEPLOY.md`** 를, DB 초기화는 **`sql/supabase_setup.sql`** 을 참고하세요. 키를 안 넣어도 게임은 오프라인 폴백으로 동작합니다.

## 🔭 데이터 분석 구조 (한눈에)

계측은 게임 클라이언트에서 시작해 두 갈래로 흐릅니다. **행동 로그**(좌표·세션)는 Supabase→BigQuery로, **이벤트**(벌목·수확·퀘스트 등)는 GA4→BigQuery로 갑니다.

```
[게임 클라이언트]
   ├─ logger.js  ── game_logs 배치(좌표·마우스·카메라 + client_id·is_guest·variant)
   │        │
   │        ▼
   │   Supabase(Postgres, RLS "본인만")  ──일일 파이프라인(GitHub Actions)──▶  BigQuery
   │        │  · 7일치만 보관(hot)              scripts/export_to_bq.py             (전체 이력, cold)
   │        │  · 익명계정 7일 뒤 정리
   │        ▼
   │   analytics.html / admin_analytics.html (대시보드)
   │
   └─ analytics.js ── GA4 이벤트 ──▶ GA4 ──(native export)──▶ BigQuery(analytics_*)
```

분석 아티팩트 층: **① 계측**(`js/logger.js`·`analytics.js` — 게임과 결합) · **② ETL**(`scripts/export_to_bq.py` + `.github/workflows`) · **③ 쿼리**(`sql/analytics_queries.sql` Supabase, `sql/bigquery_queries.sql` BQ) · **④ 표현**(`dashboards/`).

세그먼트 필드 — `client_id`(영구 기기 ID, 게스트 재방문/리텐션), `is_guest`(게스트 vs 로그인), `variant`(A/B, 기본 `control`). A/B는 `js/config.js`의 `EXPERIMENT`로 켜고, 전/후·세그먼트 비교 쿼리는 각 SQL 팩의 세그먼트 섹션 참고. **체험단/런칭 전에는 `sql/quality_checks.sql`로 계측이 정상인지(로그 신선도·필드 커버리지·게스트 적재) 먼저 확인하세요.**

## ▶ 로컬 실행

ES 모듈이라 `file://`로 열면 CORS로 막힙니다. 로컬 서버로 여세요:

```
cd calm_forest
python3 -m http.server 8000   # → http://localhost:8000
```

## 🚀 배포

`main`에 push하면 **GitHub Actions**(`.github/workflows/deploy.yml`)가 GitHub Pages로 자동 배포합니다. 최초 1회 저장소 **Settings → Pages → Source → "GitHub Actions"** 설정 필요. 상세는 `docs/DEPLOY.md` 참고.

## 🎮 조작

**도구 하트바(하단)에서 도구를 고르고 상호작용합니다.** 도구 선택은 숫자키 `1~7`(🪓도끼·⛏️괭이·🌰씨앗·💧물조리개·🌾낫·🔨망치·🎣낚싯대) 또는 슬롯 탭, 상호작용은 `Space`/클릭(모바일은 액션 버튼). 모바일 액션 버튼은 상황에 따라 아이콘이 바뀝니다(도구 · 💬주민대화 · 🚪문 · 가구배치).

| 키 | 도구 | 하는 일 | 연출 |
|----|------|---------|------|
| 1 | 🪓 도끼 | 나무 벌목 (3번 → 쓰러짐, 목재 +3) | 스쿼시&스트레치 + 잎/나무조각 |
| 2 | ⛏️ 괭이 | 빈 땅을 갈아 이랑 밭 만들기 (장애물 위 불가) | 흙먼지 |
| 3 | 🌰 씨앗 | 갈아둔 밭에 씨앗 심기 | 새싹 팝 |
| 4 | 💧 물조리개 | 자라는 작물에 물주기(물 줘야만 성장) | 물방울 + 무지개 반짝임 |
| 5 | 🌾 낫 | 다 자란 작물 수확 (작물 +1, 씨앗 +2 → 농사 지속 가능) | 별/스파클 + 팝 |
| 6 | 🔨 망치 | 집 터에서 목재 10개씩 단계 건설(데크→통나무벽→지붕) | 아래서 톡 솟음 + 흙먼지 → 완성 시 색종이/반짝이 |

- **이동**: WASD·방향키 (모바일은 좌측 가상 조이스틱)
- **저장**: 전부 자동(30초 주기 + 탭 숨김/종료 시) — 수동 저장 버튼 없음
- 우측 상단 인벤토리(🪵목재 🌰씨앗 🥕작물 🐟물고기) + 낮/밤 인디케이터 상시 표시
- **집 터**: 맵의 반투명 원형 자리로 가서 망치로 목재 10개씩 3단계 건설 → **나무 바닥(데크) → 통나무 벽(+창문) → 지붕**. 각 단계는 아래에서 위로 톡 솟아오르고 약한 먼지가 피어오릅니다. 목재는 판자 결이 보이는 따뜻한 우드 머티리얼이고, 완성 순간 색종이+반짝이 축하 연출이 터집니다. 밤엔 창문이 따뜻하게 빛나요.

### 🔐 로그인
첫 화면은 **실제 게임 씬이 배경으로 흐르고**(카메라가 천천히 숲을 돕니다) 그 위에 유리 느낌의 `calm forest` 카드가 뜨는 구성입니다. 여기서 **Google로 시작하기**(구글 OAuth) 또는 **게스트로 둘러보기**를 고릅니다. 구글 로그인은 기기가 바뀌어도 저장이 이어지고, 게스트는 그 브라우저에서만 유지됩니다. Supabase anon key가 없으면 게스트(오프라인)만 가능합니다. 구글 provider 설정은 `docs/DEPLOY.md` 참고. 좌측 상단에 로그인 계정과 로그아웃 버튼이 표시됩니다.

### 🌱 농사 흐름
**괭이**로 빈 땅을 갈면 이랑(줄무늬) 밭이 생기고 흙먼지가 피어오릅니다. 그 위에 **씨앗** 도구로 씨앗을 심고, **물조리개**로 물을 주면(물방울 파티클) 작물이 **3단계 메시**로 자라요: 🌱새싹 → 🌿자람 → 🍎수확가능. 각 단계로 넘어갈 때 작물이 **톡 튀는 팝** 애니메이션으로 커집니다. **물을 줘야만 자랍니다**(시간이 지나도 저절로 자라지 않음). 한 번 주면 흙이 잠깐 촉촉해졌다가 마르고, 마른 뒤 다시 주면 다음 단계로 — 총 2번 주면 수확가능. 목마른 밭 위에는 **“💧 물 줘요!” 알림**이 둥실 떠서 알려줘요. 너무 오래 방치하면 작물이 **🥀 시들어**(갈색으로 처짐) 버리는데, 그땐 **괭이로 다시 갈아 재배**하면 됩니다. 수확 후에도 밭은 비어서 바로 다시 심을 수 있어요. 다 자라면 **낫**으로 수확 → 반짝이 스파클이 터지고 **작물 +1**. 수확 후 밭은 다시 비어 재배할 수 있어요. 심을 때 작물 종류(당근·토마토·블루베리·호박)가 랜덤 배정돼 열매 색이 달라집니다.

### 🧑‍🌾 NPC & 퀘스트
마을에 세 명의 주민이 살아요(각자 색·이름·퀘스트 체인). 주민은 홈 주변을 천천히 배회하고, 가까이 가면 플레이어를 바라봅니다. 근처에서 **Space/액션 버튼으로 말 걸기**가 도구보다 우선돼요(대화창에 이름·대사 표시).

- 🧑‍🌾 **농부 삼촌** — 나무 3번 베기 → 작물 2개 수확 → 물 4번 주기
- 👷 **목수 아저씨** — 목재 10개 모으기 → 집 완성
- 🧙 **방랑 상인** — 씨앗 3번 심기 → 작물 5개 보유

목표를 채우고 돌아가면 보상(씨앗·목재·작물)을 줘요. 머리 위 말풍선이 상태를 알려줍니다(`!` 수락 가능 · `…` 진행 중 · `✓` 완료). 퀘스트 타입은 벌목·수확·물주기·심기·집완성·보유량 달성 등 다양하고, 진행 상황은 저장에 함께 기록됩니다. 완료 시 GA4 `quest_accept`/`quest_complete` 이벤트를 전송해요.

### 🌅 분위기 & 환경
옅고 넓게 퍼지는 거리 안개, 부드러운 비네팅, 따뜻한 컬러 그레이딩으로 포근한 톤을 잡았고, 카메라는 위치·시선을 모두 감쇠 보간해 캐릭터를 한 박자 부드럽게 따라옵니다. 하늘색·햇빛은 자정→여명→아침→정오→노을→밤 7단계 키프레임을 smoothstep으로 이어 자연스럽게 전환됩니다. 우측 상단 **시간 바를 드래그**하면 원하는 시간대로 바로 조절되고(자동 순환 정지), 해/달 아이콘을 누르면 자동 순환을 켜고 끌 수 있어요. 맵에는 **호수(물가 돌·수련잎)·벤치·가로등(밤에 점등)·꽃밭**이 흩어져 있습니다.

### 🆕 신규 유저 튜토리얼
처음 로그인하면 이동·도구·상호작용·농사·건축·주민·저장을 한눈에 보여주는 안내 카드가 뜹니다(1회). 좌측 상단 **❓ 버튼**으로 언제든 다시 볼 수 있어요.

### 🎣 낚시
호수 물가에서 **🎣 낚싯대(도구 7)** 를 골라 던지면(Space/액션), 잠시 뒤 **"❗ 물었어요!"** 가 뜰 때 다시 눌러 낚아챕니다(반응 미니게임). 등급별로 🐟피라미·붉은 물고기·**무지개 물고기(희귀)** 가 잡혀요. 물고기는 **어항 가구를 사거나(꾸미기)** **낚시꾼 할아버지 퀘스트**(2마리→5마리→희귀어)에 쓰입니다. 낚시는 GA4(`fishing_cast`/`fishing_catch`{rarity}/`fishing_miss`)로 트래킹돼 캐스팅→성공 전환율·희귀 드롭률을 분석할 수 있어요.

### 🏠 집 실내 & 꾸미기
집을 완성하면 집 앞에서 **🚪 들어가기**로 실내에 입장할 수 있어요(문 근처에서 Space/액션). 실내에서 상단 **🎨 꾸미기** 버튼으로 가구 메뉴를 열고, 러그·화분·의자·테이블·램프·소파를 **작물🥕로 구매**해 **바닥을 탭/클릭**해 배치합니다(수확한 작물의 쓸모!). 배치한 가구는 저장돼서 다시 들어가도 유지돼요. 문 근처에서 **🚪 나가기**로 바깥으로. 입장·퇴장·배치는 GA4(`enter_house`/`exit_house`/`place_decor`)로 트래킹됩니다.

### 🔊 사운드
효과음은 전부 WebAudio로 실시간 합성합니다(오디오 파일 없음). 벌목·밭갈기·물주기·수확·건축·완성 팡파레·도구 전환음이 있고, 브라우저 정책상 첫 클릭/터치 이후 소리가 납니다.

### 📱 모바일
터치 기기에서 자동으로 좌측 가상 조이스틱 + 우측 액션 버튼이 나타납니다. 액션 버튼 아이콘은 현재 선택한 도구로 바뀝니다. 화면 스크롤/줌은 비활성화됩니다. `viewport-fit=cover` + safe-area 로 노치 대응.

## 🔑 실제 연동 (플레이스홀더 교체)

`js/config.js` 상단만 바꾸면 됩니다. **값을 안 바꿔도 오프라인 폴백으로 정상 플레이**되며, 저장/로그는 콘솔에 출력됩니다.

```js
SUPABASE_URL: 'https://xxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJ...',
GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',
```

GA4를 실제 켜려면 `index.html` 상단의 gtag `<script async ...>` 주석을 해제하고 ID를 함께 교체하세요.

## 🗄️ Supabase 테이블 (SQL)

```sql
-- 게임 저장(유저별 1행)
create table game_saves (
  user_id uuid primary key,
  state jsonb,
  updated_at timestamptz default now()
);

-- 센서/행동 로그 (분석용)
create table game_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  session_id text,
  client_id text, is_guest boolean, variant text, -- 분석 세그먼트(기기·게스트·A/B)
  mouse_x real, mouse_y real,             -- 마우스 이동 좌표
  char_x real, char_y real, char_z real,  -- 캐릭터 위치
  cam_yaw real, cam_pitch real,           -- 카메라 각도
  created_at timestamptz default now()
);
```

익명 로그인을 쓰므로 Supabase 대시보드에서 **Anonymous sign-ins** 를 활성화하세요. RLS 정책은 `auth.uid() = user_id` 기준으로 걸면 됩니다.

## 📊 데이터 수집 지점 (코드 내 주석 태그)

- `[GA4]` — analytics.js: 로그인, 첫 벌목, 벌목, 체류 시간
- `[센서]` — logger.js + game.js `sampleFrame(...)`: 마우스/캐릭터/카메라를 0.2초 throttle 로 샘플링 → 1.5초마다 `game_logs` 배치 insert (각 행에 `client_id`·`is_guest`·`variant` 동봉)
- `[Supabase]` — supabase-client.js: 인증/저장/불러오기/로그전송, 전부 try-catch 오프라인 폴백. 세그먼트 필드(`client_id`/`is_guest`/`variant`)·A/B 배정도 여기서 처리

수집된 `game_logs` 는 이동 히트맵(char_x/z), 체류 구역, 카메라 시선 분포 분석에 바로 활용할 수 있고, `client_id`(기기 리텐션)·`is_guest`(게스트 vs 로그인)·`variant`(A/B)로 세그먼트를 나눠 볼 수 있습니다.

## 💾 저장 데이터

`game_saves.state`(jsonb)에 인벤토리 + 집 단계 + 밭 목록이 함께 저장됩니다. 스키마는 그대로(jsonb) 두면 되고, 불러오기 시 집·밭이 복원됩니다.

```json
{ "inventory": {"wood":0,"seed":5,"crop":0}, "houseStage": 2, "timeOfDay": 0.62,
  "plots": [{"x":2,"z":-4,"state":"growing","growth":0.4}],
  "npcs": {"farmer":{"idx":1,"progress":2,"given":true}} }
```

인벤토리·집 단계·밭·NPC 퀘스트·**시간대**까지 저장돼요. **30초마다 + 탭을 숨기거나 닫을 때 자동 저장**되므로, 창을 닫았다 다시 열어도 이어집니다(구글 로그인 시 기기 간에도 이어짐).

## 🚧 다음 단계 (아이디어)

작물 종류 다양화, 낚시/채집, 마을 NPC, 사운드(WebAudio 절차적 생성), 인벤토리 창 확장 등. 현재 파티클/머티리얼/블룸/도구 파이프라인을 그대로 재사용하도록 설계돼 있습니다.
