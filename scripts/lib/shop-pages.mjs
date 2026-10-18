import { seoHead, escapeHtml } from './seo-meta.mjs';
import { SITE, OG_IMAGE } from './seo-pages.mjs';
import { SLOT_KO } from './shop-rows.mjs';
import { SHOP_COPY, SHOP_COMMON, SALE_LABEL } from './shop-copy.mjs';
import { SALE_WINDOWS, saleOpen } from '../../js/shop/sale-window.js';

const won = (n) => `₩${n.toLocaleString('ko-KR')}`;

export function salePeriod(key) {
  const w = SALE_WINDOWS[key];
  if (!w) return '';
  const [fy, fm, fd] = w.from.split('-').map(Number);
  const [ty, tm, td] = w.to.split('-').map(Number);
  return `${fy}.${fm}.${fd} ~ ${ty === fy ? '' : ty + '.'}${tm}.${td}`;
}

function productLd(it, desc, path, open) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: it.name,
    description: desc,
    sku: it.id,
    category: `프리미엄 꾸미기 > ${SLOT_KO[it.slot].replace(/^\S+\s/, '')}`,
    brand: { '@type': 'Brand', name: '고요한 숲' },
    image: OG_IMAGE,
    url: SITE + path,
    offers: {
      '@type': 'Offer',
      price: String(it.price.won),
      priceCurrency: 'KRW',
      availability: open ? 'https://schema.org/InStock' : 'https://schema.org/Discontinued',
      url: SITE + path,
    },
  };
}

function productHtml(it, open) {
  const path = `/shop/${it.id}`;
  const desc = SHOP_COPY[it.id];
  const price = it.price.cash?.label ?? won(it.price.won);
  const sale = it.sale ? `<p class="sale">${SALE_LABEL[it.sale] ?? '기간 한정'} · ${salePeriod(it.sale)}${open ? '' : ' · 판매 기간이 끝났어요'}</p>` : '';
  const head = seoHead({ path, title: `${it.name} · 고요한 숲 프리미엄 꾸미기`, description: desc, type: 'product', jsonLd: productLd(it, desc, path, open) });
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#bfe8c9" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
${head}
<style>
  html, body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
  body { background: linear-gradient(#d9f0df, #bfe8c9) fixed; color: #3c4a41; padding: 24px 16px 64px; }
  main { max-width: 560px; margin: 0 auto; background: rgba(255,255,255,0.82); border-radius: 18px;
         box-shadow: 0 6px 18px rgba(90,120,100,0.18); padding: 32px 28px; }
  .thumb { font-size: 88px; line-height: 1; width: 140px; height: 140px; display: grid; place-items: center;
           background: rgba(143,214,160,0.28); border-radius: 28px; margin: 0 0 20px; }
  .slot { font-size: 13px; opacity: 0.75; margin: 0 0 4px; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  .price { font-size: 20px; font-weight: 700; color: #2f7a4a; margin: 0 0 16px; }
  .sale { display: inline-block; background: #fbe3c8; color: #8a4b12; border-radius: 999px; padding: 4px 12px; font-size: 13px; margin: 0 0 14px; }
  p { font-size: 15px; line-height: 1.75; }
  .note { background: rgba(143,214,160,0.22); border-radius: 10px; padding: 12px 14px; font-size: 13px; }
  .cta { display: inline-block; margin-top: 18px; background: #2f7a4a; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 600; }
  a { color: #2f7a4a; }
  footer { max-width: 560px; margin: 18px auto 0; font-size: 12px; opacity: 0.75; text-align: center; }
</style>
</head>
<body>
<main>
  <div class="thumb" role="img" aria-label="${escapeHtml(it.name)} 아이콘">${it.ico}</div>
  <p class="slot">💎 프리미엄 꾸미기 · ${SLOT_KO[it.slot]}</p>
  <h1>${escapeHtml(it.name)}</h1>
  <p class="price">${price}</p>
  ${sale}
  <p>${escapeHtml(desc)}</p>
  <div class="note">${SHOP_COMMON} 표시가는 세금 포함이며, 결제창에서 최종 금액을 확인할 수 있어요.</div>
  <a class="cta" href="/">🌿 게임에서 입어보기</a>
</main>
<footer>고요한 숲 · calm forest · <a href="/shop">전체 가격표</a> · <a href="/terms">이용약관</a> · <a href="/refund">환불 정책</a> · <a href="/privacy">개인정보처리방침</a></footer>
</body>
</html>
`;
}

export function shopProductPages(items, now = Date.now()) {
  return items.filter(it => it.premium).map(it => {
    const open = saleOpen(it, now);
    return { id: it.id, path: `/shop/${it.id}`, open, html: productHtml(it, open) };
  });
}
