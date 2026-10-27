# Tasks — sea-forage
- [x] 분할 방향·선택 화면 2안(세 장) 확정 (2026-10-27)
- [x] 갯벌 캐기 시뮬 sims/mudflat-dig-sim.html (캐기 방식 A·B·C)
- [x] 브라우저 검증 PC+모바일 캡처 (자동 플레이 60초 기준 A 44개·B 39개·C 25개, 콘솔 오류 0)
- [x] 사용자 캐기 방식 선택 → **C 숨 쉴 때 캐기** (2026-10-27)
- [x] 잠수 시뮬 sims/dive-sim.html (숨 규칙 A·B·C, 자동 플레이 숨 3번 기준 A 31개·B 15개·C 41개)
- [x] 결과창 공용 모듈 sims/forage-result.js 시안 3개(바구니·영수증·수첩) + 비교 sims/forage-result-compare.html (PC·세로 폰·가로 폰)
- [x] 잠수 숨 규칙 선택 → **A 숨 다 되면 떠오르기** (2026-10-27)
- [x] 결과창 시안 선택 → **3안 수첩** (2026-10-27, 두 시뮬·모듈 기본값 3)
- [x] 선택 화면 시안 3개 sims/sea-mode-pick-compare.html (A 나란히·B 넘기기·C 부두 표지판, 미리보기는 세 시뮬 ?clip=1 가상 시계로 실제 장면 캡처) + 제목 후보 3·카드 문구 2세트
- [x] 선택 화면 레이아웃·제목·카드 문구 선택 → **A 나란히 세 장 · 제목 1번 · 카드 문구 가안** (2026-10-27)
- [x] 이식 계획 승인 (~/.claude/plans/async-jingling-glade.md), 워크트리 feat/sea-forage (calm_forest-sea-forage)
- [x] 순수 로직 js/forage/logic.js + tests/forage-logic.test.mjs 10개 통과
- [x] 보상 표 승인 (잡을 때 코인 + 판매가, 1분 갯벌 약 59·잠수 약 74, 낚시 약 98·썰매 약 11 기준)
- [x] ML 고려 트래킹 설계서 sea-forage-tracking.md (GA4 새 키 0개, forage_runs 상세, 난이도 probe)
- [x] 아이템 11종 등록: js/forage/logic.js 단일 출처(FORAGE_SELL·ICO·LABEL·META·KEYS)를 catalog·places·game RES_LABEL·index.html 가방/판매에 펼침 + 영어 이름 · tests/forage-items.test.mjs 6개 · 게임에서 가방 "🌊 바다" 칸·판매 줄 이름 확인
- [x] 트래킹 행 빌더 js/forage/run.js(38컬럼·GA4 3종 페이로드·배열 200 상한) + tests/forage-run 10개 · 난이도 probe(tuning mudflat/dive, ddaOutcome mudflat=성공률) + tests/forage-difficulty 4개 · forage_runs 운영 DB 적용(2026-10-27, DB 리뷰 5건 반영, 최악 행 삽입 후 롤백 확인) · config FORAGE_TABLE + sendForageRun
- [x] 선택 화면: js/forage/pick.js(승인 문구·NEW 규칙) + js/spaces/sea-pick.js(문 연결·sea_mode_pick·ENTRY 맵) + index.html #sea-pick-modal(seap- 접두사, 컨테이너 쿼리) + 번역 + 분류표 행 · tests/sea-pick 6개 · PC·세로·가로 폰 확인, 낚시 입장·닫기·잠긴 카드 동작 확인. 갯벌·잠수는 ENTRY 에 연결하면 열림(지금 "곧 열려요")
- [ ] 카드 미리보기 영상: 공간 완성 뒤 실제 게임에서 3.5초 녹화 → webm(카드용) + GIF(공지·SNS용 원하면)
- [x] 갯벌 공간 1차: 바다터 안 놀이(seaMode)로 구현 — 독립 공간 대신(등록 20곳 → 바다터 분기 8곳). js/forage/mudflat-run.js(판 규칙, 테스트 8) + js/spaces/mudflat.js(화면) + 결과창 js/forage/result-card.js(수첩, fr- 접두사) + HUD #forage-hud + 분류표 forage_start/result · 게임에서 캐기→보상(가리비 +2코인·아이템 +1)→기록→판 끝→결과창→마을로 정리까지 확인
- [x] 🔨 호미 시안 3개(js/forage/hoe-art.js, ?hoe=A|B|C) 게임 캐릭터 실화면 비교 dev/active/sea-forage/hoe-compare.png · 모션은 사용자 요청대로 기존 삽질('dig') 그대로
- [ ] 호미 시안 선택 → 기본값으로 고정(?hoe 디버그 제거 여부 결정)
- [ ] 🌙 밤에 갯벌이 너무 어두움 → 밤 조명 시안(손전등·달빛 등)
- [ ] 갯벌 세로·가로 폰 화면 확인
- [ ] 잠수 공간 (헤엄 자세 프레임 비교 승인 후)
- [ ] 결과창 fr- 접두사 이식 + 글꼴 자체 호스팅
- [ ] 🦀🦪🐙🤿🫧 아이콘 묶음(js/icons/toss-icons-all.js ICON_ALL)에 없음 → 그림체 확인·필요하면 아이콘 추가(디자인 비교)
- [ ] 번역 · 연결 테스트 · 실제 게임 캡처 · 리뷰
- [ ] 5곳 배포 + 다음 날 BigQuery 확인

