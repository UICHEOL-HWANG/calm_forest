import { josa } from './faq.mjs';
import { RECIPE_STEPS, STEP_TIP } from './guides-tips.mjs';

const COND_KEYS = ['계절', '날씨', '시간', '깊이'];

export const fact = (e, k) => e.facts.find(f => f[0] === k)?.[1];
export const num = (s) => Number.parseInt(String(s ?? '').replace(/[^0-9]/g, ''), 10);
export const ref = (e) => `[[${e.cat}/${e.id}]]`;
export const refs = (items) => items.map(ref).join(', ');
export const lnk = (e, pair) => ref(e) + josa(e.name, pair).slice(e.name.length);
export const list = (items) => items.join(', ');
export const lnkAll = (items, pair) => list([...items.slice(0, -1).map(ref), lnk(items[items.length - 1], pair)]);
export const sibs = (e, all) => all.filter(x => x.cat === e.cat && x !== e);

const WEATHER_WORD = { 비: '비 오는 날', 눈: '눈 오는 날', 안개: '안개 낀 날', 맑음: '맑은 날' };
const ORD = ['', '첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한'];

export const weatherWords = (e) => (fact(e, '날씨') ?? '').split(' · ').filter(Boolean).map(w => WEATHER_WORD[w] ?? w);

export const condText = (e) => {
  const parts = [];
  const season = fact(e, '계절');
  const weather = weatherWords(e);
  const time = fact(e, '시간');
  const depth = fact(e, '깊이');
  if (depth) parts.push(`${depth}에서만`);
  if (season) parts.push(`${season}에만`);
  if (weather.length) parts.push(`${weather.join('이나 ')}에만`);
  if (time) parts.push(time === '하루 한 마리' ? '하루 한 마리만' : `${time}에`);
  return parts.length ? parts.join(' ') : '조건 없음';
};

export const hasCond = (e) => COND_KEYS.some(k => fact(e, k));
export const priceOf = (e, key = '판매가') => {
  const v = fact(e, key);
  return /\d/.test(v ?? '') ? v : null;
};

export const byGroup = (items, keyFn) => {
  const out = new Map();
  for (const it of items) {
    const k = keyFn(it);
    out.set(k, [...(out.get(k) ?? []), it]);
  }
  return out;
};

export const rankIn = (items, fn, target, hi, lo) => {
  const v = fn(target);
  const above = items.filter(x => fn(x) > v).length;
  const below = items.filter(x => fn(x) < v).length;
  if (above === 0) return `가장 ${hi}`;
  if (below === 0) return `가장 ${lo}`;
  return `${nth(above + 1)}로 ${hi}`;
};
export const nth = (n) => `${ORD[n] ?? n} 번째`;

const reward = (e) => {
  const text = fact(e, '보상') ?? '';
  return { fish: num(text.match(/물고기 (\d+)/)?.[1]), coin: num(text.match(/코인 (\d+)/)?.[1]) };
};
const maxKg = (e) => num((fact(e, '무게') ?? '').split('~')[1]);
export const isSea = (e) => e.cat === 'fish' && fact(e, '장소') === '바다터 부두';
export const isLake = (e) => e.cat === 'fish' && fact(e, '장소') === '마을 낚시터';

export const parseEffect = (e) => {
  const m = (fact(e, '효과') ?? '').match(/^(\d+)초 (.+)$/);
  const clean = (t) => t.replace('확률↑', '확률 상승');
  return m ? { sec: Number(m[1]), label: clean(m[2]) } : { sec: 0, label: clean(fact(e, '효과') ?? '') };
};
const ingredientKinds = (e) => (fact(e, '재료') ?? '').split(' · ').map(s => s.replace(/ \d+$/, ''));
const questsOf = (e) => (fact(e, '의뢰') ?? '').split(' · ').filter(Boolean);
const withWord = (all, key, word, skip) => all.filter(x => x !== skip && (fact(x, key) ?? '').split(' · ').includes(word));

