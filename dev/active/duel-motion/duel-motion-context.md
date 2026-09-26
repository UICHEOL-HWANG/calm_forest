# 🎬 대결 연출 — 컨텍스트
**Last Updated** 2026-09-27 00:40

- 브랜치 feat/duel-motion (fix/night-note-order 위에 쌓음 — 쪽지 순서 수정 6f31b17 포함)
- 핵심 파일: js/duel/stage.js(무대·카메라, updateDuelStage 비어 있었음) · js/duel/index.js(흐름) · js/duel/art.js(동물은 부위가 합쳐진 메시 → 몸 전체 변환으로만 움직인다)
- 결정: 연출 루프는 stage 가 소유(game.js 메인 루프는 duelActive 동안 플레이어·카메라 갱신을 건너뛴다 — game.js:5132)
- 카메라: zoomBowls 가 카메라를 직접 트윈하던 것을 handle.cam(기준 자세) 트윈으로 — 루프가 기준+오프셋을 매 프레임 합성
- 함정(기존 주석): CAM_DIST 8.2 는 폰에서 멧돼지 뒷다리가 안 잘리는 하한 — 줌인은 거리 8% 이내
- 제약: 도구 스윙 모션은 건드리지 않는다(memory no-swing-motion-change)
