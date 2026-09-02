# 베타 A/B 테스트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 베타테스터 10명 번들 A/B(5:5) — 명단 배정, 개편판 3종(보상 3일 부스트·첫 3회 관대 판정·튜토리얼 재배치), 운영자 전용 관제 대시보드.

**Architecture:** 변형 파라미터는 신설 `js/tuning.js`에 집약하고, 로그인 시 Supabase `beta_testers` 명단으로 `state.variant`를 고정(`beta_A`/`beta_B`). variant는 이미 모든 로그에 실려 나가므로 게임 쪽은 분기 3곳(보상·판정·튜토리얼 순서)만 추가한다. 관제는 기존 `admin_analytics.html`의 인증 패턴(구글 로그인 + security definer RPC)을 복제한 `beta_monitor.html`.

**Tech Stack:** 바닐라 ES 모듈(빌드 없음) · Supabase(Postgres RPC + RLS) · Chart.js(기존 대시보드와 동일) · Cloudflare Pages(main 병합 = 배포)

**Spec:** `docs/BETA_AB_TEST_PLAN.md`

## Global Constraints

- 테스트 프레임워크 없음 — 각 태스크의 검증은 **브라우저 프리뷰 콘솔/화면 확인**으로 수행 (프리뷰는 Claude Browser `preview_start` 사용, Bash로 서버 띄우지 말 것)
- 커밋은 **dev 브랜치**. main 병합·배포는 Task 8에서만
- `?v=NN` 캐시버스팅 파라미터 금지 (2026-08-15 전면 제거됨)
- 대시보드 차트 색은 `dashboards/_dash.css` 토큰만 사용
- 새 한국어 UI 문구 추가 금지 — 기존 문구 재사용만 (신규 문구는 유저 선검수 필요)
- i18n: 한국어 원문이 번역 키 — **기존 한국어 문자열을 변경하지 말 것** (js/i18n-en.js 키 미스 유발)
- 커밋 메시지 끝: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: js/tuning.js 신설 + EXPERIMENT 전환 + assignVariant 가드

**Files:**
- Create: `js/tuning.js`
- Modify: `js/config.js:59-67` (EXPERIMENT 스위치)
- Modify: `js/i18n.js:37-43` (assignVariant)

**Interfaces:**
- Produces: `TUNING` 상수, `isBetaA(variant): boolean`, `rewardBoostMult(variant, createdAtIso): number(1|1.5)`, `easeMult(variant, tries): number(1|1.3)` — Task 3·4·5가 사용

- [ ] **Step 1: js/tuning.js 작성**

```js
// =============================================================
//  calm forest · 베타 A/B 변형 파라미터 (docs/BETA_AB_TEST_PLAN.md)
//  ------------------------------------------------------------
//  A군(beta_A)에만 적용되는 개편 3종의 수치를 한 곳에 모은다.
//  배정 자체는 supabase-client.js(명단 테이블), 적용은 game.js/index.html.
// =============================================================

export const TUNING = {
  // 보상 부스트 — 가입(created_at) 후 N일간, 출석·퀘스트·판매 코인 ×mult
  rewardBoost: { days: 3, mult: 1.5, sources: ['daily_bonus', 'quest_reward', 'lucky_box'] },
  // 관대 판정 — 미니게임별 첫 tries회 시도는 판정 계수 ×mult
  firstTryEase: { tries: 3, mult: 1.3 },
  // A군 튜토리얼 순서 — 재미(낚시·집짓기·꾸미기) 전진. 스텝 내용은 index.html TUT_STEPS 그대로.
  TUT_ORDER_A: ['move', 'toolpage', 'chop', 'fish', 'build', 'enter', 'decor',
                'till', 'seed', 'water', 'harvest', 'sell', 'market', 'quest',
                'mine', 'carve', 'dex'],
};

export function isBetaA(variant) { return variant === 'beta_A'; }

// 가입 후 rewardBoost.days 이내의 A군이면 1.5, 아니면 1
export function rewardBoostMult(variant, createdAtIso) {
  if (!isBetaA(variant) || !createdAtIso) return 1;
  const days = (Date.now() - Date.parse(createdAtIso)) / 86400000;
  return (days >= 0 && days < TUNING.rewardBoost.days) ? TUNING.rewardBoost.mult : 1;
}

// 해당 미니게임 시도 횟수가 tries 미만인 A군이면 1.3, 아니면 1
export function easeMult(variant, tries) {
  return (isBetaA(variant) && (tries || 0) < TUNING.firstTryEase.tries)
    ? TUNING.firstTryEase.mult : 1;
}
```

