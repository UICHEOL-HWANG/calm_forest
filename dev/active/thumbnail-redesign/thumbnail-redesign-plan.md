# 썸네일 리디자인 — 계획
- 문제: 토스·OG·itch 가 같은 AI 생성 이미지(title-source.jpg) — 뒷모습·저해상도 업스케일·로고 분리.
- 결정(2026-10-06): A안(레퍼런스형 — 밝은 낮, 왼쪽 로고 패널+곰 뱃지, 오른쪽 캐릭터 4명 정면) 채택. B(골든아워)·C(모닥불)는 기각.
- 방식: sims/thumbnail-sim.html 이 인게임 buildAnimalMesh 를 import 해 3D 로 직접 렌더 → shoot.mjs 가 규격 PNG 로 캡처.
