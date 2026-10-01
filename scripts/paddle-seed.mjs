// scripts/paddle-seed.mjs
// =============================================================
//  calm forest · 💳 Paddle 상품·가격 등록 → js/shop/price-ids.js 자동 기입
//  ------------------------------------------------------------
//  사용:
//    node scripts/paddle-seed.mjs --dry-run            # 무엇을 만들지 출력만(키 불필요)
//    node scripts/paddle-seed.mjs --only straw_hat     # 한 개만
//    node scripts/paddle-seed.mjs                      # 전부(이미 있는 건 재사용)
//  환경변수: PADDLE_API_KEY (필수) · PADDLE_ENV=sandbox|production (기본 sandbox)
//  ▶ 멱등: 상품 custom_data.item_id 로 기존 상품을 찾아 재사용, 활성 가격이 있으면 그것을 쓴다.
//    금액이 다르면 바꾸지 않고 경고만 한다(가격 변경은 사람이 대시보드에서).
//  ▶ 샌드박스와 라이브의 id 는 다르다 — 라이브 승인 후 PADDLE_ENV=production 으로 다시 돌린다.
// =============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PET_KINDS } from '../js/pet/rules.js';
import { buildPlan, patchPriceIds } from './lib/paddle-seed.mjs';

const PRICE_IDS_PATH = new URL('../js/shop/price-ids.js', import.meta.url);
const BASES = { sandbox: 'https://sandbox-api.paddle.com', production: 'https://api.paddle.com' };

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const env = process.env.PADDLE_ENV || 'sandbox';
const base = BASES[env];
if (!base) fail(`PADDLE_ENV 는 sandbox 또는 production: ${env}`);

const plan = buildPlan(ITEMS, PET_KINDS).filter(p => !only || p.itemId === only);
if (!plan.length) fail(`카탈로그에 없는 id: ${only}`);

if (dryRun) {
  console.table(plan.map(p => ({ id: p.itemId, name: p.name, amount: `${p.amount} ${p.currency}` })));
  process.exit(0);
}

const key = process.env.PADDLE_API_KEY;
if (!key) fail('PADDLE_API_KEY 가 없다 — 터미널에서 export PADDLE_API_KEY=... 후 다시 실행');

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    throw new Error(`${method} ${path} → ${res.status} ${e.code || ''} ${e.detail || ''} ${JSON.stringify(e.errors || '')}`);
  }
  return json;
}

/** item_id → 상품(prices 포함) — 활성 상품 전부를 페이지 넘기며 읽는다 */
async function loadExisting() {
  const byItem = new Map();
  let path = '/products?status=active&include=prices&per_page=200';
  while (path) {
    const { data, meta } = await api('GET', path);
    for (const prod of data) {
      const itemId = prod.custom_data?.item_id;
      if (itemId) byItem.set(itemId, prod);
    }
    const next = meta?.pagination?.has_more ? meta.pagination.next : null;
    path = next ? next.replace(base, '') : null;
  }
  return byItem;
}

async function ensure(p, existing) {
  let prod = existing.get(p.itemId);
  if (!prod) {
    ({ data: prod } = await api('POST', '/products', {
      name: p.name,
      description: p.description,
      tax_category: 'standard',
      custom_data: { item_id: p.itemId, kind: p.kind },
    }));
    prod.prices = [];
    console.log(`  + 상품 ${p.itemId} (${p.name}) ${prod.id}`);
  }
  const active = (prod.prices || []).find(pr => pr.status === 'active');
  if (active) {
    const { amount, currency_code } = active.unit_price;
    if (amount !== p.amount || currency_code !== p.currency) {
      console.warn(`  ⚠ ${p.itemId}: 기존 가격 ${amount} ${currency_code} ≠ 표 ${p.amount} ${p.currency} — 그대로 둔다`);
    }
    console.log(`  = 가격 ${p.itemId} ${active.id} (기존)`);
    return active.id;
  }
  const { data: price } = await api('POST', '/prices', {
    product_id: prod.id,
    description: `${p.name} 1회 구매`,
    unit_price: { amount: p.amount, currency_code: p.currency },
    quantity: { minimum: 1, maximum: 1 },
    custom_data: { item_id: p.itemId },
  });
  console.log(`  + 가격 ${p.itemId} ${price.id} (${p.amount} ${p.currency})`);
  return price.id;
}

console.log(`Paddle ${env} — ${plan.length}개`);
const existing = await loadExisting();
const ids = {};
try {
  for (const p of plan) ids[p.itemId] = await ensure(p, existing);
} finally {
  // 중간에 실패해도 만들어진 것까지는 기록한다(재실행 시 재사용되므로 중복 없음)
  if (Object.keys(ids).length) {
    writeFileSync(PRICE_IDS_PATH, patchPriceIds(readFileSync(PRICE_IDS_PATH, 'utf8'), ids));
    console.log(`✓ price-ids.js 에 ${Object.keys(ids).length}개 기록`);
  }
}
