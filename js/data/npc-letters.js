import { STAGES } from '../affinity/stages.js';

export const LETTERS = Object.freeze({
  farmer: Object.freeze({
    nbr: Object.freeze({ body: '요즘 밭에 자주 들러 줘서 고마워. 올해 씨앗이 잘 여물어서 조금 나눠 담았어. 네 밭에도 뿌려 보고, 싹 올라오면 나한테도 보여 줘.', bodyEn: 'Thanks for stopping by the field so often. The seeds came out plump this year, so I packed you a few. Sow them in your plot, and show me when the sprouts come up.', gift: Object.freeze({ seed: 8, crop: 4 }) }),
    friend: Object.freeze({ body: '이제 우리 그냥 이웃은 아니지? 창고 정리하다가 오래된 낫 도면을 찾았어. 금빛으로 벼린 낫이야. 밭에 오면 얘기해 줄게.', bodyEn: 'We are more than neighbors now, right? I was tidying the shed and found an old sickle blueprint. A sickle forged in gold. Come by the field and I will tell you about it.', alt: '금빛 낫은 잘 쓰고 있어? 네가 밭에 서 있으면 멀리서도 반짝여서 금방 알아봐. 이제 우리 그냥 이웃은 아니지?', altEn: 'Getting good use out of the golden sickle? When you stand in your field, it shines so bright I can spot you from far off. We are more than neighbors now, right?' }),
  }),
  builder: Object.freeze({
    nbr: Object.freeze({ body: '망치질하다 보면 네 집 지붕이 눈에 들어와. 손 많이 갔더라! 남는 목재 좀 묶어 보냈어. 다음에 증축할 때 보태 쓰라고.', bodyEn: 'Whenever I am swinging my hammer, your roof catches my eye. You put real work into it! I bundled up some spare timber for you. Use it for your next extension.', gift: Object.freeze({ wood: 15 }) }),
    friend: Object.freeze({ body: '이야, 이제 우리 손발이 척척 맞잖아! 내 작업 노트에 금빛 망치 도면이 있거든. 나 있는 데로 와. 보여 줄게!', bodyEn: 'Hey, we make a great team now! My work notebook has a blueprint for a golden hammer. Come find me and I will show you!', alt: '금빛 망치 소리는 멀리서도 들려! 그걸로 뭘 지을지 궁금해서 요즘 자꾸 네 마당 쪽을 보게 돼.', altEn: 'I can hear that golden hammer from way over here! I keep glancing at your yard, wondering what you will build with it.' }),
  }),
  merchant: Object.freeze({
    nbr: Object.freeze({ body: '먼 길을 다니다 보면 반가운 얼굴이 드물다오. 그대는 그 드문 얼굴 가운데 하나요. 장사하고 남은 동전 몇 닢 넣어 보내니 요긴하게 쓰시오.', bodyEn: 'On the long road, friendly faces are rare. Yours is one of those rare few. I have tucked in a few coins left over from trading. Put them to good use.', gift: Object.freeze({ coins: 40 }) }),
    friend: Object.freeze({ body: '이제 그대와는 셈을 따지지 않는 사이가 됐구려. 내 보따리 깊은 곳에 금빛 씨앗 주머니 도면이 있소. 좌판에 들르면 꺼내 보여 주겠소.', bodyEn: 'It seems you and I no longer keep count between us. Deep in my bundle is a blueprint for a golden seed pouch. Visit my stall and I shall show it to you.', alt: '금빛 주머니에서 씨앗 꺼내는 모습을 봤소. 내 물건이 제 주인을 찾은 듯해 흐뭇했다오. 이제 그대와는 셈을 따지지 않는 사이요.', altEn: 'I saw you pulling seeds from that golden pouch. It warmed my heart, as if my wares had found their true owner. You and I no longer keep count between us.' }),
  }),
  angler: Object.freeze({
    nbr: Object.freeze({ body: '허허, 요즘 호수에서 자네 그림자를 자주 보네. 물고기는 기다리는 사람한테 오는 법이지. 미끼 조금하고 오늘 잡은 놈들 좀 보내네.', bodyEn: 'Heh heh, I see your shadow by the lake a lot these days. Fish come to those who wait, you know. Here is a little bait and a few of today\'s catch.', gift: Object.freeze({ bait: 3, fish: 3 }) }),
    friend: Object.freeze({ body: '자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네. 젊을 적 쓰던 금빛 낚싯대 도면이 있는데, 이제 자네한테 넘길 때가 된 것 같구먼. 호숫가로 오게나.', bodyEn: 'Sitting beside you, I lose track of time. I have a blueprint for the golden rod I used in my younger days. I reckon it is time to pass it on to you. Come down to the lake.', alt: '금빛 낚싯대가 물살에 반짝이는 걸 보니 내 젊을 때 생각이 나더군. 허허, 자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네.', altEn: 'Seeing that golden rod glint on the water reminds me of my younger days. Heh heh, sitting beside you, I lose track of time.' }),
  }),
  chef: Object.freeze({
    nbr: Object.freeze({ body: '있지, 네가 준 선물 덕에 새 메뉴가 떠올랐어! 밀가루랑 꿀 조금 보낼게. 빵 구울 때 넣으면 딱이야!', bodyEn: 'Guess what, your gift gave me an idea for a new dish! I am sending a little flour and honey. Perfect for baking bread!', gift: Object.freeze({ flour: 2, honey: 1 }) }),
    friend: Object.freeze({ body: '우리 이제 진짜 친구지? 친구한테는 아끼는 걸 줘야 해! 요리하다 찾은 반짝이는 보석 하나 넣었어. 밀가루도 넉넉히 담았고!', bodyEn: 'We are real friends now, right? You have to give your friends the good stuff! I put in a sparkly gem I found while cooking. Plenty of flour too!', gift: Object.freeze({ gem: 1, flour: 2 }) }),
  }),
  forager: Object.freeze({
    nbr: Object.freeze({ body: '숲에서 주운 것들을 나눠 담았어. 혼자 먹기엔 많고, 너랑 나누면 딱 좋더라. 바구니 비면 또 말해 줘.', bodyEn: 'I shared out what I gathered in the woods. It is too much for one, and just right to split with you. Tell me when your basket is empty.', gift: Object.freeze({ forage: 6 }) }),
    friend: Object.freeze({ body: '요즘 숲길을 걷다 보면 네 발자국이 먼저 나 있더라. 그게 참 좋아. 내가 아끼던 금빛 도끼 도면, 이제 너한테 보여 줄게. 숲 입구로 와 줘.', bodyEn: 'Lately, when I walk the forest path, your footprints are already there. I really like that. Let me show you my treasured golden axe blueprint. Come to the forest entrance.', alt: '금빛 도끼 소리가 숲 입구까지 들려. 요즘 숲길에 네 발자국이 먼저 나 있는 게 참 좋아.', altEn: 'I can hear that golden axe all the way at the forest entrance. I really like finding your footprints on the forest path these days.' }),
  }),
  stargazer: Object.freeze({
    nbr: Object.freeze({ body: '어젯밤에 반딧불이를 잡아서 병에 담았어요! 다 드릴게요. 밤에 뚜껑을 열면 방이 반짝반짝해져요.', bodyEn: 'Last night I caught some fireflies and put them in a jar! You can have them all. Open the lid at night and your room will sparkle.', gift: Object.freeze({ bug: 3 }) }),
    friend: Object.freeze({ body: '이제 우리 진짜 친구예요! 비밀 하나 알려 드릴게요. 포충망을 금빛으로 만드는 도면이 있어요. 계곡 입구로 오면 보여 드릴게요!', bodyEn: 'We are real friends now! Want to hear a secret? There is a blueprint that makes a net golden. Come to the valley entrance and I will show you!', alt: '금빛 포충망 쓰는 거 봤어요! 반딧불이들도 좋아하는 것 같았어요. 이제 우리 진짜 친구예요!', altEn: 'I saw you using the golden net! I think the fireflies liked it too. We are real friends now!' }),
  }),
  ferryman: Object.freeze({
    nbr: Object.freeze({ body: '물때 맞춰 나루에 들르는 게 이제 자네 버릇이 됐구먼. 오늘 건진 물고기하고 배 고치고 남은 널 몇 장 보내네.', bodyEn: 'Dropping by the ferry with the tide has become a habit of yours, eh. Here are today\'s catch and a few planks left from fixing the boat.', gift: Object.freeze({ fish: 3, wood: 8 }) }),
    friend: Object.freeze({ body: '뱃사람은 아무한테나 뱃길 얘기를 안 하네. 자네는 이제 아무나가 아니게야. 금빛 물조리개 도면이 있는데, 나루로 오시게.', bodyEn: 'A boatman does not tell just anyone about the river routes. And you are not just anyone anymore. I have a blueprint for a golden watering can. Come down to the ferry.', alt: '금빛 물조리개로 밭에 물 주는 걸 강 건너에서도 봤네. 뱃사람은 아무한테나 뱃길 얘기를 안 하는데, 자네는 다르지.', altEn: 'I saw you watering your field with that golden can, clear from across the river. A boatman does not tell just anyone about the routes, but you are different.' }),
  }),
  rancher: Object.freeze({
    nbr: Object.freeze({ body: '아침마다 닭장에 들러 줘서 고마워요. 오늘 아침에 낳은 달걀이에요. 따뜻할 때 부쳐 먹으면 제일 맛있어요.', bodyEn: 'Thank you for checking on the coop every morning. These eggs were laid this morning. They taste best fried while still warm.', gift: Object.freeze({ egg: 5, crop: 2 }) }),
    friend: Object.freeze({ body: '이제 우리 서로 아침상 걱정해 주는 사이죠? 제가 아끼는 금빛 삽 도면이 있어요. 목장에 오면 보여 줄게요.', bodyEn: 'We worry about each other\'s breakfast now, don\'t we? I have a golden shovel blueprint I treasure. Come to the ranch and I will show you.', alt: '금빛 삽으로 밭 고르는 거 봤어요. 손이 야무지네요. 이제 우리 서로 아침상 걱정해 주는 사이죠?', altEn: 'I saw you leveling the field with the golden shovel. Such a capable hand. We worry about each other\'s breakfast now, don\'t we?' }),
  }),
  curator: Object.freeze({
    nbr: Object.freeze({ body: '전시실에 오실 때마다 무언가를 새로 알아보시더군요. 표본을 다듬고 남은 돌과 석탄을 보내 드립니다. 요긴하게 쓰시길 바랍니다.', bodyEn: 'Each time you visit the gallery, you notice something new. I am sending the stone and coal left over from preparing specimens. I trust you will put them to good use.', gift: Object.freeze({ stone: 8, coal: 2 }) }),
    friend: Object.freeze({ body: '오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요. 수장고에 금빛 괭이 도면이 한 장 있습니다. 박물관 앞으로 오시면 보여 드리지요.', bodyEn: 'I have watched for some time, and I believe I may now call you a friend. There is a golden hoe blueprint in the archive. Do come to the museum and I shall show it to you.', alt: '금빛 괭이는 박물관에 걸어 두어도 손색없을 물건이지요. 오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요.', altEn: 'That golden hoe would not look out of place on display in the museum. I have watched for some time, and I believe I may now call you a friend.' }),
  }),
  courier: Object.freeze({
    nbr: Object.freeze({ body: '의뢰를 맡길 때마다 믿음이 가더군. 마을 사람들이 건넨 사례금을 조금 따로 모아 두었네. 자네 몫이야.', bodyEn: 'Each time I hand you a request, you earn my trust. I have set aside part of the thank-you money the villagers gave. This share is yours.', gift: Object.freeze({ coins: 40 }) }),
    friend: Object.freeze({ body: '이렇게 편지를 직접 쓰는 건 오랜만이네. 의뢰를 꾸준히 끝내 준 자네에게 마을이 고마워하고 있어. 둥지에서 찾은 보석 하나와 사례금을 보내네.', bodyEn: 'It has been a while since I wrote a letter myself. The village is grateful that you keep finishing its requests. I am sending a gem I found in my nest, along with a reward.', gift: Object.freeze({ gem: 1, coins: 40 }) }),
  }),
});