- [ ] **Step 2: config.js EXPERIMENT 전환**

`js/config.js:67`의 `EXPERIMENT: 'i18n',` 을 다음으로 교체하고, 59-66행 주석 블록 끝에 `'beta'` 설명 한 줄을 추가:

```js
  //    'beta' = 베타 번들 A/B — beta_testers 명단으로 배정(supabase-client). 일반 유저=control.
  EXPERIMENT: 'beta',   // 🧪 베타 A/B 가동(2026-09-02~) — docs/BETA_AB_TEST_PLAN.md
```

- [ ] **Step 3: assignVariant 가드**

`js/i18n.js:38` (`if (!CONFIG.EXPERIMENT || CONFIG.EXPERIMENT === 'off') return 'control';`) 바로 다음 줄에 추가:

```js
  if (CONFIG.EXPERIMENT === 'beta') return 'control';  // 베타 배정은 명단(supabase-client) 전담 — 해시 배정 안 함
```

주의: `detectLang()`(i18n.js:54)은 `EXPERIMENT === 'i18n'`일 때만 variant를 언어에 쓰므로 'beta' 전환 시 비한국어=영어 전면 롤아웃으로 동작 — 의도된 현행 유지.

- [ ] **Step 4: 검증** — 프리뷰(`preview_start`)를 열고 콘솔에서:

```
(await import('./js/tuning.js')).rewardBoostMult('beta_A', new Date(Date.now()-86400000).toISOString())  // → 1.5
(await import('./js/tuning.js')).rewardBoostMult('beta_A', new Date(Date.now()-4*86400000).toISOString()) // → 1
(await import('./js/tuning.js')).easeMult('beta_B', 0)   // → 1
(await import('./js/i18n.js')).assignVariant()            // → 'control'
```

- [ ] **Step 5: Commit** — `git add js/tuning.js js/config.js js/i18n.js && git commit -m "Feat: 🧪 베타 A/B 변형 파라미터(tuning.js)·EXPERIMENT=beta 전환·해시 배정 가드"`

---

### Task 2: beta_testers 테이블 + 로그인 배정 + forceVariant

**Files:**
- Modify: `sql/admin_analytics.sql` (파일 끝에 §베타 섹션 추가)
- Modify: `js/supabase-client.js:42-49` (applySession), `js/supabase-client.js:16-25` (state)
- Modify: `js/analytics.js` (setAbVariant 신설, 56행 setGaUser 근처)

**Interfaces:**
- Consumes: 없음 (Task 1과 독립)
- Produces: `state.variant`가 로그인 후 `'beta_A'|'beta_B'`로 확정, `state.createdAt`(ISO 문자열) — Task 3이 사용. `setAbVariant(v: string): void` (analytics.js)

- [ ] **Step 1: SQL — 테이블·RLS** (`sql/admin_analytics.sql` 끝에 추가)

```sql
-- =============================================================
--  🧪 베타 A/B (2026-09-02) — docs/BETA_AB_TEST_PLAN.md
--  베타테스터 명단: email → A/B 군 직접 배정(5:5)
-- =============================================================
create table if not exists public.beta_testers (
  email text primary key,           -- 소문자로 저장할 것
  grp   text not null check (grp in ('A','B')),
  note  text
);
alter table public.beta_testers enable row level security;
drop policy if exists beta_testers_self_read on public.beta_testers;
create policy beta_testers_self_read on public.beta_testers
  for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
-- 쓰기 정책 없음 → service role(SQL 편집기)로만 등록/변경
-- 명단 등록 예시(운영자가 SQL 편집기에서 실행):
-- insert into public.beta_testers (email, grp, note) values
--   ('tester1@gmail.com','A','1기'), ('tester2@gmail.com','B','1기');
```

