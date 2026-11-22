# 식당 재고 P1 두 건

1. 재료가 바닥나 더 받을 손님이 없으면 영업을 일찍 끝낸다(session.js tickSession, finishSession.soldOut).
2. 결과 카드에서 다음 영업 재료가 모자라면 포구 부두 안내(기존 onStockGuide)로 이어 준다. 시안 A/B/C 중 사용자 선택.
3. 선택: 첫 재료 쌀 4 → 5(별2 조건 주먹밥 5그릇).