export function letterOf(npc, idx, { hasBlueprint = false, lang = 'ko' } = {}) {
  const stage = STAGES[idx];
  const entry = stage && LETTERS[npc]?.[stage.id];
  if (!entry) return null;
  const alt = hasBlueprint && entry.alt;
  const en = lang === 'en';
  const body = alt ? (en ? entry.altEn : entry.alt) : (en ? entry.bodyEn : entry.body);
  return { npc, idx, stage: stage.id, body, gift: entry.gift || null };
}

export const BEST_ITEMS = Object.freeze({
  farmer: Object.freeze({ ico: '🥕', name: '채소 수레' }),
  builder: Object.freeze({ ico: '🪑', name: '목수의 흔들의자' }),
  merchant: Object.freeze({ ico: '⛺', name: '보라 천막' }),
  angler: Object.freeze({ ico: '🎣', name: '낚시 쉼터' }),
  chef: Object.freeze({ ico: '🎋', name: '대나무 찜기 탁자' }),
  forager: Object.freeze({ ico: '🍄', name: '버섯 등불' }),
  stargazer: Object.freeze({ ico: '🔭', name: '꼬마 망원경' }),
  ferryman: Object.freeze({ ico: '🛶', name: '꽃배 화분' }),
  rancher: Object.freeze({ ico: '🐣', name: '병아리 둥지' }),
  curator: Object.freeze({ ico: '🏺', name: '유리 진열장' }),
  courier: Object.freeze({ ico: '📮', name: '올빼미 우체통' }),
});