- [ ] **Step 2: analytics.js — setAbVariant 신설** (setGaUser 아래에)

```js
// [속성] A/B 변형이 로그인 후(명단 조회) 확정될 때 GA4 유저 속성 갱신
export function setAbVariant(v) {
  if (isGaConfigured() && typeof window.gtag === 'function') {
    window.gtag('set', 'user_properties', { ab_variant: v });
  }
}
```

- [ ] **Step 3: supabase-client.js — 배정 조회**

상단 임포트에 `setAbVariant` 추가(`import { setAbVariant } from './analytics.js';` — analytics는 i18n·config만 임포트하므로 순환 없음). `state` 객체에 `createdAt: null,` 필드 추가. `applySession(session)` 본문 끝(`emit();` 앞)에 `resolveBetaGroup(session);` 호출을 추가하고, 함수 신설:

```js
// ── 🧪 베타 배정 — 로그인 계정이 beta_testers 명단에 있으면 variant 고정 ──
//    명단 > ?forceVariant=(로컬 검증용) > 기존 assignVariant() 순.
async function resolveBetaGroup(session) {
  state.createdAt = session.user.created_at || null;   // 보상 부스트(가입 3일) 기준
  try {
    const forced = new URLSearchParams(location.search).get('forceVariant');
    if (forced === 'beta_A' || forced === 'beta_B') state.variant = forced;
    if (supabase && !isAnon(session)) {
      const email = (session.user.email || '').toLowerCase();
      const { data } = await supabase.from('beta_testers').select('grp').eq('email', email).maybeSingle();
      if (data?.grp) state.variant = 'beta_' + data.grp;   // 명단이 최우선
    }
  } catch (e) { console.warn('[베타] 배정 조회 실패(variant 유지):', e?.message || e); }
  setAbVariant(state.variant);
  emit();
}
```

주의: `resolveBetaGroup`는 async지만 applySession에서 await하지 않는다(로그인 흐름 비차단). 이후 전송되는 로그부터 variant가 확정값으로 실린다. 게스트 로컬 검증을 위해 `signInAsGuest` 경로의 applySession에서도 동일하게 호출되므로 forceVariant는 게스트에서도 동작한다.

- [ ] **Step 4: 검증** — ① 유저가 Supabase SQL 편집기에서 Step 1 SQL 실행(요청할 것). ② 프리뷰 `?forceVariant=beta_A`로 열어 로그인(게스트 포함) 후 콘솔:

```
(await import('./js/supabase-client.js')).state.variant  // → 'beta_A'
```

③ 파라미터 없이 열면 `'control'` 확인.

- [ ] **Step 5: Commit** — `git add sql/admin_analytics.sql js/supabase-client.js js/analytics.js && git commit -m "Feat: 🧪 beta_testers 명단 테이블(RLS)·로그인 배정·forceVariant 검증 파라미터"`

---

### Task 3: 보상 부스트 (A군 · 가입 3일 · 출석/퀘스트/판매)

**Files:**
- Modify: `js/game.js:26` (임포트), `js/game.js:8798-8803` (giveReward), `js/game.js:6262-6275` (sellItem)

**Interfaces:**
- Consumes: `TUNING, rewardBoostMult` (js/tuning.js — Task 1), `state.variant/state.createdAt` (supabase-client — Task 2)

- [ ] **Step 1: 임포트** — game.js:26의 supabase-client 임포트에 `state as authState` 추가, 그 아래에 `import { TUNING, rewardBoostMult, easeMult } from './tuning.js';` 추가 (easeMult는 Task 4용).

- [ ] **Step 2: giveReward 부스트** — game.js:8798 함수 첫머리에:

