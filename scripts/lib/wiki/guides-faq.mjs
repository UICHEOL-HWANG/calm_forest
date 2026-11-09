import { fact, num, ref, refs, list, priceOf, parseEffect, isLake, isSea, weatherWords } from './guides-data.mjs';

const top = (items, fn) => [...items].sort((a, b) => fn(b) - fn(a))[0];
const qa = (q, a) => `Q. ${q}\nA. ${a}`;

const fishFaq = (entries) => {
  const lake = entries.filter(isLake);
  const sea = entries.filter(isSea);
  const kg = (e) => num((fact(e, '무게') ?? '').split('~')[1]);
  const heaviest = top(sea, kg);
  const seasons = lake.filter(e => fact(e, '계절')).map(e => `${fact(e, '계절')} ${ref(e)}`);
  return [
    qa('비 오는 날에만 낚이는 물고기는 무엇인가요?', `${refs(lake.filter(e => fact(e, '날씨') === '비'))}이다. 비 오는 날에는 입질이 빨라지고 귀한 물고기가 더 잘 나온다.`),
    qa('계절 한정 물고기에는 무엇이 있나요?', `${list(seasons)} 등이 있다. 계절이 지나면 다음 해 같은 계절까지 만날 수 없다.`),
    qa('바다터에서 가장 무거운 물고기는 무엇인가요?', `${ref(heaviest)}이고 무게는 ${fact(heaviest, '무게')}이다.`),
    qa('하루에 한 마리만 낚을 수 있는 물고기가 있나요?', `${refs(sea.filter(e => fact(e, '시간') === '하루 한 마리'))}이다. 그날 한 마리를 낚았다면 다음 날까지 다시 나오지 않는다.`),
    qa('밤에만 낚이는 바다 물고기는 무엇인가요?', `${refs(sea.filter(e => fact(e, '시간') === '밤'))}이다. 낮에는 나오지 않으니 해가 진 뒤에 찾아가야 한다.`),
  ];
};

const cropFaq = (entries) => {
  const adv = entries.filter(e => fact(e, '종류') === '고급 작물');
  const basic = entries.filter(e => fact(e, '종류') === '기본 작물');
  const priciest = top(adv, e => num(fact(e, '판매가')));
  const lightest = [...adv].sort((a, b) => num(fact(a, '물 주기')) - num(fact(b, '물 주기')))[0];
  return [
    qa('가장 비싸게 팔리는 작물은 무엇인가요?', `${ref(priciest)}이고 판매가는 ${fact(priciest, '판매가')}이다. 기본 작물은 ${fact(basic[0], '판매가')}이므로 고급 작물이 훨씬 비싸다.`),
    qa('기본 씨앗을 심으면 어떤 작물이 자라나요?', `${refs(basic)} 가운데 하나가 무작위로 자란다.`),
    qa('물을 가장 적게 줘도 되는 고급 작물은 무엇인가요?', `${ref(lightest)}이고 물을 ${fact(lightest, '물 주기')} 주면 된다.`),
    qa('포도는 어디에 심나요?', '포도 지지대 바로 옆 밭에만 심을 수 있다. 지지대는 측량소 옆 자재 작업대에서 만든다.'),
    qa('밀을 처음 거두면 무엇이 열리나요?', '마을 동쪽 언덕의 과수원이 열리고 사과 묘목을 받는다.'),
  ];
};