const fishEntry = (e, all) => {
  if (isLake(e)) {
    const lake = all.filter(isLake);
    const others = lake.filter(x => x !== e);
    const prices = new Set(lake.map(x => fact(x, '판매가')));
    const seasonal = lake.filter(x => fact(x, '계절'));
    const always = lake.filter(x => !fact(x, '계절') && !fact(x, '날씨'));
    const rain = lake.filter(x => fact(x, '날씨') === '비');
    const season = fact(e, '계절');
    const calendar = season
      ? `${season}에는 호수에서 ${list([...always, e].map(ref))} 등을 낚을 수 있고, ${josa(e.name, '은/는')} 이 계절에만 올라온다. 다른 계절에는 ${list(seasonal.filter(x => x !== e).map(ref))}가 각자의 계절에 한 종씩 이 자리를 채운다.`
      : fact(e, '날씨')
        ? `비 오는 날 호수에서는 ${list(always.map(ref))}에 더해 ${e.name}까지 노릴 수 있다. 계절 한정 물고기 ${list(seasonal.map(ref))}는 각자의 계절에만 나오므로, 비 오는 날과 계절이 겹치면 한 번에 여러 종을 채울 수 있다.`
        : `${josa(e.name, '은/는')} 계절과 날씨에 상관없이 언제든 낚을 수 있다. 여기에 계절마다 ${list(seasonal.map(ref))} 가운데 한 종이 더해지고 비 오는 날에는 ${list(rain.map(ref))}가 더해져서, 호수 물고기 ${lake.length}종이 시기에 따라 번갈아 올라온다.`;
    return [
      `${lnk(e, '은/는')} 호수 물고기 ${lake.length}종 가운데 하나다. 호수 물고기의 판매가는 ${prices.size === 1 ? `모두 ${josa([...prices][0], '으로/로')} 같아서 값으로는 구분되지 않는다` : '종마다 다르다'}. 그래서 낚은 뒤의 선택은 도감 등록, 요리 재료, 의뢰 제출처럼 쓰임을 기준으로 정하는 편이 낫다.`,
      `${e.name}의 조건이 맞지 않는 날에는 ${list(others.map(x => `${ref(x)}(${condText(x)})`))} 가운데 그날 낚이는 종을 노려 보자. 호수 낚시는 한 번 던질 때마다 올라오는 종이 달라지므로, 조건이 겹치는 날에는 여러 종을 한꺼번에 채울 수 있다.`,
      calendar,
    ];
  }
  const sea = all.filter(isSea);
  const other = sea.filter(x => x !== e);
  const bySea = (word) => sea.filter(x => (fact(x, '시간') ?? '').includes(word));
  const slots = (x) => (fact(x, '시간') ?? '').split(' · ');
  const sameTime = other.filter(x => slots(x).some(t => slots(e).includes(t)));
  const r = reward(e);
  const kgRank = rankIn(sea, maxKg, e, '무겁다', '가볍다');
  const coinRank = rankIn(sea, x => reward(x).coin, e, '많다', '적다');
  return [
    `${lnk(e, '은/는')} 바다터 ${sea.length}종 가운데 최대 무게가 ${kgRank}. 보상은 물고기 ${r.fish}개와 ${r.coin}코인이며, 코인 보상은 ${coinRank}. 같은 바다 물고기라도 무게와 보상이 크게 달라 어떤 종이 필요한지 정하고 시간대를 맞추면 효율이 좋다.`,
    `바다터 물고기는 ${list(other.map(x => `${ref(x)}(${fact(x, '시간')}, ${fact(x, '무게')})`))} 등으로 나뉜다. ${sameTime.length ? `${josa(e.name, '과/와')} 같은 시간대에 나오는 종은 ${refs(sameTime)}다.` : `${josa(e.name, '과/와')} 같은 시간 조건을 가진 종은 따로 없어, 이 물고기를 노릴 때는 시간부터 맞추는 것이 중요하다.`} 낚은 물고기는 무게를 기록한 뒤 바다로 돌려보내고 물고기와 코인을 받는 방식이다.`,
    `${josa(e.name, '은/는')} ${condText(e)} 낚을 수 있다. 시간대로 나누면 낮에 낚을 수 있는 종은 ${refs(bySea('낮'))}이고, 밤에 낚을 수 있는 종은 ${refs(bySea('밤'))}이다. 부두에 서기 전에 지금 시간대에 노릴 수 있는 종이 무엇인지 확인하고, 낮에 가볍게 연습한 뒤 밤에 무거운 종에 도전하는 순서가 안정적이다.`,
  ];
};