```js
function giveReward(r, source = 'reward', item = null) {
  // 🧪 [베타 A군] 가입 3일 부스트 — 출석·퀘스트·럭키박스 코인 ×1.5, 원장 item에 |boost 마커(원값=÷1.5 복원 가능)
  if (r.coins && TUNING.rewardBoost.sources.includes(source)) {
    const bm = rewardBoostMult(authState.variant, authState.createdAt);
    if (bm > 1) { r = { ...r, coins: Math.round(r.coins * bm) }; item = (item ?? source) + '|boost'; }
  }
  for (const k in r) gameState.inventory[k] = (gameState.inventory[k] || 0) + r[k];
  // …이하 기존 코드 그대로(logEcon·refreshInventoryUI·spawnFloatText)…
```

- [ ] **Step 3: sellItem 부스트** — game.js:6267 `const gain = priceOf(k) * qty;` 를 다음으로 교체하고, 6274행 `logEcon('shop_sell', k, gain, ...)`의 `k`를 `ledgerItem`으로 교체:

```js
  const bm = rewardBoostMult(authState.variant, authState.createdAt);   // 🧪 [베타 A군] 판매 부스트
  const gain = Math.round(priceOf(k) * qty * bm);
  const ledgerItem = bm > 1 ? k + '|boost' : k;
```

(trackEvent('shop_sell')의 gain은 부스트 반영값 그대로 — 별도 수정 불필요)

- [ ] **Step 4: 검증** — 프리뷰 `?forceVariant=beta_A` 게스트 플레이. 게스트는 createdAt이 없어 부스트가 안 붙는 게 정상이므로, 콘솔에서 `(await import('./js/supabase-client.js')).state.createdAt = new Date().toISOString()` 주입 후: 작물 1개 판매 → 코인 증가가 시세×1.5(반올림)인지, 콘솔 `[GA4 폴백] event: econ_tx` 로그의 item에 `|boost` 마커 확인. `beta_B`로는 원값 확인.

- [ ] **Step 5: Commit** — `git add js/game.js && git commit -m "Feat: 🧪 베타 A군 보상 부스트 — 출석·퀘스트·판매 ×1.5(가입 3일), 원장 |boost 마커"`

---

### Task 4: 첫 3회 관대 판정 (호수낚시·바다낚시·안개 리듬)

**Files:**
- Modify: `js/game.js:632-648` 부근 (gameState 초기 객체), `js/game.js:1481-1489` 부근 (세이브 로드 병합), `js/game.js:445` (fishEase 변수), `js/game.js:8014-8017` (호수 cast), `js/game.js:8058` (biteEnd), `js/game.js:4936-4959` (sea fight), `js/game.js:4165` (startSoothe), `js/game.js:4182-4204` (sootheTap)

**Interfaces:**
- Consumes: `easeMult` (Task 1에서 임포트 완료), `authState` (Task 3에서 임포트 완료)
- Produces: `gameState.beta = { tries: { fish, sea, mist } }` — 세이브에 저장됨

- [ ] **Step 1: 상태·헬퍼 추가** — gameState 초기 객체(`mist: {...},` 640행 근처)에 한 줄:

```js
  beta: { tries: {} },   // 🧪 미니게임별 시도 횟수 { fish, sea, mist } — 첫 3회 관대 판정용
```

세이브 로드부(1489행 `if (saved.night)` 근처)에:

```js
  if (saved.beta) gameState.beta = { tries: {}, ...saved.beta };   // 🧪 관대 판정 카운터 복원
```

헬퍼를 giveReward 근처에 추가:

```js
// 🧪 [베타 A군] 미니게임 첫 3회 관대 판정 — 시도 카운트를 올리고 현재 ease 배율을 돌려준다
function betaEase(game) {
  const t = gameState.beta.tries;
  const m = easeMult(authState.variant, t[game]);
  t[game] = (t[game] || 0) + 1;
  return m;
}
```

- [ ] **Step 2: 호수낚시** — 445행 `let biteAt = 0, biteEnd = 0;` 옆에 `let fishEase = 1;` 선언. cast 함수(8014행 `fishState = 'wait'; biteAt = ...`) 직전에 `fishEase = betaEase('fish');` 추가. 8058행을:

```js
      fishState = 'bite'; biteEnd = now + (gameState.upgrades.rod ? 2.6 : 1.4) * fishEase; // 튼튼한 낚싯대: 입질 여유↑ · 🧪첫 3회 관대
```

