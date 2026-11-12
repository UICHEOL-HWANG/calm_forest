# npc-affinity 확정 문구 (P1)

- 확정: 2026-11-13, 사용자 "추천안으로 확정"
- 출처: `sims/npc-affinity-copy.html` 의 추천안을 스크립트로 그대로 뽑았다(손으로 옮기지 않음)
- 구현 규칙: 한국어 원문이 i18n 키, 영어는 `js/i18n-en.js`. 편지 영어 번역은 구현 때 이 표 아래에 추가해 다시 검수
- 예시의 "목수 아저씨"·"❤️7/10"·"4통" 은 자리값이다. 주민 이름·숫자는 코드에서 채운다
- 320px: 대화창 머리 줄바꿈 허용(칩이 이름 아랫줄로). 375px 은 전부 한 줄(실측)

## ① 화면 문구

| # | 자리 | 한국어 | 영어 |
|---|---|---|---|
| 1 | 단계 이름 5개 | 아는 사이 · 이웃 · 친구 · 단짝 · 가족 | Acquaintance · Neighbor · Friend · Best Friend · Family |
| 2 | 대화창 칩 (진행 중) | 🤝 친구 ❤️7/10 | 🤝 Friend ❤️7/10 |
| 3 | 대화창 칩 (0일 때) | ❤️0 · 선물로 시작 | ❤️0 · Start with a gift |
| 4 | 대화창 칩 (가족, 15 넘음) | 🌳 가족 ❤️18 | 🌳 Family ❤️18 |
| 5 | 수첩 이름 (☰ 메뉴·제목) | 📒 주민 수첩 | 📒 Villager Book |
| 6 | 수첩 카드: 다음 보상 | 다음 ❤️10 🪑 | Next ❤️10 🪑 |
| 7 | 수첩 카드: 아직 0 | 선물 하나면 시작 | One gift to start |
| 8 | 수첩 상세: 오늘 선물 하트 | 오늘 선물 하트 1/2 | Gift hearts today 1/2 |
| 9 | 단계 오름 토스트 1줄 | 🤝 목수 아저씨와 친구가 됐어요! | 🤝 You and the Carpenter are now Friends! |
| 10 | 단계 오름 토스트 2줄 | ✉️ 소식함에 편지가 왔어요 | ✉️ A letter is in your Inbox |
| 11 | 기존 유저 소급 토스트 | ✉️ 주민들에게서 편지 4통이 와 있어요 | ✉️ 4 letters from villagers are waiting |
| 12 | 선물 하트 상한 토스트 | 🎁 전했어요! 오늘 목수 아저씨 하트는 다 찼어요 | 🎁 Given! Hearts with the Carpenter are full for today |
| 13 | 올빼미 +1 토스트 | 🦉 오늘 의뢰 다 끝! 올빼미 ❤️+1 | 🦉 All requests done! Owl ❤️+1 |
| 14 | 소식함 탭 | 📮 소식 / ✉️ 편지 | 📮 News / ✉️ Letters |
| 15 | 편지 목록 한 줄 | 목수 아저씨 · 🤝 친구 | Carpenter · 🤝 Friend |
| 16 | 편지 받기 버튼 | 받기 → 받았어요 | Claim → Claimed |
| 17 | 받은 뒤 토스트 | 🎒 가방에 넣었어요 / 🧺 보관함에 넣었어요 | Added to your bag / storage |

## ② 편지 (이웃 ❤️3 · 친구 ❤️6)

### 🧑‍🌾 농부 삼촌 (반말, 푸근)

- L1 🏡 이웃 · 동봉 🌰 씨앗 · 🥕 작물
  > 요즘 밭에 자주 들러 줘서 고마워. 올해 씨앗이 잘 여물어서 조금 나눠 담았어. 네 밭에도 뿌려 보고, 싹 올라오면 나한테도 보여 줘.
- L2 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 이제 우리 그냥 이웃은 아니지? 창고 정리하다가 오래된 낫 도면을 찾았어. 금빛으로 벼린 낫이야. 밭에 오면 얘기해 줄게.
- L2b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 낫은 잘 쓰고 있어? 네가 밭에 서 있으면 멀리서도 반짝여서 금방 알아봐. 이제 우리 그냥 이웃은 아니지?

### 👷 목수 아저씨 (반말, 힘 있게)

- L3 🏡 이웃 · 동봉 🪵 목재
  > 망치질하다 보면 네 집 지붕이 눈에 들어와. 손 많이 갔더라! 남는 목재 좀 묶어 보냈어. 다음에 증축할 때 보태 쓰라고.
- L4 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 이야, 이제 우리 손발이 척척 맞잖아! 내 작업 노트에 금빛 망치 도면이 있거든. 나 있는 데로 와. 보여 줄게!
- L4b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 망치 소리는 멀리서도 들려! 그걸로 뭘 지을지 궁금해서 요즘 자꾸 네 마당 쪽을 보게 돼.

