# 🌿 calm forest

동물의 숲 톤의 포근한 로우폴리 3D 브라우저 게임. Vanilla JS + Three.js(WebGL)로 만들었고, **외부 이미지·모델·사운드 파일 없이** 모든 형상·효과음을 코드로 생성합니다.

🎮 **플레이**: https://uicheol-hwang.github.io/calm_forest/

**주요 기능**: 걷기 · 벌목 · 농사(밭갈기/심기/물주기/수확) · 건축(단계 건설) · NPC 3명 & 퀘스트 체인 · 낮/밤 사이클 · 파티클 & 블룸 · 절차적 사운드 · 모바일 터치 · 구글 로그인 · 클라우드 저장 · 행동 데이터 분석(Supabase/GA4/BigQuery)

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
│  ├─ analytics_queries.sql # 전체 유저 집계 쿼리 팩
│  └─ bigquery_queries.sql  # GA4 export(BigQuery) 쿼리 팩
└─ docs/                 # 📚 문서
   ├─ DEPLOY.md          #   🚀 Supabase·GA4·GitHub Pages 배포 가이드
   └─ GA4_GUIDE.md       #   📈 GA4 설정·탐색 가이드
```

> 실제 연동(Supabase 키·GA4)과 배포는 **`docs/DEPLOY.md`** 를, DB 초기화는 **`sql/supabase_setup.sql`** 을 참고하세요. 키를 안 넣어도 게임은 오프라인 폴백으로 동작합니다.

## ▶ 로컬 실행

ES 모듈이라 `file://`로 열면 CORS로 막힙니다. 로컬 서버로 여세요:

```
cd calm_forest
python3 -m http.server 8000   # → http://localhost:8000
```

## 🚀 배포

`main`에 push하면 **GitHub Actions**(`.github/workflows/deploy.yml`)가 GitHub Pages로 자동 배포합니다. 최초 1회 저장소 **Settings → Pages → Source → "GitHub Actions"** 설정 필요. 상세는 `docs/DEPLOY.md` 참고.

## 🎮 조작

**도구 하트바(하단)에서 도구를 고르고 상호작용합니다.** 도구 선택은 숫자키 `1~5` 또는 슬롯 탭, 상호작용은 `Space`/클릭(모바일은 액션 버튼).

| 키 | 도구 | 하는 일 | 연출 |
|----|------|---------|------|
| 1 | 🪓 도끼 | 나무 벌목 (3번 → 쓰러짐, 목재 +3) | 스쿼시&스트레치 + 잎/나무조각 |
| 2 | ⛏️ 괭이 | 빈 땅에 밭 만들기 + 씨앗 심기 | 흙먼지 |
| 3 | 💧 물조리개 | 자라는 작물에 물주기(성장 촉진) | 물방울 + 무지개 반짝임 |
| 4 | 🌾 낫 | 다 자란 작물 수확 (작물 +2, 씨앗 +1) | 별/스파클 + 팝 |
| 5 | 🔨 망치 | 집 터에서 목재 5개씩 단계 건설 | 흙먼지 → 완성 시 색종이/반짝이 |

- **이동**: WASD·방향키 (모바일은 좌측 가상 조이스틱)
- **저장**: 좌측 상단 💾 버튼
- 우측 상단 인벤토리(🪵목재 🌰씨앗 🥕작물) + 낮/밤 인디케이터 상시 표시
- **집 터**: 맵의 반투명 원형 자리로 가서 망치로 건설 → 기초 → 벽(창문) → 지붕. 완성되면 밤에 창문이 따뜻하게 빛납니다.