- [ ] **Step 3: 바다낚시** — sea cast 시작부(4936행 `seaMG.sp = best.sp; seaMG.st = 'cast';`)에 `seaMG.ease = betaEase('sea');` 추가. 4951행과 4958행을:

```js
      seaMG.progress = Math.min(1, seaMG.progress + sp.tap * (seaMG.ease || 1));   // 🧪첫 3회: 연타 효율↑
```
```js
      seaMG.bad++; seaMG.pz -= 0.5 * sp.drag / (seaMG.ease || 1);                  // 🧪첫 3회: 끌림 완화
```

- [ ] **Step 4: 안개 리듬** — startSoothe(4165행 `mist.soothe = { sp, step: 0, phase: 0, note };`)에 `ease: betaEase('mist'),` 필드 추가. sootheTap 판정(4184행 `if (so.phase >= 0.62 && so.phase <= 0.99)`)을:

```js
  const lo = 1 - 0.38 * (so.ease || 1);                 // 기본 0.62 — 🧪첫 3회 0.506(창 ×1.3)
  if (so.phase >= lo && so.phase <= 0.99) {             // 🎯 ♪가 작아진 순간
```

- [ ] **Step 5: 검증** — 프리뷰 `?forceVariant=beta_A`: 호수낚시 4회 시도 — 콘솔에서 `getGameState().beta.tries.fish`가 4, 1~3회차 입질 여유가 길었는지 확인(1.4→1.82초). `beta_B`에선 배율 1 확인. 저장→새로고침→`beta.tries` 복원 확인. (getGameState는 index.html:1375에서 이미 임포트되어 콘솔 접근 가능 — 안 되면 세이브 데이터로 확인)

- [ ] **Step 6: Commit** — `git add js/game.js && git commit -m "Feat: 🧪 베타 A군 첫 3회 관대 판정 — 호수 입질창·바다 연타/끌림·안개 리듬창 ×1.3"`

---

### Task 5: 튜토리얼 재배치 (A군) + 스텝별 카운터

**Files:**
- Modify: `index.html:1373-1382` (임포트), `index.html:1952-1998` (TUT_STEPS·renderCoach·startCoach)
- Modify: `js/metrics.js:37` (onTrack 카운터)

**Interfaces:**
- Consumes: `TUNING.TUT_ORDER_A, isBetaA` (tuning.js), `authState.variant` (index.html은 1374행에서 이미 `state as authState` 임포트 중)
- Produces: `session_logs.counts`에 `tut_<key>` 스텝별 카운트 — Task 6 SQL의 튜토리얼 퍼널이 사용

- [ ] **Step 1: 임포트** — index.html:1377 근처에 `import { TUNING, isBetaA } from './js/tuning.js';`

- [ ] **Step 2: 순서 적용 + 동적 번호** — `startCoach()`(1994행) 첫머리에:

```js
      // 🧪 [베타 A군] 재미 단계(낚시·집짓기·꾸미기) 전진 — 스텝 내용은 그대로, 순서만
      if (isBetaA(authState.variant)) {
        TUT_STEPS.sort((a, b) => TUNING.TUT_ORDER_A.indexOf(a.key) - TUNING.TUT_ORDER_A.indexOf(b.key));
      }
```

`renderCoach()`(1990행)의 `$('coach-text').textContent = TUT_STEPS[tutIdx].text;`를 원문자 번호 동적 교체로:

```js
      // 원문자 번호를 현재 위치 기준으로 재부여 — 한국어 원문(i18n 키)은 변경하지 않는다.
      // A군 영어 표시는 번호 차이로 번역 키 미스가 날 수 있으나 베타 대상자는 전원 한국어 사용자라 허용.
      const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰';
      $('coach-text').textContent = TUT_STEPS[tutIdx].text.replace(/^[①-⑰]/, CIRC[tutIdx]);
```

- [ ] **Step 3: 스텝별 카운터** — `js/metrics.js:37`의 onTrack 훅(`onTrack((name) => { if (name !== 'econ_tx' && name !== 'session_summary') counts[name] = (counts[name] || 0) + 1; });`)을:

