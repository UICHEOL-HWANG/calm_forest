# 🪞 거울 마을 — 체크리스트

- [x] 브레인스토밍·스펙
- [x] 시안 1 정류장 위치·외관
- [x] 시안 2 거울 마을 전경
- [x] 시안 3 그림자 주민
- [x] 시안 4 잃어버린 물건 6종
- [x] 시안 5 거울 장식 4종
- [x] 시안 6 컷신 스토리보드
- [x] 구현 계획(writing-plans)
- [x] TDD 구현 (layout/quests/clues/track → art → spaces/mirror → cutscene 공용화 → game.js 연결)
- [x] 코드 리뷰 · dream QA 회귀 · 실측
- [ ] 4곳 동시 배포 · 공지 · 다음 날 BQ 재검증

## 진행 (2026-10-08 Task 14 기준, HEAD 5d658ca)
- ✅ Task 0~13 구현·QA 완료 · ✅ Task 14 브랜치 전체 리뷰(CRITICAL/HIGH 0 · MEDIUM 3 · LOW 4)
- 리뷰 반영(5d658ca): 탑승 중 저장 → 정류장 앞 · 재탑승해도 힌트 감점 유지 · 안에서 자정 넘기면 HUD·말풍선 갱신
- 결과: npm test **2217/2217** · 거울 QA **24/24**(PC·모바일·영어) · 꿈 회귀 **27/27** · 드로우콜 거울 공간 **59**/60(전체 90)
- 남은 리뷰 항목(의도/수용): 옛 클라가 `mirror` 필드를 지움 → **4곳 동시 배포, 토스 승인 전엔 웹·Play 보류** · `mirror_stop_shown` 은 접근마다 1회(퍼널 분모 = 접근 수, Task 15 표에서 재검토) · 언어 바꿔도 이름표는 다음 빌드까지 그대로 · 정류장 충돌 상자 vs 기존 야외 장식 겹침(확신 <80%, 배포 전 실측)
- ✅ Task 15 파라미터 정리(사용자 컨펌 "전부 적용"): npc_id→npc · item_id→item · wait_s·search_s→elapsed_s · done_today→left_today · mirror_return 삭제(보상=hinted 파생) → 새 키 10→5 · 이벤트 11→10 · 근거 param-review.md · QA 24/24×3
- ⬜ 4곳 동시 배포 · 공지 · 다음 날 BQ 재검증 (사용자 확인 후)