const cropEntry = (e, all) => {
  const adv = sibs(e, all).filter(x => fact(x, '종류') === '고급 작물');
  const basic = sibs(e, all).filter(x => fact(x, '종류') === '기본 작물');
  if (fact(e, '종류') === '고급 작물') {
    const price = num(fact(e, '판매가'));
    const seed = num(fact(e, '씨앗'));
    const basicPrice = num(fact(basic[0], '판매가'));
    const advAll = [e, ...adv];
    return [
      `${lnk(e, '은/는')} 씨앗이 ${fact(e, '씨앗')}, 판매가가 ${fact(e, '판매가')}이라 씨앗값과 판매가의 차이가 ${price - seed}🪙이다. 판매가는 고급 작물 ${advAll.length}종 가운데 ${rankIn(advAll, x => num(fact(x, '판매가')), e, '높고', '낮고')}, 기본 작물 판매가 ${basicPrice}🪙의 ${Math.round(price / basicPrice)}배 수준이다.`,
      `${josa(e.name, '은/는')} ${fact(e, '성장 단계')}를 거쳐 자라며 물을 ${fact(e, '물 주기')} 줘야 한다. 같은 고급 작물인 ${list(adv.map(x => `${ref(x)}(${fact(x, '성장 단계')}, 물 ${fact(x, '물 주기')})`))} 등과 비교해 밭 관리에 드는 손이 얼마나 되는지 따져 보고 심을 순서를 정하면 좋다.`,
    ];
  }
  return [
    `${lnk(e, '은/는')} 기본 작물 ${basic.length + 1}종 가운데 하나로 판매가는 ${fact(e, '판매가')}이다. 기본 씨앗 하나에서 ${list([e, ...basic].map(x => x.name))} 가운데 무작위로 자라므로 원하는 종만 골라 키울 수는 없다.`,
    `${josa(e.name, '은/는')} 판매가가 ${josa(fact(e, '판매가'), '으로/로')} 값이 낮은 편이다. 더 값진 작물이 필요하다면 상점에서 씨앗을 사는 고급 작물 ${list(adv.map(x => `${ref(x)}(판매가 ${fact(x, '판매가')})`))} 등이 있다. 기본 작물은 씨앗이 넉넉히 돌아오고 고급 작물은 한 번에 여러 개를 거두는 차이가 있어, 밭을 처음 키울 때는 기본 작물로 시작해 코인을 모은 뒤 고급 작물로 넘어가는 순서가 자연스럽다.`,
  ];
};

const oreEntry = (e, all) => {
  const ores = all.filter(x => x.cat === 'ore');
  const priced = ores.filter(x => priceOf(x));
  const others = ores.filter(x => x !== e);
  const describe = (x) => `${ref(x)}(${condText(x)}${priceOf(x) ? `, ${priceOf(x)}` : ''})`;
  return [
    priceOf(e)
      ? `${lnk(e, '은/는')} 판매가가 ${josa(priceOf(e), '으로/로')}, 광물 ${priced.length}종 가운데 ${rankIn(priced, x => num(priceOf(x)), e, '비싸다', '저렴하다')}. 비싼 광물은 조건이 까다롭고 흔한 광물은 건축 재료로 계속 필요하니, 팔기 전에 앞으로 필요한 수량을 먼저 헤아려 보자.`
      : `${lnk(e, '은/는')} 정보 표에 판매가가 따로 없는 광물이다. 팔아서 코인으로 바꾸기보다 조건과 쓰임새를 먼저 확인하고 다루는 편이 낫다.`,
    `같은 채굴 동굴에서 나오는 광물은 ${list(others.map(describe))} 등이다. 조건이 있는 광물은 날씨나 층수가 맞아야 하므로, 같은 날 여러 광물을 노린다면 조건이 겹치는 것부터 채굴하자.`,
  ];
};

