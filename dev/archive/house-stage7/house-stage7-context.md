# Context — Last Updated: 2026-10-06
- 서버/SQL 변경 없음(gameState jsonb 통째 저장)
- 핵심 파일: js/house-cost.js · js/house/index.js · js/house/addons.js · js/spaces/house.js · js/spaces/doors.js · js/spaces/indoor.js · index.html renderExpand
- 함정: 복원 순서(house.style 은 buildHouseStage 루프 앞) · 한옥 role 재질 1개 · 병합 시 role/baseColor 유지 · 충돌 solidBox 3개
