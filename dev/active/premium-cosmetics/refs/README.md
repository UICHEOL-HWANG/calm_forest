# 프리미엄(현금) 꾸미기 레퍼런스 — 2026-10-01 조사

목적: calm forest 에 ₩3,000~₩10,000 현금 전용 꾸미기(코인 아이템과 별개)를 넣기 위한 내일 디자인 세션용 자료.
가격은 출처에 적힌 USD 기준이며, 확인하지 못한 값은 **미확인**으로 표시했다. 환율·지역가는 반영하지 않았다.

---

## 1. 게임별 정리

### Sky: Children of the Light (thatgamecompany)
- **가게 UI 방식**: 설정(톱니) 메뉴 → Shop 아이콘에 상시 상점(캔들 팩, 스타터 팩)이 있다. 이벤트 기간에는 월드 안의 **마네킹·상점 정령**에서도 IAP를 판다. 공지 인포그래픽은 아이콘 하나하나에 🛒(IAP)·티켓(이벤트 재화)·캔들(소프트 재화) 마크를 붙여 **현금 아이템과 재화 아이템을 같은 줄에 두고 마크로만 구분**한다(`sky-store-ui-01/02`). 자선 아이템은 보라색 하트 배지를 따로 붙인다.
- **입어보기**: 이벤트마다 IAP와 재화 아이템의 **무료 try-on spell**(일정 시간 착용)을 나눠 준다(Days of Bloom 2026 기준).
- **프리미엄 아이템 종류**: 망토(cape), 전신 의상, 머리 장식, 소품(우산·버블 머신), 미니 동반자(Cinnamoroll 콜라보), 신발. 시즌 패스와 선물용 패스도 있다.
- **가격대**(fandom Premium Candle Shop 문서 기준):
  - 캔들 15개 $4.99 / 35개 $9.99 / 72개 $19.99 / 190개 $49.99
  - 시즌 패스 $9.99, 시즌 패스+선물 패스 2장 $19.99
  - 스타터 팩(주황 망토+캔들 20) $4.99
  - 단품 망토: Bloom Rose-Embroidered Cape $14.99, Cloak of Darkness $14.99, Ocean Cape $14.99, Earth Cape $4.99
  - 소품: Color Bubble Machine $14.99 ("망토 색에 따라 버블 색이 반응")
  - 의상 팩: Charming Creature Pack(의상+머리 장식) $14.99
  - **Dark Rainbow Loafers + 캔들 75개 $19.99** — "풀밭에서 신으면 무지개 발자국을 남긴다"(`sky-store-ui-01`). 우리 '자국' 슬롯과 정확히 같은 개념이다.
  - 소액: $0.99~$2.99 단품도 있다(목걸이 $1.99 등).
- **시사점**
  - 프리미엄은 대부분 **움직이는 것**(망토 펄럭임, 빛나는 몸, 반응형 버블, 발자국)이다. 정적인 모자보다 물리·발광·반응이 붙은 물건이 현금값을 한다.
  - "현금 아이템+소프트 재화 묶음"($19.99 = 아이템+캔들 75) 구성이 많다. 아이템만 사는 게 아니라 재화가 같이 와서 손해 보는 느낌이 줄어든다.
  - 무료 입어보기 덕분에 구매 전에 확신을 얻는다.
  - 자선 아이템(수익 절반 기부)이 정기적으로 나온다.

