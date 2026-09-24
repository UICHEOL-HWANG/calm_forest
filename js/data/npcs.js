// =============================================================
//  📦 주민·선물·퀘스트 안내·데일리/반복 의뢰
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
export const GIFTS = [
  { id: 'bouquet', name: '꽃다발',      ico: '💐', cost: { crop: 2 } },
  { id: 'fruit',   name: '과일 바구니', ico: '🧺', cost: { crop: 4 } },
  { id: 'fishset', name: '생선 묶음',   ico: '🐟', cost: { fish: 3 } },
  { id: 'woodtoy', name: '목각 인형',   ico: '🪆', cost: { wood: 6 } },
  { id: 'necklace', name: '보석 목걸이', ico: '📿', cost: { gem: 1 }, love: 2 },   // 💎 최상급 선물 — 친밀도 +2(채굴)
];

//   베타 피드백: "방랑 상인이 씨앗뿌리기 0/3 이라는데 어쩌라는 건지 모르겠어요."
//   제목·목표(무엇을)만 있고 수행 방법(어디서·무슨 도구로)이 없어서 생긴 막힘 →
//   퀘스트 패널과 주민 대화창에 이 줄을 함께 띄운다. 지명은 VILLAGE_PLACES 와 같은 이름을 쓴다.
export const QUEST_HOW = {
  plant:        '🌾 텃밭에서 🌰씨앗을 들고 일군 밭에 심어요 (밭이 없으면 ⛏️괭이로 먼저 갈아요)',
  water:        '🌾 텃밭에서 💧물조리개를 들고 씨앗 심은 밭에 물을 줘요',
  harvest:      '🌾 텃밭에서 다 자란 작물 앞에 서서 낫으로 거둬요',
  collect_crop: '🌾 텃밭에서 씨앗을 심고 물을 주면 자라요. 거두면 가방에 쌓여요',
  collect_wood: '🪓 도끼를 들고 마을 나무 앞에서 액션을 눌러요',
  chop:         '🪓 도끼를 들고 마을 나무 앞에서 액션을 눌러요',
  fish:         '🏞️ 호수에서 🎣낚싯대를 던지고, "물었어요!" 가 뜨면 바로 액션!',
  fish_rare:    '🏞️ 호수에서 계속 낚아요. 🪱미끼를 쓰면 희귀 물고기 확률이 올라가요',
  house:        '🔨 망치를 들고 내 집 앞에서 액션 — 목재를 넣으면 한 단계씩 올라가요',
  collect_dex:  '📖 처음 보는 것을 잡거나 캐거나 거두면 도감에 등록돼요 — ☰ 메뉴 → 📖 에서 확인',
  dex_one:      '📖 큐레이터가 집어 준 것을 찾아 도감에 등록해요 — ☰ 메뉴 → 📖 에서 어디서 나오는지 확인',
  expand:       '🎨 완성된 집 근처에서 [집 외관 꾸미기] 버튼을 열면 맨 위에 🏗️ 증축이 있어요',
  sell:         '🏪 상점이나 찾아온 🧙방랑 상인에게 가방 속 물건을 팔아요',
  catch:        '🌟 밤에 반딧불이 계곡으로 가서, 밝게 반짝일 때 포충망을 휘둘러요',
  forage:       '🍄 채집 숲에서 열매·버섯 앞에 서서 맨손으로 주워요',
  mine:         '⛏️ 채굴 동굴에서 괭이를 들고 광석 앞에서 액션을 눌러요',
  cook:         '🍳 자유주방에 들어가 재료가 있는 요리를 골라 만들어요',
  serve:        '☕ 카페에 들어가 손님이 말한 요리를 만들어 내드려요',
  carve:        '🗿 작업대에서 조각 탭을 열고, 오늘의 주문 하나를 골라 깎아요',
  egg:          '🥚 닭장에 가서 달걀을 걷어요. 하루에 한 번 나와요',
  gift:         '🎁 작업대에서 선물을 만들어, 주민 앞에서 가방을 열고 건네요',
  decor:        '🪵 작업대에서 야외 장식을 만들어 마당에 놓아요',
  boat:         '🛶 나루터에서 배를 타고 강을 끝까지 내려가요',
  seafish:      '🌊 바다터에서 낚싯대를 던지고, 물면 힘겨루기를 버텨요',
  mist:         '🌫️ 안개 숲에 들어가 등불을 밝히고 숲을 정화해요',
};

