# context — Last Updated: 2026-09-29

- 워크트리 `../calm_forest-wardrobe` · 브랜치 `feat/menu-wardrobe` (main 22cf006 에서)
- 메뉴: index.html `#util-btns` (~1576) · 핸들러 id 로 바인딩(music 5418 · lang 2295 · privacy/delacc 3875(토스는 remove) · logout 3715)
- 캐릭터 모달: index.html `#char-modal` 2185 · `ui.showCharacterSelect` 2830 · 프리뷰 `Input.createCharacterPreview` → game.js makeCharacterPreview(refresh/showPet/showTrail)
- 가게: js/spaces/cafe.js drawCosMenu/drawPetTab (~845~960)
- 펫 교체: finishPetJob(petJob 정산) → usePet → respawnPet → requestSave, trackEvent('pet_switch')
- 함정: preview 는 원 저장소 루트를 띄움 → launch.json 임시 항목에 워크트리 serve.py 절대경로