### Palia (Singularity 6 / 현 운영사)
- **가게 UI 방식**: 재단사(Tailor) 계산대, 인벤토리, 옷장 세 곳에서 Premium Store 로 들어간다. 왼쪽에 **캐릭터 전신 미리보기**, 가운데에 색상 스와치 패널, 오른쪽에 같은 세트의 변형 3종 카드가 있다. 아래에는 "전부 사기" 가격과 할인 규칙 문구가 붙는다(`palia-store-ui-01`). 결제 확인 화면은 영수증처럼 줄별 할인(50% OFF 배지)과 합계를 보여 준다(`palia-store-ui-02`). 우상단에는 보유 코인과 + 버튼이 있다.
- **세트 할인 구조**: 세트를 한 번에 사면 약 33% 할인이다. 따로 사면 두 번째와 세 번째가 각각 50% 할인된다. 그래서 "하나만 사도 나머지가 싸진다"는 동기가 생긴다.
- **프리미엄 아이템 종류**: 의상 세트(색 변형 3종), 도구 스킨, 글라이더 스킨, **프리미엄 펫(Palcat 등)**, 이모트, 스티커, 집터 Landscape, 친구 선물용 Mystery Outfit Gift.
- **가격대**:
  - Palia Coin(현재, paliaguide.com 기준): 425=$4.99, 1,000=$9.99, 2,050=$19.99, 3,650=$34.99, 5,350=$49.99, 11,000=$99.99
  - 2023년 개편 목업에서는 425=$4.99, 850=$8.49, 1,700=$16.49 …로 **의상 가격(425·850·1,700)과 코인 묶음을 일치시켜 잔돈이 남지 않게** 했다(`palia-coins-ui-01`). 현재 가격과 다르니 참고만 할 것.
  - 의상 단품 425~2,380 코인, 세트 850~5,100, 펫 510~1,190, 글라이더 212~850, 도구 스킨 묶음 255~892 (위키 세일가 기준)
  - Steam DLC 팩: Starter Pack $4.99(코인 850+의상 1+전용 펫 Palcat), Founders Pack $29.99(코인 3,400+의상 8+펫), Highlands Supporter Pack $29.99, Royal Highlands $59.99
- **시사점**
  - **잔돈이 남지 않는 코인 단위 설계**를 공식 공지로 사과하며 고쳤다. 우리는 처음부터 "현금 = 아이템 1:1 가격"으로 가면 이 문제가 생기지 않는다.
  - 색 변형 3종을 묶고 할인 규칙을 화면에 문장으로 풀어 써서 신뢰를 얻는다.
  - 프리미엄 펫은 **구매 보상 전용(무료 획득 경로 없음)**이라고 명시했다.
  - $4.99 스타터 팩이 "두 배 가치+전용 펫"으로 첫 결제 문턱을 낮춘다.

### Disney Dreamlight Valley (Gameloft)
- **가게 UI 방식**: Premium Shop 은 매주 수요일에 교체된다(featured 4개 + 상시 번들). 할인 상품은 20% 할인 배지를 단 "Limited-Time Deals" 칸에 따로 둔다. 구매하면 **어두운 별하늘 배경에 아이템을 3D로 단독 회전시키는 '획득 연출 화면'**이 나오고, 하단에 번들 구성품 썸네일이 슬라이드로 깔린다(`ddv-reveal-*`). 'New Item' 태그와 카테고리(Character Dream Style / House Style / Glider / Clothing) 라벨이 붙는다.
- **프리미엄 아이템 종류**: Dream Bundle(캐릭터 스킨+집 외관+가구+글라이더+의상을 한 테마로 묶고 퀘스트도 포함), 캐릭터 Dream Style(주민 스킨), 동반자(펫), House Dream Style(집 외관 전체), 도구 스킨 세트, 가구.
- **가격대**(Moonstone): 1,200=$4.99 / 2,500=$9.99 / 5,500=$19.99 / 14,500=$49.99(검색 결과 기준, 공식 스토어에서 재확인은 **미확인**)
  - 의상 850~2,250, 의상 번들 1,200~1,500, 동반자 2,000~3,000, 집 외관 3,000~3,750, Dream Bundle 4,000(약 $19.99), 겨울 디럭스 번들 8,000
- **시사점**
  - **"한 테마 = 캐릭터+집+탈것+옷"의 세트 완성도**가 프리미엄을 만든다. 낱개보다 '세계관 한 덩어리'를 판다.
  - 획득 연출(별하늘+회전 3D)만으로도 비싼 물건처럼 보인다. 우리 옷장 미리보기에 그대로 쓸 수 있는 패턴이다.
  - 매주 교체와 재등장 구조로 FOMO를 만들되 "언젠가 돌아온다"는 신호도 함께 준다.