### 🧙 방랑 상인 (하오체)

- L5 🏡 이웃 · 동봉 🪙 코인
  > 먼 길을 다니다 보면 반가운 얼굴이 드물다오. 그대는 그 드문 얼굴 가운데 하나요. 장사하고 남은 동전 몇 닢 넣어 보내니 요긴하게 쓰시오.
- L6 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 이제 그대와는 셈을 따지지 않는 사이가 됐구려. 내 보따리 깊은 곳에 금빛 씨앗 주머니 도면이 있소. 좌판에 들르면 꺼내 보여 주겠소.
- L6b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 주머니에서 씨앗 꺼내는 모습을 봤소. 내 물건이 제 주인을 찾은 듯해 흐뭇했다오. 이제 그대와는 셈을 따지지 않는 사이요.

### 🎣 낚시꾼 할아버지 (하게체, 허허)

- L7 🏡 이웃 · 동봉 🪱 미끼 · 🐟 물고기
  > 허허, 요즘 호수에서 자네 그림자를 자주 보네. 물고기는 기다리는 사람한테 오는 법이지. 미끼 조금하고 오늘 잡은 놈들 좀 보내네.
- L8 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네. 젊을 적 쓰던 금빛 낚싯대 도면이 있는데, 이제 자네한테 넘길 때가 된 것 같구먼. 호숫가로 오게나.
- L8b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 낚싯대가 물살에 반짝이는 걸 보니 내 젊을 때 생각이 나더군. 허허, 자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네.

### 🐼 요리사 판다 (반말, 들뜸)

- L9 🏡 이웃 · 동봉 🌾 밀가루 · 🍯 꿀
  > 있지, 네가 준 선물 덕에 새 메뉴가 떠올랐어! 밀가루랑 꿀 조금 보낼게. 빵 구울 때 넣으면 딱이야!
- L10 🤝 친구 · 동봉 💎 보석 · 🌾 밀가루
  > 우리 이제 진짜 친구지? 친구한테는 아끼는 걸 줘야 해! 요리하다 찾은 반짝이는 보석 하나 넣었어. 밀가루도 넉넉히 담았고!

### 🦡 숲지기 오소리 (반말, 부드럽게)

- L11 🏡 이웃 · 동봉 🍄 채집물
  > 숲에서 주운 것들을 나눠 담았어. 혼자 먹기엔 많고, 너랑 나누면 딱 좋더라. 바구니 비면 또 말해 줘.
- L12 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 요즘 숲길을 걷다 보면 네 발자국이 먼저 나 있더라. 그게 참 좋아. 내가 아끼던 금빛 도끼 도면, 이제 너한테 보여 줄게. 숲 입구로 와 줘.
- L12b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 도끼 소리가 숲 입구까지 들려. 요즘 숲길에 네 발자국이 먼저 나 있는 게 참 좋아.

### ⭐ 별 보는 아이 (해요체, 아이)

- L13 🏡 이웃 · 동봉 🌟 반딧불이
  > 어젯밤에 반딧불이를 잡아서 병에 담았어요! 다 드릴게요. 밤에 뚜껑을 열면 방이 반짝반짝해져요.
- L14 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 이제 우리 진짜 친구예요! 비밀 하나 알려 드릴게요. 포충망을 금빛으로 만드는 도면이 있어요. 계곡 입구로 오면 보여 드릴게요!
- L14b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 포충망 쓰는 거 봤어요! 반딧불이들도 좋아하는 것 같았어요. 이제 우리 진짜 친구예요!

### 🦆 사공 오리 (하게체, 뱃사람)

- L15 🏡 이웃 · 동봉 🐟 물고기 · 🪵 목재
  > 물때 맞춰 나루에 들르는 게 이제 자네 버릇이 됐구먼. 오늘 건진 물고기하고 배 고치고 남은 널 몇 장 보내네.
- L16 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 뱃사람은 아무한테나 뱃길 얘기를 안 하네. 자네는 이제 아무나가 아니게야. 금빛 물조리개 도면이 있는데, 나루로 오시게.
- L16b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 물조리개로 밭에 물 주는 걸 강 건너에서도 봤네. 뱃사람은 아무한테나 뱃길 얘기를 안 하는데, 자네는 다르지.

### 🐔 목장 아주머니 (해요체, 살뜰)

- L17 🏡 이웃 · 동봉 🥚 달걀
  > 아침마다 닭장에 들러 줘서 고마워요. 오늘 아침에 낳은 달걀이에요. 따뜻할 때 부쳐 먹으면 제일 맛있어요.