```js
onTrack((name, p) => {
  if (name === 'econ_tx' || name === 'session_summary') return;
  counts[name] = (counts[name] || 0) + 1;
  if (name === 'tutorial_step' && p?.key) counts['tut_' + p.key] = (counts['tut_' + p.key] || 0) + 1; // 🧪 군별 스텝 퍼널용
});
```

- [ ] **Step 4: 검증** — 프리뷰 `?forceVariant=beta_A` 신규 게스트: 코치 4번째 스텝이 `④ …낚시…`로 표시되는지(원문자 번호가 위치 기준 재부여), `beta_B`(또는 파라미터 없음)는 현행 순서 그대로인지. 스텝 하나 완료 후 콘솔 `[GA4 폴백] event: tutorial_step` 확인.

- [ ] **Step 5: Commit** — `git add index.html js/metrics.js && git commit -m "Feat: 🧪 베타 A군 튜토리얼 재배치(낚시·집짓기 전진)·스텝별 tut_* 카운터"`

---

### Task 6: cf_beta_overview RPC (SQL)

**Files:**
- Modify: `sql/admin_analytics.sql` (§베타 섹션에 이어서 추가 — Task 2 다음)

**Interfaces:**
- Consumes: `beta_testers`(Task 2), `session_logs`(counts jsonb·variant·play_sec·started_at·updated_at), `game_saves`(state jsonb), `game_logs`(variant·created_at·client_id·user_id), `cf_share_links`(기존 공유 토큰), `auth.users`(email→id)
- Produces: `public.cf_beta_overview(days int default 7, token text default null) returns jsonb` — Task 7 대시보드가 호출. 반환 형태:
  `{ "testers": [{email,grp,user_id,last_seen,sessions,play_sec,coins,house_stage,tutorial,streak}], "ab_daily": [{day,variant,dau,avg_play_sec}], "tut_funnel": [{variant,key,users}], "minigame": [{variant,event,n}] }`

- [ ] **Step 1: RPC 작성** — `cf_admin_overview`(29행)의 권한 블록을 그대로 복제해 사용:

