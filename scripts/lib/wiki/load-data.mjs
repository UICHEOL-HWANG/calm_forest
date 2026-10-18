import { register } from 'node:module';

register('./three-hook.mjs', import.meta.url);

export const WIKI_DATA_FILES = Object.freeze([
  'js/data/dex.js', 'js/data/catalog.js', 'js/data/places.js', 'js/dex-gates.js', 'js/museum.js',
  'js/habitat.js', 'js/data/npcs.js', 'js/farm-crops.js', 'js/season.js', 'js/i18n-en.js', 'scripts/lib/wiki',
]);

export const WIKI_CATS = Object.freeze([
  { id: 'fish', name: '물고기', ico: '🐟', place: '마을 낚시터' },
  { id: 'crop', name: '작물', ico: '🥕', place: '밭' },
  { id: 'ore', name: '광물', ico: '🪨', place: '동굴' },
  { id: 'cook', name: '요리', ico: '🍳', place: '부엌' },
  { id: 'npc', name: '주민', ico: '🧑‍🌾', place: '마을' },
  { id: 'forage', name: '채집물', ico: '🍄', place: '채집 숲' },
  { id: 'bug', name: '반딧불이', ico: '🌟', place: '반딧불이 계곡' },
  { id: 'track', name: '밤손님 흔적', ico: '🐾', place: '밭 둘레' },
  { id: 'dig', name: '땅속 보물', ico: '🪏', place: '빈 땅' },
  { id: 'river', name: '강가 줍기', ico: '🛶', place: '나루터 강' },
  { id: 'spirit', name: '안개 정령', ico: '🌫️', place: '안개 낀 숲' },
  { id: 'weather', name: '날씨', ico: '🌦️', place: '마을' },
  { id: 'visitor', name: '텃밭 방문객', ico: '🦋', place: '내 텃밭' },
]);

const RES_KO = { crop: '작물', fish: '물고기', forage: '채집물', egg: '달걀', flour: '밀가루', juice: '과즙', seed: '씨앗', wood: '목재', stone: '돌', coal: '석탄', gem: '보석', coins: '코인', bug: '반딧불이' };
const WEATHER_KO = { clear: '맑음', rain: '비', snow: '눈', fog: '안개' };
const WHEN_KO = { day: '낮', night: '밤', rain: '비 오는 날' };

const resList = (obj) => Object.entries(obj || {}).map(([k, n]) => `${RES_KO[k] ?? k} ${n}`).join(' · ');

function gateFacts(gate, seasonName) {
  if (!gate) return [];
  const out = [];
  if (gate.season?.length) out.push(['계절', gate.season.map(seasonName).join(' · ')]);
  if (gate.weather?.length) out.push(['날씨', gate.weather.map(w => WEATHER_KO[w] ?? w).join(' · ')]);
  if (gate.night) out.push(['시간', '밤']);
  return out;
}

