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
(Task 0 에서 채운다)
