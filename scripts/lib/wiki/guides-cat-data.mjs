import { josa } from './faq.mjs';
import { fact, num, ref, refs, list, lnk, lnkAll, condText, hasCond, priceOf, byGroup, parseEffect, isLake, isSea, weatherWords } from './guides-data.mjs';

const sortBy = (items, fn) => [...items].sort((a, b) => fn(b) - fn(a));
const museumLine = (entries) => {
  const floors = [...new Set(entries.map(e => e.museum).filter(Boolean))];
  const n = entries.filter(e => e.museum).length;
  return floors.length ? ` 박물관 ${floors.join(', ')} 전시와 이어지는 종은 ${n}종이다.` : '';
};

const overview = (cat, entries) => {
  const cond = entries.filter(hasCond);
  const free = entries.length - cond.length;
  const condPart = cond.length
    ? `이 가운데 ${cond.length}종은 계절, 날씨, 시간 같은 조건이 붙어 있고 ${free}종은 조건 없이 만날 수 있다.`
    : '모든 종이 별도의 계절, 날씨, 시간 조건 없이 만날 수 있다.';
  return [`${cat.name} 도감 한눈에 보기`, `${cat.name} 분류에는 모두 ${entries.length}종이 실려 있다. ${condPart}${museumLine(entries)} 처음 접하는 분류라면 아래 조건 정리와 수치 비교를 먼저 훑어본 뒤, 이름을 눌러 개별 문서에서 얻는 법과 쓰임새를 확인하자.`];
};

const conditionSection = (entries) => {
  const groups = [...byGroup(entries, condText)];
  if (groups.length < 2) return null;
  const sentences = groups.map(([cond, items]) => `${cond === '조건 없음' ? '조건 없이 만나는 종' : `${cond} 만나는 종`}: ${refs(items)}`);
  return ['조건별로 나누어 보기', `${sentences.join('. ')}. 같은 조건에 묶인 종은 같은 날 함께 노릴 수 있으니, 지금 조건에 맞는 종부터 채우면 헛걸음이 줄어든다.`];
};

const fishCompare = (entries) => {
  const lake = entries.filter(isLake);
  const sea = entries.filter(isSea);
  const kg = (e) => num((fact(e, '무게') ?? '').split('~')[1]);
  const coin = (e) => num((fact(e, '보상') ?? '').match(/코인 (\d+)/)?.[1]);
  const price = [...new Set(lake.map(e => fact(e, '판매가')))];
  return ['호수와 바다터 수치 비교', `호수 물고기 ${lake.length}종의 판매가는 ${price.length === 1 ? `모두 ${josa(price[0], '으로/로')} 같다` : '종마다 다르다'}. 바다터 물고기 ${sea.length}종은 최대 무게가 무거운 순서대로 ${list(sortBy(sea, kg).map(e => `${ref(e)} ${fact(e, '무게')}`))} 순이고, 낚았을 때 받는 코인은 ${list(sortBy(sea, coin).map(e => `${ref(e)} ${coin(e)}`))} 순서다. 무게와 보상이 클수록 줄다리기가 힘들어지므로 처음에는 가벼운 종으로 연습하는 편이 좋다.`];
};

const cropCompare = (entries) => {
  const adv = entries.filter(e => fact(e, '종류') === '고급 작물');
  const basic = entries.filter(e => fact(e, '종류') === '기본 작물');
  const line = (e) => `${lnk(e, '은/는')} 씨앗 ${fact(e, '씨앗')}, 판매가 ${fact(e, '판매가')}, ${fact(e, '성장 단계')}, 물 ${fact(e, '물 주기')}`;
  const top = sortBy(adv, e => num(fact(e, '판매가')))[0];
  const light = [...adv].sort((a, b) => num(fact(a, '물 주기')) - num(fact(b, '물 주기')))[0];
  return ['기본 작물과 고급 작물 수치 비교', `기본 작물 ${lnkAll(basic, '은/는')} 판매가가 모두 ${josa(fact(basic[0], '판매가'), '으로/로')} 같고 기본 씨앗 하나에서 무작위로 자란다. 고급 작물은 ${list(adv.map(line))} 순으로 다르다. 판매가가 가장 높은 고급 작물은 ${ref(top)}이고, 물 주기가 가장 적게 드는 작물은 ${ref(light)}이다. 손이 덜 가는 작물부터 시작해 밭이 안정되면 값이 높은 작물로 넘어가자.`];
};

