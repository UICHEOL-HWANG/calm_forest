// scripts/lib/paddle-seed.mjs
// =============================================================
//  calm forest · 💳 Paddle 상품 등록 — 순수 로직 (네트워크 없음, tests/paddle-seed.test.mjs)
//  ------------------------------------------------------------
//  ▶ 무엇을 등록할지는 카탈로그(ITEMS·PET_KINDS)가, 얼마인지는 js/shop/cash.js 등급표가 정한다.
//    아이템을 카탈로그에 추가하고 price-ids.js 에 `id: null` 한 줄을 넣은 뒤 스크립트를 다시 돌리면
//    새 항목만 만들어진다(기존 상품은 custom_data.item_id 로 찾아 재사용).
// =============================================================
import { cashLabel, PET_CASH_LABEL } from '../../js/shop/cash.js';

const CURRENCY = 'KRW';
const SLOT_DESC = { head: '머리 꾸미기', neck: '목 꾸미기', back: '등 꾸미기', trail: '걷는 자국' };

/** '₩1,500' → '1500'. KRW 는 소수 단위가 없어 Paddle 금액이 그대로 원 단위다 */
export function labelToAmount(label) {
  if (!/^₩[\d,]+$/.test(label)) throw new Error(`KRW 라벨이 아니다: ${label}`);
  return label.slice(1).replace(/,/g, '');
}

/** 등록할 상품 목록 — [{ itemId, kind, name, description, amount, currency }] */
export function buildPlan(items, petKinds) {
  const cosmetics = items.map(it => ({
    itemId: it.id,
    kind: 'cosmetic',
    name: it.slot === 'trail' ? `${it.name} 자국` : it.name,
    description: `calm forest ${SLOT_DESC[it.slot] ?? '꾸미기'} 아이템`,
    amount: labelToAmount(cashLabel(it.price.coins)),
    currency: CURRENCY,
  }));
  const pets = petKinds.map(p => ({
    itemId: p.id,
    kind: 'pet',
    name: `펫 ${p.name}`,
    description: `calm forest 펫 — ${p.blurb}`,
    amount: labelToAmount(PET_CASH_LABEL),
    currency: CURRENCY,
  }));
  return [...cosmetics, ...pets];
}

/** price-ids.js 원문에서 지정한 id 의 값만 바꾼 새 원문을 돌려준다 */
export function patchPriceIds(src, map) {
  let out = src;
  for (const [id, priceId] of Object.entries(map)) {
    if (!/^pri_[a-z0-9]+$/.test(priceId)) throw new Error(`priceId 형식이 아니다: ${id}=${priceId}`);
    const re = new RegExp(`(^|[\\s{,])${id}: (null|'pri_[a-z0-9]+')`, 'm');
    if (!re.test(out)) throw new Error(`price-ids.js 에 ${id} 칸이 없다 — 먼저 '${id}: null' 을 추가`);
    out = out.replace(re, `$1${id}: '${priceId}'`);
  }
  return out;
}
