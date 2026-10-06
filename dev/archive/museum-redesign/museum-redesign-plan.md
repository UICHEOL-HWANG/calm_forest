# 박물관 리디자인 — 계획 (승인됨 2026-10-06)

- 스펙: docs/superpowers/specs/2026-10-06-museum-redesign-design.md
- 구현 계획(전문): docs/superpowers/plans/2026-10-06-museum-redesign.md  ← 단일 출처, 여기엔 복사하지 않는다
- 시안: sims/museum-redesign-layout-sim.html · sims/museum-redesign-exhibits-sim.html (캡처 look/)
- 브랜치: feat/museum-redesign (main 에서 분기, 워크트리 아님)

## 결정 요약
1. 한 건물, 정문은 1층만. 상층 남쪽은 난간+유리창.
2. 1·2층 = 벽 유리장 16×14(최대 17칸) / 3층·특별전 = 회랑 20×14(벽 유리장 + 낮은 탁자).
3. 전시물 = 카테고리별 대표 조형 + 종별 변형. 도형 데이터(exhibit-parts) → 병합 빌더(exhibit-build), 전시물당 메시 ≤3.
4. 스펙과 달라진 점: 벽 배치 방 15×13 → 16×14 (코너 계단과 뒷벽 5칸 충돌).
