# 호미 노점 + 유료 호미 스킨 연결

## 확정 (2026-10-27)
- 위치 B: 마을 바다터 입구 옆 등대 앞 모래사장 (17.2, -9.4), 회전 -0.6
- 노점에서 호미 단계(코인)·각인(재료) 판매. 잡화점의 buy_homi1/2 는 노점으로 옮김
- 유료 스킨은 노점에서 미리보기만, 결제는 꾸미기샵(현금 Paddle) 호미 탭으로 연결
- 노점 둘레 나무·꽃 금지 + 충돌체(통과 금지)
- 안내판은 기둥 가로대에 매달기 (간격 맞춤)

## 상품 (Paddle 라이브 등록 완료)
| id | 가격 | price |
|---|---|---|
| homi_najeon | 1,500 | pri_01m5yj5pa4wkbkss123en74c71 |
| homi_coral | 1,500 | pri_01m5yj5pycvkeec9x65fm1zyvr |
| homi_whale | 1,500 | pri_01m5yj5qewvy1rn6r3qjs0maca |
| homi_trio (묶음) | 3,500 | pri_01m5yj5qzq2thcttma947mxtht |
| mudflat_set | 3,900 | pri_01m5yj5rg2kebcpax83hckb2k1 |

## 단계
1. 노점 조형 js/forage/homi-stall-art.js, 배치·충돌체·나무 제외 (sea.js, game.js, places.js)
2. 노점 메뉴: 단계·각인·스킨 미리보기 → 꾸미기샵 호미 탭 열기 (index.html, doors.js)
3. 꾸미기 'homi' 슬롯: catalog·price-ids·REVEAL_COPY·SHOP_COPY·탭·shop-rows·paddle-seed·테스트
4. 장착 렌더: mudflat holdShovel 이 equipped.homi 를 읽어 skinOf pal/over + dressHoe
5. 묶음 homi_trio: bundles.js 일반화(choose 없음), 웹훅 grant
6. 서버 원장 가드 SQL migrate_homi_skins.sql 직접 실행
7. 테스트·리뷰·PC/폰 캡처
