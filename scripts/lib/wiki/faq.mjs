const DIGIT_TAIL = { 0: 'ㅇ', 1: 'ㄹ', 2: '', 3: 'ㅁ', 4: '', 5: '', 6: 'ㄱ', 7: 'ㄹ', 8: 'ㄹ', 9: '' };
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function tail(word) {
  for (const ch of [...String(word)].reverse()) {
    if (/[0-9]/.test(ch)) return DIGIT_TAIL[ch];
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) return JONG[code % 28];
  }
  return '';
}

export function josa(word, pair) {
  const [withBatchim, without] = pair.split('/');
  const t = tail(word);
  const useWith = pair === '으로/로' ? t !== '' && t !== 'ㄹ' : t !== '';
  return word + (useWith ? withBatchim : without);
}

const WEATHER_PHRASE = { 맑음: '맑은 날', 비: '비 오는 날', 눈: '눈 오는 날', 안개: '안개 낀 날' };
const WHERE = {
  fish: ['낚여요', '낚여요'],
  crop: ['길러요', '길러요'],
  ore: ['캐요', '캘 수 있어요'],
  forage: ['주워요', '주울 수 있어요'],
  bug: ['잡아요', '잡을 수 있어요'],
  river: ['주워요', '주울 수 있어요'],
  spirit: ['만나요', '만날 수 있어요'],
};

const coin = (v) => v.replace(/🪙/g, '코인');

function onlyWhen(f) {
  const parts = [];
  if (f.계절) parts.push(f.계절);
  if (f.날씨) parts.push(f.날씨.split(' · ').map(w => WEATHER_PHRASE[w] ?? w).join(' · '));
  if (f.시간 === '밤' || f.시간 === '낮') parts.push(f.시간);
  return parts.length ? `${parts.join(', ')}에만 ` : '';
}

function whereQa(e, f) {
  const verbs = WHERE[e.cat];
  if (!verbs || !f.장소) return null;
  const daily = f.시간 === '하루 한 마리' ? ' 하루에 한 마리만 낚을 수 있어요.' : '';
  return [`${josa(e.name, '은/는')} 어디서 ${verbs[0]}?`, `${f.장소}에서 ${onlyWhen(f)}${verbs[1]}.${daily}`];
}

function specificQa(e, f) {
  const n = e.name;
  switch (e.cat) {
    case 'crop':
      if (f.종류 !== '고급 작물') return [];
      return [
        [`${n} 씨앗은 얼마예요?`, `씨앗은 ${josa(coin(f.씨앗), '이에요/예요')}.`],
        [`${josa(n, '은/는')} 물을 몇 번 줘야 해요?`, `${f['성장 단계']}로 자라고, 물을 ${f['물 주기']} 줘야 해요.`],
      ];
    case 'cook':
      return [
        [`${josa(n, '은/는')} 무엇으로 만들어요?`, `재료는 ${josa(f.재료, '이에요/예요')}.`],
        [`${josa(n, '을/를')} 먹으면 어떻게 돼요?`, `${f.효과} 효과가 있어요.`],
        [`${josa(n, '은/는')} 카페에서 얼마에 팔려요?`, `카페에서 ${coin(f['카페 판매가'])}에 팔려요.`],
      ];
    case 'npc':
      if (f.의뢰) return [[`${josa(n, '은/는')} 어떤 의뢰를 줘요?`, `${f.의뢰} 의뢰를 줘요.`]];
      if (f.구분 === '카페 손님') return [[`${josa(n, '은/는')} 어디서 만나요?`, '카페에 손님으로 찾아와요.']];
      return [];
    case 'visitor': {
      const block = f['싫어하는 것'] ? ` ${f['싫어하는 것']} 이상이면 오지 않아요.` : '';
      return [[`${josa(n, '은/는')} 어떻게 오게 해요?`, `텃밭 환경이 ${f['필요한 환경']} 이상이면 ${f['나타나는 때']}에 찾아와요.${block}`]];
    }
    case 'track':
      return [[`${josa(n, '은/는')} 언제 볼 수 있어요?`, `${f.시간} ${f.장소}에서 볼 수 있어요.`]];
    case 'dig':
      return [[`${josa(n, '은/는')} 어떻게 얻어요?`, `${josa(f.장소, '을/를')} ${josa(f.도구, '으로/로')} 파면 나와요.`]];
    case 'fish': {
      const out = [];
      if (f.무게) out.push([`${josa(n, '은/는')} 얼마나 무거워요?`, `무게는 ${f.무게} 사이예요.`]);
      if (f.보상) out.push([`${josa(n, '을/를')} 낚으면 무엇을 받아요?`, `${josa(f.보상, '을/를')} 받아요.`]);
      return out;
    }
    case 'forage':
      return f['얻는 양'] ? [[`${josa(n, '을/를')} 주우면 무엇을 얻어요?`, `${josa(f['얻는 양'], '을/를')} 얻어요.`]] : [];
    case 'river':
      return f['얻는 것'] ? [[`${josa(n, '을/를')} 주우면 무엇을 얻어요?`, `${josa(f['얻는 것'], '을/를')} 얻어요.`]] : [];
    default:
      return [];
  }
}

export function faqOf(entry) {
  const f = Object.fromEntries(entry.facts);
  const n = entry.name;
  const advCrop = entry.cat === 'crop' && f.종류 === '고급 작물';
  const qa = [];
  const where = advCrop ? null : whereQa(entry, f);
  if (where) qa.push(where);
  qa.push(...specificQa(entry, f));
  if (f.판매가) qa.push([`${josa(n, '은/는')} 얼마에 팔려요?`, `${coin(f.판매가)}에 팔 수 있어요.`]);
  if (entry.museum && !['weather', 'npc'].includes(entry.cat)) qa.push([`${josa(n, '은/는')} 박물관 어디에 전시돼요?`, `박물관 ${entry.museum}에 전시돼요.`]);
  return qa.slice(0, 3);
}