//   퀘스트 type: chop(벌목) harvest(수확) water(물주기) plant(심기)
//               house(집완성) collect_wood/collect_crop(보유량 달성)
// 💬 하루에 주민 한 명과 나눌 수 있는 대화 횟수.
//    ⚠️ functions/api/npc-talk.js 의 SETS_PER_DAY 와 반드시 같아야 한다 —
//    서버가 2세트만 내려주는데 여기가 3이면 세 번째에 빈 대화가 열린다.
export const TALK_PER_DAY = 2;

export const NPCS = [
  {
    id: 'farmer', name: '농부 삼촌', emoji: '🧑‍🌾', color: 0x5fbf62, hat: 0xf0cd6a, pos: [5, 0, 4], look: 'farmer',   // 🟢 초록 + 넓은 밀짚모자
    quests: [
      { type: 'chop',    target: 3, title: '장작 모으기', desc: '나무 3번 베기',   reward: { seed: 3, coins: 5 },  line: '겨울 대비 장작이 필요해. 나무 3번만 베어줄래?' },
      { type: 'harvest', target: 2, title: '수확의 기쁨', desc: '작물 2개 수확',   reward: { wood: 6, coins: 8 },  line: '밭에서 작물 두 개만 거둬다 주면 목재로 보답하지!' },
      { type: 'water',   target: 4, title: '촉촉하게',   desc: '물 4번 주기',     reward: { seed: 5, coins: 8 },  line: '모종이 목말라 해. 물 네 번만 부탁할게.' },
      { type: 'harvest', target: 6, title: '대풍년',     desc: '작물 6개 수확',   reward: { seed: 6, coins: 15 }, line: '올해는 대풍년을 만들어보자! 여섯 개만 더 거둬줘.' },
    ],
  },
  {
    id: 'builder', name: '목수 아저씨', emoji: '👷', color: 0xe0663c, hat: 0xffd23f, pos: [-5, 0, 6], look: 'builder',  // 🟠 테라코타 + 노란 안전모·각목
    quests: [
      { type: 'collect_wood', target: 10, title: '목재 납품', desc: '목재 10개 모으기', reward: { crop: 3, coins: 10 },          line: '집 지으려면 목재 10개가 필요해. 모아올 수 있겠어?' },
      { type: 'house',        target: 1,  title: '보금자리',  desc: '집 완성하기',      reward: { seed: 6, crop: 3, coins: 30 }, line: '이제 근사한 집을 완성해보자고!' },
      { type: 'collect_wood', target: 20, title: '큰 창고 짓기', desc: '목재 20개 모으기', reward: { coins: 25 }, line: '마을 창고를 지으려면 목재가 많이 필요해. 스무 개 부탁해!' },
      // 🏗️ 증축 안내 — 증축은 [🎨 집 외관 꾸미기] 버튼 안에 숨어 있어 아무도 찾지 못했다.
      //    목수가 그 위치를 직접 말해 주는 게 이 세 의뢰의 존재 이유다.
      //    ⚠️ 되돌릴 수 없는 1회성 목표 — 진행도는 상태형(houseStage)으로 읽고,
      //       이미 지어 둔 기존 유저에게는 pickCurrent(js/quests.js)가 읽는 자리에서 조용히 건너뛴다.
      { type: 'expand', stage: 4, target: 1, title: '한 층 더', desc: '🧱 브릭 로프트로 증축', reward: { stone: 6, coins: 20 }, line: '집이 좁지 않아? 집 앞에서 🎨집 외관 꾸미기를 열면 🏗️증축이 있어. 벽돌 한 층 올려보자고!' },
      { type: 'expand', stage: 5, target: 1, title: '펜트하우스', desc: '🏢 펜트하우스로 증축', reward: { wood: 10, coal: 3, coins: 25 }, line: '한 층 더 올릴 수 있어. 목재랑 돌, 석탄까지 모아야 하니 만만치 않을 거야.' },
      { type: 'expand', stage: 6, target: 1, title: '옥상 정원', desc: '🏝️ 루프탑 빌라로 증축', reward: { coins: 30, gem: 1 }, line: '마지막이야 — 옥상 정원까지 얹으면 마을에서 제일 근사한 집이 돼.' },
    ],
  },
  {
    // 좌판 바로 뒤(북쪽) 상주 — 좌판 장애물 반경 1.6 + NPC 여유 0.35 = 1.95 밖이어야 npcBlocked 에 안 걸린다
    id: 'merchant', name: '방랑 상인', emoji: '🧙', color: 0x8a5cd0, hat: 0xf0c04a, pos: [10.5, 0, -3.5], roam: 0.6, look: 'peddler',   // 🟣 보라 보따리 장수(hat 색은 허리띠)
    quests: [
      { type: 'plant',        target: 3, title: '씨앗 뿌리기', desc: '씨앗 3번 심기',   reward: { wood: 4, coins: 6 }, grant: { seed: 3 }, line: '여기 씨앗 3개를 줄 테니, 세 번 심어보겠소?' },
      { type: 'collect_crop', target: 5, title: '풍년',       desc: '작물 5개 보유',   reward: { seed: 8, coins: 12 }, line: '작물 다섯 개만 모으면 큰 선물을 주겠소!' },
      { type: 'sell',         target: 10, title: '장사의 신',  desc: '상점에서 10개 팔기', reward: { coins: 30 }, line: '장사꾼의 자질이 보이는군! 상점에서 열 개를 팔아보시오.' },
    ],
  },
  {
    id: 'angler', name: '낚시꾼 할아버지', emoji: '🎣', color: 0x3f8fd6, hat: 0x27506f, pos: [9, 0, 14], look: 'angler',   // 🔵 파랑 + 버킷햇·낚싯대·흰 수염
    quests: [
      { type: 'fish',      target: 2, title: '첫 낚시',   desc: '물고기 2마리 낚기', reward: { crop: 3, coins: 8 }, line: '호수에서 🎣낚싯대로 물고기 두 마리만 낚아보게!' },
      { type: 'fish',      target: 5, title: '월척 도전', desc: '물고기 5마리 낚기', reward: { seed: 5, coins: 12 }, line: '이번엔 다섯 마리! 물면 바로 낚아채야 하네.' },
      { type: 'fish_rare', target: 1, title: '무지개를 낚아', desc: '희귀 물고기 1마리', reward: { crop: 6, seed: 4, coins: 40 }, line: '전설의 무지개 물고기를 낚아오면 큰 상을 주지!' },
      { type: 'fish',      target: 8, title: '만선의 꿈',   desc: '물고기 8마리 낚기', reward: { crop: 5, coins: 20 }, line: '마지막 도전일세 — 만선의 꿈을 이뤄보게나!' },
    ],
  },
  {
    id: 'chef', name: '요리사 판다', emoji: '🐼', color: 0xf7f4ee, hat: 0xffffff, pos: [0, 0, -8], look: 'chef',   // ⚫⚪ 판다(검은 귀·눈 패치) + 요리사 토크
    quests: [
      { type: 'collect_crop', target: 3, title: '신선한 재료', desc: '작물 3개 보유',  reward: { coins: 8 },            line: '요리는 재료가 절반! 신선한 작물 세 개를 모아와 줘.' },
      { type: 'cook',         target: 2, title: '오늘의 요리', desc: '요리 2번 하기',  reward: { coins: 12 },           line: '자유주방에서 요리 두 번! 타이밍을 잘 맞추면 버프도 오래가.' },
      { type: 'cook',         target: 3, title: '풀코스 도전', desc: '요리 3번 하기',  reward: { coins: 20, gem: 1 },   line: '마지막 시험이야 — 풀코스 세 접시를 완성해 봐! 💎 특별 보상이 있어.' },
    ],
  },
  {
    // 🦡 채집 숲지기 — 마을 외곽이 텅 비었다는 베타 건의에 맞춰 숲 입구에 상주.
    //    🐿️다람쥐·🦦수달은 ☕카페 손님 캐스트에 이미 있다(같은 동물이 밖과 카페에 동시에 있으면 헷갈린다)
    id: 'forager', name: '숲지기 오소리', emoji: '🦡', color: 0x6b6157, hat: 0xf2efe8, skin: 0xe8e4dc, pos: [-16.5, 0, 15.5], roam: 0.5, look: 'badger',   // ⬛⬜ 잿빛 몸 + 흰 줄무늬 얼굴
    quests: [
      { type: 'forage', target: 5,  title: '숲 첫걸음',   desc: '🍄 채집물 5개 줍기',      reward: { seed: 4, coins: 8 },  line: '숲에 들어온 김에 다섯 개만 주워다 줄래? 어디에 뭐가 나는지 알려줄게.' },
      { type: 'forage', target: 12, title: '바구니 가득', desc: '🍄 채집물 12개 줍기',     reward: { crop: 4, coins: 14 }, line: '겨울 준비를 해야 해. 열두 개면 바구니가 그득해질 거야!' },
      { type: 'gift',   target: 1,  title: '이웃의 몫',   desc: '🎁 주민에게 선물 1번 주기', reward: { seed: 6, coins: 12 }, line: '주운 걸 혼자 쌓아두면 재미없잖아. 누구든 하나 나눠줘 봐.' },
      { type: 'carve',  target: 1,  title: '나뭇결 읽기', desc: '🗿 조각 1개 완성하기',    reward: { coins: 20, gem: 1 },   line: '마지막은 손재주야 — 작업대에서 조각 하나만 완성해 보렴. 💎 값진 걸 줄게.' },
    ],
  },
  {
    // ⭐ 밤 콘텐츠 안내역 — 반딧불이 계곡 입구(밤에만 의미가 생기는 구역의 길잡이)
    id: 'stargazer', name: '별 보는 아이', emoji: '⭐', color: 0x5b6fd0, hat: 0xffd86b, skin: 0xfde3c8, pos: [6, 0, 20.5], roam: 0.5, look: 'stargazer',   // 🔵 남색 + 별 머리핀·포충망
    quests: [
      { type: 'catch', target: 3, title: '첫 반딧불이', desc: '🌟 반딧불이 3마리 잡기(밤)', reward: { crop: 3, coins: 10 }, line: '밤이 되면 여기 반딧불이가 떠올라요. 세 마리만 같이 잡아요!' },
      { type: 'gift',  target: 1, title: '나눠 주기',   desc: '🎁 주민에게 선물 1번 주기',  reward: { seed: 5, coins: 10 }, line: '예쁜 걸 보면 누구 주고 싶어져요. 선물 하나만 건네 보실래요?' },
      { type: 'catch', target: 8, title: '별이 내린 밤', desc: '🌟 반딧불이 8마리 잡기(밤)', reward: { coins: 24, gem: 1 },  line: '여덟 마리가 모이면 계곡이 하늘처럼 보인대요. 보고 싶어요!' },
    ],
  },
  {
    // 🦆 나루터지기 — 🛶강·🌊바다는 잠길 수 있어 체인엔 넣지 않는다(일일·반복 풀에서만 나온다)
    id: 'ferryman', name: '사공 오리', emoji: '🦆', color: 0xf0ede4, hat: 0xe8a33c, skin: 0xf5f2ea, pos: [2.5, 0, -13.5], roam: 0.5, look: 'duck',   // ⚪ 흰 몸 + 주황 부리·밀짚 삿갓·노
    quests: [
      { type: 'fish',         target: 4,  title: '나루 조황',   desc: '물고기 4마리 낚기',  reward: { wood: 5, coins: 10 }, line: '물때가 좋구먼. 네 마리만 낚아 보시게 — 뱃길 이야기를 들려주지.' },
      { type: 'collect_wood', target: 15, title: '나루 손보기', desc: '목재 15개 모으기',   reward: { crop: 4, coins: 16 }, line: '선착장 널이 삭았어. 목재 열다섯이면 든든하게 고치겠군.' },
      { type: 'fish',         target: 8,  title: '한나절 낚시', desc: '물고기 8마리 낚기',  reward: { coins: 22, gem: 1 },  line: '마지막일세 — 여덟 마리를 채우면 진짜 물가 사람이 되는 게야.' },
    ],
  },
  {
    // 🐔 목장터 — 🥚달걀은 닭장을 지어야 가능하므로 체인엔 넣지 않는다(일일·반복 풀에서만 나온다)
    id: 'rancher', name: '목장 아주머니', emoji: '🐔', color: 0xd9694f, hat: 0xfaf3e2, skin: 0xfbe0c4, pos: [-6.5, 0, 12.8], roam: 0.5, look: 'rancher',   // 🔴 벽돌빛 저고리 + 쪽진 머리에 비녀 · 달걀 바구니
    quests: [
      { type: 'cook',         target: 2, title: '아침상 차리기', desc: '요리 2번 하기',            reward: { seed: 5, coins: 10 }, line: '아침은 든든해야지! 부엌에서 두 번만 만들어 봐요.' },
      { type: 'serve',        target: 3, title: '손님맞이',     desc: '☕ 카페 손님 3명 서빙하기', reward: { crop: 4, coins: 16 }, line: '카페가 바쁘대요. 손님 세 분만 봐주면 큰 도움이 될 거예요.' },
      { type: 'collect_crop', target: 8, title: '곳간 채우기',   desc: '작물 8개 보유',            reward: { coins: 22, gem: 1 },  line: '마지막 부탁이에요 — 작물 여덟 개면 겨울이 무섭지 않아요.' },
    ],
  },
  {
    // 🧑‍🦳 박물관 큐레이터 — 🏛️ 입구 옆 상주. 마을에서 유일하게 차려입은 사람이라 실루엣으로 구분된다.
    //   개관 체인이 박물관 자체를 소개한다(🔨목수 체인이 숨어 있던 증축을 소개했듯).
    //   ⚠️ 목표는 전부 도감 등록(collect_dex)이다 — 무엇을 가져오든 "처음 보는 것" 이면 된다.
    id: 'curator', name: '큐레이터 할아버지', emoji: '🧑‍🦳', color: 0x4a5a7a, hat: 0x8a2f3a, skin: 0xf0ddc8,
    //  ⚠️ 자리는 계단 오른쪽 **앞마당**(벽에서 2유닛 앞)이다. 벽에 바싹 붙이면 몸이 벽을 파고든다 —
    //     npcBlocked 가 보는 obstacles 의 박물관은 **원 r3.2** 인데 건물은 7.2×5.4 사각이라
    //     네 모서리(중심에서 4.5)가 원 밖으로 삐져나온다. 즉 정면 모서리는 막히지 않아 걸어 들어간다.
    //     roam 도 다른 상주 주민과 같은 0.5 로 묶는다(기본 1.6 이면 배회 중에 벽까지 간다).
    pos: [-23.9, 0, 9.9], roam: 0.5, look: 'curator',   // 🔵 남색 정장 + 🔴 자주 나비넥타이
    quests: [
      { type: 'collect_dex', target: 3,  title: '개관 준비',   desc: '📖 도감 3종 등록하기',  reward: { coins: 20 },
        line: '박물관이 텅 비어 있답니다… 무엇이든 세 가지만 찾아다 주시겠어요? 첫 전시를 열고 싶군요.' },
      { type: 'collect_dex', target: 8,  title: '첫 전시실',   desc: '📖 도감 8종 등록하기',  reward: { seed: 6, coins: 26 },
        line: '진열장이 아직 헐렁하군요. 여덟 가지가 모이면 1층이 제법 박물관다워질 겁니다.' },
      { type: 'collect_dex', target: 13, title: '2층을 향해',  desc: '📖 도감 13종 등록하기', reward: { coins: 40, gem: 1 },
        line: '아홉 가지가 모이면 위층을 열 수 있어요. 조금만 더 부탁드립니다. 💎값진 걸로 보답하지요.' },
    ],
  },
  {
    // 📋 데일리 의뢰 담당 — quests 는 매일 refreshDailyQuests() 가 날짜 시드로 채움(전원 동일)
    id: 'courier', name: '의뢰 올빼미', emoji: '🦉', color: 0xe0a52e, hat: 0x8a5c28, skin: 0xfdfaf3, pos: [-3, 0, -3], look: 'owl',   // 🦉 원숭이올빼미(크림 얼굴 + 황금 등·날개)
    daily: true, doneLine: '오늘 의뢰는 전부 끝! 내일 새 의뢰를 가져올게요 🦉',
    quests: [],
  },
];