export async function loadWiki() {
  const [{ DEX }, catalog, places, { DEX_GATES }, { MUSEUM_FLOORS }, habitat, { NPCS }, { ADV_CROPS }, { SEASONS }, { EN }] = await Promise.all([
    import('../../../js/data/dex.js'),
    import('../../../js/data/catalog.js'),
    import('../../../js/data/places.js'),
    import('../../../js/dex-gates.js'),
    import('../../../js/museum.js'),
    import('../../../js/habitat.js'),
    import('../../../js/data/npcs.js'),
    import('../../../js/farm-crops.js'),
    import('../../../js/season.js'),
    import('../../../js/i18n-en.js'),
  ]);
  const seasonName = (id) => SEASONS.find(s => s.id === id)?.name ?? id;
  const museumOf = (cat) => MUSEUM_FLOORS.find(f => f.cats.includes(cat))?.name ?? null;
  const sell = catalog.SELL_PRICE;

  const extra = {
    fish: (it) => {
      const out = [['장소', '마을 낚시터'], ...gateFacts(DEX_GATES.fish?.[it.id], seasonName)];
      if (sell.fish) out.push(['판매가', `${sell.fish}🪙`]);
      return out;
    },
    crop: (it) => {
      const adv = ADV_CROPS.find(c => c.id === it.id);
      if (!adv) return [['종류', '기본 작물'], ['장소', '밭'], ['판매가', `${sell.crop}🪙`]];
      return [['종류', '고급 작물'], ['장소', '밭'], ['성장 단계', `${adv.stages}단계`], ['물 주기', `${adv.waters}번`], ['씨앗', `${adv.seedCoin}🪙`], ['판매가', `${adv.price}🪙`]];
    },
    ore: (it) => [['장소', '동굴'], ...gateFacts(DEX_GATES.ore?.[it.id], seasonName), ['판매가', `${sell[it.id]}🪙`]],
    cook: (it) => {
      const r = catalog.RECIPES.find(x => x.id === it.id);
      return [['재료', resList(r.cost)], ['효과', r.desc], ['난이도', '★'.repeat(r.stages.length)], ['카페 판매가', `${catalog.CAFE_PAY[r.id]}🪙`]];
    },
    npc: (it) => {
      const n = NPCS.find(x => x.id === it.id);
      if (!n) return [['구분', '카페 손님'], ['장소', '카페']];
      const qs = (n.quests || []).map(q => q.title);
      return [['구분', '마을 주민'], ...(qs.length ? [['의뢰', qs.join(' · ')]] : [])];
    },
    forage: (it) => {
      const f = places.FORAGE_KINDS.find(x => x.id === it.id);
      return [['장소', '채집 숲'], ...gateFacts(DEX_GATES.forage?.[it.id], seasonName), ['얻는 양', resList(f?.give)], ['판매가', `${sell.forage}🪙`]];
    },
    bug: (it) => [['장소', '반딧불이 계곡'], ['시간', '밤'], ...gateFacts(DEX_GATES.bug?.[it.id], seasonName).filter(f => f[0] !== '시간'), ['판매가', `${sell.bug}🪙`]],
    track: () => [['장소', '밭 둘레'], ['시간', '밤손님이 다녀간 다음 날']],
    dig: () => [['장소', '빈 땅'], ['도구', '삽']],
    river: (it) => {
      const r = places.RIVER_PICKS.find(x => x.id === it.id);
      return [['장소', '나루터 강'], ...(r?.night ? [['시간', '밤']] : []), ['얻는 것', resList(r?.give)]];
    },
    spirit: (it) => {
      const s = places.SPIRITS.find(x => x.id === it.id);
      return [['장소', '안개 낀 숲'], ...(s?.fog ? [['날씨', '안개']] : [])];
    },
    weather: () => [['장소', '마을 전체']],
    visitor: (it) => {
      const v = habitat.VISITORS.find(x => x.id === it.id);
      const tags = (o) => Object.entries(o || {}).map(([k, n]) => `${habitat.TAG_LABEL[k] ?? k} ${n}`).join(' · ');
      return [['장소', '내 텃밭'], ['필요한 환경', tags(v.need)], ...(v.block ? [['싫어하는 것', tags(v.block)]] : []), ['나타나는 때', WHEN_KO[v.when] ?? v.when]];
    },
  };

  const entries = [];
  for (const cat of WIKI_CATS) {
    for (const it of DEX[cat.id]) {
      entries.push({ cat: cat.id, id: it.id, name: it.name, nameEn: EN[it.name] ?? null, ico: it.ico, facts: extra[cat.id](it), museum: museumOf(cat.id) });
    }
    if (cat.id === 'fish') {
      for (const s of places.SEA_SPECIES) {
        const time = s.daily ? '하루 한 마리' : s.night ? '밤' : s.daylight ? '낮' : '낮 · 밤';
        entries.push({
          cat: 'fish', id: `sea_${s.id}`, name: s.name, nameEn: EN[s.name] ?? null, ico: s.ico, museum: null,
          facts: [['장소', '바다터 부두'], ['시간', time], ['무게', `${s.w[0]} ~ ${s.w[1]}kg`], ['보상', resList(s.give)]],
        });
      }
    }
  }
  return { cats: WIKI_CATS.map(c => ({ ...c })), entries };
}
