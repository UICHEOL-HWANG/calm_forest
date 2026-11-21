export const REGULAR_LETTERS = Object.freeze({
  farmer: Object.freeze({
    body: '식당 주먹밥 먹고 나면 오후 밭일이 하나도 안 힘들어. 내 쌀로 지은 밥이라 그런가? 다음 철엔 제일 좋은 쌀을 식당 몫으로 따로 떼어 둘게.',
    bodyEn: 'After a rice ball at your restaurant, the afternoon field work is no trouble at all. Maybe because it is made from my rice? Next season I will set aside the best rice just for the restaurant.',
    pantry: Object.freeze({ rice: 3 }),
  }),
  builder: Object.freeze({
    body: '공사판에선 주먹밥이 최고야! 한 손으로 먹으면서 한 손으론 망치를 들 수 있잖아. 네 식당 주먹밥은 모양까지 반듯해서 먹기 아깝더라!',
    bodyEn: 'Rice balls are the best on a building site! You can eat with one hand and hold a hammer with the other. Yours come out so neat that I almost felt bad eating them!',
    pantry: Object.freeze({ rice: 3 }),
  }),
  stargazer: Object.freeze({
    body: '별 보러 갈 때 식당 주먹밥을 싸 갔어요! 밤하늘 보면서 먹으니까 두 배로 맛있었어요. 다음엔 같이 가요!',
    bodyEn: 'I packed rice balls from your restaurant when I went stargazing! Eating them under the night sky made them twice as tasty. Let\'s go together next time!',
    pantry: Object.freeze({ rice: 3 }),
  }),
  angler: Object.freeze({
    body: '허허, 잡는 건 자신 있어도 굽는 건 영 서툴러서 말이지. 자네 식당 생선구이는 껍질은 바삭하고 속은 촉촉하더구먼. 이제 잡은 놈은 자네한테 맡기겠네.',
    bodyEn: 'Heh heh, I can catch them fine, but I have never been any good at grilling. The fish at your restaurant is crisp on the outside and tender inside. From now on, I leave my catch to you.',
    pantry: Object.freeze({ fish: 3 }),
  }),
  ferryman: Object.freeze({
    body: '뱃일 끝나고 자네 식당에 들르는 게 낙이 됐구먼. 생선구이 한 접시면 하루 피로가 다 풀리네. 물때 맞춰 또 가겠네.',
    bodyEn: 'Stopping by your restaurant after a day on the boat has become my little joy. One plate of grilled fish and the whole day\'s tiredness is gone. I will come again with the tide.',
    pantry: Object.freeze({ fish: 3 }),
  }),
  forager: Object.freeze({
    body: '숲에서 밤을 새우고 나면 몸이 으슬으슬한데, 네 식당 생선국 한 그릇이면 금방 따뜻해져. 다음엔 숲에서 딴 버섯을 넣어 봐도 좋겠다.',
    bodyEn: 'After a night out in the woods I get chilled to the bone, but one bowl of your fish soup warms me right up. Next time you could try adding mushrooms from the forest.',
    pantry: Object.freeze({ fish: 3 }),
  }),
  rancher: Object.freeze({
    body: '새벽 일 마치고 생선국 한 그릇 먹으면 닭들 모이 줄 때까지 속이 든든해요. 국물이 진해서 자꾸 생각나요. 다음엔 달걀을 넉넉히 갖다 드릴게요.',
    bodyEn: 'One bowl of fish soup after the early chores keeps me full until the hens are fed. The broth is so rich that I keep thinking about it. Next time I will bring you plenty of eggs.',
    pantry: Object.freeze({ fish: 3 }),
  }),
  curator: Object.freeze({
    body: '천천히 음미하며 먹는 식사를 좋아합니다. 그대 식당의 생선국은 서두르지 않고 끓인 맛이 납니다. 앞으로도 자주 찾겠습니다.',
    bodyEn: 'I am fond of meals one can savor slowly. The fish soup at your restaurant tastes as though it was simmered without hurry. I shall be visiting often.',
    pantry: Object.freeze({ fish: 3 }),
  }),
});

export function regularLetterOf(npc, lang = 'ko') {
  if (!Object.hasOwn(REGULAR_LETTERS, npc)) return null;
  const l = REGULAR_LETTERS[npc];
  return { npc, body: lang === 'en' ? l.bodyEn : l.body, pantry: l.pantry };
}