const stepsParagraph = (e) => {
  const steps = RECIPE_STEPS[e.id] ?? [];
  if (!steps.length) return null;
  const tips = steps.map(st => `${st}는 ${STEP_TIP[st]}`);
  return `${josa(e.name, '은/는')} 자유주방에서 ${steps.join(', ')} 순서로 미니게임을 진행해 만든다. ${tips.join('. ')}. ${steps.length > 1 ? '뒤 단계로 갈수록 판정 구간이 좁아지므로 마지막 단계에서 집중력을 아끼는 편이 좋다.' : '단계가 하나뿐이라 처음 요리를 익히기에 알맞다.'}`;
};

const cookEntry = (e, all) => {
  const cooks = all.filter(x => x.cat === 'cook');
  const eff = parseEffect(e);
  const sameEffect = cooks.filter(x => x !== e && parseEffect(x).label === eff.label).sort((a, b) => parseEffect(a).sec - parseEffect(b).sec);
  const stars = fact(e, '난이도');
  const sameStars = cooks.filter(x => x !== e && fact(x, '난이도') === stars);
  const kinds = ingredientKinds(e);
  const shared = cooks.filter(x => x !== e && ingredientKinds(x).some(k => kinds.includes(k)));
  const price = num(fact(e, '카페 판매가'));
  const priceRank = rankIn(cooks, x => num(fact(x, '카페 판매가')), e, '비싸다', '저렴하다');
  return [
    sameEffect.length
      ? `${lnk(e, '은/는')} ${eff.label} 효과를 ${eff.sec}초 동안 주는 요리다. 같은 효과를 내는 요리는 ${list(sameEffect.map(x => `${ref(x)}(${parseEffect(x).sec}초)`))} 등이니, 필요한 지속 시간에 맞춰 골라 만들면 된다.`
      : `${lnk(e, '은/는')} ${eff.label} 효과를 ${eff.sec}초 동안 주는 요리다. 이 효과를 내는 요리는 ${e.name} 하나뿐이라, 이 효과가 필요한 때에는 다른 요리로 대신할 수 없다.`,
    `난이도 ${stars}에 카페 판매가 ${josa(`${price}🪙`, '으로/로')}, 요리 ${cooks.length}종 가운데 카페 값이 ${priceRank}. ${sameStars.length ? `같은 난이도의 요리로는 ${refs(sameStars)} 등이 있다.` : '같은 난이도의 다른 요리는 없다.'}`,
    stepsParagraph(e),
    `재료는 ${fact(e, '재료')}이다. ${shared.length ? `같은 종류의 재료를 쓰는 ${refs(shared.slice(0, 6))} 같은 요리와 재료를 함께 모아 두면 여러 요리를 연달아 만들 수 있다.` : '다른 요리와 겹치지 않는 재료라 따로 준비해야 한다.'}`,
  ];
};

const npcEntry = (e, all) => {
  const people = all.filter(x => x.cat === 'npc');
  const residents = people.filter(x => fact(x, '구분') === '마을 주민');
  const guests = people.filter(x => fact(x, '구분') === '카페 손님');
  if (fact(e, '구분') === '카페 손님') {
    const others = guests.filter(x => x !== e);
    return [
      `${lnk(e, '은/는')} 마을에 살지 않고 카페에만 찾아오는 손님이다. 카페 손님은 모두 ${guests.length}종이고 ${refs(others)} 등이 함께 도감에 실려 있다. 손님 구성은 날마다 바뀌므로 오늘 오지 않았다면 다음 날 다시 확인해야 한다.`,
      `${josa(e.name, '은/는')} 머리 위 말풍선으로 요리를 주문한다. 주문한 요리를 대접하면 코인을 받고, 그날 손님을 모두 대접하면 보너스가 붙는다. 처음 대접한 손님은 도감에 등록되니 새 손님이 보이면 주문을 확인하고 찬장에 있는 요리를 바로 내줄 수 있는지 살펴보자.`,
    ];
  }
  const quests = questsOf(e);
  if (!quests.length) {
    return [
      `${lnk(e, '은/는')} 정해진 의뢰 목록 대신 날마다 새 의뢰를 내주는 주민이다. 마을 주민 ${residents.length}명 가운데 의뢰가 매일 바뀌는 주민은 ${e.name} 하나이며, 같은 날에는 모든 사람에게 같은 의뢰가 나온다.`,
      `다른 주민은 의뢰가 순서대로 이어지지만 ${e.name}의 의뢰는 하루 단위로 새로 나온다. 일일 의뢰를 모두 끝내면 특별 의뢰가 하나 더 열리므로, 하루에 한 번은 꼭 말을 걸어 오늘 할 일을 확인하자.`,
    ];
  }
  const withQuests = residents.filter(x => questsOf(x).length);
  const counts = withQuests.filter(x => x !== e).map(x => `${ref(x)} ${questsOf(x).length}건`);
  return [
    `${lnk(e, '은/는')} 의뢰가 ${quests.length}건 있고 ${list(quests.map(q => `'${q}'`))} 순서로 이어진다. 의뢰 목록이 있는 주민 ${withQuests.length}명 가운데 의뢰 수로는 ${rankIn(withQuests, x => questsOf(x).length, e, '많은 편이다', '적은 편이다')}.`,
    `다른 주민의 의뢰 수는 ${list(counts)}이다. 한 주민의 의뢰만 이어서 끝내는 것보다 여러 주민의 의뢰를 번갈아 진행하면 재료를 한 번 모은 뒤 여러 부탁에 나눠 쓸 수 있어 효율적이다.`,
  ];
};

