// 📲 Install Referrer 배선 — 네이티브 등록·부팅 호출·GA4 속성·Supabase 전송이 끊기지 않았는지 소스로 확인
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const analytics = read('js/analytics.js');

test('네이티브 플러그인이 MainActivity 에 등록되고 의존성이 있다', () => {
  assert.match(read('android/app/src/main/java/com/cheorish/lab/calmforest/MainActivity.java'), /registerPlugin\(InstallReferrerPlugin\.class\)/);
  assert.match(read('android/app/build.gradle'), /com\.android\.installreferrer:installreferrer:/);
  assert.match(read('android/app/src/main/java/com/cheorish/lab/calmforest/InstallReferrerPlugin.java'), /@CapacitorPlugin\(name = "InstallReferrer"\)/);
});

test('안드로이드에서만 부팅 때 읽는다 — 인증보다 먼저, 기다리지 않고', () => {
  const boot = html.indexOf("bootInstallReferrer({ plugin: capPlugin('InstallReferrer')");
  assert.ok(boot > 0, 'bootInstallReferrer 호출');
  assert.ok(boot < html.indexOf('const res = await initAuth('), '인증 전에 시작');
  assert.match(html.slice(boot - 500, boot), /if \(IS_ANDROID && !IS_DEV_SESSION\)/);
  assert.doesNotMatch(html, /await bootInstallReferrer/);
});

test('로그인 상태가 바뀔 때마다 계정 동기화를 부른다', () => {
  const cb = html.slice(html.indexOf('const res = await initAuth('), html.indexOf('}, { keepGuest:'));
  assert.match(cb, /if \(s\.online\) syncInstall\(s\)/);
});

test('GA4 사용자 속성을 다시 set 하는 곳 전부 install_*·heard_from·exp_arm 을 같이 싣는다(allUserProps 한 곳)', () => {
  assert.match(analytics, /function allUserProps[\s\S]{0,300}\.\.\.installProps\(\)[\s\S]{0,80}exp_arm: expArm/);
  const sets = analytics.match(/gtag\('set', 'user_properties', [^)]*\)/g) || [];
  assert.ok(sets.length >= 5, '부팅·setAbVariant·setInstallUserProps·setSurveyUserProps·setExpArm');
  for (const s of sets) assert.match(s, /allUserProps\(/, s);
});

test('Supabase 는 계정·기기당 1행, 덮어쓰지 않는다', () => {
  assert.match(read('js/supabase-client.js'), /from\('install_attribution'\)[\s\S]{0,120}onConflict: 'user_id,client_id', ignoreDuplicates: true/);
});
