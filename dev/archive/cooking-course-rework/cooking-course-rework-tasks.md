# 🍳 요리 코스 개편 — 태스크

## Phase A — game.js 데이터·상태
- [x] A1 `COOK_MG` 미니게임 메타 4종
- [x] A2 `RECIPES` 8종 + `stages[]` + `diff`(★1~3) + `COOK_DIFF` 판정창 배율
- [x] A3 `gameState.pantry` + save/load(applySave)
- [x] A4 `kitchenStart` → 코스 정보(stages·배율) 반환
- [x] A5 `kitchenFinish` → tier 판정만, 버프는 먹을 때로 분리
- [x] A6 `pantryStore` / `pantryEat` / `pantryView`
- [x] A7 Input API 노출

## Phase B — 카페
- [x] B1 외지 손님 캐스트 `CAFE_GUESTS` 8명 (이름·색·실루엣)
- [x] B2 `localCafeGuests` → 캐스트 기반, 주민 풀 제거
- [x] B3 `serveCafeGuest` 3단 분기(찬장→미니게임→부족)
- [x] B4 카페 미니게임 완료 콜백 → 서빙 정산
- [x] B5 손님 도감 등록

## Phase C — index.html 미니게임
- [x] C1 스테이지 모듈 인터페이스 + pot/chop 이관
- [x] C2 grill(굽기) 모듈 + HUD
- [x] C3 season(간 맞추기) 모듈 + HUD + 홀드-릴리스 입력
- [x] C4 스테이지 러너(코스 진행·단계 표시)
- [x] C5 결과 화면 먹기/보관 버튼
- [x] C6 주방 메뉴판 ★난이도·코스 뱃지
- [x] C7 가방 🍱 찬장 섹션 + 먹기

## Phase D — 3D 무대
- [x] D1 grill 소품(팬·불·재료) + 연출 훅
- [x] D2 season 소품(소금통·그릇·간 게이지) + 연출 훅
- [x] D3 `mgSceneStart` → 스테이지 전환 지원
- [ ] D4 카페 조리 배경 변형 — **보류**: 주방 세트를 그대로 쓰기로. 배경만 바꾸는 이득보다 세트 하나를 두 곳이 공유하는 단순함이 크다

## Phase E — 드로우콜
- [x] E1 카페 홀 재질별 mergeGeos
- [x] E2 손님 풀링 + 병합 (disposeTree 제거)
- [ ] E3 주방 무대 정적 파츠 병합
- [x] E4 펜던트 PointLight 3 → 1
- [x] E5 `__perf()` 전후 실측

## Phase F — 마무리
- [x] F1 i18n-en.js 문구
- [x] F2 tests/ 갱신
- [x] F3 브라우저 검증(데스크톱 + 모바일 뷰포트)
- [ ] F4 code-reviewer
- [ ] F5 📮 소식함 업데이트 공지 작성 — `im-not-ai` 스킬(https://github.com/epoko77-ai/im-not-ai)로 자연스럽고 간결하게

## 추가로 나온 일 (작업 중 발견)
- [x] 🐛 미니게임 위로 힌트 모달이 덮던 버그 — `firstHint` 가 `mgView` 중이면 미루도록(소진 않고 재시도)
- [x] 🐛 패널(자유주방 메뉴판 등)이 열려 있을 때 💬대화하기·존 안내·프롬프트가 패널 위로 떠서 목록을 가리던 문제 (사용자 보고)
- [x] 🐛 "든든한 채소죽가 당기네요" 조사 오류 — `josa()` 도입, 문장을 통째로 갈라 영어 번역에 조사가 안 남게
- [x] 📱 조리 무대 카메라가 폰 세로에서 소품을 잘라먹던 문제 — `applyMgCamera` 를 화면비에 맞춰 뒤로 빼기
- [x] 🥗 ★1 구간에 🔪썰기가 없어(썰기를 처음 만나는 자리가 ★2였다) `herb_salad` 추가 → 레시피 9종
