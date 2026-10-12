// =============================================================
//  🧪 E2 연결 — 배정이 로그인 화면 판단보다 먼저 오고, 웹 밖·기존 유저는 아무것도 바뀌지 않는다
//  (index.html·js/analytics.js·js/supabase-client.js·js/i18n.js 원문 검사 — gameSource() 와 같은 텍스트 잠금 방식)
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const html = read('index.html');
const analytics = read('js/analytics.js');
const supa = read('js/supabase-client.js');
const i18n = read('js/i18n.js');
const boot = read('js/exp-e2-boot.js');

// 부팅 IIFE — initAuth 를 부르는 마지막 모듈 블록 끝부분
const bootStart = html.lastIndexOf('(async () => {');
const bootSrc = html.slice(bootStart);

test('GA4 첫 user_properties 에 exp_entry 가 함께 실린다 — 로그인 판단(부팅 IIFE)보다 먼저 도는 모듈 평가 시점', () => {
  assert.match(analytics, /import \{[^}]*e2Decision[^}]*\} from '\.\/exp-e2-boot\.js'/);
  // 모든 사용자 속성은 allUserProps() 한 곳에서 만든다(치환이라 통째로 실어야 서로 안 지운다) — exp_entry 포함
  assert.match(analytics, /function allUserProps[\s\S]{0,300}\.\.\.e2UserProps\(e2Decision\(\)\)/);
  assert.match(analytics, /gtag\('set', 'user_properties', allUserProps\(\)\)/);
  // 나중 덮어쓰기(setAbVariant)도 allUserProps 로 exp_entry 를 다시 실어 지우지 않는다
  assert.match(analytics, /export function setAbVariant[\s\S]{0,300}allUserProps\(\)/);
});

test('exp_entry 는 이벤트 파라미터로 보내지 않는다(25개 한도)', () => {
  for (const [name, src] of [['index.html', html], ['analytics.js', analytics]]) {
    assert.doesNotMatch(src, /trackEvent\([^)]*exp_entry/, name);
  }
  assert.doesNotMatch(analytics, /payload = \{[^}]*exp_entry/);
});

test('부팅: 배정 → initAuth → (토스·안드로이드·iOS 분기) → 처치면 게스트 바로 시작 → 아니면 로그인 화면', () => {
  const at = (re) => { const m = bootSrc.search(re); assert.ok(m >= 0, String(re)); return m; };
  const decide = at(/const e2 = e2Decision\(\)/);
  const auth = at(/await initAuth\(/);
  const toss = at(/else if \(IS_TOSS && !res\.offline && !justExited\)/);
  const ios = at(/else if \(IS_IOS && !res\.offline && !justExited\)/);
  const skip = at(/else if \(skipLoginNow\(\{ decision: e2, offline: res\.offline, justExited, hasInvite: e2HasInvite\(\) \}\)\) startDeferredGuest\(\)/);
  const screen = at(/else showLoginScreen\(res\.offline\);/);
  assert.ok(decide < auth && auth < toss && toss < ios && ios < skip && skip < screen, '순서가 어긋났다');
  assert.match(bootSrc, /await initAuth\([\s\S]*?\}, \{ keepGuest: keepGuestSession\(e2, \{ hasInvite: e2HasInvite\(\) \}\) \}\)/);
});

test('토스·플레이 앱·iOS 실패 화면과 세션 있는 재방문 경로는 손대지 않았다', () => {
  assert.match(bootSrc, /if \(!res\.needLogin\) enterPlay\(\);/);
  assert.match(bootSrc, /if \(!r\.ok\) showLoginScreen\(false, 'toss_fail'\);/);
  assert.match(bootSrc, /showLoginScreen\(false, r\.reason === 'endpoint_not_configured' \? 'pgs_unconfigured' : 'pgs_fail'\)/);
  assert.match(bootSrc, /showLoginScreen\(false, r\.reason === 'endpoint_not_configured' \? 'gc_unconfigured' : 'gc_fail'\)/);
});

test('처치 입장: 오프라인 게스트 상태로 입장 → 첫 실제 입력 뒤 익명 계정', () => {
  const fn = html.match(/async function startDeferredGuest\(\) \{[\s\S]*?\n    \}/);
  assert.ok(fn, 'startDeferredGuest 가 없다');
  const src = fn[0];
  const local = src.indexOf('startLocalGuest()'), arm = src.indexOf('armDeferredGuest(window'), play = src.indexOf("await enterPlay('guest_deferred')");
  assert.ok(local >= 0 && arm > local && play > arm, src);
  assert.match(src, /upgradeGuest\(\{ signInAsGuest, loadGame, track: trackEvent \}\)/);
  assert.doesNotMatch(src.slice(0, arm), /signInAsGuest\(\)/, '입력 전에 계정을 만들면 안 된다');
  // 계정 전 임시 id('local-…')는 GA4 user_id 로 보내지 않는다 — 그 밖의 경로는 그대로
  assert.match(bootSrc, /if \(s\.userId && !\(deferredGuest && !s\.online\)\) setGaUser\(s\.userId\);/);
});

test('enterPlay 의 login 수단 — 인자가 없으면 기존 그대로', () => {
  assert.match(html, /async function enterPlay\(via\) \{/);
  assert.match(html, /trackLogin\(via \|\| authState\.loginVia \|\| authState\.provider \|\| 'offline'\)/);
});

test('initAuth: 게스트 세션 이어 가기는 keepGuest 일 때만, 토스·스토어 앱 경로는 그대로', () => {
  assert.match(supa, /export async function initAuth\(onStatusChange, \{ keepGuest = false \} = \{\}\)/);
  const anon = supa.match(/if \(s && isAnon\(s\)\) \{[\s\S]*?\n    \}/)[0];
  assert.match(anon, /if \(keepGuest && !IS_TOSS && !IS_NATIVE\) \{ applySession\(s\); return \{ needLogin: false, offline: false \}; \}/);
  assert.match(anon, /if \(IS_TOSS \|\| IS_NATIVE\) pendingGuest = await readGuestSave\(s\.user\.id\);/);
  assert.match(anon, /await signOutQuietly\(\);/);
});

test('오프라인 게스트 상태는 한 함수 — 익명 로그인 실패와 미뤄 둔 게스트가 같은 상태', () => {
  assert.match(supa, /export function startLocalGuest\(\) \{[\s\S]*?state\.provider = 'offline';[\s\S]*?emit\(\);/);
  assert.match(supa, /signInAsGuest[\s\S]*?startLocalGuest\(\);\s*\n\s*return \{ online: false \};/);
});

test('첫 방문 판정 — client_id 가 이번 로드에서 처음 만들어졌는가', () => {
  assert.match(i18n, /export const clientIdIsNew = \(\) =>/);
  assert.match(boot, /newDevice: clientIdIsNew\(\)/);
  assert.match(boot, /dev: IS_DEV_SESSION/);
  assert.match(boot, /platform: PLATFORM/);
});
