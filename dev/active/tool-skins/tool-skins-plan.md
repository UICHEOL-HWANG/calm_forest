# 🪓☂️ 프리미엄 도구 테마 세트 — 계획 (2026-10-02 승인: "테마 세트로 ₩5,000 ㄱㄱ 게임에 넣어")

## 상품
- 카탈로그 새 칸 `tools`(🪓 도구) · 3종: `tools_shroom` 🍄 버섯 숲 세트 · `tools_moon` 🌙 달밤 세트 · `tools_bloom` 🌸 꽃정원 세트 — 각 ₩5,000(현금 전용 won)
- 세트 = 손에 드는 도구 9종(axe·hoe·seed·water·sickle·shovel·hammer·rod·net) 외형 + 비 오는 날 우산
- 시안: sims/premium-tool-umbrella-sim.html (꽃삽 = ① 꽃 양각 확정)

## 규칙
- 외형만. 성능·스윙 모션·금빛(tier2) 규칙 불변. 테마를 입으면 테마가 등급 외형보다 우선
- 일꾼(makeWorkerMesh)·🌊 릴대(reel)는 테마 미적용(toolMesh 기본 인자 null)
- 우산: WEATHER==='rain' 이고 바깥(실내·카페·박물관·광산 아님)일 때만 머리 위에 펼침. 맑은 날엔 안 보임
- 드로우콜: 정점색 굽기(bake)로 도구 1개 ≤ 5콜, 우산 ≤ 5콜. 입자는 v1 제외
- 🌙 발광: nightLevel 로 emissive 세기 조절(블룸 임계 0.85 — 발광은 작은 별·테두리만)
- 토스·안드로이드·itch: 가게 행 숨김(기존 premiumRowMode), 옷장 탭은 산 게 있을 때만

## 단계
1. 순수 규칙 + 테스트(RED→GREEN): catalog tools 칸·3종 · tool-skin-rules(toolSkinOf·지원 도구·테마) · wardrobeTabVisible · revealModeOf
2. 조형 모듈 js/cosmetics/tool-skins.js (THREE 인자) — 시뮬에서 이식 + bake
3. 게임 배선: toolMesh(id, tier, skin) · setHeldTool/refreshHeldTool · applyCosmetics 시 재생성 · 우산 update · 밤 발광
4. 가게·옷장: COS_TABS/SLOT_TABS 🪓 도구 · 미리보기 showTools · 구매 연출(boxburst + 도구 진열)
5. 검증: npm test · 게임 화면(?weather=rain, 밤) · 드로우콜 실측 · code-reviewer
6. Paddle: priceId 는 사용자 키로 `PADDLE_ENV=production node scripts/paddle-seed.mjs --only tools_*` (사용자 실행) → 배포 4곳