### 🔐 로그인
첫 화면은 **실제 게임 씬이 배경으로 흐르고**(카메라가 천천히 숲을 돕니다) 그 위에 유리 느낌의 `calm forest` 카드가 뜨는 구성입니다. 여기서 **Google로 시작하기**(구글 OAuth) 또는 **게스트로 둘러보기**를 고릅니다. 구글 로그인은 기기가 바뀌어도 저장이 이어지고, 게스트는 그 브라우저에서만 유지됩니다. Supabase anon key가 없으면 게스트(오프라인)만 가능합니다. 구글 provider 설정은 `docs/DEPLOY.md` 참고. 좌측 상단에 로그인 계정과 로그아웃 버튼이 표시됩니다.

### 🌱 농사 흐름
빈 땅에서 **괭이**(밭+씨앗 심기) → **물조리개**로 물주기(2~3번이면 다 자람, 시간이 지나도 서서히 성장) → 다 자라면 **낫**으로 수확. 수확하면 밭이 다시 비어 재배 가능. 심을 때 작물 종류(당근·토마토·블루베리·호박)가 랜덤 배정돼 열매 색이 달라집니다.

### 🧑‍🌾 NPC & 퀘스트
마을에 세 명의 주민이 살아요(각자 색·이름·퀘스트 체인). 주민은 홈 주변을 천천히 배회하고, 가까이 가면 플레이어를 바라봅니다. 근처에서 **Space/액션 버튼으로 말 걸기**가 도구보다 우선돼요(대화창에 이름·대사 표시).

- 🧑‍🌾 **농부 삼촌** — 나무 3번 베기 → 작물 2개 수확 → 물 4번 주기
- 👷 **목수 아저씨** — 목재 10개 모으기 → 집 완성
- 🧙 **방랑 상인** — 씨앗 3번 심기 → 작물 5개 보유

목표를 채우고 돌아가면 보상(씨앗·목재·작물)을 줘요. 머리 위 말풍선이 상태를 알려줍니다(`!` 수락 가능 · `…` 진행 중 · `✓` 완료). 퀘스트 타입은 벌목·수확·물주기·심기·집완성·보유량 달성 등 다양하고, 진행 상황은 저장에 함께 기록됩니다. 완료 시 GA4 `quest_accept`/`quest_complete` 이벤트를 전송해요.

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
  mouse_x real, mouse_y real,             -- 마우스 이동 좌표
  char_x real, char_y real, char_z real,  -- 캐릭터 위치
  cam_yaw real, cam_pitch real,           -- 카메라 각도
  created_at timestamptz default now()
);
```

익명 로그인을 쓰므로 Supabase 대시보드에서 **Anonymous sign-ins** 를 활성화하세요. RLS 정책은 `auth.uid() = user_id` 기준으로 걸면 됩니다.

## 📊 데이터 수집 지점 (코드 내 주석 태그)

- `[GA4]` — analytics.js: 로그인, 첫 벌목, 벌목, 체류 시간
- `[센서]` — logger.js + game.js `sampleFrame(...)`: 마우스/캐릭터/카메라를 0.2초 throttle 로 샘플링 → 1.5초마다 `game_logs` 배치 insert
- `[Supabase]` — supabase-client.js: 인증/저장/불러오기/로그전송, 전부 try-catch 오프라인 폴백

수집된 `game_logs` 는 이동 히트맵(char_x/z), 체류 구역, 카메라 시선 분포 분석에 바로 활용할 수 있습니다.

## 💾 저장 데이터

`game_saves.state`(jsonb)에 인벤토리 + 집 단계 + 밭 목록이 함께 저장됩니다. 스키마는 그대로(jsonb) 두면 되고, 불러오기 시 집·밭이 복원됩니다.

```json
{ "inventory": {"wood":0,"seed":5,"crop":0}, "houseStage": 2,
  "plots": [{"x":2,"z":-4,"state":"planted","growth":0.4}] }
```

## 🚧 다음 단계 (아이디어)

작물 종류 다양화, 낚시/채집, 마을 NPC, 사운드(WebAudio 절차적 생성), 인벤토리 창 확장 등. 현재 파티클/머티리얼/블룸/도구 파이프라인을 그대로 재사용하도록 설계돼 있습니다.
