# Tasks
- [x] 1 규칙 모듈(js/house-stage7.js)+비용(EXPANSIONS 7)+테스트
- [x] 2 모델 이식(garden/merge/stage7-modern/hanok)+index.js
- [x] 3 구성품 7단계 자리
- [x] 4 게임 연결(house.js/doors.js/indoor.js/game.js 복원)
- [x] 5 UI 스타일 카드(index.html)+i18n
- [x] 6 검증(테스트·브라우저 PC/모바일·드로우콜·옛 세이브)

## 2026-10-06 구현 결과 (미배포)
- 테스트 1781/1781 · 드로우콜(메시 수) 6단계 113 → 7단계 모던 31/한옥 28 (구성품 12종 포함 192 → 60/57)
- 확인: ?house=7&style=modern|hanok · 증축 카드→한옥 선택→증축(코인 -1500, style 저장) · 현관 프롬프트·퇴장 · 실내 3층 · 스와치
- 2026-10-06 내관: js/house/interior7.js(스타일 벽·창·실내 정원) + indoor.js 연결 완료
- 남은 것: 밤 점등 실물 확인 · 실기기(토스) · 6단계 목수 대사 "마지막이야" 문구(npcs.js:76) · 배포 여부 사용자 결정

## 2026-10-06 정원 층(f=3)
- house-floors.js GARDEN(f3, outdoor, elevated 없음)+GARDEN_DOOR · indoor.js(buildRoom 정원 분기·1층 오른쪽 벽 문 틈·계단 생략·floorBaseY=elevated) · doors.js(문 프롬프트 🌿/🏠·계단 제외·goFloor 문 앞 이동) · interior7.js buildGardenFloor7 · game.js 카메라(elevated 만)·미니맵 문 표시
- 확인: ?house=7 → 1층 문 프롬프트→정원 이동→가구(f=3) 배치·층별 가시성 · 정원 방 메시 20개
- 남은 것: 밤 점등 · 실기기 · 옛 세이브 · 배포는 사용자 결정
