#!/usr/bin/env node
// =============================================================
//  🍎 App Store 스크린샷 업로드 — assets/store/ios/(ko) · assets/store/ios/en/(en-US), 6.9" 1320×2868
//  흐름: 세트(APP_IPHONE_67) 확보 → 기존 스크린샷 삭제(교체) → 예약(POST) → 조각 PUT → 완료(PATCH, md5)
//  사용: node tools/asc/screenshots.mjs
// =============================================================
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc } from './asc.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = '6821420691';
const DISPLAY = 'APP_IPHONE_67';   // 6.7"·6.9" 공용 세트(1290×2796 · 1320×2868)
const DIRS = { ko: 'assets/store/ios', 'en-US': 'assets/store/ios/en' };

const version = (await asc('GET', `/v1/apps/${APP}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED&limit=1`)).data[0];
const locs = (await asc('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;

for (const [locale, dir] of Object.entries(DIRS)) {
  const loc = locs.find(l => l.attributes.locale === locale);
  if (!loc) throw new Error('현지화 없음: ' + locale + ' — listing.mjs 먼저');
  const sets = (await asc('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`)).data;
  let set = sets.find(s => s.attributes.screenshotDisplayType === DISPLAY);
  if (!set) set = (await asc('POST', '/v1/appScreenshotSets', { data: { type: 'appScreenshotSets',
    attributes: { screenshotDisplayType: DISPLAY },
    relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } } } })).data;
  for (const old of (await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`)).data) await asc('DELETE', `/v1/appScreenshots/${old.id}`);

  const files = readdirSync(path.join(ROOT, dir)).filter(f => /^\d\d-.*\.png$/.test(f)).sort();
  for (const f of files) {
    const buf = readFileSync(path.join(ROOT, dir, f));
    const shot = (await asc('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots',
      attributes: { fileName: f, fileSize: buf.length },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } })).data;
    for (const op of shot.attributes.uploadOperations) {
      const headers = Object.fromEntries((op.requestHeaders || []).map(h => [h.name, h.value]));
      const r = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
      if (!r.ok) throw new Error(`조각 업로드 실패 ${f} ${r.status}`);
    }
    await asc('PATCH', `/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id,
      attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') } } });
    console.log('🖼️', locale, f);
  }
}
console.log('— 스크린샷 업로드 끝(처리는 Apple 쪽에서 몇 분)');