export const DAILY_COUNT = 3;   // 하루 일일 의뢰 개수 — refreshDailyQuests·validDailyQuests·특별 의뢰 판정이 함께 쓴다

// 의뢰 하나당 코인. 앞이 가볍고 뒤가 무겁다.
export const QUEST_COINS = [10, 15, 20];

export const QUEST_LUCKY = 3;   // 🎁럭키박스가 붙는 건수(앞에서부터). 5건으로 올릴 땐 3 을 유지한다(전부 붙이면 발행이 두 배)

// 진행도가 실제로 추적되는 목표 종류 — questEvent() 가 쏘는 이벤트 + 상태형(refreshCollectQuests).
//   이 목록에 없는 type 을 가진 의뢰는 아무리 플레이해도 영원히 완료되지 않는다.
//   되돌릴 수 없는 1회성 목표(house 등)는 이벤트가 아니라 상태형으로 넣는다 —
//   이벤트는 수락 전에 이미 끝내버린 사람에게 두 번 다시 쏘이지 않는다.
export const QUEST_TYPES = new Set([
  'chop', 'plant', 'water', 'harvest', 'fish', 'fish_rare', 'mine',
  'sell', 'cook', 'serve', 'catch', 'forage', 'house', 'expand',
  'collect_wood', 'collect_crop',
  // 🦉 의뢰가 "베고·심고·낚고" 로만 돌던 것을 넓힌다(베타: "컨텐츠가 부족하다").
  //   이 중 일부는 전제조건이 있다 — js/quests.js 의 QUEST_GATES 가 거른다.
  'carve', 'egg', 'gift', 'decor', 'boat', 'seafish', 'mist',
  'collect_dex',   // 🏛️ 도감 등록 종수 — 상태형(dexCount 에서 읽는다)
  'dex_one',       // 🏛️ 콕 집은 한 종 — 상태형(그 종이 도감에 있는가)
]);