const forageEntry = (e, all) => {
  const items = all.filter(x => x.cat === 'forage');
  const others = items.filter(x => x !== e);
  const same = new Set(items.map(x => fact(x, '판매가'))).size === 1;
  return [
    `${lnk(e, '은/는')} 한 번 주울 때 ${josa(fact(e, '얻는 양'), '을/를')} 주고 판매가는 ${fact(e, '판매가')}이다. 채집물 ${items.length}종의 판매가는 ${same ? '모두 같아서' : '종마다 달라서'} 요리와 의뢰에 필요한 몫을 먼저 남기고 판매 여부를 정하면 된다.`,
    `같은 채집 숲에서 줍는 ${list(others.map(x => `${ref(x)}(${condText(x)}, ${fact(x, '얻는 양')})`))} 등도 함께 모아 두면 한 번의 외출로 요리 재료를 고루 채울 수 있다. 조건이 붙은 채집물은 때를 맞춰 따로 찾아가야 한다.`,
  ];
};

const bugEntry = (e, all) => {
  const bugs = all.filter(x => x.cat === 'bug');
  const others = bugs.filter(x => x !== e);
  const weather = weatherWords(e);
  const same = new Set(bugs.map(x => fact(x, '판매가'))).size === 1;
  return [
    `${lnk(e, '은/는')} 반딧불이 ${bugs.length}종 가운데 하나다. 반딧불이는 ${same ? `종류와 상관없이 판매가가 ${josa(fact(e, '판매가'), '으로/로')} 같으니` : '종마다 판매가가 달라'} 값보다 도감과 의뢰, 촘촘한 포충망 재료로서의 쓰임을 기준으로 삼으면 된다.`,
    `${weather.length ? `${josa(e.name, '은/는')} ${weather.join('이나 ')}의 밤에만 만날 수 있다. ` : `${josa(e.name, '은/는')} 날씨 조건 없이 밤에 계곡을 찾으면 만날 수 있다. `}같은 계곡의 ${list(others.map(x => `${ref(x)}(${weatherWords(x).length ? `${weatherWords(x).join('이나 ')} 필요` : '날씨 필요 없음'})`))} 등과 함께 노리면 밤 한 번에 여러 종을 채울 수 있다.`,
  ];
};

