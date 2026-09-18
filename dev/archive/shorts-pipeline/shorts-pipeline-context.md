# 🎬 쇼츠 파이프라인 — 컨텍스트

**Last Updated:** 2026-09-15 17:30

## 핵심 파일

| 파일 | 역할 | 상태 |
|---|---|---|
| `tools/cardnews/shoot.mjs` | 게임 스틸 캡처(HUD 숨김) | 기존 — 참조 이미지 공급원 |
| `tools/cardnews/flow.mjs` | aside 로 Flow 생성 → 720p 다운로드 | **신규** |
| `tools/cardnews/record.mjs` | 게임 플레이 녹화(Playwright recordVideo) | **신규** |
| `tools/cardnews/reel.mjs` | ffmpeg 조립 + 자막 + 리사이즈 | **신규** |
| `tools/cardnews/publish.mjs` | 발행 (릴스 분기 추가 예정) | 기존 확장 |
| `tools/cardnews/host.mjs` | KV 호스팅 — mp4 도 같은 경로 | 기존 |
| `functions/cardnews-cron.js` | 크론 발행 — `publishReel()` 추가 예정 | 기존 확장 |

## aside repl 함정 (전부 실측)

1. **`page` 가 호출마다 초기화된다** → 매번 `attachBrowserTab(탭ID)` 재부착
2. **파일 경로가 세션 디렉터리로 샌드박싱**되고 그 디렉터리는 **호출마다 새로 생김**
   → 들여올 때: 로컬 서버(`:8000`) 경유 `fetch`
   → 꺼낼 때: `pwd` 를 출력시키고 bash `cp`
3. **ref ID 는 snapshot 마다 무효화** → 이름으로 매번 재탐색
4. **"중지 버튼 사라짐 ≠ 완료"** — 큐 대기가 따로 있다. 완료 판정은 동영상 타일 수 증가로
5. 소재 피커 대기 **2.5초는 부족, 4초 필요**
6. `pwd` 는 함수가 아니라 **값**이다

## Flow UI 좌표 (이름 기준, 2026-09-14)

- 프롬프트 연결: `button "프롬프트 상자에 소재 추가"` → `button "미디어 업로드"` → `option "<파일명>"` → `button "프롬프트에 추가"`
- 생성: `button "생성 시작"` → `radio "승인"` (크레딧 확인창)
- 다운로드: 타일 클릭 → `button "미디어 다운로드"` → `menuitem "720p 원본 크기"`
- 설정: `button "설정"` → `동영상 생성 기본값` 아래 `radio "9:16"` → `button "저장"`

## 참조 이미지 규칙

- **글자가 들어가면 안 된다.** NPC 이름표·간판은 3D 캔버스 안이라 CSS 로 못 숨긴다
  → 9:16 중앙 크롭으로 잘라낸다 (`sips -c <H> <H*9/16>`)
- 현재 준비됨: `shots/_ref_city_slump.png`, `_ref_arrive_forest.png`, `_ref_tmp.png`(숲)
- **캐릭터가 바뀌면 재촬영해야 한다** — 얼굴 7종 개편(9/13) 이전 캡처는 이미 낡았었다
  ```
  cd tools/cardnews && node shoot.mjs 8000 city_slump arrive_forest d02_forest_dawn
  ```

## 의존성

- `ffmpeg` 9.0.1 (brew, 2026-09-14 설치)
- `aside` CLI — u0 계정으로 Flow 로그인됨
  ⚠️ 주 계정이다. 분리 계정 전환은 `/u/{uid}` 만 바꾸면 된다
- 로컬 서버 `python3 scripts/serve.py 8000` — flow.mjs 의 참조 이미지 브리지에 필수

## 미해결

- 무인 루틴을 돌리려면 Flow 설정 `생성하기 전에 확인` → `안 함` 이 필요
  (크레딧이 확인 없이 나간다. 일 50개 상한이라 피해는 제한적) — **사용자 승인 대기**
- 검토 메일 발송 경로 미정 (aside 의 google-gmail 스킬 vs 기존 Cloudflare NOTIFY)
