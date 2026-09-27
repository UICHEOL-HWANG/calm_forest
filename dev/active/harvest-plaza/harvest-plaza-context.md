# harvest-plaza context
Last Updated: 2026-09-27

- 스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
- 계획: docs/superpowers/plans/2026-09-27-harvest-plaza.md
- 브랜치: feat/harvest-plaza (main 49bc40c 분기)
- 핵심 결정: 영구 광장 · 위치 (23,-4) · 단계형 무조건 완공 · 하루 상한 30 · RPC 원장 · 좌판2+등급2 · 장식은 🧺 보관함 지급
- 연결 규칙: game.js 에는 연결 줄만(≤14, tests/plaza-wiring.test.mjs)
- 디자인 게이트: 3D·UI·문구는 시안 3개+ 캡처 비교 후 사용자 선택
- 사용자 실행 필요: sql/migrations/migrate_plaza.sql → sql/tests/plaza_selftest.sql (SQL Editor)