const oreCompare = (entries) => {
  const priced = sortBy(entries.filter(e => priceOf(e)), e => num(priceOf(e)));
  const noPrice = entries.filter(e => !priceOf(e));
  return ['광물 판매가 순위', `판매가가 높은 순서대로 ${list(priced.map(e => `${ref(e)} ${priceOf(e)}`))} 순이다.${noPrice.length ? ` ${lnkAll(noPrice, '은/는')} 정보 표에 판매가가 따로 적혀 있지 않다.` : ''} 흔한 광물은 값이 낮지만 건축과 제작에 계속 들어가고, 조건이 붙은 광물은 값이 높은 대신 얻을 수 있는 날이 제한되므로 나눠서 계획하는 것이 좋다.`];
};

const cookCompare = (entries) => {
  const groups = [...byGroup(entries, e => parseEffect(e).label)];
  const effectLine = ([label, items]) => `${label}: ${list([...items].sort((a, b) => parseEffect(a).sec - parseEffect(b).sec).map(e => `${ref(e)} ${parseEffect(e).sec}초`))}`;
  const stars = [...byGroup(entries, e => fact(e, '난이도'))].sort((a, b) => a[0].length - b[0].length);
  const starLine = ([s, items]) => {
    const prices = items.map(e => num(fact(e, '카페 판매가')));
    return `난이도 ${s}는 ${items.length}종으로 카페 판매가가 ${Math.min(...prices)}에서 ${Math.max(...prices)}코인 사이다`;
  };
  return ['효과와 난이도별 정리', `효과별로 보면 ${groups.map(effectLine).join('. ')}. 난이도별로는 ${stars.map(starLine).join(', ')}. 별이 많을수록 카페 값과 효과 시간이 함께 오르는 경향이 있으니, 재료가 충분할 때는 높은 난이도에 도전해 보자.`];
};

const npcCompare = (entries) => {
  const quests = (e) => (fact(e, '의뢰') ?? '').split(' · ').filter(Boolean);
  const residents = entries.filter(e => fact(e, '구분') === '마을 주민');
  const guests = entries.filter(e => fact(e, '구분') === '카페 손님');
  const withQ = sortBy(residents.filter(e => quests(e).length), e => quests(e).length);
  const daily = residents.filter(e => !quests(e).length);
  return ['주민별 의뢰 수와 카페 손님', `마을 주민은 ${residents.length}명이고, 의뢰가 많은 순서대로 ${list(withQ.map(e => `${ref(e)} ${quests(e).length}건`))} 순이다. ${lnkAll(daily, '은/는')} 정해진 목록 대신 날마다 새 의뢰를 내준다. 카페 손님은 ${guests.length}종으로 ${refs(guests)} 등이 있으며 모두 남쪽 카페에서만 만난다.`];
};

const forageCompare = (entries) => ['채집물별 얻는 양과 판매가', `${list(entries.map(e => `${lnk(e, '은/는')} ${josa(fact(e, '얻는 양'), '을/를')} 주고 판매가 ${fact(e, '판매가')}, ${hasCond(e) ? `${condText(e)} 만날 수 있다` : '조건 없이 만날 수 있다'}`))}. 채집물은 한 번에 얻는 양이 다르므로 요리에 많이 필요한 재료는 한 번에 여러 개를 주는 종을 우선 찾는 편이 효율적이다.`];

const bugCompare = (entries) => {
  const prices = [...new Set(entries.map(e => fact(e, '판매가')))];
  return ['반딧불이별 출현 조건', `${list(entries.map(e => `${lnk(e, '은/는')} ${weatherWords(e).length ? `${weatherWords(e).join('이나 ')}의 밤에만` : '밤이면 날씨와 상관없이'} 나온다`))}. 판매가는 ${prices.length === 1 ? `종류와 상관없이 모두 ${josa(prices[0], '으로/로')} 같다` : '종마다 다르다'}. 모든 종을 채우려면 날씨 조건이 있는 종을 중심으로 날짜를 정하고, 그날 계곡에서 다른 종도 함께 잡아 두자.`];
};

