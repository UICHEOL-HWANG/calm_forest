// =============================================================
//  calm forest · 🎮 게임 진입 공용 루틴
//  ------------------------------------------------------------
//  shoot.mjs(정지 캡처)와 record.mjs(플레이 녹화)가 같이 쓴다.
//  로그인 게이트·캐릭터 선택·인트로·튜토리얼은 게임이 바뀌면 같이 바뀐다.
//  두 벌로 복사해 두면 한쪽만 조용히 깨진다 — 그래서 여기 한 곳에 둔다.
// =============================================================

/** HUD 전부 숨김. body 직계 중 #app(Three.js 캔버스)만 남긴다 —
 *  id 를 하나씩 나열하면 UI 가 추가될 때마다 깨진다. */
export const PHOTOMODE = 'body > *:not(#app):not(script){display:none!important}';

/** 보이면 누른다. 고정 순서로 기다리면 두 번째 실행부터 타임아웃이 난다
 *  (localStorage 에 진행이 남아 인트로·튜토리얼이 아예 안 뜬다). */
export async function step(page, sel, timeout = 8000) {
  try { await page.waitForSelector(sel, { state: 'visible', timeout }); }
  catch { return false; }
  // 캔버스·모달 오버레이가 포인터를 가로채 Playwright 의 클릭 가능성 검사에 걸린다.
  // 눈에 보이는 게 확인됐으면 DOM 클릭으로 넘긴다.
  await page.evaluate(s => document.querySelector(s)?.click(), sel);
  return true;
}

/** 실제로 플레이 화면에 들어왔는가. 인트로 레이어가 남아 있으면 아직이다. */
export async function inPlay(page) {
  return page.evaluate(() => {
    if (document.querySelector('#login-screen.show')) return false;
    if (!document.body.classList.contains('playing')) return false;
    const intro = document.querySelector('#intro-layer');
    if (intro && getComputedStyle(intro).display !== 'none') return false;
    return typeof window.__pos === 'function' && Array.isArray(window.__pos());
  });
}

/** @param opts.skipMs  인트로·튜토리얼 스킵 버튼을 기다리는 시간
 *  @param opts.playMs  플레이 화면 진입을 기다리는 시간
 *  기본값은 shoot.mjs 가 쓰던 값 그대로다. 녹화(record.mjs)는 영상 인코딩
 *  부담으로 기동이 더 느려 이 값을 키워서 부른다. */
export async function enterGame(page, opts = {}) {
  const skipMs = opts.skipMs ?? 6000;
  const playMs = opts.playMs ?? 20000;

  if (!await step(page, '#guest-btn', 30000)) throw new Error('로그인 게이트 통과 실패');  // 구글 로그인 안 씀
  if (!await step(page, '#char-confirm', 30000)) throw new Error('캐릭터 선택 실패');
  // 예산 6초. 예전 4초는 DSF 2 에서 모자랐다 — 헤드리스가 2배 해상도로 그리면 프레임이
  // 1/2~1/4 로 떨어지고, 집 리디자인·야외 장식·배칭이 들어가며 기동이 더 느려져
  // 스킵 버튼이 4초 안에 안 떴다.
  await step(page, '#intro-skip', skipMs);   // 이미 본 세이브면 안 뜬다
  await step(page, '#tut-skip', skipMs);     // 〃

  // ⚠️ step() 은 "안 보이면 그냥 지나간다". 그래서 스킵을 놓쳐도 촬영은 계속됐고
  //    인트로 도시가 마을 컷인 척 찍혔다(village_noon 이 밝기 170 → 72 로 바뀐 사고).
  //    조용히 틀린 그림을 내보내느니 여기서 멈춘다.
  for (let i = 0; i < Math.ceil(playMs / 500); i++) {
    if (await inPlay(page)) return;
    // 인트로가 아직 돌고 있으면 스킵 버튼이 늦게 뜬 것일 수 있다 — 보이면 누른다
    await step(page, '#intro-skip', 300);
    await page.waitForTimeout(500);
  }
  const why = await page.evaluate(() => ({
    login: !!document.querySelector('#login-screen.show'),
    playing: document.body.classList.contains('playing'),
    intro: !!document.querySelector('#intro-layer') &&
           getComputedStyle(document.querySelector('#intro-layer')).display !== 'none',
    pos: window.__pos?.() ?? null,
  }));
  throw new Error(`20초 안에 플레이 화면 진입 실패 — ${JSON.stringify(why)}`);
}
