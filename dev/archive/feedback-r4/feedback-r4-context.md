# Context — feedback-r4

Last Updated: 2026-09-11

## 핵심 파일
- `js/game.js:110` WET_TIME / `:111` WILT_TIME — 작물 속도
- `js/game.js:1316` ZONE_PAGE / `updateToolPageAuto` — 구역별 도구 자동 전환
- `js/game.js:8898` handleAction 의 `atMine` 분기 — 채굴은 hoe 일 때만
- `js/game.js:7161` placeOutdoor / `:7204` pickOutdoor / `:5910` buildDecorGhost
- `index.html:1122` #inv-hud 자원칩 / `:1903` ui.setInventory

## 의사결정
- 작물: 촉촉 9초·시듦 60초 (성장량 유지) — 사용자 선택
- 광산 HUD: 🪨⚫💎+🪙 4칸 (칸 수 유지 → 모바일 레이아웃 안 흔들림) — 사용자 선택
- 회전: 실내 가구와 동일(↻버튼·R키·90° 4방향) — 사용자 선택

## 함정
- `outdoorMesh` 는 정원등·화로·정령등불의 재질을 `houseWindows`(밤 점등 목록)에 push 한다.
  고스트용으로 만들 때 그대로 두면 목록이 계속 불어나고 dispose 된 재질이 남는다 → 만든 뒤 잘라낸다.
- 자동 도구 선택은 `Input.selectTool`(효과음·배치취소 포함) 말고 조용한 경로를 써야 한다.