export const DAILY_POOL = [
  { type: 'chop',    target: 5, title: '오늘의 벌목',  desc: '나무 5번 베기' },
  { type: 'harvest', target: 3, title: '오늘의 수확',  desc: '작물 3개 수확하기' },
  { type: 'water',   target: 5, title: '오늘의 물주기',  desc: '물 5번 주기' },
  { type: 'plant',   target: 3, title: '씨앗 심는 날', desc: '씨앗 3번 심기' },
  { type: 'fish',    target: 3, title: '오늘의 조황',  desc: '물고기 3마리 낚기' },
  { type: 'mine',    target: 4, title: '광산 의뢰',    desc: '광석 4개 캐기' },
  { type: 'sell',    target: 5, title: '장사의 날',    desc: '상점에서 아무거나 5개 팔기' },
  { type: 'catch',   target: 3, title: '밤의 산책',    desc: '🌟 반딧불이 3마리 잡기(밤)' },
  { type: 'serve',   target: 2, title: '오늘의 접객',  desc: '☕ 카페 손님 2명 서빙하기' },
  { type: 'forage',  target: 5, title: '숲의 아침',    desc: '🍄 채집물 5개 줍기' },
  // ↓ 게임에 있는데 의뢰로는 한 번도 안 쓰이던 것들(2026-09-12). 일부는 전제조건이 있어
  //   js/quests.js 의 QUEST_GATES 가 거른다 — 닭장을 안 지었으면 🥚는 아예 안 뽑힌다.
  //   target 은 QUEST_LIMITS 를 넘지 않는다(하루 1회 제한 콘텐츠는 그날 못 깨는 의뢰가 된다).
  { type: 'carve',   target: 1, title: '오늘의 주문',  desc: '🗿 조각 1개 완성하기' },
  { type: 'gift',    target: 1, title: '이웃에게 선물',  desc: '🎁 주민에게 선물 1번 주기' },
  { type: 'decor',   target: 2, title: '마당 가꾸기',  desc: '🪵 야외 장식 2개 놓기' },
  { type: 'egg',     target: 1, title: '아침 달걀',    desc: '🥚 달걀 걷기' },
  { type: 'boat',    target: 1, title: '뱃길 따라',    desc: '🛶 강 한 번 완주하기' },
  { type: 'seafish', target: 2, title: '먼바다까지',   desc: '🌊 바다 물고기 2마리 낚기' },
  { type: 'mist',    target: 1, title: '안개 걷기',    desc: '🌫️ 안개 숲 정화하기' },
];

