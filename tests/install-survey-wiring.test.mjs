// 🧭 첫 실행 설문 배선 — 부팅 순서(로딩과 병렬·인증 전 대기)·계정 동기화·GA4 속성·Supabase·영어판
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SURVEY_OPTIONS } from '../js/install-survey.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');

test('로딩과 병렬로 시작하고, 인증 직전에만 기다린다', () => {
  const start = html.indexOf('surveyP = bootInstallSurvey({');
  const world = html.indexOf('await bootWorld(ui);');
  const wait = html.indexOf('await surveyP;');
  const auth = html.indexOf('const res = await initAuth(');
  assert.ok(start > 0 && start < world, 'bootWorld 전에 시작(기다리지 않고)');
  assert.ok(world < wait && wait < auth, 'bootWorld 뒤·initAuth 전에 대기 — 초대 코드가 enterPlay 전에 보관돼야 한다');
  assert.doesNotMatch(html, /await bootInstallSurvey/);
  assert.doesNotMatch(html, /await bootInstallReferrer/, 'Play 귀속도 여전히 기다리지 않는다');
});

test('안드로이드 첫 실행 판정 — 부팅 전 캐시 유무로 fresh, referrer promise 를 넘긴다', () => {
  const pre = html.indexOf('referrerFresh = !cachedInstallAttribution(storage)');
  assert.ok(pre > 0 && pre < html.indexOf("referrerP = bootInstallReferrer({ plugin: capPlugin('InstallReferrer')"));
  assert.match(html, /referrerP, fresh: referrerFresh/);
});

test('카드는 #loading 의 형제(안이면 setLoadWait 가 덮어쓴다)·dev 는 ?survey=1 강제만', () => {
  assert.match(html, /<div id="loading">[^<]*<\/div>\s*<div id="survey-card"><\/div>/);
  assert.match(html, /force: IS_DEV_SESSION && new URLSearchParams\(location\.search\)\.get\('survey'\) === '1'/);
});

test('로그인 상태가 바뀔 때마다 설문 답도 계정 동기화', () => {
  const cb = html.slice(html.indexOf('const res = await initAuth('), html.indexOf('}, { keepGuest:'));
  assert.match(cb, /if \(s\.online\) syncSurvey\(s\)/);
});

test('Supabase 는 계정·기기당 1행, 덮어쓰지 않는다 · GA4 사용자 속성은 installProps 에 실린다', () => {
  assert.match(read('js/supabase-client.js'), /from\('install_survey'\)[\s\S]{0,120}onConflict: 'user_id,client_id', ignoreDuplicates: true/);
  assert.match(read('js/analytics.js'), /surveyUserProps\(readSurvey\(globalThis\.localStorage\)\)/);
});

test('보기·문구 영어판이 다 있다', () => {
  const en = read('js/i18n-en.js');
  const keys = [...SURVEY_OPTIONS.map(o => o.label), 'calm forest 를 어디서 알게 되셨어요?', '불러오는 동안 하나만 여쭤볼게요 🌿',
    '초대 코드 (선택)', '코드를 다시 확인해 주세요', '건너뛰기', '확인'];
  for (const k of keys) assert.ok(en.includes(`'${k}':`), k);
});

test('DB answer CHECK 와 보기 값이 같다', () => {
  const sql = read('sql/migrations/migrate_install_survey.sql');
  for (const o of SURVEY_OPTIONS) assert.ok(sql.includes(`'${o.value}'`), o.value);
});
