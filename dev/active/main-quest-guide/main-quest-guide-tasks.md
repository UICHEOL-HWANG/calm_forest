# 체크리스트

Last Updated: 2026-11-10 18:40 KST

- [x] 장별 도달·멈춤 데이터
- [x] 장별 요구사항·비용 조사
- [x] 계획 초안(세밀 단계 + 광고 자리)
- [x] 계획 확인(사용자 "묶음 1 시안부터" 11/10)
- [x] 광고 버튼 문구 확정: "🎬 광고 보고 🪨 3개 받기" 형식(사용자 선택 11/10)
- [x] 화면 시안 A·B·C(sims/main-quest-guide/compare.html) → A 선택(11/10)
- [x] 광고 버튼 반짝임(무지개 테두리 회전·은은한 빛·✦ 두 개, 동작 줄이기면 정지) 시안 sims/main-quest-guide/a-shine.html → 확인 대기
- [ ] 문구 후보 검수
- [x] 묶음 1 구현(미커밋): js/guide/story-steps.js(순수 단계 규칙) · js/guide/step-card.js(카드, 번역 노드 분리) · goal-guide 연결(story_* 목적지, 도착 카드) · 판 안 카드+하이라이트(금색 CSS 표식, 이모지 아님)
- [x] 봇 확인: 2장 세계수 도착 카드 → 판 안 연못 하이라이트·부족 줄(🪨 2개 더 필요 · 동굴에서) → 하이라이트만 눌러 물의 가지 완성 / 3장 밭→부엌 탭 안내 → 카페 문(건물 돌아서) → 만들 수 있는 주문 손님 도착 카드
- [x] 봇 발견 수정: 카페 문이 건물 바로 뒤라 경유점이 없던 문제 → 박스 콜라이더는 모서리로 돌아가기(detourPoint) + 테스트
- [x] 코드 리뷰(CRITICAL/HIGH 0) 반영: 모서리 다음 구간 막힘 감점, '개' 전역 번역 제거(영어면 단위 노드 생략)
- [x] npm test 4597 통과
- [ ] 화면 캡처(브라우저 창이 숨겨져 캡처 보류) · 영어 모드 확인 · 카페 요리 미니게임 끝까지
- [x] 집 3단계(바닥·벽·지붕) 부족 카드 + 반짝 광고 버튼(js/guide/house-short.js, 규칙 js/guide/prepass-rules.js) · 스위치 PREPASS_ON=false(tuning.js) · 로컬 ?prepass=1 로 가짜 광고 확인
  - 지급: 모자란 만큼, 재료별 상한(목재 10·돌 6·석탄 1·코인 40) · ~~하루 3회·단계 1회~~ 11/11 사용자 결정으로 횟수 제한 없음 · 50:50 배정(prepass-v1 소금, 대조군은 버튼 없음)
  - 계측: prepass_eligible{slot,arm} · prepass_ad_result{slot,result,value_micros}
  - 애드몹 연결: feat/admob-rewarded 병합 때 game.js 의 setPrepassProvider({available: rewardedAvailable, show: showRewarded}) 한 줄(정적 경로 동적 import 는 esbuild 번들이 깨져서 뺌)
  - 주의: 부족 카드(광고 없는 줄)는 스위치와 무관하게 모두에게 보임 → 바닥 단계는 집 안내 실험 두 무리에 똑같이 들어감, 배포일 기록
- [ ] 광고 스위치 켜기: 안내 배포 1주 기준선 뒤
- [ ] 묶음 2: 4장 · 6장 · 광부
- [ ] 묶음 3: 5·7·8·9장, 8장 원인 조사
- [ ] 광고: 기준선 1주 뒤 A·B·C·H 실험
- [x] 11/11 LTV 방향: 4~8장은 도달이 적어 안내보다 반복 활동 광고로. 집 완성(houseStage 3) 뒤에만 노출
  - 공용 버튼 js/ads/rewarded.js(① 무지개 테두리, 시안 sims/ad-button/compare.html) · 집 카드도 이걸 씀
  - 텃밭 farm_rush(js/ads/farm-rush.js, 자라는 칸 즉시 익힘) · 화덕 craft_rush(어제로 돌림, craft_claim via=ad) · 판매 sell_bonus(절반, 코인 40 상한) · 출석 daily_double(같은 코인 한 번 더)
  - 횟수 제한 없음(사용자 결정). 이유가 있을 때만 뜸: 자라는 칸·굽는 칸·방금 판매·오늘 출석
  - 확인: ?prepass=1 봇으로 네 자리 지급 확인, npm test 4605 통과, 코드 리뷰 중간 3건 반영
- [ ] 안내 개편(묶음 1)도 대조군 실험 스위치: 신규만, 광고와 다른 소금