const oreFaq = (entries) => {
  const priciest = top(entries.filter(e => priceOf(e)), e => num(priceOf(e)));
  return [
    qa('가장 비싸게 팔리는 광물은 무엇인가요?', `${ref(priciest)}이고 판매가는 ${priceOf(priciest)}이다.`),
    qa('보석은 언제 캘 수 있나요?', '[[weather/fog]]에만 채굴 동굴에서 나온다. 광부의 힘 효과와 상관없이 한 번에 하나씩만 나온다.'),
    qa('수정은 어디에서 나오나요?', '채굴 동굴 지하 열한 번째 층 아래 수정 동굴의 광맥에서만 나온다. 지상과 위쪽 층에서는 나오지 않는다.'),
    qa('돌과 석탄은 사서 채울 수 있나요?', '상점에서 코인으로 살 수 있다. 급할 때는 채굴 대신 구매로 메울 수 있다.'),
    qa('채굴 효율을 올리는 요리는 무엇인가요?', '[[cook/baked_yam]], [[cook/omelette]] 등을 먹으면 광부의 힘 효과로 광석이 더 잘 나온다.'),
  ];
};

const cookFaq = (entries) => {
  const longest = top(entries, e => parseEffect(e).sec);
  const priciest = top(entries, e => num(fact(e, '카페 판매가')));
  const luck = entries.filter(e => parseEffect(e).label.includes('희귀 물고기'));
  const one = entries.filter(e => fact(e, '난이도') === '★');
  return [
    qa('효과가 가장 오래가는 요리는 무엇인가요?', `${ref(longest)}이고 ${parseEffect(longest).label} 효과가 ${parseEffect(longest).sec}초 동안 이어진다.`),
    qa('카페에서 가장 비싸게 팔리는 요리는 무엇인가요?', `${ref(priciest)}이고 카페 판매가는 ${fact(priciest, '카페 판매가')}이다.`),
    qa('낚시 행운 요리에는 무엇이 있나요?', `${refs(luck)} 등이다. 귀한 물고기가 더 잘 낚이는 효과가 붙는다.`),
    qa('가장 쉬운 요리는 무엇인가요?', `난이도 별 하나짜리 ${refs(one)} 등이다. 미니게임을 한 단계만 하면 완성된다.`),
    qa('재료를 하룻밤 가공해야 하는 요리는 무엇인가요?', '[[cook/bread]]과 [[cook/grape_juice]]이다. 밀은 화덕에서, 포도는 발효통에서 하룻밤 걸려야 한다.'),
  ];
};

const npcFaq = (entries) => {
  const quests = (e) => (fact(e, '의뢰') ?? '').split(' · ').filter(Boolean);
  const topNpc = top(entries.filter(e => quests(e).length), e => quests(e).length);
  const guests = entries.filter(e => fact(e, '구분') === '카페 손님');
  return [
    qa('의뢰가 가장 많은 주민은 누구인가요?', `${ref(topNpc)}이고 의뢰가 ${quests(topNpc).length}건이다.`),
    qa('카페 손님은 몇 종인가요?', `${guests.length}종이고 ${refs(guests)} 등이다. 모두 남쪽 카페에서만 만날 수 있다.`),
    qa('히든 의뢰가 있는 주민은 누구인가요?', '[[npc/builder]], [[npc/merchant]], [[npc/angler]], [[npc/rancher]] 등이다. 마치면 금빛 도구 도면을 받는다.'),
    qa('매일 새 의뢰를 주는 주민은 누구인가요?', '[[npc/courier]]이다. 같은 날에는 모든 사람에게 같은 의뢰가 나온다.'),
    qa('마지막 의뢰 보상으로 보석을 주는 주민은 누구인가요?', '[[npc/builder]], [[npc/chef]], [[npc/forager]], [[npc/stargazer]], [[npc/ferryman]], [[npc/rancher]], [[npc/curator]]이다.'),
  ];
};

