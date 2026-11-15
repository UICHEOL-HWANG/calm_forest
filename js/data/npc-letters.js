import { STAGES } from '../affinity/stages.js';

export const LETTERS = Object.freeze({
  farmer: Object.freeze({
    nbr: Object.freeze({ body: '요즘 밭에 자주 들러 줘서 고마워. 올해 씨앗이 잘 여물어서 조금 나눠 담았어. 네 밭에도 뿌려 보고, 싹 올라오면 나한테도 보여 줘.', bodyEn: 'Thanks for stopping by the field so often. The seeds came out plump this year, so I packed you a few. Sow them in your plot, and show me when the sprouts come up.', gift: Object.freeze({ seed: 8, crop: 4 }) }),
    friend: Object.freeze({ body: '이제 우리 그냥 이웃은 아니지? 창고 정리하다가 오래된 낫 도면을 찾았어. 금빛으로 벼린 낫이야. 밭에 오면 얘기해 줄게.', bodyEn: 'We are more than neighbors now, right? I was tidying the shed and found an old sickle blueprint. A sickle forged in gold. Come by the field and I will tell you about it.', alt: '금빛 낫은 잘 쓰고 있어? 네가 밭에 서 있으면 멀리서도 반짝여서 금방 알아봐. 이제 우리 그냥 이웃은 아니지?', altEn: 'Getting good use out of the golden sickle? When you stand in your field, it shines so bright I can spot you from far off. We are more than neighbors now, right?' }),
    best: Object.freeze({ body: '네 덕에 올해 밭일이 하나도 안 힘들었어. 그래서 수레 하나 꾸며 봤지. 제일 잘 여문 놈들로만 골라 실었으니까 마당에 두고 볼 때마다 웃어. 비 오는 날엔 모자도 씌워 두고.', bodyEn: 'Thanks to you, the field work was no trouble at all this year. So I fixed up a cart. I loaded only the plumpest ones, so smile whenever you see it in your yard. Pop the hat on it when it rains.', gift: Object.freeze({ decor: 'aff_cart' }) }),
    family: Object.freeze({ body: '이제 내 밭이 네 밭이고 네 밭이 내 밭 같아. 장에서 사진을 한 장 찍었는데, 네 식탁에 두면 내가 매일 아침 인사하는 셈이겠다.', bodyEn: 'Feels like my field is yours and yours is mine now. I had a photo taken at the market. Put it on your table and it will be like I am saying good morning every day.', gift: Object.freeze({ decor: 'aff_frame_farmer' }) }),
  }),
  builder: Object.freeze({
    nbr: Object.freeze({ body: '망치질하다 보면 네 집 지붕이 눈에 들어와. 손 많이 갔더라! 남는 목재 좀 묶어 보냈어. 다음에 증축할 때 보태 쓰라고.', bodyEn: 'Whenever I am swinging my hammer, your roof catches my eye. You put real work into it! I bundled up some spare timber for you. Use it for your next extension.', gift: Object.freeze({ wood: 15 }) }),
    friend: Object.freeze({ body: '이야, 이제 우리 손발이 척척 맞잖아! 내 작업 노트에 금빛 망치 도면이 있거든. 나 있는 데로 와. 보여 줄게!', bodyEn: 'Hey, we make a great team now! My work notebook has a blueprint for a golden hammer. Come find me and I will show you!', alt: '금빛 망치 소리는 멀리서도 들려! 그걸로 뭘 지을지 궁금해서 요즘 자꾸 네 마당 쪽을 보게 돼.', altEn: 'I can hear that golden hammer from way over here! I keep glancing at your yard, wondering what you will build with it.' }),
    best: Object.freeze({ body: '이 흔들의자, 처음으로 남 주려고 짠 거야! 데크까지 깔았으니까 해 질 녘에 앉아서 마을 한번 내려다봐. 삐걱거리면 바로 불러. 고쳐 줄게!', bodyEn: 'This rocking chair is the first one I ever built to give away! I even laid a deck, so sit on it at sunset and look out over the village. If it creaks, call me right away. I will fix it!', gift: Object.freeze({ decor: 'aff_chair' }) }),
    family: Object.freeze({ body: '망치 들고 다닌 지 몇십 년인데 이런 이웃은 처음이야. 우리 이제 한 식구나 마찬가지지! 사진 한 장 넣었어. 네 집 지을 때 그 자리에 나도 있었다는 증거로.', bodyEn: 'I have carried a hammer for decades and never had a neighbor like you. We are practically family now! I put a photo in. Proof that I was there when your house went up.', gift: Object.freeze({ decor: 'aff_frame_builder' }) }),
  }),
  merchant: Object.freeze({
    nbr: Object.freeze({ body: '먼 길을 다니다 보면 반가운 얼굴이 드물다오. 그대는 그 드문 얼굴 가운데 하나요. 장사하고 남은 동전 몇 닢 넣어 보내니 요긴하게 쓰시오.', bodyEn: 'On the long road, friendly faces are rare. Yours is one of those rare few. I have tucked in a few coins left over from trading. Put them to good use.', gift: Object.freeze({ coins: 40 }) }),
    friend: Object.freeze({ body: '이제 그대와는 셈을 따지지 않는 사이가 됐구려. 내 보따리 깊은 곳에 금빛 씨앗 주머니 도면이 있소. 좌판에 들르면 꺼내 보여 주겠소.', bodyEn: 'It seems you and I no longer keep count between us. Deep in my bundle is a blueprint for a golden seed pouch. Visit my stall and I shall show it to you.', alt: '금빛 주머니에서 씨앗 꺼내는 모습을 봤소. 내 물건이 제 주인을 찾은 듯해 흐뭇했다오. 이제 그대와는 셈을 따지지 않는 사이요.', altEn: 'I saw you pulling seeds from that golden pouch. It warmed my heart, as if my wares had found their true owner. You and I no longer keep count between us.' }),
    best: Object.freeze({ body: '먼 마을에서 쓰던 천막을 하나 들고 왔소. 떠돌다 돌아올 때 그대 마당에 이 천막이 서 있으면 집에 온 기분일 것 같구려. 좌판에 올린 병들은 밤이면 은은히 빛난다오.', bodyEn: 'I have brought a tent I used in a far-off village. When I come back from wandering and see it standing in your yard, I think it will feel like coming home. The bottles on the stall glow softly at night.', gift: Object.freeze({ decor: 'aff_tent' }) }),
    family: Object.freeze({ body: '떠도는 사람에게 돌아올 곳이 생겼으니, 이제 나도 이 마을 사람이오. 그 마음을 담아 내 얼굴을 한 장 보내오. 식탁 한쪽에 두고 가끔 안부를 물어 주시오.', bodyEn: 'A wanderer now has a place to return to, so I am one of this village too. With that in mind, I send you my portrait. Keep it on a corner of your table and ask after me now and then.', gift: Object.freeze({ decor: 'aff_frame_merchant' }) }),
  }),
  angler: Object.freeze({
    nbr: Object.freeze({ body: '허허, 요즘 호수에서 자네 그림자를 자주 보네. 물고기는 기다리는 사람한테 오는 법이지. 미끼 조금하고 오늘 잡은 놈들 좀 보내네.', bodyEn: 'Heh heh, I see your shadow by the lake a lot these days. Fish come to those who wait, you know. Here is a little bait and a few of today\'s catch.', gift: Object.freeze({ bait: 3, fish: 3 }) }),
    friend: Object.freeze({ body: '자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네. 젊을 적 쓰던 금빛 낚싯대 도면이 있는데, 이제 자네한테 넘길 때가 된 것 같구먼. 호숫가로 오게나.', bodyEn: 'Sitting beside you, I lose track of time. I have a blueprint for the golden rod I used in my younger days. I reckon it is time to pass it on to you. Come down to the lake.', alt: '금빛 낚싯대가 물살에 반짝이는 걸 보니 내 젊을 때 생각이 나더군. 허허, 자네랑 나란히 앉아 있으면 시간 가는 줄 모르겠네.', altEn: 'Seeing that golden rod glint on the water reminds me of my younger days. Heh heh, sitting beside you, I lose track of time.' }),
    best: Object.freeze({ body: '허허, 자네 마당에 작은 물가를 하나 만들어 두게. 내가 쓰던 의자랑 양동이를 같이 보내네. 물고기가 안 물어도 앉아 있으면 마음이 편해지는 자리일세.', bodyEn: 'Heh heh, make yourself a little waterside in your yard. I am sending my old stool and bucket along with it. Even when the fish are not biting, it is a spot where the heart settles.', gift: Object.freeze({ decor: 'aff_nook' }) }),
    family: Object.freeze({ body: '이 나이에 식구가 하나 늘 줄은 몰랐네. 허허, 쑥스럽지만 사진을 한 장 보내네. 자네 식탁에 두면 같이 아침 먹는 기분이겠구먼.', bodyEn: 'I never thought my family would grow by one at my age. Heh heh, it is a bit embarrassing, but here is a photo. Put it on your table and it will feel like we are having breakfast together.', gift: Object.freeze({ decor: 'aff_frame_angler' }) }),
  }),
  chef: Object.freeze({
    nbr: Object.freeze({ body: '있지, 네가 준 선물 덕에 새 메뉴가 떠올랐어! 밀가루랑 꿀 조금 보낼게. 빵 구울 때 넣으면 딱이야!', bodyEn: 'Guess what, your gift gave me an idea for a new dish! I am sending a little flour and honey. Perfect for baking bread!', gift: Object.freeze({ flour: 2, honey: 1 }) }),
    friend: Object.freeze({ body: '우리 이제 진짜 친구지? 친구한테는 아끼는 걸 줘야 해! 요리하다 찾은 반짝이는 보석 하나 넣었어. 밀가루도 넉넉히 담았고!', bodyEn: 'We are real friends now, right? You have to give your friends the good stuff! I put in a sparkly gem I found while cooking. Plenty of flour too!', gift: Object.freeze({ gem: 1, flour: 2 }) }),
    best: Object.freeze({ body: '짜잔! 내가 제일 아끼는 찜기 탁자야! 김이 모락모락 나는 걸 보면 배고파지지? 친구랑 같이 먹으려고 의자도 두 개 놨어!', bodyEn: 'Ta-da! My very favorite steamer table! Seeing the steam curl up makes you hungry, right? I put two stools out so we can eat together!', gift: Object.freeze({ decor: 'aff_steamer' }) }),
    family: Object.freeze({ body: '우리 이제 한솥밥 먹는 사이야! 그 기념으로 내 사진을 보내. 식탁에 두면 밥이 더 맛있어질 거야. 진짜야!', bodyEn: 'We share the same pot now! To celebrate, here is my photo. Put it on your table and your meals will taste even better. Really!', gift: Object.freeze({ decor: 'aff_frame_chef' }) }),
  }),
  forager: Object.freeze({
    nbr: Object.freeze({ body: '숲에서 주운 것들을 나눠 담았어. 혼자 먹기엔 많고, 너랑 나누면 딱 좋더라. 바구니 비면 또 말해 줘.', bodyEn: 'I shared out what I gathered in the woods. It is too much for one, and just right to split with you. Tell me when your basket is empty.', gift: Object.freeze({ forage: 6 }) }),
    friend: Object.freeze({ body: '요즘 숲길을 걷다 보면 네 발자국이 먼저 나 있더라. 그게 참 좋아. 내가 아끼던 금빛 도끼 도면, 이제 너한테 보여 줄게. 숲 입구로 와 줘.', bodyEn: 'Lately, when I walk the forest path, your footprints are already there. I really like that. Let me show you my treasured golden axe blueprint. Come to the forest entrance.', alt: '금빛 도끼 소리가 숲 입구까지 들려. 요즘 숲길에 네 발자국이 먼저 나 있는 게 참 좋아.', altEn: 'I can hear that golden axe all the way at the forest entrance. I really like finding your footprints on the forest path these days.' }),
    best: Object.freeze({ body: '숲에서 제일 예쁜 그루터기를 찾았어. 그 위에 버섯 등불을 키워 봤는데, 밤이 되면 은은하게 빛나. 네 마당에도 숲 한 조각이 있으면 좋겠다 싶었어.', bodyEn: 'I found the prettiest stump in the woods. I grew mushroom lamps on it, and they glow softly at night. I thought it would be nice for your yard to have a little piece of the forest too.', gift: Object.freeze({ decor: 'aff_lamp' }) }),
    family: Object.freeze({ body: '숲에서 혼자 지낸 시간이 길었는데, 요즘은 네가 있어서 덜 쓸쓸해. 사진 한 장 넣어 둘게. 식탁 위에서 너를 지켜 줄게.', bodyEn: 'I spent a long time alone in the woods, but these days I feel less lonely because of you. I will tuck in a photo. I will watch over you from your table.', gift: Object.freeze({ decor: 'aff_frame_forager' }) }),
  }),
  stargazer: Object.freeze({
    nbr: Object.freeze({ body: '어젯밤에 반딧불이를 잡아서 병에 담았어요! 다 드릴게요. 밤에 뚜껑을 열면 방이 반짝반짝해져요.', bodyEn: 'Last night I caught some fireflies and put them in a jar! You can have them all. Open the lid at night and your room will sparkle.', gift: Object.freeze({ bug: 3 }) }),
    friend: Object.freeze({ body: '이제 우리 진짜 친구예요! 비밀 하나 알려 드릴게요. 포충망을 금빛으로 만드는 도면이 있어요. 계곡 입구로 오면 보여 드릴게요!', bodyEn: 'We are real friends now! Want to hear a secret? There is a blueprint that makes a net golden. Come to the valley entrance and I will show you!', alt: '금빛 포충망 쓰는 거 봤어요! 반딧불이들도 좋아하는 것 같았어요. 이제 우리 진짜 친구예요!', altEn: 'I saw you using the golden net! I think the fireflies liked it too. We are real friends now!' }),
    best: Object.freeze({ body: '제 망원경을 드릴게요! 밤에 들여다보면 별이 엄청 크게 보여요. 별 의자에 앉아서 보면 더 잘 보여요. 같이 보고 싶을 땐 불러 주세요!', bodyEn: 'I am giving you my telescope! At night the stars look super big through it. They look even better from the star stool. Call me when you want to look together!', gift: Object.freeze({ decor: 'aff_telescope' }) }),
    family: Object.freeze({ body: '제가 정했어요. 같이 별을 본 사람은 가족이에요! 그래서 제 사진을 드려요. 식탁에 두고 밤마다 인사해 주세요.', bodyEn: 'I decided it. Anyone who watched the stars with you is family! So here is my photo. Keep it on your table and say good night to me every night.', gift: Object.freeze({ decor: 'aff_frame_stargazer' }) }),
  }),
  ferryman: Object.freeze({
    nbr: Object.freeze({ body: '물때 맞춰 나루에 들르는 게 이제 자네 버릇이 됐구먼. 오늘 건진 물고기하고 배 고치고 남은 널 몇 장 보내네.', bodyEn: 'Dropping by the ferry with the tide has become a habit of yours, eh. Here are today\'s catch and a few planks left from fixing the boat.', gift: Object.freeze({ fish: 3, wood: 8 }) }),
    friend: Object.freeze({ body: '뱃사람은 아무한테나 뱃길 얘기를 안 하네. 자네는 이제 아무나가 아니게야. 금빛 물조리개 도면이 있는데, 나루로 오시게.', bodyEn: 'A boatman does not tell just anyone about the river routes. And you are not just anyone anymore. I have a blueprint for a golden watering can. Come down to the ferry.', alt: '금빛 물조리개로 밭에 물 주는 걸 강 건너에서도 봤네. 뱃사람은 아무한테나 뱃길 얘기를 안 하는데, 자네는 다르지.', altEn: 'I saw you watering your field with that golden can, clear from across the river. A boatman does not tell just anyone about the routes, but you are different.' }),
    best: Object.freeze({ body: '바다로 못 나가게 된 배가 한 척 있는데, 버리기 아까워 꽃을 심어 봤네. 자네 마당에 띄워 두면 물 위에 꽃이 피는 셈이지. 밤엔 고물 등불을 켜 두시게.', bodyEn: 'There is a boat that cannot go to sea anymore, and it seemed a shame to throw it away, so I planted flowers in it. Float it in your yard and you will have flowers blooming on the water. Light the stern lantern at night.', gift: Object.freeze({ decor: 'aff_boat' }) }),
    family: Object.freeze({ body: '뱃사람은 정을 잘 안 주는데, 자네한텐 어쩔 수가 없구먼. 사진 한 장 넣었네. 식탁에 두면 내가 물때 맞춰 안부를 묻는 걸로 알게.', bodyEn: 'Boatmen do not warm up to people easily, but there is no helping it with you. I put in a photo. Keep it on your table and take it as me asking after you with every tide.', gift: Object.freeze({ decor: 'aff_frame_ferryman' }) }),
  }),
  rancher: Object.freeze({
    nbr: Object.freeze({ body: '아침마다 닭장에 들러 줘서 고마워요. 오늘 아침에 낳은 달걀이에요. 따뜻할 때 부쳐 먹으면 제일 맛있어요.', bodyEn: 'Thank you for checking on the coop every morning. These eggs were laid this morning. They taste best fried while still warm.', gift: Object.freeze({ egg: 5, crop: 2 }) }),
    friend: Object.freeze({ body: '이제 우리 서로 아침상 걱정해 주는 사이죠? 제가 아끼는 금빛 삽 도면이 있어요. 목장에 오면 보여 줄게요.', bodyEn: 'We worry about each other\'s breakfast now, don\'t we? I have a golden shovel blueprint I treasure. Come to the ranch and I will show you.', alt: '금빛 삽으로 밭 고르는 거 봤어요. 손이 야무지네요. 이제 우리 서로 아침상 걱정해 주는 사이죠?', altEn: 'I saw you leveling the field with the golden shovel. Such a capable hand. We worry about each other\'s breakfast now, don\'t we?' }),
    best: Object.freeze({ body: '우리 닭이 병아리를 둘이나 깠어요! 둥지째 보내니까 마당 볕 좋은 데 두세요. 아침마다 삐약삐약 인사할 거예요.', bodyEn: 'Our hen hatched two chicks! I am sending the whole nest, so put it somewhere sunny in your yard. They will peep good morning to you every day.', gift: Object.freeze({ decor: 'aff_nest' }) }),
    family: Object.freeze({ body: '서로 아침상 걱정해 주던 사이가 이제 가족이 됐네요. 아침상 차릴 때마다 생각나서 사진을 한 장 보내요. 식탁에 두고 밥 든든히 챙겨 먹어요.', bodyEn: 'We used to worry about each other’s breakfast, and now we are family. You come to mind every time I set the breakfast table, so here is a photo. Keep it on your table and eat a hearty meal.', gift: Object.freeze({ decor: 'aff_frame_rancher' }) }),
  }),
  curator: Object.freeze({
    nbr: Object.freeze({ body: '전시실에 오실 때마다 무언가를 새로 알아보시더군요. 표본을 다듬고 남은 돌과 석탄을 보내 드립니다. 요긴하게 쓰시길 바랍니다.', bodyEn: 'Each time you visit the gallery, you notice something new. I am sending the stone and coal left over from preparing specimens. I trust you will put them to good use.', gift: Object.freeze({ stone: 8, coal: 2 }) }),
    friend: Object.freeze({ body: '오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요. 수장고에 금빛 괭이 도면이 한 장 있습니다. 박물관 앞으로 오시면 보여 드리지요.', bodyEn: 'I have watched for some time, and I believe I may now call you a friend. There is a golden hoe blueprint in the archive. Do come to the museum and I shall show it to you.', alt: '금빛 괭이는 박물관에 걸어 두어도 손색없을 물건이지요. 오래 지켜보았습니다만, 이제는 친구라 불러도 되겠지요.', altEn: 'That golden hoe would not look out of place on display in the museum. I have watched for some time, and I believe I may now call you a friend.' }),
    best: Object.freeze({ body: '제 수장품 가운데 가장 아끼는 항아리를 보내 드립니다. 유리 진열장에 넣어 두었으니, 그대의 마당이 작은 박물관이 되겠지요. 안에 든 보석은 밤이면 은은히 빛납니다.', bodyEn: 'I am sending you the jar I treasure most in my collection. I have placed it in a glass display case, so your yard shall become a small museum. The gem inside glows softly at night.', gift: Object.freeze({ decor: 'aff_vitrine' }) }),
    family: Object.freeze({ body: '오랜 세월 물건만 모아 왔습니다만, 결국 가장 귀한 것은 사람이더군요. 제 초상을 한 점 보내 드립니다. 식탁 한편에 두시면 영광이겠습니다.', bodyEn: 'I have spent many years collecting objects, and in the end, the most precious thing turned out to be people. I send you a portrait of myself. I would be honored if you kept it on your table.', gift: Object.freeze({ decor: 'aff_frame_curator' }) }),
  }),
  courier: Object.freeze({
    nbr: Object.freeze({ body: '의뢰를 맡길 때마다 믿음이 가더군. 마을 사람들이 건넨 사례금을 조금 따로 모아 두었네. 자네 몫이야.', bodyEn: 'Each time I hand you a request, you earn my trust. I have set aside part of the thank-you money the villagers gave. This share is yours.', gift: Object.freeze({ coins: 40 }) }),
    friend: Object.freeze({ body: '이렇게 편지를 직접 쓰는 건 오랜만이네. 의뢰를 꾸준히 끝내 준 자네에게 마을이 고마워하고 있어. 둥지에서 찾은 보석 하나와 사례금을 보내네.', bodyEn: 'It has been a while since I wrote a letter myself. The village is grateful that you keep finishing its requests. I am sending a gem I found in my nest, along with a reward.', gift: Object.freeze({ gem: 1, coins: 40 }) }),
    best: Object.freeze({ body: '오늘은 의뢰 쪽지 대신 우체통을 물고 왔네. 내가 쉬어 갈 자리도 위에 만들어 두었지. 앞으로 자네한테 오는 소식은 여기로 먼저 오게 하겠네.', bodyEn: 'Today I brought a mailbox instead of a request slip. I made a spot on top for me to rest, too. From now on, news for you will come here first.', gift: Object.freeze({ decor: 'aff_mailbox' }) }),
    family: Object.freeze({ body: '마을 소식을 나르며 수많은 집을 봤지만, 이렇게 마음이 머무는 집은 처음이네. 내 모습을 한 장 남기네. 식탁에 두면 늘 곁에 있는 걸로 알게.', bodyEn: 'I have seen countless homes while carrying the village news, but this is the first where my heart wants to stay. I leave you a picture of myself. Keep it on your table and know that I am always near.', gift: Object.freeze({ decor: 'aff_frame_courier' }) }),
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
  farmer: Object.freeze({ ico: '🥕', name: '채소 수레', decor: 'aff_cart' }),
  builder: Object.freeze({ ico: '🪑', name: '목수의 흔들의자', decor: 'aff_chair' }),
  merchant: Object.freeze({ ico: '⛺', name: '보라 천막', decor: 'aff_tent' }),
  angler: Object.freeze({ ico: '🎣', name: '낚시 쉼터', decor: 'aff_nook' }),
  chef: Object.freeze({ ico: '🎋', name: '대나무 찜기 탁자', decor: 'aff_steamer' }),
  forager: Object.freeze({ ico: '🍄', name: '버섯 등불', decor: 'aff_lamp' }),
  stargazer: Object.freeze({ ico: '🔭', name: '꼬마 망원경', decor: 'aff_telescope' }),
  ferryman: Object.freeze({ ico: '🛶', name: '꽃배 화분', decor: 'aff_boat' }),
  rancher: Object.freeze({ ico: '🐣', name: '병아리 둥지', decor: 'aff_nest' }),
  curator: Object.freeze({ ico: '🏺', name: '유리 진열장', decor: 'aff_vitrine' }),
  courier: Object.freeze({ ico: '📮', name: '올빼미 우체통', decor: 'aff_mailbox' }),
});

export const frameDecorId = (npc) => `aff_frame_${npc}`;
