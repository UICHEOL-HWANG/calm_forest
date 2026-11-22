# 대시보드 개편 3차 — 체크리스트

- [x] 시안 3종 비교 · 방향 확정 · 계획 승인
- [x] 순수 함수 테스트 먼저(`activeKpis`·`activeDailyRows`·`experimentSpan`) → 구현
- [x] 공통 메뉴 `admin-nav.js` · `_admin.css` 글자·부품
- [x] 활성 유저 창(`active.html`·`admin-active.js`) · SQL `cf_admin_active`
- [x] 실험 창: 타임라인(기간·효과 전환) · 카드 목록 · 리포트 화면(`#실험id`)
- [x] 홈·애널리틱스(섹션 전부 유지)·UTM·소식함·베타 관제에 메뉴
- [x] `node --test tests/admin-*.test.mjs` 58 통과
- [x] 미리보기 캡처 확인(PC 1440·모바일 390 · 라이트·다크 · 가로 넘침 0)
- [x] 운영 DB 에 `cf_admin_active(token)` 적용(2026-11-20 · 0.70s · 어제 DAU 10·WAU 116·MAU 731 직접 집계와 일치 · 무권한 호출 거부)
- [x] code-reviewer 반영(치명 0 · 높음 4 · 중간 5 · 낮음 2 중 10건 수정, SQL 은 조회 범위를 최근 구간으로 묶어 재적용 0.66s)
- [ ] 남긴 것: 이력이 7·30일보다 짧을 때 지표 카드 라벨("최근 7일 평균")이 실제 평균 구간과 어긋남 — 지금은 이력 149일이라 해당 없음
- [x] 커밋 fd052861 · main 병합 3e2ee487 · 웹 배포(2026-11-20 21:20, 버전 c25ab65c) · 라이브 9개 주소 200, 새 파일·메뉴 확인
- [ ] main 푸시 — 사용자 요청 시(원격보다 앞선 커밋에 다른 세션의 로컬 BI 커밋 6개 포함, 키 스캔 0)
- [ ] 관리자 로그인·공유 링크(?k=)로 실제 화면 확인

## 메모
- 전체 `npm test` 의 실패 1건(`invite-link.test.mjs` "@capacitor/app 이 두 앱에 들어간다")은 이 워크트리에 `node_modules` 가 없어서 나는 것. 이번 변경과 무관
- 캡처 방법: `mockup/rpc-fixture.js`(실제 RPC 응답, 커밋 금지) + 가짜 세션 + fetch 대역을 CDP `addScriptToEvaluateOnNewDocument` 로 주입. 결과는 `mockup/final/`
- 클래스 이름 `wrap` 은 `_admin.css` 의 레이아웃 클래스. 표 수식어로 쓰면 표가 grid 가 된다 → `tb loose`
- `a.back` 은 `_dash.css` 가 색·크기를 덮는다 → 실험 창 복귀 링크는 `to-board`
