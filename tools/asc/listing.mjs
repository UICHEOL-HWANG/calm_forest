#!/usr/bin/env node
// =============================================================
//  🍎 App Store 등록정보 반영 — docs/ops/APP_STORE_LISTING.md 가 단일 출처
//  문서의 ``` 블록을 섹션별로 읽어 App Store Connect 에 넣는다(ko + en-US).
//  사용: node tools/asc/listing.mjs [--dry]
//  ⚠️ 개인정보 라벨은 API 가 없다 — 웹에서 직접. 심사 연락처(전화)는 review.mjs 가 따로.
// =============================================================
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc } from './asc.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = '6821420691';
const VERSION = { string: '1.0.0', copyright: '© 2026 Hwang Cheorish', buildNumber: '3' };
const URLS = { support: 'https://calmforest.cloud', marketing: 'https://calmforest.cloud', privacy: 'https://calmforest.cloud/privacy' };
const NAMES = { ko: '고요한 숲', 'en-US': 'calm forest' };
const SUBTITLES = { ko: '서두르지 않는 3D 힐링 마을', 'en-US': 'A cozy village, no rush' };
const DRY = process.argv.includes('--dry');

// "## 제목" 섹션 안의 ``` 블록들을 순서대로 — [한국어, 영어]
function blocks(md, heading) {
  const sec = md.split(/^## /m).find(s => s.startsWith(heading));
  if (!sec) throw new Error('문서에 섹션 없음: ' + heading);
  return [...sec.matchAll(/```\n([\s\S]*?)\n```/g)].map(m => m[1]);
}

const md = readFileSync(path.join(ROOT, 'docs', 'ops', 'APP_STORE_LISTING.md'), 'utf8');
const [kwKo, kwEn] = blocks(md, '키워드');
const [promoKo, promoEn] = blocks(md, '프로모션 텍스트');
const [descKo, descEn] = blocks(md, '설명');
const COPY = {
  ko: { description: descKo, keywords: kwKo, promotionalText: promoKo },
  'en-US': { description: descEn, keywords: kwEn, promotionalText: promoEn },
};
for (const [loc, c] of Object.entries(COPY)) {
  if (c.keywords.length > 100) throw new Error(`${loc} 키워드 100자 초과: ${c.keywords.length}`);
  if (c.promotionalText.length > 170) throw new Error(`${loc} 프로모션 170자 초과`);
  if (c.description.length > 4000) throw new Error(`${loc} 설명 4000자 초과`);
  if (/구글|google|android|안드로이드/i.test(c.description + c.keywords)) throw new Error(`${loc} 다른 플랫폼명(2.3.10)`);
  if (/\p{Extended_Pictographic}/u.test(c.description + c.keywords + c.promotionalText)) throw new Error(`${loc} 이모지 금지(ASC 가 거절)`);
}

const step = async (label, fn) => { if (DRY) { console.log('· (dry)', label); return; } await fn(); console.log('✅', label); };

const version = (await asc('GET', `/v1/apps/${APP}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED&limit=1`)).data[0];
if (!version) throw new Error('편집 가능한 버전이 없다');
const build = (await asc('GET', `/v1/builds?filter[app]=${APP}&filter[version]=${VERSION.buildNumber}&filter[processingState]=VALID`)).data[0];
if (!build) throw new Error(`빌드 ${VERSION.buildNumber} 가 아직 VALID 가 아니다`);

await step(`버전 ${VERSION.string} · 저작권 · 수동 출시 · 빌드 ${VERSION.buildNumber}`, () => asc('PATCH', `/v1/appStoreVersions/${version.id}`, {
  data: { type: 'appStoreVersions', id: version.id,
    attributes: { versionString: VERSION.string, copyright: VERSION.copyright, releaseType: 'MANUAL' },
    relationships: { build: { data: { type: 'builds', id: build.id } } } },
}));

// 버전 현지화(설명·키워드·프로모션·URL)
const vlocs = (await asc('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
for (const [locale, c] of Object.entries(COPY)) {
  const attrs = { ...c, supportUrl: URLS.support, marketingUrl: URLS.marketing };
  const have = vlocs.find(l => l.attributes.locale === locale);
  await step(`버전 현지화 ${locale}`, () => have
    ? asc('PATCH', `/v1/appStoreVersionLocalizations/${have.id}`, { data: { type: 'appStoreVersionLocalizations', id: have.id, attributes: attrs } })
    : asc('POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale, ...attrs },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } }));
}

// 앱 정보(이름·부제·개인정보처리방침 URL·카테고리)
const info = (await asc('GET', `/v1/apps/${APP}/appInfos`)).data.find(i => i.attributes.state !== 'READY_FOR_DISTRIBUTION') ?? null;
if (!info) throw new Error('편집 가능한 appInfo 없음');
await step('카테고리 게임 › 시뮬레이션 · 캐주얼', () => asc('PATCH', `/v1/appInfos/${info.id}`, {
  data: { type: 'appInfos', id: info.id, relationships: {
    primaryCategory: { data: { type: 'appCategories', id: 'GAMES' } },
    primarySubcategoryOne: { data: { type: 'appCategories', id: 'GAMES_SIMULATION' } },
    primarySubcategoryTwo: { data: { type: 'appCategories', id: 'GAMES_CASUAL' } },
  } },
}));
const ilocs = (await asc('GET', `/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
for (const locale of Object.keys(COPY)) {
  const attrs = { name: NAMES[locale], subtitle: SUBTITLES[locale], privacyPolicyUrl: URLS.privacy };
  const have = ilocs.find(l => l.attributes.locale === locale);
  await step(`앱 정보 현지화 ${locale}`, () => have
    ? asc('PATCH', `/v1/appInfoLocalizations/${have.id}`, { data: { type: 'appInfoLocalizations', id: have.id, attributes: attrs } })
    : asc('POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale, ...attrs },
        relationships: { appInfo: { data: { type: 'appInfos', id: info.id } } } } }));
}
console.log(DRY ? '— dry run 끝' : '— 등록정보 반영 끝');