- L18 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 이제 우리 서로 아침상 걱정해 주는 사이죠? 제가 아끼는 금빛 삽 도면이 있어요. 목장에 오면 보여 줄게요.
- L18b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 삽으로 밭 고르는 거 봤어요. 손이 야무지네요. 이제 우리 서로 아침상 걱정해 주는 사이죠?

### 🧑‍🦳 큐레이터 할아버지 (합쇼체, 정중)

- L19 🏡 이웃 · 동봉 🪨 돌 · ⚫ 석탄
  > 전시실에 오실 때마다 무언가를 새로 알아보시더군요. 표본을 다듬고 남은 돌과 석탄을 보내 드립니다. 요긴하게 쓰시길 바랍니다.
- L20 🤝 친구 · 동봉 📜 금빛 도구 도면 의뢰
  > 오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요. 수장고에 금빛 괭이 도면이 한 장 있습니다. 박물관 앞으로 오시면 보여 드리지요.
- L20b 🤝 친구 (도면을 이미 받은 사람)
  > 금빛 괭이는 박물관에 걸어 두어도 손색없을 물건이지요. 오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요.

### 🦉 의뢰 올빼미 (하게체, 차분)

- L21 🏡 이웃 · 동봉 🪙 코인
  > 의뢰를 맡길 때마다 믿음이 가더군. 마을 사람들이 건넨 사례금을 조금 따로 모아 두었네. 자네 몫이야.
- L22 🤝 친구 · 동봉 💎 보석 · 🪙 코인
  > 이렇게 편지를 직접 쓰는 건 오랜만이네. 의뢰를 꾸준히 끝내 준 자네에게 마을이 고마워하고 있어. 둥지에서 찾은 보석 하나와 사례금을 보내네.

## ③ 아이템 이름

| # | 주민 | 한국어 | 영어 |
|---|---|---|---|
| I1 | 🧑‍🌾 농부 삼촌 | 🥕 채소 수레 | Veggie Cart |
| I2 | 👷 목수 아저씨 | 🪑 목수의 흔들의자 | Carpenter's Rocking Chair |
| I3 | 🧙 방랑 상인 | ⛺ 보라 천막 | Purple Tent |
| I4 | 🎣 낚시꾼 할아버지 | 🎣 낚시 쉼터 | Fishing Nook |
| I5 | 🐼 요리사 판다 | 🎋 대나무 찜기 탁자 | Bamboo Steamer Table |
| I6 | 🦡 숲지기 오소리 | 🍄 버섯 등불 | Mushroom Lamp |
| I7 | ⭐ 별 보는 아이 | 🔭 꼬마 망원경 | Little Telescope |
| I8 | 🦆 사공 오리 | 🛶 꽃배 화분 | Flower Boat Planter |
| I9 | 🐔 목장 아주머니 | 🐣 병아리 둥지 | Chick Nest |
| I10 | 🧑‍🦳 큐레이터 할아버지 | 🏺 유리 진열장 | Glass Display Case |
| I11 | 🦉 의뢰 올빼미 | 📮 올빼미 우체통 | Owl Mailbox |
| I12 | 가족 액자 (11명 공통 틀) | 🖼️ 목수 아저씨 액자 | Carpenter's Photo Frame |

## ④ 영어 번역 (검수 대기, 구현에 반영됨)

대화창 칩·토스트처럼 이름과 단계가 끼는 문장은 `js/affinity/copy.js` 에서 어순을 따로 만든다(예: `🤝 You and Carpenter are now Friends!`).

### 편지