```sql
drop function if exists public.cf_beta_overview(int, text);
create or replace function public.cf_beta_overview(days int default 7, token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text[] := array['icuchoel@gmail.com'];  -- ★ 관리자 이메일(소문자) — cf_admin_overview와 동일하게 유지
  tz constant text := 'Asia/Seoul';
  allowed boolean := false;
  since timestamptz;
  result jsonb;
begin
  if caller_email = any (admins) then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s
       set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_beta_overview.token and s.expires_at > now();
    allowed := found;
  end if;
  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  days := greatest(1, least(coalesce(days, 7), 90));
  since := now() - make_interval(days => days);

  with
  roster as (  -- 명단 ⨝ 계정(가입 전 테스터는 user_id null로 표시)
    select bt.email, bt.grp, u.id as user_id
    from beta_testers bt
    left join auth.users u on lower(u.email) = bt.email
  ),
  tester_sessions as (
    select r.email, r.grp, r.user_id,
           max(sl.updated_at)                          as last_seen,
           count(sl.session_id)                        as sessions,
           coalesce(sum(nullif(sl.play_sec, 0)), 0)    as play_sec
    from roster r
    left join session_logs sl on sl.user_id = r.user_id and sl.updated_at >= since
    group by r.email, r.grp, r.user_id
  ),
  tester_saves as (
    select gs.user_id,
           coalesce((gs.state -> 'inventory' ->> 'coins')::int, 0)        as coins,
           coalesce((gs.state ->> 'houseStage')::int, 0)                  as house_stage,
           coalesce((gs.state ->> 'tutorialSeen')::boolean, false)        as tutorial,
           coalesce((gs.state -> 'daily' ->> 'streak')::int, 0)           as streak
    from game_saves gs
    where gs.user_id in (select user_id from roster where user_id is not null)
  ),
  ab_daily as (  -- 군별 일별 활동(베타 variant만)
    select ((gl.created_at at time zone tz))::date as day,
           gl.variant,
           count(distinct coalesce(nullif(gl.client_id,''), gl.user_id::text)) as dau
    from game_logs gl
    where gl.variant in ('beta_A','beta_B') and gl.created_at >= since
    group by 1, 2
  ),
  ab_play as (
    select ((coalesce(sl.started_at, sl.updated_at) at time zone tz))::date as day,
           sl.variant, round(avg(nullif(sl.play_sec,0)))::int as avg_play_sec
    from session_logs sl
    where sl.variant in ('beta_A','beta_B') and sl.updated_at >= since
    group by 1, 2
  ),
  tut_funnel as (  -- 군별 스텝 도달 유저 수 (session_logs.counts의 tut_<key>)
    select sl.variant, replace(e.key, 'tut_', '') as key,
           count(distinct sl.user_id) as users
    from session_logs sl, jsonb_each_text(coalesce(sl.counts, '{}'::jsonb)) e
    where sl.variant in ('beta_A','beta_B') and e.key like 'tut\_%' and sl.updated_at >= since
    group by 1, 2
  ),
  minigame as (  -- 군별 미니게임 성공/실패 이벤트 합
    select sl.variant, e.key as event, sum(e.value::numeric)::bigint as n
    from session_logs sl, jsonb_each_text(coalesce(sl.counts, '{}'::jsonb)) e
    where sl.variant in ('beta_A','beta_B') and sl.updated_at >= since
      and e.key in ('fishing_catch','fishing_miss','sea_catch','sea_miss','mist_soothe','mist_soothe_miss','boat_hit')
      and e.value ~ '^[0-9]+$'
    group by 1, 2
  )
  select jsonb_build_object(
    'testers', (select coalesce(jsonb_agg(jsonb_build_object(
                  'email', ts.email, 'grp', ts.grp, 'user_id', ts.user_id,
                  'last_seen', ts.last_seen, 'sessions', ts.sessions, 'play_sec', ts.play_sec,
                  'coins', sv.coins, 'house_stage', sv.house_stage, 'tutorial', sv.tutorial, 'streak', sv.streak
                ) order by ts.grp, ts.email), '[]'::jsonb)
                from tester_sessions ts left join tester_saves sv using (user_id)),
    'ab_daily', (select coalesce(jsonb_agg(jsonb_build_object(
                  'day', d.day, 'variant', d.variant, 'dau', d.dau, 'avg_play_sec', p.avg_play_sec
                ) order by d.day), '[]'::jsonb)
                from ab_daily d left join ab_play p using (day, variant)),
    'tut_funnel', (select coalesce(jsonb_agg(jsonb_build_object(
                  'variant', variant, 'key', key, 'users', users)), '[]'::jsonb) from tut_funnel),
    'minigame', (select coalesce(jsonb_agg(jsonb_build_object(
                  'variant', variant, 'event', event, 'n', n)), '[]'::jsonb) from minigame)
  ) into result;
  return result;
end $$;

revoke all on function public.cf_beta_overview(int, text) from public;
grant execute on function public.cf_beta_overview(int, text) to authenticated, anon;
```

- [ ] **Step 2: 검증** — 유저에게 Supabase SQL 편집기에서 §베타 섹션 전체 실행을 요청. 이어 편집기에서 `select public.cf_beta_overview(7);` — 권한 예외 없이 jsonb 4키(testers/ab_daily/tut_funnel/minigame) 반환 확인(테스터 미등록 시 빈 배열 정상).

- [ ] **Step 3: Commit** — `git add sql/admin_analytics.sql && git commit -m "Feat: 🧪 cf_beta_overview RPC — 테스터 개별 현황·군별 일별·튜토리얼 퍼널·미니게임 성공률"`

---

### Task 7: beta_monitor.html — 목업 승격 + 실데이터 연동