// 세이브에 박아둔 오늘 의뢰가 그대로 쓸 만한지 — 형태와 목표 종류까지 확인한다.
//   type 이 목록 밖이면(옛 세이브·삭제된 목표) 완료가 불가능하므로 통째로 새로 뽑는다.
export function validDailyQuests(qs) {
  return Array.isArray(qs) && qs.length === DAILY_COUNT && qs.every(validQuest);
}

// 의뢰 하나가 "실제로 완료 가능한" 형태인지 — 목록 검증(validDailyQuests)과 같은 기준.
//   ✨특별 의뢰(st.special)도 반드시 이걸 통과해야 한다. 안 그러면 type 이 목록 밖일 때
//   진행도가 영원히 0 이라 st.idx 가 못 올라가고 그날 올빼미 의뢰 전체가 잠긴다.
export function validQuest(q) {
  if (!q || !QUEST_TYPES.has(q.type) || !Number.isFinite(q.target) || q.target <= 0 || !q.desc) return false;
  if (q.type === 'expand' && !Number.isFinite(q.stage)) return false;   // 목표 단계가 없으면 진행도가 영원히 0
  return true;
}

//   로컬 DAILY_POOL 로 이미 채워 둔 뒤 백그라운드로 받아오므로, 느리거나 실패해도
//   플레이가 멈추지 않는다(카페 손님과 같은 방식).
//   ⚠️ 아직 의뢰를 받지 않았을 때만 교체한다 — 진행 중에 목록이 바뀌면 st.idx 포인터가
//      엉뚱한 의뢰를 가리켜, 손도 안 댄 의뢰가 절반 차 있고 하던 진행도는 증발한다.
export const AI_QUEST_TIMEOUT = 15000;   // 서버가 Gemini 생성을 기다린다 — 엣지 캐시가 비면 실측
