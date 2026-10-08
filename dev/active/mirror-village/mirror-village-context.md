# 🪞 거울 마을 — 컨텍스트

Last Updated: 2026-10-08 (Task 14 리뷰 반영 · HEAD 5d658ca)

- 브랜치 `feat/mirror-village` · 워크트리 `.claude/worktrees/mirror-village` · 기준 origin/main f5a366f
- 핵심 결정: A(물건 찾기)+B(반전 단서) · ① 점진(1번째 그대로, 2·3 반전)+💧 힌트 · 정류장 신설+초승달 마차 재사용, 낮만 · 탑승·하차 연출 필수 · 🪞 거울 조각→장식 4종 · 시간 정지+늘 푸른 밤 · 구조 A안(복제+컷신 공용화)
- 사용자 요구: **디자인은 반드시 컨펌**(시안 3+ PC·모바일 나란히) · **트래킹 빠짐없이** · **모듈 분리(game.js 연결부만)**
- 참고 파일: js/dream/{layout,art,cutscene,decor-art}.js · js/spaces/dream.js · js/data/places.js(DREAM -550, NEIGHBOR 700) · 카메라 고정 camOffset(0,14,16) → 화면 왼쪽=서쪽
- 함정(1차 계승): 맨 localhost 금지(오프라인 CDP) · 헤드리스 hidden→rAF 정지 · 미니맵/펫/발자국 고정 목록 · 4곳 동시 배포
- 시안 위치: dev/active/mirror-village/mockups/