**Files:**
- Create: `dashboards/beta_monitor.html` (시작점: `/private/tmp/claude-501/-Users-uicheol-hwang-calm-forest/46e84f64-b216-4226-addb-e623d300bed0/scratchpad/beta-monitor-mockup.html` — "베타 관제" 아티팩트 원본. 맨 앞 frame-runtime `<script>`와 `<!doctype html><html><head>…</head><body>` 래퍼는 아티팩트 호스팅용이므로 제거하고, `<title>베타 관제</title>` 이후 본문만 가져와 일반 HTML 문서로 재구성)
- Reference: `dashboards/admin_analytics.html:190-220` (인증·RPC 패턴), `dashboards/_dash.css`

**Interfaces:**
- Consumes: `cf_beta_overview(days, token)` — Task 6의 반환 jsonb 형태 그대로

- [ ] **Step 1: 목업 이식** — mockup 파일에서 래퍼 제거 후 `dashboards/beta_monitor.html`로 저장. `<link rel="stylesheet" href="_dash.css">` 추가하고, 목업 인라인 팔레트 변수 중 `_dash.css`와 중복 정의는 삭제(토큰 단일 소스 규칙).

- [ ] **Step 2: 인증·데이터 연동** — `admin_analytics.html`의 부트 블록(193행 createClient ~ 215행 rpc 호출)을 복제해 목업의 목데이터 주입부를 대체:

```js
const { data, error } = await sb.rpc('cf_beta_overview', shareKey ? { days, token: shareKey } : { days });
```

반환 jsonb 매핑: `testers`→개별 현황 테이블, `ab_daily`→군별 DAU/체류 차트, `tut_funnel`→스텝 퍼널(정렬: B군은 현행 TUT_STEPS 순서, A군은 Task 1의 TUT_ORDER_A 순서 — 대시보드에 두 배열을 상수로 복사해 사용), `minigame`→성공률(`catch/(catch+miss)` — 쌍: fishing_catch/fishing_miss, sea_catch/sea_miss, mist_soothe/mist_soothe_miss). 목업의 패널 구조·차트 골격은 유지하고 데이터 소스만 교체.

- [ ] **Step 3: 주의 문구** — A/B 비교 패널 부제에 각주 1줄: `군당 5명 — 수치는 방향성 참고용(유의성 없음)`. **신규 한국어 문구이므로 커밋 전 유저에게 이 한 줄을 보여주고 승인받을 것** (Global Constraints의 선검수 규칙).

- [ ] **Step 4: 검증** — 프리뷰로 `dashboards/beta_monitor.html` 열기 → 구글 로그인 버튼 표시 확인. 관리자 로그인이 가능하면 실데이터 렌더까지, 아니면 RPC 에러가 admin_analytics와 동일한 방식으로 우아하게 표시되는지 확인. 콘솔 에러 0. 다크모드(`resize_window` colorScheme: dark) 렌더 확인.

- [ ] **Step 5: Commit** — `git add dashboards/beta_monitor.html && git commit -m "Feat: 🧪 베타 관제 대시보드 — 목업 승격·cf_beta_overview 연동(운영자 전용)"`

---

### Task 8: 통합 검증 + 배포

**Files:** 없음 (검증·병합만)

- [ ] **Step 1: 회귀 확인** — 프리뷰에서 파라미터 없이(일반 유저 경로) 접속: variant `control`, 보상 원값, 판정 현행, 튜토리얼 현행 순서, 콘솔 에러 0.
- [ ] **Step 2: A/B 경로 재확인** — `?forceVariant=beta_A`·`beta_B` 각 1회 스모크(튜토리얼 순서·보상·판정).
- [ ] **Step 3: SQL 실행 확인** — 유저가 §베타 섹션(테이블+RPC)을 Supabase에 실행했는지 확인하고, 테스터 명단 등록 insert 예시를 다시 제시.
- [ ] **Step 4: 병합·배포** — 유저 확인 후: `git checkout main && git merge dev --no-edit && git push origin main dev` (Cloudflare Pages 자동 배포). 배포 후 `calmforest.cloud/dashboards/beta_monitor.html` 접속 확인.
- [ ] **Step 5: 메모리 갱신** — beta-test-plan.md 메모리에 "구현 완료" 상태와 SQL 실행·명단 등록 여부 기록.