const forageFaq = (entries) => [
  qa('밤에만 주울 수 있는 채집물은 무엇인가요?', `${refs(entries.filter(e => fact(e, '시간') === '밤'))}이다. 날씨와 상관없이 밤인지만 따진다.`),
  qa('비 오는 날 더 많이 나오는 채집물은 무엇인가요?', '[[forage/mushroom]]이다. 비 오는 날에는 숲 바닥에 버섯이 더 많이 돋는다.'),
  qa('씨앗도 함께 주는 채집물은 무엇인가요?', `${refs(entries.filter(e => (fact(e, '얻는 양') ?? '').includes('씨앗')))}이다. 기본 씨앗이 모자랄 때 들르기 좋다.`),
  qa('작물도 함께 주는 채집물은 무엇인가요?', `${refs(entries.filter(e => (fact(e, '얻는 양') ?? '').includes('작물')))}이다. 밭이 없어도 작물을 조금씩 모을 수 있다.`),
  qa('채집물 판매가는 얼마인가요?', `${[...new Set(entries.map(e => fact(e, '판매가')))].join(', ')}이다.`),
];

const bugFaq = (entries) => {
  const rare = entries.filter(e => weatherWords(e).length);
  return [
    qa('가장 귀한 반딧불이는 무엇인가요?', `${refs(rare)}이다. ${weatherWords(rare[0]).join('이나 ')}의 밤에만 나타난다.`),
    qa('반딧불이 계곡은 어디에 있나요?', '카페 남쪽에 있다. 밤에 포충망을 들고 찾아간다.'),
    qa('포충망은 언제 휘둘러야 하나요?', '반딧불이가 밝게 반짝이는 순간에 휘두르면 거의 성공하고, 어두울 때 휘두르면 자주 놓친다.'),
    qa('네 종을 모두 잡으면 무엇을 받나요?', '밤의 수집가 배지를 받는다.'),
    qa('반딧불이 판매가는 얼마인가요?', `${[...new Set(entries.map(e => fact(e, '판매가')))].join(', ')}이다.`),
  ];
};

const trackFaq = () => [
  qa('밤손님 흔적은 언제 생기나요?', '자리를 비운 밤에 너구리나 멧돼지가 밭 작물을 훔쳐 간 다음 날 그 자리에 조사 표시가 뜬다.'),
  qa('너구리와는 어떻게 겨루나요?', '그릇 세 개를 섞는 놀이로 겨루며 세 판을 모두 맞혀야 이긴다.'),
  qa('멧돼지와는 어떻게 겨루나요?', '가위바위보로 겨루며 먼저 두 번 이기면 된다.'),
  qa('이기면 어떻게 되나요?', '그날 가져간 작물을 전부 되찾고 이틀 밤 동안 오지 않는다. 져도 더 잃는 것은 없다.'),
  qa('밤손님을 막으려면 어떻게 하나요?', '허수아비 하나나 울타리 네 개를 밭 근처에 두면 된다.'),
];

const digFaq = (entries) => [
  qa('땅속 수집품은 어떻게 얻나요?', '농사 세트의 삽으로 빈 밭을 완전히 메우는 순간 낮은 확률로 나온다.'),
  qa('가장 드문 땅속 수집품은 무엇인가요?', `${ref(entries[entries.length - 1])}이다. 이름은 동전이지만 코인을 주지 않는다.`),
  qa('땅속 수집품은 코인이나 재료를 주나요?', '주지 않는다. 도감과 박물관 전시만 채운다.'),
  qa('넓은 삽을 쓰면 무엇이 달라지나요?', '빈 밭을 한 번에 메울 수 있어 여러 밭을 빠르게 정리할 수 있다.'),
  qa('이미 등록한 수집품이 다시 나오나요?', '다시 나오지 않는다. 하나를 찾을수록 남은 종류에 집중할 수 있다.'),
];

const riverFaq = (entries) => [
  qa('나룻배는 어디에서 타나요?', '마을 북쪽 나루터에서 탄다.'),
  qa('하루에 몇 번 탈 수 있나요?', '세 번까지 탈 수 있다. 그날 코스는 모두에게 같다.'),
  qa('밤에만 나오는 강 수집품은 무엇인가요?', `${refs(entries.filter(e => fact(e, '시간') === '밤'))}이다. 낮에 출발하면 나오지 않는다.`),
  qa('배가 장애물에 부딪히면 어떻게 되나요?', '배가 멈추지만 그때까지 건진 수집품은 그대로 받는다.'),
  qa('별조각은 어디에 쓰나요?', '부두 뱃사공의 창고에서 노, 선체, 뱃머리 등불을 강화하는 데 쓴다.'),
];