const WEATHER_KEY = { 맑은: '맑음', 비: '비', 눈: '눈', 안개: '안개' };
const WEATHER_EFFECT = {
  clear: '특별한 보정이 없이 모든 일이 평소대로 돌아가는 날이다. 밭은 물을 줘야 자라고 낚시와 채굴도 기본 확률을 따른다.',
  rain: '물을 주지 않아도 밭 작물이 저절로 자라고 호수 입질이 빨라지는 날이다. 채집 숲에서는 버섯이 잘 나오고 나룻배를 타면 별조각을 조금 더 모을 수 있다.',
  snow: '벌목할 때 목재가 더 나오는 날이다. 집 짓기나 증축처럼 목재가 많이 드는 일을 몰아서 하기 좋다.',
  fog: '채굴 동굴에서 보석이 나오고 낮에도 반딧불이가 떠오르는 날이다. 안개 낀 숲에서는 정령 무리마다 한 마리씩 더 나와 평소보다 바쁘다.',
};
const WEATHER_MUSEUM = {
  rain: '박물관 일층 가운데 특별 진열대에는 이날 처음 낚은 물고기가 놓일 수 있다.',
  snow: '박물관 일층 가운데 특별 진열대에는 이날 직접 거둔 작물이 놓일 수 있다.',
  fog: '박물관 일층 가운데 특별 진열대에는 이날 처음 주운 채집물이 놓일 수 있다.',
};
const CAT_LABEL = { fish: '물고기', ore: '광물', bug: '반딧불이', spirit: '정령', visitor: '방문객', forage: '채집물', river: '강 수집품' };
const weatherEntry = (e, all) => {
  const word = Object.entries(WEATHER_KEY).find(([k]) => e.name.startsWith(k))?.[1];
  const hits = withWord(all, '날씨', word, e).filter(x => x.cat !== 'weather');
  const groups = [...byGroup(hits, x => x.cat)].map(([c, v]) => `${CAT_LABEL[c] ?? c} ${refs(v)}`);
  return [
    `${lnk(e, '은/는')} ${WEATHER_EFFECT[e.id]} ${WEATHER_MUSEUM[e.id] ?? ''}`.trim(),
    groups.length
      ? `도감 정보 표에 ${e.name} 조건이 적힌 항목은 ${list(groups)}이다. 이날에는 평소에 만날 수 없는 수집품을 한꺼번에 노릴 수 있으니 날씨를 확인한 뒤 하루의 순서를 정하자.`
      : `도감 정보 표에는 ${e.name}에만 나오는 수집품이 따로 적혀 있지 않다. 대신 날씨 조건이 없는 일을 차분히 진행하기 좋으며, 특별한 날씨가 오면 그날 조건이 붙은 수집품을 먼저 챙기면 된다.`,
    `날씨는 ${refs(sibs(e, all))}까지 모두 네 종이고, 날짜로 정해져 그날 접속한 모든 사람이 같은 날씨를 겪는다. 네 종을 모두 겪으면 전천후 탐험가 배지를 받으므로 아직 겪지 못한 날씨가 있다면 그날 접속해 도감부터 채우자.`,
  ];
};

const spiritEntry = (e, all) => {
  const spirits = all.filter(x => x.cat === 'spirit');
  const fogOnly = spirits.filter(x => fact(x, '날씨') === '안개');
  const others = spirits.filter(x => x !== e);
  return [
    `${lnk(e, '은/는')} 정령 ${spirits.length}종 가운데 하나로, ${fact(e, '날씨') ? '안개 낀 날에만 나타난다' : '날씨와 상관없이 안개 낀 숲의 정령 무리에서 만날 수 있다'}. 안개 날씨가 필요한 정령은 ${refs(fogOnly)}뿐이고 나머지 ${spirits.length - fogOnly.length}종은 날씨와 관계없이 찾아온다.`,
    `같은 숲의 ${refs(others)} 등도 함께 달래면 한 번의 방문으로 도감을 여러 칸 채울 수 있다. 정령을 달랠 때마다 빛 보상을 받고, 박자를 놓쳐도 잃는 것이 없다. 박자에 자신이 없다면 연습 모드로 먼저 익히고 도전하자.`,
  ];
};

