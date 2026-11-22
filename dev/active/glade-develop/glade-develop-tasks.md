# 반딧불이 계곡 디벨롭 · tasks

- [x] 지금 구현 읽기, 빈 곳 정리
- [x] 워크트리·dev docs
- [x] 방향 시안 페이지(A·B·C 각 3종) `sims/glade-develop-directions.html`
- [x] PC·모바일 캡처 확인 후 사용자에게 보여 주기 `sims/glade-develop/directions-{pc,mobile}.png`
- [x] A 오늘 밤의 빛: 사용자 "A 좋은듯"(2026-11-22). 밤 3종을 다 넣는지는 확인 필요
- [x] B: B3 나무 사이 줄등(2026-11-22)
- [x] C: 사용자 "c1, c3 혼합해" → 혼합 시안 M1·M2·M3 추가(`sims/glade-develop/mix-{pc,mobile}.png`)
- [x] 혼합: M1 앞장선 큰 반디(2026-11-22)
- [x] 설계 문서 `docs/superpowers/specs/2026-11-22-glade-develop-design.md` (미커밋, 사용자 검토 대기)
- [x] 설계 문서 승인: 사용자 "이대로 설계진행"(2026-11-22). D 관찰 수첩은 제외로 진행
- [x] 조형 시안(실제 게임 밤 화면): `sims/glade-develop/art/string-{pc,phone}.png`, `swarm-pc.png`. 도구 `dev/active/glade-develop/verify/{harness,shots}.mjs`, `glade-mock.js` (`PORT=8931 node …/shots.mjs pc|phone`)
- [x] 조형 선택: 줄등 S2 병등 줄(빈 자리에 기둥), 큰 반디 F3(사용자 "s2 F3", 2026-11-22)
- [x] 문구 추천안: 사용자에게 보여 줌, 지적 없음(설계 문서 9-1). 구현 화면에서 다시 확인
- [x] 계획서 `docs/superpowers/plans/2026-11-22-glade-develop.md` (태스크 0~9). 태스크 1~4 코드는 임시 폴더에서 28개 테스트 통과 확인
- [x] 구현 방식: 이 세션(executing-plans)
- 확인된 사실: 둘레에 실제로 서 있는 나무는 7그루(동·남쪽 반 바퀴). 북·서쪽(카페·음악회 무대)은 비어 있어 기둥 4개를 세워야 한 바퀴가 된다. 세로 폰에서는 줄등이 위·아래 일부만 보인다. 큰 반디는 게임 카메라 거리에서 40px 안팎이라 세부 조형보다 크기·번짐이 읽힌다
- 캡처 함정: 게스트 진입 뒤에도 `body.pre-world`(로그인 배경 그림 덮개)가 남아 정지 그림이 찍힌다 → 하네스에서 클래스 제거
- [x] 문구 후보 검수(설계 문서 9-1, HUD 칩은 잡을 때 글자로 대체)
- [x] 계획서(writing-plans)

## 구현 (계획서 태스크 0~9)
- [x] 0 준비: 기준 테스트 6629 통과, 문서·시안 커밋
- [x] 1~4 순수 모듈 night·string·string-layout·swarm, 테스트 28개
- [x] 5 문구·영어·배지 glade_ring
- [x] 6 오늘 밤의 빛 연결. 캡처 `sims/glade-develop/impl/pc-gnight_*`. 캡처 도구는 돌아온 플레이어 흉내(tutorialSeen·팁 건너뛰기·모달 닫기)를 넣어야 배너가 뜬다(새 게스트는 첫 안내 중이라 배너를 일부러 미룸)
- [x] 7 병등 줄. 캡처 `impl/{pc,phone}-*gcaught*`, 드로우콜 +7~10
- [x] 8 무리. 캡처 `impl/{pc,phone}-gnight_plain_gswarm_1.png`. 잡는 흐름은 CDP로 직접 휘둘러 확인: 꼬마 남았을 때 큰 반디 안 잡힘, 차례대로면 꼬마 4 + 큰 반디 4(덤 2) = 8, 순서 틀리면 6
- [x] 9 전체 확인·리뷰·기록(npm test 6674, build-web, 영어 캡처, 새 게스트 확인, 리뷰 반영)
- [ ] 사용자 확인 뒤 병합·5곳 배포(새 배지 glade_ring·저장 키가 있어 동시 배포 권장)
- [x] 길 안내 화살표가 배너를 가리던 문제 수정(2026-11-22): 경매·주말 장터·식당이 함께 쓰는 `js/auction/guide.js` 가장자리 화살표가 위쪽 104px 에 고정이라 `#hint-banner` 와 겹쳤다. `js/guide/banner-inset.js` 로 배너 아래로 내린다. 이번 작업 이전부터 있던 문제. 캡처 `impl/pc-gnight_stream-banner.png`, `impl/phone-gnight_mono-banner.png`