const spiritFaq = (entries) => [
  qa('안개 낀 날에만 나타나는 정령은 누구인가요?', `${refs(entries.filter(e => fact(e, '날씨') === '안개'))}이다. 달래면 다른 정령보다 두 배 많은 빛 보상을 준다.`),
  qa('정령은 어떻게 달래나요?', '정령 곁으로 걸어가 행동하면 음표가 떠오르고, 음표가 가장 작아질 때 맞춰 누르기를 여러 번 성공하면 달래진다.'),
  qa('박자를 놓치면 벌이 있나요?', '없다. 싸움이 아니라 음악에 가까운 놀이라 놓쳐도 잃는 것이 없다.'),
  qa('연습할 수 있나요?', '보상과 도감 기록이 없는 연습 모드로 먼저 익힐 수 있다.'),
  qa('빠른 정령은 어떻게 상대하나요?', '둘레의 등불을 켜 두면 곁을 지날 때 속도가 느려져 따라잡기 쉬워진다.'),
];

const weatherFaq = () => [
  qa('날씨는 어떻게 정해지나요?', '날짜에 따라 정해져서 그날 접속한 모든 사람이 같은 날씨를 겪는다.'),
  qa('밭이 저절로 자라는 날씨는 무엇인가요?', '[[weather/rain]]이다. 물을 주지 않아도 작물이 자라고 호수 입질도 빨라진다.'),
  qa('목재가 더 나오는 날씨는 무엇인가요?', '[[weather/snow]]이다. 벌목할 때 목재가 더 나오므로 건축 재료를 모으기 좋다.'),
  qa('보석이 나오는 날씨는 무엇인가요?', '[[weather/fog]]이다. 채굴 동굴에서 보석이 나오고 안개 낀 숲에서는 황금 정령이 나타난다.'),
  qa('네 날씨를 모두 겪으면 무엇을 받나요?', '전천후 탐험가 배지를 받는다.'),
];

const visitorFaq = (entries) => [
  qa('가장 까다로운 방문객은 누구인가요?', '[[visitor/frog]]이다. 우물로 물기를 더하고 그늘을 만든 뒤 비 오는 날을 기다려야 한다.'),
  qa('밤에 오는 방문객은 누구인가요?', `${refs(entries.filter(e => fact(e, '나타나는 때') === '밤'))}이다. 은신처와 그늘이 필요하다.`),
  qa('허수아비는 방문객에게 어떤 영향을 주나요?', '곁에 허수아비가 있으면 호랑나비와 참새가 오지 않는다. 밭 가장자리에 조금 떨어뜨려 두면 좋다.'),
  qa('방문객은 어떻게 도감에 등록하나요?', '손님은 잠깐 머물다 떠나므로 돋보기 말풍선이 뜬 사이에 다가가 행동해야 한다.'),
  qa('어떤 손님이 올지 미리 알 수 있나요?', '야외 장식을 놓거나 옮길 때 그 자리에 어떤 손님이 올지 점수판이 알려 준다.'),
];

const FAQ = {
  fish: fishFaq, crop: cropFaq, ore: oreFaq, cook: cookFaq, npc: npcFaq, forage: forageFaq, bug: bugFaq,
  track: trackFaq, dig: digFaq, river: riverFaq, spirit: spiritFaq, weather: weatherFaq, visitor: visitorFaq,
};

export function catFaq(cat, entries) {
  const items = FAQ[cat.id]?.(entries) ?? [];
  return items.length ? ['자주 묻는 질문', items.join('\n\n')] : null;
}
