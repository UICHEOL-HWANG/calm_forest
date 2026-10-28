# snow-branch · context

Last Updated: 2026-10-28 (KST)

## 어디서
- 워크트리: `/Users/uicheol_hwang/calm_forest/.claude/worktrees/mobile-hud-overlap`
- 브랜치: `feat/snow-branch` (base: `fix/mobile-hud-overlap` c48dd093 → main 6d9409e3)
- 스펙: `docs/superpowers/specs/2026-10-28-snow-branch-design.md`
- 계획: `docs/superpowers/plans/2026-10-28-snow-branch.md` (= 이 폴더 snow-branch-plan.md 사본)

## 사용자 결정 (2026-10-28)
- 세계수 판에 ❄️ 눈의 가지, 이웃 = 🛷 썰매지기
- 메인 스토리: 4장(안개숲 심장) 다음 5장 「얼어붙은 가지」
- 설산·산장 카페 잠그지 않음. 완성 보상 = 산장 창 불빛 + ❄️ 세계수 썰매
- 대화 = 고정 대사 + 거울 마을 대화 박스(A안)
- 세계수 3D 눈 가지 잎은 흰색

## 핵심 파일
- 가지 표 js/world/tree-board.js · 꽃피우기 js/world/tree-bloom.js · 연출 js/world/region-cine.js, region-fx.js · 3D js/world/tree-art.js
- 장 표 js/story/chapters.js · 판정 js/story/rules.js · 해금 js/world/unlocks.js · syncStory/복원 js/game.js
- 설산 js/spaces/mountain.js · 문 판정 js/spaces/doors.js · 말풍선 js/mountain/keeper-bubble.js · 대화 박스 js/mirror/talk-box.js
- 썰매 js/mountain/sled-lineup.js · cafe-shop.js · DB 제약 sql/migrations/migrate_sled_lineup.sql

## 함정 (조사에서 발견)
- branchUsable 은 바로 앞 가지를 본다 → after 필드 필요(광산이 눈에 막히지 않게)
- 꾸러미 재료는 시작 재료만(테스트) → 🍄 forage 금지
- region-cine npc 는 마을 NPC 여야 함 → snow 는 null
- tree-art 는 시드 난수 하나를 순서대로 소비 → 새 가지는 맨 끝 + 자기 난수
- story.ch 는 끝낸 장 수 → 5장 삽입 시 ch>=5 세이브 +1 (migrateStory, story.v=2)
- 옛 클라이언트가 snow 가지·worldtree 썰매를 세이브에서 지운다 → 5곳 동시 배포
- 앱 브라우저 검증: preview_start 5개 제한 → Bash 로 serve.py 8063 + navigate. 설산 좌표 y=30 필수

## 확정 문구
2026-10-28 사용자 확정: 계획 Task 0 표의 초안 그대로("문구 이대로 확정").

## 배포 체크리스트 (실행 전)
1. 배포 직전에 `sql/migrations/migrate_sled_worldtree.sql` 을 pooler 로 직접 실행한다. `sled_runs` 테이블의 `sled_runs_sled` 제약에 `worldtree` 를 넣는 마이그레이션이다. 이 전에 나가면 세계수 썰매 기록이 거절된다.
2. 웹·토스·Play·iOS·itch 를 **동시에** 배포한다. 이유: 옛 클라이언트의 `restoreTree` 는 모르는 `snow` 가지를 버리고, 설산 `save.js` 는 모르는 `worldtree` 썰매를 세이브에서 지운다. 옛 클라이언트는 `story.v` 를 몰라 장 번호를 옛 표로 읽는다. 한 곳만 먼저 나가면 그 사이 세이브가 깨진다.
   - 옛 클라이언트가 더 지우는 것: `treeBloom.branches.snow`(개화 단계·돌봄·본 손님), 어느 가지든 판에 놓인 ☃️ 눈사람 타일, 장착한 `worldtree` 썰매(기본 썰매로 돌아간다).
   - 장 번호 어긋남은 `story.at`(현재 장 id) 가드가 바로잡는다. 옛 클라이언트가 올린 `ch` 가 `at` 과 맞지 않으면 접속 때 옛 8장 표 기준으로 읽어 9장 표 위치로 옮기고 `story_migrated` 를 찍는다.
   - 출시 순서: 토스·iOS·Play 를 먼저 심사에 제출하고, 웹과 itch 는 셋 다 승인될 때까지 보류한 뒤 한꺼번에 낸다. 업데이트하지 않는 유저는 옛 JS 를 계속 쓴다. 감수하는 위험이며 `story.at` 가드로 완화한다.
3. 토스 출시 후 `notices_admin.html` 로 공지를 쓴다.
4. 열린 확인 사항
   - 실기기에서 눈의 가지 잎이 게임 조명 아래 회색이 아니라 흰색으로 보이는지 확인한다.
   - 배포 전 4장까지 끝낸 세이브는 5장 「얼어붙은 가지」를 받는다. 이 판은 물→밭→부엌→숲 가지를 먼저 키워야 열린다. 칩이 다음으로 키울 가지 이름을 보여 주는지 확인한다.