### Adopt Me! (Roblox, Uplift Games)
- **가게 UI 방식**: 대부분의 펫 옷(Pet Wear)은 게임 재화 Bucks 로 사고, Pet Shop 에서 화·토요일에 교체된다(Ultra-rare 칸은 토요일 주간 교체). Robux(현금 재화)는 **게임패스·특정 펫·뽑기 재료**에 쓴다.
- **프리미엄 아이템 종류**: 펫 게임패스(Axolotl 600, Cerberus 500, Frost Dragon 1,000, Ghost Dragon 1,000 Robux 등), 테마 펫 옷 게임패스(Hero's Costume — 가격 **미확인**), 뽑기 재료(Kitty Biscuit 75 Robux, 결과 확률 공개: Rare 87.5% / Ultra Rare 10% / Legendary 2.5%), VIP 640·Premium Plots 379 Robux.
- **가격대**: Robux↔원화 환산은 **미확인**(Roblox 묶음 가격이 지역·시기별로 다름).
- **시사점**
  - 펫 렌더(`adoptme-pet-*`)는 **둥근 저폴리·큰 눈·볼터치**로 우리 플러시 톤과 가장 가깝다.
  - **Neon/Mega Neon(같은 펫의 발광 업그레이드)**이 가치를 4배·16배로 올린다. "같은 모델+발광 셰이더"만으로 프리미엄 등급을 만든 사례다.
  - 확률형(뽑기)은 국내 확률 공시 의무와 토스·Play 정책 부담이 있다. 우리는 **직접 구매형만** 권장한다.

### Animal Crossing: Pocket Camp (Nintendo, 2017~2024 F2P → 현재 유료판 Complete)
- **가게 UI 방식**: Leaf Ticket(유료 재화)으로 **이벤트 포춘쿠키**(테마 가구·옷 랜덤)를 50장, 5개 묶음은 250장에 팔았다. 쿠키를 사면 스탬프가 쌓이고 10개를 채우면 원하는 아이템과 교환한다(`pocketcamp-cookie-exchange-01`). 월 구독 Pocket Camp Club 중 **Furniture & Fashion Plan 은 월 $7.99에 매달 쿠키 5개를 고르는 방식**이었다(`pocketcamp-club-plan-01`).
- **프리미엄 아이템 종류**: 테마 가구 세트, 드레스·의상, 캠핑카 외관, 기념 'Scrapbook Memory'(세트의 최고 희귀템).
- **가격대**: Club F&F 플랜 $7.99/월. Leaf Ticket 묶음 가격은 **미확인**. 2024-11 F2P 서비스가 종료되고 Complete($9.99 → $19.99 일회 구매)로 바뀌면서 유료 재화는 사라졌다.
- **시사점**
  - 랜덤이라도 **스탬프 교환으로 '확정 획득' 경로**를 붙여 불만을 줄였다.
  - 결국 F2P 를 접고 **완전 유료판으로 전환**했다. 아늑한 게임에서 과금 구조가 오래 버티기 어렵다는 반례로 기억해 둘 만하다.

### Hello Kitty Island Adventure (Sunblink) — 대조군
- **가게 UI 방식**: 게임 내 상점(Tuxedosam's Shop)은 전부 게임 재화로 운영된다. **어떤 플랫폼에도 마이크로트랜잭션이 없고**, 수익은 유료 DLC(Wheatflour Wonderland $14.99, Tea Garden $9.99, City Town $24.99)로 낸다.
- **프리미엄 아이템 종류**: 없음. 옷·얼굴·등 장식(요정 날개, 백팩)은 플레이로 얻는다.
- **시사점**: 우리와 슬롯 구조(얼굴·등 장식)가 비슷하다. **"현금 아이템은 플레이로 얻는 것과 겹치지 않는 '표현 전용'이어야 한다"**는 기준선으로 삼을 만하다. 비주얼 톤(`style-hkia-*`)도 참고.

### Cozy Grove / Fae Farm / Ooblets — 스타일 참고(현금 꾸미기 상점 없음)
- 세 게임 모두 게임 내 현금 상점이 없고 유료 DLC만 판다(Cozy Grove New Neighbears $6.99, Fae Farm Coasts of Croakia $7.99). 우리 저폴리·파스텔 톤과 가까워 **아이템 조형 톤 참고용**으로 받았다(`style-*`).

---

## 2. '프리미엄처럼 보이게 하는 것' 정리 (조사에서 반복된 패턴)

| 요소 | 사례 | 근거 이미지 |
|---|---|---|
| 움직임·물리 | Sky 망토 펄럭임, Palia 글라이더 | `sky-capes-glow-01` |
| 발광·셰이더 | Sky 빛나는 아이, Adopt Me Neon 펫, Palia Royal 팩의 번개 두른 말·빛나는 박쥐날개 | `sky-outfit-glow-01`, `palia-bundle-royal-01` |
| 세계 반응 | Sky 무지개 발자국(풀밭에서만), 버블 머신(망토 색에 반응) | `sky-store-ui-01` |
| 세트 완성도 | DDV Dream Bundle(스킨+집+탈것+옷), Palia 색 변형 3종 세트 | `ddv-reveal-*`, `palia-store-ui-01` |
| 획득 연출 | DDV 별하늘 단독 회전 화면 | `ddv-reveal-skin-01` |
| 구매 전용 표시 | Palia 프리미엄 펫(무료 경로 없음), Sky 🛒 마크 | `palia-bundle-starter-02`, `sky-store-ui-02` |
| 미리보기 | Sky 무료 try-on spell, Palia 전신 미리보기+스와치 | `palia-store-ui-01` |
| 한정·재등장 | DDV 주간 교체, Sky 이벤트 IAP 재등장('Returning Favorites') | `sky-store-ui-01` |
| 의미 부여 | Sky 자선 아이템(수익 절반 기부) | `sky-store-ui-01` |

---

## 3. 이미지 목록 (총 28장)

| 파일명 | 무엇 | 출처 URL |
|---|---|---|
| sky-capes-glow-01.jpg | Days of Color 2026 커버. 무지개·발광 망토를 두른 캐릭터 3명 | https://a.storyblok.com/f/108104/1920x1080/ed09d069c1/daysofcolor2026_cover.jpg (https://www.thatskygame.com/news/days-of-color-2026) |
| sky-store-ui-01.jpg | 이벤트 상점 인포그래픽. IAP 🛒·캔들 가격·자선 배지, "무지개 발자국" 신발 설명 | https://a.storyblok.com/f/108104/1920x1080/578a4f1a9d/daysofcolor2026_infographic03.png |
| sky-store-ui-02.jpg | IAP/이벤트 티켓/캔들 아이템을 마크로 구분한 범례, 망토 착용 캐릭터 | https://a.storyblok.com/f/108104/1920x1080/a6a49f0ce4/daysofcolor2026_infographic04.png |
| sky-store-ui-03.jpg | 7주년 이벤트 "Celebrate in Style". IAP 의상·모자 아이콘 목록 | https://a.storyblok.com/f/108104/1920x1080/cc7d387968/3_sls_7thanni_outfits_slide3.png |
| sky-outfit-glow-01.jpg | 전신이 파랗게 빛나는 캐릭터(발광 전신 스킨 참고) | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2325290/88db68b32eb6ad6e702669643addb842699ec7d4/ss_88db68b32eb6ad6e702669643addb842699ec7d4.1920x1080.jpg |
| palia-store-ui-01.png | Premium Store 세트 화면. 전신 미리보기+색 스와치+변형 3종+Buy All+할인 규칙 문장 | https://images.ctfassets.net/qyr5bjm559gz/4wzVPfWI4YQYShyu6NO79/428a9f81894585a243b220fd1a008828/Shop_Mockup2.png |
| palia-store-ui-02.png | 결제 확인 화면. 줄별 50% OFF·합계·Purchase | https://images.ctfassets.net/qyr5bjm559gz/3sJPgTiq1lWqqX1Esril3N/838d960201a3a636112ab2525b565c1a/Shop_Mockup_4.png |
| palia-coins-ui-01.png | 코인 묶음 6종 카드(2023 개편안, 의상가와 일치) | https://images.ctfassets.net/qyr5bjm559gz/3jVHjxRTSeILkRfq2MYIYJ/6b8293968abb8d8e5c65078fdacb4003/Coins_Mockup2.png |
| palia-bundle-starter-01.jpg | Starter Pack($4.99) 헤더. 고양이 펫+의상+코인 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3720190/a13107671363ebf9f66069ccb34089e853cf2265/header.jpg |
| palia-bundle-starter-02.jpg | Starter Pack 구성. 허브 의상 2종+전용 펫 Palcat | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3720190/34dbf57c3f1520238df666d2d9a258088d95e8d7/ss_34dbf57c3f1520238df666d2d9a258088d95e8d7.1920x1080.jpg |
| palia-bundle-founders-01.jpg | Founders Pack($29.99) 헤더. 의상 8종+코인 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3708940/76332ec5062f9d1721ccbee7495a8097600bff28/header.jpg |
| palia-bundle-founders-02.jpg | Founders Pack 의상 8종 단체 컷+벌 펫 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3708940/b0b8df35e767fdc102f22de47dacfc85acbea21b/ss_b0b8df35e767fdc102f22de47dacfc85acbea21b.1920x1080.jpg |
| palia-bundle-highlands-01.jpg | Highlands Supporter Pack. 승마 의상 2종+우편함+말 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4465220/e9eef95281b8b9b8bf3c360b4efd59f05fa232e0/ss_e9eef95281b8b9b8bf3c360b4efd59f05fa232e0.1920x1080.jpg |
| palia-bundle-royal-01.jpg | Royal Highlands($59.99). 번개 두른 말·발광 박쥐날개 글라이더·코인 더미 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4465230/bb8b3cfe0fd43bd05e111dc66e840adb05b56ecf/ss_bb8b3cfe0fd43bd05e111dc66e840adb05b56ecf.1920x1080.jpg |
| ddv-reveal-skin-01.jpg | 획득 연출 화면. Sun-and-Surf Stitch 캐릭터 스킨(별하늘 배경, 번들 구성 슬라이드) | https://storage.ghost.io/c/50/c6/50c61f91-0165-4605-93bc-f8598149e466/content/images/2025/10/Stitch-Dream-Style-1.jpg |
| ddv-reveal-house-01.jpg | 획득 연출. Hawaiian Home 집 외관 스킨 | https://storage.ghost.io/c/50/c6/50c61f91-0165-4605-93bc-f8598149e466/content/images/2025/10/Player-House.jpg |
| ddv-reveal-glider-01.jpg | 획득 연출. Island Surf Glider(무지개 서핑보드) | https://storage.ghost.io/c/50/c6/50c61f91-0165-4605-93bc-f8598149e466/content/images/2025/10/Surf-Board.jpg |
| ddv-reveal-clothes-01.jpg | 획득 연출. Island Swim Shorts 의상 | https://storage.ghost.io/c/50/c6/50c61f91-0165-4605-93bc-f8598149e466/content/images/2025/10/Island-Clothes.jpg |
| adoptme-pet-matcha-cat-01.png | Legendary 펫 Matcha Cat 렌더(저폴리 플러시 톤) | https://cdn.sanity.io/images/d4ypzn9i/production/b4130ba9ba6d65d3eca8a82a0ed2f0ce01fc92b4-1080x1080.png |
| adoptme-pet-catte-01.png | Ultra Rare 펫 Catte 렌더 | https://cdn.sanity.io/images/d4ypzn9i/production/6008e307f873156f8496eba51c4d3aa401ff9f12-1080x1080.png |
| pocketcamp-club-plan-01.png | Pocket Camp Club Furniture & Fashion Plan 카드("1 month for $7.99", 매달 5개 선택) | https://dodo.ac/np/images/1/11/Furniture_%26_Fashion_Plan.png |
| pocketcamp-cookie-exchange-01.png | 스탬프 카드 → 포춘쿠키 교환 아이콘 | https://dodo.ac/np/images/8/85/Fortune_Cookie_Exchange_PC.png |
| pocketcamp-cookie-icon-01.png | 이벤트 포춘쿠키 아이콘 예시 | https://dodo.ac/np/images/f/fd/Filbert%27s_Rocket_Cookie_PC_Icon.png |
| style-hkia-01.jpg | Hello Kitty Island Adventure 밭+풍선(파스텔 저폴리 톤) | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2495100/ss_4b2dee4ba9d74ebff886cff692a718632db7ebfa.1920x1080.jpg |
| style-hkia-02.jpg | HKIA 통나무 오두막 실내 꾸미기 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2495100/63ac4ec151b232b1c98cd824701085ac2f5891db/ss_63ac4ec151b232b1c98cd824701085ac2f5891db.1920x1080.jpg |
| style-faefarm-01.jpg | Fae Farm 농장 탑뷰 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2230110/ss_a1f1fd1a79c86ece30a15275abd0d3cb70d47be1.1920x1080.jpg |
| style-ooblets-01.jpg | Ooblets 밭+동반 생물 | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/593150/ss_ac9b89cd8233c2baf3716113b7bc14b04ddaced7.1920x1080.jpg |
| style-cozygrove-01.jpg | Cozy Grove 밤 캠프 조명(따뜻한 발광 소품 참고) | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1458100/ss_7ccc68d4ac9698f3066995d02587b50977dace71.1920x1080.jpg |

텍스트 출처: Sky Premium Candle Shop(fandom, API로 위키텍스트 열람), palia.wiki.gg Premium Store, palia.com/news/monetization-update-08-2023, paliaguide.com, thegamer.com·gamegrin.com·gamingtrend.com(DDV), playadopt.me/news, nookipedia.com Fortune cookie, Steam store API(DLC 가격).

---

## 4. calm forest 적용 아이디어

전제: 현금 아이템은 **플레이 보상과 겹치지 않는 '표현 전용'**이고(HKIA 기준선), **뽑기 없는 직접 구매**만 한다(Adopt Me·Pocket Camp 반례). 가격은 **원화 1:1 직판**으로 둬서 잔돈 코인 문제를 없앤다(Palia 교훈). 가격 칸은 제안값이다.

| # | 슬롯 | 아이템 | 제안가 | 왜 프리미엄으로 느껴지나 |
|---|---|---|---|---|
| 1 | 자국 | **계절 꽃 발자국** — 풀·흙 위에서만 작은 꽃이 피었다가 몇 초 뒤 사라짐(물·돌 위에선 물방울/먼지) | ₩3,000 | Sky 무지개 발자국($19.99 묶음)처럼 **세계에 반응**한다. 지면 종류마다 다르게 나와서 '살아 있는' 느낌이 든다 |
| 2 | 자국 | **반딧불 자국** — 밤에만 발자국에서 반딧불이 떠오름(낮엔 평범한 잎) | ₩4,000 | 우리 밤낮 시스템과 연동돼 **조건부로만 보이는 희소성**이 생기고, 발광 파티클이 붙는다 |
| 3 | 등 | **오로라 망토** — 걷고 뛸 때 천 시뮬로 펄럭이고, 밤엔 가장자리가 은은하게 빛남 | ₩6,000 | Sky 망토($14.99대)의 핵심인 **움직임+발광**. 기존 망토 재조형 자산을 재사용하되 셰이더로 차별화한다 |
| 4 | 등 | **나뭇잎 요정 날개** — 가만히 있으면 접히고, 점프·달리기 때 펼쳐지며 잎가루가 날림 | ₩5,000 | 상태에 따라 **모양이 바뀌는 애니메이션**. HKIA 요정 날개는 무료 보상이라 '접힘/펼침+파티클'로 급을 나눈다 |
| 5 | 머리 | **계절 화관(4종 세트)** — 봄 벚꽃·여름 해바라기·가을 단풍·겨울 눈꽃, 해당 계절에 꽃잎이 한두 장씩 흩날림 | 단품 ₩3,000 / 세트 ₩9,000 | Palia식 **색·테마 변형 3~4종 세트 할인**. 계절 운영과 연결돼 수집 욕구가 생긴다 |
| 6 | 목 | **방울 목도리** — 걸을 때 방울이 흔들리며 작게 딸랑 효과음, 클릭하면 인사 이모트 | ₩3,000 | 시각+**소리**+이모트가 묶인 작은 물건. Sky 소품($0.99~4.99대)처럼 저가 입문용 |
| 7 | 펫 | **펫 발광 스킨 'Moonlit'** — 기존 펫 모델에 달빛 테두리+밤에 은은한 발광 | 펫당 ₩4,000 | Adopt Me **Neon 개념**과 같다. 같은 모델에 셰이더만 바꿔도 등급이 달라 보이고, 제작비가 낮다 |
| 8 | 펫 | **펫 의상 세트** — 펫용 미니 망토·모자를 주인 아이템과 커플로 | ₩5,000(주인+펫 세트 ₩8,000) | **커플 세트 완성도**(DDV식 묶음). 펫과 함께 다니는 사진을 남기고 싶어진다 |
| 9 | 스킨(전신·신규) | **플러시 인형 스킨** — 몸에 바느질 선·천 질감, 걸을 때 살짝 말랑하게 눌림, 넘어지면 솜뭉치 파티클 | ₩9,000 | DDV Character Dream Style, Sky 전신 의상 팩($14.99)과 같은 **전신 단위 변신**. 우리 플러시 얼굴 콘셉트를 가장 강하게 보여 준다 |
| 10 | 스킨(전신·신규) | **숲의 정령 스킨** — 반투명 초록 발광체, 걷는 자리에 작은 새싹(자국 슬롯과 연동) | ₩10,000 | Sky 빛나는 아이(`sky-outfit-glow-01`) 참고. **스킨+자국 일체형**이라 세트감이 최대다. 최고가 앵커 상품 |
| 11 | 집/장식 | **반딧불 정원등 세트** — 밤에 켜지는 등 4개+작은 아치 | ₩5,000 | DDV House Style·Cozy Grove 조명처럼 **밤 풍경을 바꾸는 장식**. 다른 사람이 놀러 와도 보인다 |
| 12 | 번들 | **첫 구매 팩 '숲의 손님'** — 꽃 발자국+방울 목도리+펫 Moonlit 1종 | ₩5,900(단품 합 ₩10,000) | Palia Starter Pack($4.99, "두 배 가치+전용 펫")처럼 **첫 결제 문턱을 낮추는 1회 한정 묶음** |

### UI 쪽 제안 (조사 기반)
- **입어보기 우선**: Palia처럼 왼쪽에 전신 미리보기를 두고, 오른쪽에 아이템·색 변형을 놓는다. Sky의 무료 try-on 처럼 "30초 입어보고 마을 걷기"도 검토해 볼 만하다.
- **현금 표시 분리**: 코인 아이템과 같은 그리드에 두되 🛒/₩ 배지로 구분하거나(Sky), 별도 탭에 둔다. 가격은 재화가 아니라 **₩ 그대로** 표기한다.
- **획득 연출**: DDV처럼 어두운 배경에 아이템 단독 회전과 반짝임을 넣는다. 우리 옷장 탭의 '자국 걸어오기' 미리보기(B안)와 잘 붙는다.
- **세트 할인 문장화**: "하나 사면 나머지 50%" 같은 규칙을 화면에 문장으로 적는다(Palia).
- **확률형 금지**: 직접 구매만 한다(토스·Play 정책, 국내 확률 공시 부담 회피).