const TRACK_ANIMAL = {
  fur_tuft: { name: '너구리', sub: '너구리', rule: '그릇 세 개를 섞는 놀이에서 세 판을 모두 맞혀야' },
  acorn_drop: { name: '멧돼지', sub: '멧돼지', rule: '가위바위보에서 먼저 두 번 이겨야' },
};
const trackEntry = (e, all) => {
  const a = TRACK_ANIMAL[e.id];
  const other = sibs(e, all)[0];
  return [
    `${lnk(e, '은/는')} ${josa(a.name, '이/가')} 밭에 남기는 흔적이다. 조사를 마치면 ${josa(a.name, '과/와')}의 승부가 열리고, ${a.rule} 이긴다. 이기면 그날 가져간 작물을 전부 되찾고 ${josa(a.name, '은/는')} 이틀 밤 동안 오지 않으며, 져도 더 잃는 것은 없다.`,
    `밤손님 흔적은 ${refs([e, other])} 두 종뿐이고, 둘 다 밭 작물을 도둑맞은 다음 날 조사 표시로 나타난다. 허수아비나 울타리를 두면 밤손님이 오지 않는 대신 흔적도 생기지 않으므로, 도감을 채우려면 한 번은 밤손님이 다녀가야 한다는 점을 알아 두자.`,
  ];
};

const DIG_RANK = { worm: '가장 자주 나오는', shard: '두 번째로 자주 나오는', old_coin: '가장 드물게 나오는' };
const digEntry = (e, all) => {
  const others = sibs(e, all);
  return [
    `${lnk(e, '은/는')} 땅속 수집품 ${others.length + 1}종 가운데 ${DIG_RANK[e.id]} 종이다. 삽으로 빈 밭을 완전히 메우는 순간 낮은 확률로 나오며, 재료나 코인은 주지 않고 도감과 박물관 전시만 채운다.`,
    `땅속 수집품은 ${refs([e, ...others])} 세 종이다. 한 번 등록한 수집품은 다시 나오지 않으므로 이미 찾은 종이 있다면 남은 종류만 노리면 된다. 넓은 삽을 마련하면 한 번에 빈 밭을 메울 수 있어 시도 횟수를 크게 늘릴 수 있다.`,
  ];
};

const riverEntry = (e, all) => {
  const items = all.filter(x => x.cat === 'river');
  const others = items.filter(x => x !== e);
  return [
    `${lnk(e, '은/는')} 강 수집품 ${items.length}종 가운데 하나로, 건지면 ${josa(fact(e, '얻는 것'), '을/를')} 보상으로 받는다. ${fact(e, '시간') ? '밤에만 등장하므로 밤 코스에 출발해야 만날 수 있다.' : '낮과 밤 모두 등장해 언제든 노릴 수 있다.'}`,
    `같은 코스에서 만나는 ${list(others.map(x => `${ref(x)}(${fact(x, '얻는 것')}${fact(x, '시간') ? ', 밤 한정' : ''})`))} 등도 함께 건지면 한 번의 운항으로 여러 보상을 챙길 수 있다. 하루에 탈 수 있는 횟수가 세 번이라 어떤 보상이 필요한지 정한 뒤 출발하는 편이 낫다.`,
  ];
};

const visitorEntry = (e, all) => {
  const vs = all.filter(x => x.cat === 'visitor');
  const others = vs.filter(x => x !== e);
  const block = fact(e, '싫어하는 것');
  return [
    `${lnk(e, '은/는')} ${josa(fact(e, '필요한 환경'), '이/가')} 갖춰진 텃밭에 ${fact(e, '나타나는 때')}에 찾아온다. ${block ? `${block} 요소가 있으면 오지 않으므로 이 장식은 멀리 두어야 한다.` : '싫어하는 요소가 따로 없어 필요한 환경만 갖추면 된다.'}`,
    `텃밭 방문객은 ${refs(vs)} 네 종이고 필요한 환경이 모두 다르다. ${list(others.map(x => `${x.name}(${fact(x, '필요한 환경')})`))}처럼 갖춰야 할 환경이 서로 다르므로, 한 번에 모두 부르려면 장식의 종류와 위치를 나누어 배치해야 한다.`,
  ];
};

const DISPATCH = {
  fish: fishEntry, crop: cropEntry, ore: oreEntry, cook: cookEntry, npc: npcEntry, forage: forageEntry,
  bug: bugEntry, weather: weatherEntry, spirit: spiritEntry, track: trackEntry, dig: digEntry, river: riverEntry, visitor: visitorEntry,
};

export function entryExtra(entry, all) {
  return (DISPATCH[entry.cat]?.(entry, all) ?? []).filter(Boolean);
}
