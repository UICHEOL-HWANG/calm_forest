# mountain-sled context

Last Updated: 2026-10-15

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
