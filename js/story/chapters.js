// =============================================================
//  📖 메인 이야기 — 장 표(값만). 판정은 js/story/rules.js
//  프롤로그 컷신에서 이어지는 장들. 새 시스템이 아니라 "이미 하게 될 일"에 서사와 순서를 얹는다.
//  🌳 한 줄 목적(2026-10-16 세계관 개편): "시든 세계수를 되살려, 떠난 이웃들을 숲으로 돌아오게 한다."
//     id·goal·보상은 그대로 — 문구만 바꿨다(기존 완료 기록 유지). docs/superpowers/specs/2026-10-16-world-tree-reworld-design.md §4-3
//  🌉 1·2장 「세계수를 지키는 법」(해금 4단계): 해금이 켜진 **새 세이브**만 STORY_REWORLD 문구·규칙을 쓴다(storyFor).
//     해금 꺼짐·옛 세이브는 STORY 그대로 — 기존 유저의 이야기는 안 바뀐다. id·보상은 같아서 완료 기록이 섞여도 안전하다.
//  강제 없음(코지 문법): HUD 칩이 "다음에 하면 좋은 것"을 알려주고, 조건이 차면 어디서든 완료된다.
//  안내자는 🦉 의뢰 올빼미 — 완료 모달의 기록자 화자.
//  ⚠️ import 없음 — Node 테스트가 three 없이 읽는다. soon:true = 기능 출시 전 잠긴 장(판정 false·칩 숨김)
//  5~8장: docs/superpowers/specs/2026-10-07-story-ch5-8-design.md
// =============================================================
export const STORY = [
  {
    id: 'home', ico: '🏠', title: '나의 첫 집', goal: '내 집 짓기',
    start: '빈터에 내 집을 지어 보자. 나무를 베면 목재가 나와요.',
    done: '지붕이 올라갔어요. 오늘부터 여기서 자요.',
    reward: { coins: 40 },
  },
  {
    id: 'friends', ico: '💬', title: '숲의 이웃들', goal: '주민 의뢰 3번',
    start: '❕ 말풍선이 뜬 이웃을 도와 얼굴을 익혀 보자.',
    done: '이웃 셋을 도왔어요. 이제 서로 알아요.',
    reward: { seed: 5, coins: 30 },
  },
  {
    id: 'taste', ico: '🍳', title: '첫 요리', goal: '요리하고 서빙하기',
    start: '숲에서 거둔 재료로 요리해 카페 손님에게 내 보자.',
    done: '첫 요리를 냈어요. 밥 냄새가 숲 밖까지 퍼져요.',
    reward: { coins: 50 },
  },
  {
    id: 'secret', ico: '🌳', title: '세계수의 심장', goal: '안개 걷어내기',
    start: '북서쪽 안개 속에서 세계수의 심장이 희미하게 뛰어요. 빛을 되돌려 주자.',
    done: '안개가 걷혔어요. "와 줘서 고마워. 다시 숨이 트이는구나."',
    reward: { coins: 80 },
  },
  {
    id: 'living', ico: '🌾', title: '마을의 살림', goal: '밭 넓히고 과일나무 심기',
    start: '밭을 넓히고 과일나무를 심어 보자. 측량소는 밭 울타리 옆이에요.',
    done: '어린 나무가 뿌리를 내렸어요. 세계수 뿌리도 한 뼘 자랐어요.',
    reward: { coins: 100 },
  },
  {
    id: 'memory', ico: '🏛️', title: '숲의 기억', goal: '박물관 특별 진열대 채우기',
    start: '비·눈·안개 낀 날 얻은 것을 박물관 특별 진열대에 두자.',
    done: '진열대에 첫 기억이 놓였어요.',
    reward: { coins: 120 },
  },
  {
    id: 'stars', ico: '🔭', title: '별을 잇는 밤', goal: '천문대에서 별자리 잇기',
    start: '"밤하늘에도 내 잎이 있단다." 천문대에서 별을 이어 보자.',
    done: '별이 잎 모양으로 이어졌어요. "너 혼자가 아니란다."',
    reward: { coins: 120 },
  },
  {
    id: 'neighbors', ico: '🏡', title: '이웃의 숲', goal: '이웃 마을에 놀러 가기',
    start: '다른 숲에도 세계수를 지키는 이웃이 있대요. 놀러 가 보자.',
    done: '이웃 마을에 다녀왔어요. 숲은 생각보다 넓어요.',
    reward: { coins: 150 },
  },
];

// 🌉 해금 켜짐 + 새 세이브의 1·2장 — 빈 마을에 온 바깥사람(플레이어)이 🦉 올빼미를 만나 세계수를 지키기로 한다.
//   rule: 판정 규칙 키(js/story/rules.js STORY_RULES). 없으면 id 와 같다. 보상·id 는 STORY 와 같다.
export const STORY_REWORLD = {
  home: {
    ico: '🌳', title: '세계수를 지키는 법', goal: '할아버지 만나기', rule: 'homeBridge',
    start: '🦉 "저 나무, 우리가 지켜야 해." 집을 짓고 서쪽 할아버지를 찾아가자.',
    done: '다리를 고쳐 할아버지를 만났어요.',
  },
  friends: {
    ico: '💧', title: '첫 번째 가지', goal: '물의 가지 빈터 꾸미기', rule: 'branchWater',
    start: '🌳 세계수 판에서 💧물의 가지 빈터를 꾸며 🎣낚시꾼 할아버지를 불러오자.',
    done: '물의 가지에 생기가 돌고 낚시꾼 할아버지가 돌아왔어요.',
  },
  taste: {
    rule: 'tasteGated',
    start: '🌳 밭의 가지와 부엌의 가지 빈터를 꾸미면 🐼판다와 카페가 돌아와요. 요리하고 서빙해 보자.',
  },
  secret: {
    rule: 'secretGated',
    start: '🌳 숲의 가지 빈터를 꾸미면 안개 숲이 열려요. 안개를 걷어내 보자.',
  },
  living: {
    rule: 'livingGated',
    start: '🌳 밭의 가지가 살아나면 과수원이 열려요. 밭을 넓히고 과일나무를 심어 보자.',
  },
};
const REWORLD = STORY.map(c => (STORY_REWORLD[c.id] ? { ...c, ...STORY_REWORLD[c.id] } : c));

/** 지금 세이브가 쓸 장 표 — reworld=true(해금 켜짐 + 새 세이브)면 1·2장만 바뀐 표. 둘 다 같은 순서·id·보상 */
export function storyFor(reworld) { return reworld ? REWORLD : STORY; }