| 주민 | 단계 | 영어 |
|---|---|---|
| 농부 삼촌 | 이웃 | Thanks for stopping by the field so often. The seeds came out plump this year, so I packed you a few. Sow them in your plot, and show me when the sprouts come up. |
| 농부 삼촌 | 친구 | We are more than neighbors now, right? I was tidying the shed and found an old sickle blueprint. A sickle forged in gold. Come by the field and I will tell you about it. |
| 농부 삼촌 | 친구(도면 받음) | Getting good use out of the golden sickle? When you stand in your field, it shines so bright I can spot you from far off. We are more than neighbors now, right? |
| 목수 아저씨 | 이웃 | Whenever I am swinging my hammer, your roof catches my eye. You put real work into it! I bundled up some spare timber for you. Use it for your next extension. |
| 목수 아저씨 | 친구 | Hey, we make a great team now! My work notebook has a blueprint for a golden hammer. Come find me and I will show you! |
| 목수 아저씨 | 친구(도면 받음) | I can hear that golden hammer from way over here! I keep glancing at your yard, wondering what you will build with it. |
| 방랑 상인 | 이웃 | On the long road, friendly faces are rare. Yours is one of those rare few. I have tucked in a few coins left over from trading. Put them to good use. |
| 방랑 상인 | 친구 | It seems you and I no longer keep count between us. Deep in my bundle is a blueprint for a golden seed pouch. Visit my stall and I shall show it to you. |
| 방랑 상인 | 친구(도면 받음) | I saw you pulling seeds from that golden pouch. It warmed my heart, as if my wares had found their true owner. You and I no longer keep count between us. |
| 낚시꾼 할아버지 | 이웃 | Heh heh, I see your shadow by the lake a lot these days. Fish come to those who wait, you know. Here is a little bait and a few of today's catch. |
| 낚시꾼 할아버지 | 친구 | Sitting beside you, I lose track of time. I have a blueprint for the golden rod I used in my younger days. I reckon it is time to pass it on to you. Come down to the lake. |
| 낚시꾼 할아버지 | 친구(도면 받음) | Seeing that golden rod glint on the water reminds me of my younger days. Heh heh, sitting beside you, I lose track of time. |
| 요리사 판다 | 이웃 | Guess what, your gift gave me an idea for a new dish! I am sending a little flour and honey. Perfect for baking bread! |
| 요리사 판다 | 친구 | We are real friends now, right? You have to give your friends the good stuff! I put in a sparkly gem I found while cooking. Plenty of flour too! |
| 숲지기 오소리 | 이웃 | I shared out what I gathered in the woods. It is too much for one, and just right to split with you. Tell me when your basket is empty. |
| 숲지기 오소리 | 친구 | Lately, when I walk the forest path, your footprints are already there. I really like that. Let me show you my treasured golden axe blueprint. Come to the forest entrance. |
| 숲지기 오소리 | 친구(도면 받음) | I can hear that golden axe all the way at the forest entrance. I really like finding your footprints on the forest path these days. |
| 별 보는 아이 | 이웃 | Last night I caught some fireflies and put them in a jar! You can have them all. Open the lid at night and your room will sparkle. |
| 별 보는 아이 | 친구 | We are real friends now! Want to hear a secret? There is a blueprint that makes a net golden. Come to the valley entrance and I will show you! |
| 별 보는 아이 | 친구(도면 받음) | I saw you using the golden net! I think the fireflies liked it too. We are real friends now! |
| 사공 오리 | 이웃 | Dropping by the ferry with the tide has become a habit of yours, eh. Here are today's catch and a few planks left from fixing the boat. |
| 사공 오리 | 친구 | A boatman does not tell just anyone about the river routes. And you are not just anyone anymore. I have a blueprint for a golden watering can. Come down to the ferry. |
| 사공 오리 | 친구(도면 받음) | I saw you watering your field with that golden can, clear from across the river. A boatman does not tell just anyone about the routes, but you are different. |
| 목장 아주머니 | 이웃 | Thank you for checking on the coop every morning. These eggs were laid this morning. They taste best fried while still warm. |
| 목장 아주머니 | 친구 | We worry about each other's breakfast now, don't we? I have a golden shovel blueprint I treasure. Come to the ranch and I will show you. |
| 목장 아주머니 | 친구(도면 받음) | I saw you leveling the field with the golden shovel. Such a capable hand. We worry about each other's breakfast now, don't we? |
| 큐레이터 할아버지 | 이웃 | Each time you visit the gallery, you notice something new. I am sending the stone and coal left over from preparing specimens. I trust you will put them to good use. |
| 큐레이터 할아버지 | 친구 | I have watched for some time, and I believe I may now call you a friend. There is a golden hoe blueprint in the archive. Do come to the museum and I shall show it to you. |
| 큐레이터 할아버지 | 친구(도면 받음) | That golden hoe would not look out of place on display in the museum. I have watched for some time, and I believe I may now call you a friend. |
| 의뢰 올빼미 | 이웃 | Each time I hand you a request, you earn my trust. I have set aside part of the thank-you money the villagers gave. This share is yours. |
| 의뢰 올빼미 | 친구 | It has been a while since I wrote a letter myself. The village is grateful that you keep finishing its requests. I am sending a gem I found in my nest, along with a reward. |

### 아이템 이름

| 한국어 | 영어 |
|---|---|
| 🥕 채소 수레 | Veggie Cart |
| 🪑 목수의 흔들의자 | Carpenter's Rocking Chair |
| ⛺ 보라 천막 | Purple Tent |
| 🎣 낚시 쉼터 | Fishing Nook |
| 🎋 대나무 찜기 탁자 | Bamboo Steamer Table |
| 🍄 버섯 등불 | Mushroom Lamp |
| 🔭 꼬마 망원경 | Little Telescope |
| 🛶 꽃배 화분 | Flower Boat Planter |
| 🐣 병아리 둥지 | Chick Nest |
| 🏺 유리 진열장 | Glass Display Case |
| 📮 올빼미 우체통 | Owl Mailbox |