## 2026-10-27 호미 확정
- [x] 대장간 호미(A3) 기본, 손에 들 때 앞면(HOE_FACE=-π/2), 휘두를 때 옆선으로 돌아가 날이 아래로 걸림
- [x] 새 호미 모션(들기→걸기→당기기) 승인, 기존 삽질 그대로
- [x] 폰 세로 확인, 가로(높이<500) 카메라 1.2→0.8로 당김
- [ ] 갯벌 밤 조명 시안 3개
- [ ] 💡 사용자 제안: 상점에서 호미 구매 + 옵션(능력치) + 유료 호미 스킨 → 범위·가격 시안 먼저

## 2026-10-27 호미 상점 결정
- [x] 구매처 A 잡화점 도구 칸 (sims/hoe-shop-compare.html)
- [x] 아이콘은 이모지 대신 게임 전용 토스풍 SVG (js/icons ICON_BY_ID 에 'homi' 등 추가 예정) · 시안 sims/hoe-icon-compare.html
- [x] 유료: P2 호미 단독 스킨 3종(자개·산호·고래, 각 1,500 / 묶음 3,500) + P3 갯벌 세트(호미+바구니+장화, 3,900) 둘 다 · 디자인 화려하게(js/forage/hoe-skins.js, sims/hoe-skin-compare.html)
- [x] 아이콘 2안 대장간 날 확정 → sims/icon-set/icons-toss.js 원본에 homi·homi_long·homi_eye·homi_gold·homi_opt_reach·homi_opt_eye·homi_opt_spare 추가, GAME_IDS 등록 후 node tools/icons/build-game-icons.mjs 로 생성 (js/icons/toss-icons.js 직접 수정 금지, 테스트가 잡음)
- [x] 옵션 방식 2안 각인 끼우기 확정 (단계가 오르면 칸 1→2, 각인은 조개로 구매)
- [ ] 유료 호미 디자인 승인 → 결제 상품·서버 원장 SQL 목록·Paddle/토스 상품 등록(사용자 몫 포함)

## 2026-10-27 호미 단계·각인 구현 (계획: ~/.claude/plans/async-jingling-glade.md)
- [x] js/forage/homi.js 순수 모델 + tests/homi.test.mjs (단계 0~2, 각인 reach/eye/spare, 기본 효과는 단계 누적·칸에 못 끼움)
- [x] mudflat-run reach/missLimit 인자 · mudflat.js 판 시작 때 효과 고정·눈썰미 반짝임·단계별 호미 색(hoe-skins tierLook)
- [x] 잡화점 SHOP_BUY buy_homi1/2 (HOMI_TIERS에서 파생) · shop.js buyHomi · renderShop 보유/잠금 표시
- [x] 각인 창 2안 칸+타일·문구 2안 (index.html #homi-menu, renderHomi/onHomiTile) · PC·세로·가로 폰 확인
- [x] forage_runs homi_tier·engraves (운영 적용, feet 포함 CHECK) + homi_engrave(item_id/slot/action, 기존 키)
- [x] 리뷰 반영: 2단계 빈 칸 → 각인 '가벼운 발'(갯벌 걷기 ×1.15, mudflatSpeedMult) 추가 · 1단계에서 산 눈썰미는 2단계 구매 때 재료 환불 · buyEngrave 모델 검증(칸 없음·기본 효과 겹침) · 가로 폰 CSS · 보유 호미 줄 흐림 해제
- [ ] 다음: 유료 호미 스킨 결제 연결(디자인 승인 후) · 갯벌 세트 바구니·장화
- [x] 갯벌 지도 곡선화(2026-10-27): js/forage/mudflat-shore.js 곡선 만(모래·젖은 모래 띠·풀 둔덕 압출·바위·모래 언덕) · bayEdge 가 걷는 범위(±14)보다 항상 바깥(테스트로 잠금)
- [x] 바다 2안 '밀려오는 파도' 확정: js/forage/mudflat-sea.js 정점 물결+얕은/깊은 색+물가 찰랑임+파도 거품 3줄(3.6초 주기). 1안·3안 코드는 지움 · 드로우콜 순증 약 +5(상자 5개 → 해안 5 + 바다 5)
