import { josa } from './faq.mjs';
import { CAT_GUIDES, ROUTINES, MISTAKES } from './guides-text.mjs';
import { catFaq } from './guides-faq.mjs';
import { catData } from './guides-cat-data.mjs';
import { entryExtra, condText, hasCond, ref, list } from './guides-data.mjs';
import { WIKI_CATS } from './load-data.mjs';
import { linkedRefs } from './content.mjs';
import { ENTRY_TIPS } from './guides-tips.mjs';

export function categoryGuide(catId, entries) {
  const cat = WIKI_CATS.find(c => c.id === catId);
  if (!cat) return [];
  const [overview, ...data] = catData(cat, entries);
  return [overview, ...(CAT_GUIDES[catId] ?? []), ROUTINES[catId], MISTAKES[catId], ...data, catFaq(cat, entries)].filter(Boolean);
}

export function buildBacklinks(content, index) {
  const out = new Map();
  for (const [key, secs] of content) {
    const from = index.get(key);
    if (!from) continue;
    for (const target of new Set([...secs.values()].flatMap(linkedRefs))) {
      if (target === key) continue;
      out.set(target, [...(out.get(target) ?? []), from]);
    }
  }
  return out;
}

const backlinkParagraph = (entry, backlinks) => {
  const from = (backlinks.get(`${entry.cat}/${entry.id}`) ?? []).slice(0, 8);
  if (!from.length) return null;
  return `${josa(entry.name, '은/는')} ${list(from.map(ref))} 문서에서도 다루어진다. 연결된 문서를 함께 읽으면 조건과 쓰임을 한 번에 파악할 수 있다.`;
};

const FIRST = { fish: '낚으면', crop: '거두면', ore: '캐면', cook: '완성하면', npc: '말을 걸면', forage: '주우면', bug: '잡으면', track: '발견하면', dig: '발견하면', river: '건지면', spirit: '달래면', weather: '겪으면', visitor: '만나면' };
const AFTER = {
  npc: '이미 등록했다면 의뢰 진행 상황을 기준으로 다시 찾아가면 된다.',
  weather: '이미 등록했다면 그날의 효과를 활용해 하루 계획을 짜는 것이 핵심이다.',
  cook: '이미 등록했다면 필요한 효과와 카페 주문을 기준으로 다시 만들면 된다.',
};
const museumParagraph = (entry) => entry.museum
  ? `${josa(entry.name, '은/는')} 처음 ${FIRST[entry.cat] ?? '얻으면'} 도감에 기록되고 박물관 ${entry.museum} 전시 칸도 채운다. ${AFTER[entry.cat] ?? '이미 등록했다면 재료, 의뢰, 판매 같은 실제 사용처를 기준으로 다음 수집 여부를 정하면 된다.'}`
  : null;

const conditionParagraph = (entry) => hasCond(entry)
  ? `${josa(entry.name, '은/는')} ${condText(entry)} 나오므로 출발하기 전에 조건을 먼저 확인한다. 조건이 하나라도 맞지 않으면 아무리 시도해도 만나지 못하니 시간, 날씨, 계절, 장소를 맞추는 것이 가장 빠르다.`
  : null;

export function entryGuide(entry, all, backlinks = new Map()) {
  return [
    conditionParagraph(entry),
    ...entryExtra(entry, all),
    ENTRY_TIPS[`${entry.cat}/${entry.id}`],
    backlinkParagraph(entry, backlinks),
    museumParagraph(entry),
  ].filter(Boolean);
}