const trackCompare = (entries) => ['밤손님별 흔적과 승부', `${lnk(entries[0], '은/는')} 너구리가 남기는 흔적으로 그릇 세 개를 섞는 놀이에서 세 판을 모두 맞혀야 승부에서 이긴다. ${lnk(entries[1], '은/는')} 멧돼지가 남기는 흔적으로 가위바위보에서 먼저 두 번 이기면 된다. 두 승부 모두 이기면 그날 가져간 작물을 되찾고 해당 밤손님은 이틀 밤 동안 오지 않으며, 져도 더 잃는 것은 없다.`];

const digCompare = (entries) => ['땅속 수집품 출현 빈도', `${list(entries.map(ref))} 순서로 점점 드물게 나온다. 셋 모두 삽으로 빈 밭을 완전히 메우는 순간 낮은 확률로 나오고, 재료나 코인은 주지 않으며 도감과 박물관 전시를 채운다. 한 번 등록한 수집품은 다시 나오지 않으니 남은 종류가 줄어들수록 더 드문 종에 집중하게 된다.`];

const riverCompare = (entries) => ['강 수집품별 보상', `보상은 ${list(entries.map(e => `${ref(e)} ${fact(e, '얻는 것')}${fact(e, '시간') ? ' (밤에만 등장)' : ''}`))} 순이다. 코스를 마치면 건진 수집품이 보상으로 바뀌므로 필요한 재료가 무엇인지에 따라 건질 대상을 정하면 된다. 하루에 세 번까지 탈 수 있으니 낮과 밤을 섞어 출발하면 모든 수집품을 만날 수 있다.`];

const spiritCompare = (entries) => {
  const fog = entries.filter(e => fact(e, '날씨') === '안개');
  return ['정령별 특징과 조건', `정령 ${entries.length}종 가운데 ${refs(fog)}만 안개 낀 날에 나타나고 나머지는 날씨와 상관없이 안개 낀 숲에서 만날 수 있다. 느리고 덩치가 큰 정령은 박자를 맞추기 쉽고, 빠르고 작은 정령은 재빠르게 세계수로 달려든다. 황금 정령은 달래면 다른 정령보다 두 배 많은 빛 보상을 준다.`];
};

const WEATHER_BRIEF = {
  clear: '특별한 보정이 없는 평범한 날',
  rain: '밭이 저절로 자라고 호수 입질이 빨라지는 날',
  snow: '벌목할 때 목재가 더 나오는 날',
  fog: '보석과 황금 정령과 낮 반딧불이가 나오는 날',
};
const weatherCompare = (entries) => ['날씨별 효과 요약', `${list(entries.map(e => `${lnk(e, '은/는')} ${WEATHER_BRIEF[e.id]}`))}이다. 날씨는 날짜로 정해져 접속한 모든 사람이 같은 날씨를 겪으므로 하루를 시작할 때 먼저 확인하고, 그날만 가능한 활동을 우선순위에 올리면 낭비가 없다.`];

const visitorCompare = (entries) => ['방문객별 필요한 환경', `${list(entries.map(e => `${lnk(e, '은/는')} ${josa(fact(e, '필요한 환경'), '이/가')} 있어야 ${fact(e, '나타나는 때')}에 찾아오고${fact(e, '싫어하는 것') ? `, ${josa(fact(e, '싫어하는 것'), '이/가')} 있으면 오지 않는다` : ''}`))}. 환경 수치는 서로 달라서 한 종류씩 차근차근 완성하는 것이 좋다.`];

const COMPARE = {
  fish: fishCompare, crop: cropCompare, ore: oreCompare, cook: cookCompare, npc: npcCompare, forage: forageCompare,
  bug: bugCompare, track: trackCompare, dig: digCompare, river: riverCompare, spirit: spiritCompare, weather: weatherCompare, visitor: visitorCompare,
};

export function catData(cat, entries) {
  return [overview(cat, entries), conditionSection(entries), COMPARE[cat.id]?.(entries)].filter(Boolean);
}
