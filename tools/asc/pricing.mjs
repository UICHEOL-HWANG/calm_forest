#!/usr/bin/env node
// =============================================================
//  🍎 가격(무료) · 판매 국가(전체 + 새 국가 자동) 설정 — 한 번만 하면 된다
//  사용: node tools/asc/pricing.mjs
// =============================================================
import { asc } from './asc.mjs';

const APP = '6821420691';

// ① 무료 — 기준 국가 USA 의 0 원 가격점
const points = (await asc('GET', `/v1/apps/${APP}/appPricePoints?filter[territory]=USA&limit=200`)).data;
const free = points.find(p => Number(p.attributes.customerPrice) === 0);
if (!free) throw new Error('USA 무료 가격점을 못 찾음');
await asc('POST', '/v1/appPriceSchedules', {
  data: { type: 'appPriceSchedules', relationships: {
    app: { data: { type: 'apps', id: APP } },
    baseTerritory: { data: { type: 'territories', id: 'USA' } },
    manualPrices: { data: [{ type: 'appPrices', id: '${free}' }] } } },
  included: [{ type: 'appPrices', id: '${free}', attributes: { startDate: null },
    relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } }],
});
console.log('✅ 가격: 무료');

// ② 판매 국가 — 전체 + 앞으로 생기는 국가도 자동
const territories = [];
let next = '/v1/territories?limit=200';
while (next) {
  const page = await asc('GET', next);
  territories.push(...page.data.map(t => t.id));
  next = page.links?.next ? page.links.next.replace('https://api.appstoreconnect.apple.com', '') : null;
}
await asc('POST', '/v2/appAvailabilities', {
  data: { type: 'appAvailabilities', attributes: { availableInNewTerritories: true }, relationships: {
    app: { data: { type: 'apps', id: APP } },
    territoryAvailabilities: { data: territories.map(t => ({ type: 'territoryAvailabilities', id: '${' + t + '}' })) } } },
  included: territories.map(t => ({ type: 'territoryAvailabilities', id: '${' + t + '}', attributes: { available: true },
    relationships: { territory: { data: { type: 'territories', id: t } } } })),
});
console.log(`✅ 판매 국가: ${territories.length}곳 + 새 국가 자동`);
