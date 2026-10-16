# mountain-sled context

Last Updated: 2026-10-16 (1단계·산장 서사 f9fac2be 완료, 산장 카페·추위 지수 스펙·계획 확정·미착수, 미병합·미배포)

## 위치
- 워크트리 `.claude/worktrees/mountain-sled`, 브랜치 `feat/mountain-sled`(origin/main 기준, 미푸시)
- 시안: `dev/active/mountain-sled/mockup.html?v=a|b|c`, 비교표 `shots/compare.png`

## 확정 결정
- 한 판: 뒤 능선 오르며 🌰 도토리(최대 6) → 정상 → 앞 사면 S자 활강(도토리 = 부스터 1회 2초)
- 외관 A(중턱 구름 띠, 앞면 가운데 틈), 이틀째 해금·사계절, 하루 3판 보상 + 정상 기록판
- 조작: 화면 좌우 반쪽 + 부스터 버튼, PC ←→/A/D + 스페이스
- 추가 활동: 정상 전망대(2단계), 얼음 낚시(3단계, 기존 조작 + 얕게/깊게, 새 어종 4종)

## 코드 조사로 바뀐 것(2026-10-15)
- 마을 카메라(offset 0,14,16 / fov 42)는 하늘을 못 본다 → 원경은 해금 연출·입구 랜드마크·활강 카메라 세 순간에만
- 첫 접속일 필드 없음 → `gameState.firstDay` 신설, 기존 세이브는 2000-01-01(바로 열림)
- 기록판 RPC 는 페르소나 제외가 없다 → 기존 규칙 그대로, 분석 단계 `_filters.sql` 로 제외
- 기록판은 오늘(KST) 점수 내림차순 → 썰매 점수 `-min(time_ms)`
- 카메라 공용 훅 없음 → `setCameraRig()` 추가(해금 연출·활강 공용)
- 게임 fog 18~74, far 200 → 원경 재질 `fog:false`, far 안쪽 배치

## 핵심 참조 파일
- 공간 패턴: `js/spaces/observatory.js`, 문: `js/spaces/doors.js`, 그림자: `js/shadow-scope.js`
- 정산 패턴: `js/observatory/star-run.js`, 테스트 패턴: `tests/observatory-star-run.test.mjs`(vm 컨텍스트)
- 난이도: `js/tuning.js` DIFFICULTY, `js/difficulty.js` ddaOutcome
- 기록판: `functions/api/leaderboard.js`, `sql/migrations/migrate_leaderboard_sea_species_icon.sql`, `index.html` LB_BOARDS

## 의존성·주의
- 새 코드 주석 금지, game.js 는 플래그·훅·디스패치만
- GA4 이벤트 25개 한도(자동 키 ts·platform·exp_arm 포함)
- DDL 은 풀러로 직접 실행
- 4곳 동시 배포(firstDay·mountain 세이브 키)

## 구현 중 바뀐 것(2026-10-15)
- 코스·물리 재조정: 장애물 중앙선 ±0.6~1.0, 깃발 폭 ±2.2, 충돌 0.5배 1.5초 → 숙련 차 3.1초(T3)
- sled_runs: 버전별 최단 기록 트리거·course_v/phys_v 체크·음수 금지·run_date 서버 지정(T6)
- 시간 값 정수 반올림(T5) — 정수 컬럼에 소수가 들어가면 조용히 저장 실패
- 해금 연출은 모달·코치마크가 닫힐 때까지 대기, 마을 벗어나면 즉시 종료(T9)
- 배치 재설계(T9b): 광장 (0,74.6,r9)·출구 (0,83), 등산로는 동쪽 비탈로 돌아 정상(0,-4), 지형은 terrainHeight 높이 함수(1콜)
- T10b: 썰매 모형·공간 안 구름 띠·카메라 SLED_CAM{up9,back10,lookAhead22,lookDrop0.5}·장애물 메시 병합 → 공간 59~60콜
- 미리보기: 루트 .claude/launch.json 에 mountain-sled(8807) 등록, ?dbg=1 + window.__gs()/__tp() 로 검수
- SDD 원장: .superpowers/sdd/2026-10-15-mountain-sled-stage1/progress.md

## 2026-10-16 추가 결정
- 마을 입구: 아치(신사처럼 보임) 제거, 시안 A 설산 자체를 랜드마크로(반지름 7·높이 6.5·자락 1.2·구름 2.2배, 중심 (−15,−36), 입구 (−15,−29.5)), 산자락 밭 갈기·꾸미기 금지('🏔️ 산자락엔 놓을 수 없어요'), 극좌표 밀어내기 충돌
- 내부: 레퍼런스 기반 재디자인(침엽수·빨강/파랑 기문·하늘 그라데이션·먼 능선·푸른 그림자), 테마 낮/노을(0.66~0.80)/눈/밤, 나갈 때 전역 화면값 복원
- 문구 정리: 첫 안내 '🏔️ 뒤쪽 능선길로 올라가 정상에서 썰매를 타요', 보상 소진 '오늘 보상은 다 받았어요. 기록 도전은 계속할 수 있어요'
- 세이브: gameState.mountain 복원(js/mountain/save.js)
- SDD 원장 사본: dev/active/mountain-sled/sdd-ledger.md
