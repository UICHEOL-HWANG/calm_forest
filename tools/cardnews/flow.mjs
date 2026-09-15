// =============================================================
//  calm forest · 🎬 Flow 영상 생성 (aside CLI 로 브라우저를 몬다)
//  ------------------------------------------------------------
//  node flow.mjs --ref shots/_ref_city_slump.png \
//                --prompt "..." --out clips/01_city.mp4
//
//  왜 API 가 아니라 브라우저인가:
//    Veo API 는 초당 과금이다(Lite 8초 $0.64). Flow 웹은 무료 등급이 매일
//    50 크레딧을 주고 한 편에 10 크레딧이라 하루 5편까지 $0 이다.
//    ⚠️ 대신 한국은 워터마크가 강제(스위치 비활성)고 무료는 720p 가 상한이다.
//
//  ⚠️ aside repl 의 함정 — 전부 실측으로 확인한 것들이다:
//   1. page 가 호출마다 초기화된다 → 매번 attachBrowserTab() 으로 재부착
//   2. 파일 경로가 세션 디렉터리로 샌드박싱되고, 그 디렉터리는 호출마다
//      새로 생긴다 → 바깥 파일을 미리 넣어둘 수 없다.
//      들여올 때는 로컬 서버(:8000) 경유 fetch, 꺼낼 때는 pwd 를 찍어
//      이 스크립트가 copyFile 로 가져온다.
//   3. ref ID 는 snapshot 마다 무효화된다 → 이름으로 매번 다시 찾는다
//   4. "중지 버튼 사라짐 ≠ 완료". 큐 대기가 따로 있다(무료 등급은 몇 분).
//      완료 판정은 동영상 타일 수가 늘었는지로 한다.
//   5. 소재 피커는 2.5초로 모자랐다 → 4초
// =============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, stat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const PORT = process.env.CF_PORT || '8000';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** aside 실행 파일을 찾는다.
 *  ⚠️ 함정이 두 겹이다. 이 스크립트를 **aside 루틴이 부를 때**:
 *   1. 에이전트 셸의 PATH 에 aside 가 없다(runtime/bin 엔 node·python 만)
 *   2. HOME 이 샌드박스 홈(~/.aside/runtime/home)이라 $HOME 기준 경로도 빗나간다
 *  둘 다 "사람이 터미널에서 돌리면 되는데 루틴에서만 실패"해서 찾기 어렵다.
 *  그래서 실재하는 절대경로를 직접 훑는다. */
function findAside() {
  if (process.env.ASIDE_BIN) return process.env.ASIDE_BIN;
  const home = process.env.HOME || '';
  const real = home.includes('/.aside/runtime') ? home.split('/.aside/runtime')[0] : home;
  for (const p of [`${real}/.local/bin/aside`,
                   `${real}/.aside/cli/Aside CLI.app/Contents/MacOS/aside`,
                   '/usr/local/bin/aside', '/opt/homebrew/bin/aside']) {
    if (existsSync(p)) return p;
  }
  throw new Error('aside 실행 파일을 못 찾았다 — ASIDE_BIN 으로 지정할 것');
}
const ASIDE = findAside();

/** aside repl 한 번 호출. 실패 사유를 그대로 올린다 — 조용한 폴백 금지 */
async function repl(code) {
  const { stdout, stderr } = await run(ASIDE, ['repl', code], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180_000,
  });
  const out = stdout + stderr;
  if (/\[error \|/.test(out)) throw new Error(`aside repl 실패:\n${out}`);
  return out;
}

/** 출력에서 KEY=값 한 줄을 뽑는다 */
const pick = (out, key) => (out.match(new RegExp(`^${key}=(.+)$`, 'm')) || [])[1]?.trim();

/** 열려 있는 Flow 탭의 targetId. 없으면 새로 연다.
 *  ⚠️ URL 에 'flow.google.com' 이 들어 있는지로 찾으면 안 된다. 로그인
 *     리다이렉트 탭(accounts.google.com/...?continue=https://flow.google.com/)
 *     이 걸려 엉뚱한 탭을 몰게 된다 — 실제로 한 번 당했다. 호스트명으로 본다. */
async function flowTab() {
  const find = () => repl(`
    const isFlow = u => { try { return new URL(u).hostname === 'flow.google.com'; } catch { return false; } };
    const t = await listBrowserTabs();
    const f = t.find(x => isFlow(x.url));
    if (f) console.log('TAB=' + f.targetId);
  `);

  let id = pick(await find(), 'TAB');
  if (!id) {
    // ⚠️ repl 안에서 openTab() 으로 연 탭은 **그 세션이 끝나면 닫힌다**.
    //    이 스크립트는 단계마다 새 repl 세션을 쓰므로, 다음 단계에서
    //    "No open browser tab found" 로 죽는다(실제로 두 번 당했다).
    //    `aside <url>` 로 열어야 앱 탭으로 남아 세션 간에 유지된다.
    await run(ASIDE, ['https://flow.google.com/'], { timeout: 180_000 })
      .catch(() => {});                      // 에이전트가 뭐라 답하든 탭만 열리면 된다
    await new Promise(r => setTimeout(r, 4000));
    id = pick(await find(), 'TAB');
  }
  if (!id) throw new Error('Flow 탭을 못 찾았다 — Aside 브라우저에서 flow.google.com 을 열어둘 것');
  return id;
}

/** 로컬 서버가 떠 있어야 참조 이미지를 repl 안으로 들여올 수 있다 */
async function assertServer(urlPath) {
  const res = await fetch(`http://localhost:${PORT}${urlPath}`, { method: 'HEAD' }).catch(() => null);
  if (!res?.ok) {
    throw new Error(
      `로컬 서버에서 참조 이미지를 못 읽는다: http://localhost:${PORT}${urlPath}\n` +
      `  → python3 scripts/serve.py ${PORT} 를 먼저 띄울 것`);
  }
}

/** 남은 Flow 크레딧. 생성이 진짜 돌았는지의 **유일한 물증**이다.
 *  화면 요소는 전환만으로도 늘었다 줄었다 한다 — 실제로 타일 개수로 완료를
 *  판정했다가 "안 만들어졌는데 완료" 로 읽고 크레딧 20개를 흘렸다. */
async function credits(tab) {
  const out = await repl(`
    await attachBrowserTab('${tab}');
    const B = (t, n) => (t.match(new RegExp('button "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];
    let a = await snapshot(page, { interactive: true });
    if (!B(a.tree, '계정 패널 닫기')) {
      // ⚠️ 동영상 편집기 화면엔 '계정 세부정보' 가 없다. 가드 없이 누르려다
      //    첫 단계에서 통째로 터졌다 — 프로젝트 화면으로 먼저 빠져나온다.
      let acct = B(a.tree, '계정 세부정보');
      if (!acct) {
        const out = B(a.tree, '이전 페이지로 이동하는 뒤로 버튼') || B(a.tree, '뒤로') || B(a.tree, '홈');
        if (out) { await page.locator(out).click(); await sleep(3000);
                   a = await snapshot(page, { interactive: true });
                   acct = B(a.tree, '계정 세부정보'); }
      }
      if (!acct) throw new Error('계정 세부정보 버튼을 못 찾았다 — 크레딧을 읽을 수 없다');
      await page.locator(acct).click();
      await sleep(2200);
    }
    const s = await snapshot(page);
    const m = s.tree.match(/Google Flow 크레딧 (\\d+)개/);
    const b = await snapshot(page, { interactive: true });
    const cl = B(b.tree, '계정 패널 닫기');
    if (cl) { await page.locator(cl).click(); await sleep(1200); }
    if (m) console.log('CREDITS=' + m[1]);
  `);
  const n = Number(pick(out, 'CREDITS'));
  if (!Number.isFinite(n)) throw new Error(`크레딧을 못 읽었다:\n${out}`);
  return n;
}

/** 프로젝트 `동영상` 컬렉션의 타일 수.
 *
 *  ⚠️ 완료 판정을 채팅의 "편집기에서 동영상 열기" 버튼 수로 했다가 두 번 실패했다.
 *     새 생성을 걸면 채팅 세션이 새로 시작되면서 이전 버튼이 사라지고 새 버튼이
 *     생긴다 — 개수가 1 에서 안 늘어 15분을 기다리다 실패로 끝났다(크레딧은 나갔다).
 *     그래서 **항상 같은 화면(동영상 컬렉션)으로 이동한 뒤** 타일을 센다.
 *     화면을 고정하지 않으면 타일 수도 전환만으로 흔들린다 — 그것도 당했다. */
async function videoTiles(tab) {
  const out = await repl(`
    await attachBrowserTab('${tab}');
    const B = (t, n) => (t.match(new RegExp('button "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];
    const G = (t, n) => (t.match(new RegExp('generic "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];

    let a = await snapshot(page, { interactive: true });
    // 홈이면 프로젝트로 들어간다
    if (!G(a.tree, '동영상')) {
      const op = (a.tree.match(/link "프로젝트 열기"[^\\n]*\\[ref=(e\\d+)\\]/) || [])[1];
      if (op) { await page.locator(op).click(); await sleep(6000);
                a = await snapshot(page, { interactive: true }); }
    }
    const nav = G(a.tree, '동영상');
    if (!nav) throw new Error('동영상 컬렉션으로 못 갔다');
    await page.locator(nav).click();
    await sleep(3500);
    const s = await snapshot(page);
    console.log('N=' + (s.tree.match(/생성된 동영상 썸네일/g) || []).length);
  `);
  const n = Number(pick(out, 'N'));
  if (!Number.isFinite(n)) throw new Error(`타일 수를 못 셌다:\n${out}`);
  return n;
}

async function main() {
  const refPath = arg('--ref');
  const prompt = arg('--prompt');
  const outPath = arg('--out');

  // 이미 Flow 에 만들어진 최신 영상만 받아온다 — 크레딧을 쓰지 않는다.
  // 다운로드 단계에서 실패했을 때 생성부터 다시 하지 않으려고 둔다.
  if (argv.includes('--fetch-latest')) {
    if (!outPath) { console.error('사용: node flow.mjs --fetch-latest --out <mp4>'); process.exit(1); }
    await downloadLatest(await flowTab(), outPath);
    return;
  }

  if (!refPath || !prompt || !outPath) {
    console.error('사용: node flow.mjs --ref <이미지> --prompt "<문구>" --out <mp4>');
    console.error('      node flow.mjs --fetch-latest --out <mp4>   (생성 없이 최신본만)');
    process.exit(1);
  }

  // 참조 이미지는 저장소 안에 있어야 한다 — 로컬 서버가 서빙해야 하므로
  const abs = resolve(HERE, refPath);
  if (!abs.startsWith(ROOT + '/')) throw new Error(`참조 이미지가 저장소 밖이다: ${abs}`);
  const urlPath = '/' + abs.slice(ROOT.length + 1).split('/').map(encodeURIComponent).join('/');
  await assertServer(urlPath);

  const tab = await flowTab();
  const cr0 = await credits(tab);
  const res0 = await videoTiles(tab);
  console.log(`탭 ${tab.slice(0, 8)}… · 크레딧 ${cr0}개 · 기존 동영상 ${res0}개`);
  if (cr0 < 10) throw new Error(`크레딧이 ${cr0}개뿐이다 (한 편에 10개). 내일 리셋을 기다릴 것`);

  // ── 업로드 → 프롬프트 연결 → 문구 입력 → 생성 ──────────────
  const esc = prompt.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const out1 = await repl(`
    const r = await fetch('http://localhost:${PORT}${urlPath}');
    if (!r.ok) throw new Error('참조 이미지 fetch 실패 ' + r.status);
    const dest = path.join(pwd, 'ref.png');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));

    await attachBrowserTab('${tab}');
    const B = (t, n) => (t.match(new RegExp('button "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];

    // 설정 패널·계정 다이얼로그가 열려 있으면 닫고 시작한다.
    // ⚠️ '닫기' 는 절대 누르지 않는다 — 그건 채팅 세션 패널을 닫는 버튼이고,
    //    크레딧 승인창이 바로 그 패널 안에 뜬다. 닫아 놓으면 승인창을 영영
    //    못 찾고, 생성은 시작도 안 된 채 성공으로 읽힌다(실제로 당했다).
    let a = await snapshot(page, { interactive: true });
    for (const name of ['뒤로', '계정 패널 닫기']) {
      const r0 = B(a.tree, name);
      if (r0) { await page.locator(r0).click(); await sleep(1500);
                a = await snapshot(page, { interactive: true }); }
    }

    // ⚠️ 프롬프트 UI 는 **프로젝트 안에만** 있다. Flow 홈(프로젝트 목록)에 있으면
    //    소재 추가 버튼이 없다 — 어제는 이미 들어가 있어서 안 드러났다.
    if (!B(a.tree, '프롬프트 상자에 소재 추가')) {
      const openProj = (a.tree.match(/link "프로젝트 열기"[^\\n]*\\[ref=(e\\d+)\\]/) || [])[1]
                    || B(a.tree, '새 프로젝트');
      if (!openProj) throw new Error('프로젝트를 열 수 없다 — Flow 화면 상태를 확인할 것');
      await page.locator(openProj).click();
      await sleep(6000);
      a = await snapshot(page, { interactive: true });
    }

    const addRef = B(a.tree, '프롬프트 상자에 소재 추가');
    if (!addRef) throw new Error('소재 추가 버튼을 못 찾았다 (프로젝트 진입 실패)');
    await page.locator(addRef).click();
    await sleep(4000);                                   // ⚠️ 2.5초는 모자랐다

    const b = await snapshot(page, { interactive: true });
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 20000 }),
      page.locator(B(b.tree, '미디어 업로드')).click(),
    ]);
    await fc.setFiles(dest);
    await sleep(12000);                                  // 업로드 반영 대기

    const c = await snapshot(page, { interactive: true });
    const opt = c.tree.match(/option "ref\\.png[^"]*"[^\\n]*\\[ref=(e\\d+)\\]/);
    if (!opt) throw new Error('업로드한 자산을 목록에서 못 찾았다');
    await page.locator(opt[1]).click();
    await sleep(2500);

    // ⚠️ 자산을 고르는 것만으로 프롬프트에 붙고 피커가 닫히는 경우가 있다.
    //    그때는 '프롬프트에 추가' 버튼이 아예 없다 — 없는 걸 누르려다 터졌었다.
    let d = await snapshot(page, { interactive: true });
    const addBtn = B(d.tree, '프롬프트에 추가');
    if (addBtn) { await page.locator(addBtn).click(); await sleep(3000);
                  d = await snapshot(page, { interactive: true }); }

    // 소재가 정말 붙었는지 확인한다. 안 붙은 채로 생성하면 화풍이 통째로 달라진다
    if (!/button "소재"/.test(d.tree)) throw new Error('참조 이미지가 프롬프트에 안 붙었다');

    const tb = d.tree.match(/textbox \\[ref=(e\\d+)\\]/);
    if (!tb) throw new Error('프롬프트 입력창을 못 찾았다');
    await page.locator(tb[1]).click();
    await page.keyboard.type('${esc}', { delay: 2 });
    await sleep(2500);

    const f = await snapshot(page, { interactive: true });
    const go = f.tree.match(/button "생성 시작"(?! \\[disabled\\])[^\\n]*\\[ref=(e\\d+)\\]/);
    if (!go) throw new Error('생성 시작이 비활성이다 — 프롬프트·소재 연결 실패');
    await page.locator(go[1]).click();

    // ⚠️ 클릭했다고 제출된 게 아니다. 실제로 세션이 돌기 시작하면 '중지' 버튼이
    //    뜬다(실측: 즉시). 이 확인이 없어서 "시작됨"만 찍고 아무 일도 안 일어난
    //    채로 완료 판정까지 간 적이 있다.
    let ran = false;
    for (let i = 0; i < 6; i++) {
      await sleep(4000);
      const g = await snapshot(page, { interactive: true });
      if (/button "중지"|생각 중/.test(g.tree)) { ran = true; break; }
    }
    if (!ran) throw new Error('생성 시작을 눌렀는데 세션이 안 돈다 — 제출이 먹지 않았다');
    console.log('STARTED=1');
  `);
  if (!pick(out1, 'STARTED')) throw new Error(`생성 시작 실패:\n${out1}`);
  console.log('생성 시작됨(세션 확인). 승인 창을 기다린다…');

  // ── 크레딧 승인 ────────────────────────────────────────────
  //  설정이 "항상 확인"이면 승인창이 뜨고, "안 함"이면 안 뜬 채로 바로 돈다.
  //  둘을 구분하는 물증은 **크레딧 잔량**이다. 승인창도 없고 크레딧도 그대로면
  //  생성이 시작되지 않은 것이다 — 낙관하지 않고 멈춘다.
  // ⚠️ 승인창이 뜨는 시각이 들쭉날쭉하다 — 어제는 36초, 오늘은 90초를 넘겼다.
  //    짧게 잡으면 생성은 걸어 놓고 승인을 못 해 그대로 유실된다. 넉넉히 5분.
  let approved = false;
  for (let i = 0; i < 60; i++) {                       // 최대 5분
    const out2 = await repl(`
      await attachBrowserTab('${tab}');
      const s = await snapshot(page, { interactive: true });
      const ok = s.tree.match(/radio "승인"(?![^\\n]*disabled)[^\\n]*\\[ref=(e\\d+)\\]/);
      if (ok) { await page.locator(ok[1]).click(); console.log('APPROVED=1'); }
      else console.log('APPROVED=0');
    `);
    if (pick(out2, 'APPROVED') === '1') { approved = true; console.log('크레딧 승인(10개)'); break; }
    await sleep(5000);
  }
  if (!approved) {
    const now = await credits(tab);
    if (now >= cr0) {
      throw new Error(
        `승인창도 못 찾았고 크레딧도 그대로다(${cr0}개) — 생성이 시작되지 않았다.\n` +
        `  채팅 세션 패널이 닫혀 있으면 승인창이 안 보인다. 브라우저에서 확인할 것`);
    }
    console.log(`승인창 없음. 크레딧이 ${cr0}→${now} 로 줄었으니 자동 승인 설정이다`);
  }

  // ── 완료 대기 ─────────────────────────────────────────────
  //  판정 기준은 "편집기에서 동영상 열기" 버튼 수. 이 버튼은 생성 하나에
  //  묶여서 생긴다. 타일 개수는 화면 전환만으로도 변해서 못 쓴다.
  const DEADLINE = Date.now() + 15 * 60_000;
  let done = false;
  while (Date.now() < DEADLINE) {
    await sleep(20_000);
    const n = await videoTiles(tab);
    process.stdout.write(`\r대기 중… 동영상 ${n}/${res0 + 1}개   `);
    if (n > res0) { done = true; break; }
  }
  console.log('');
  if (!done) {
    const now = await credits(tab);
    throw new Error(`15분 안에 결과가 안 나왔다 (크레딧 ${cr0}→${now}). Flow 큐가 밀렸을 수 있다`);
  }

  const cr1 = await credits(tab);
  console.log(`크레딧 ${cr0} → ${cr1}`);
  await downloadLatest(tab, outPath);
}

/** 최신 동영상 타일을 열고 720p 로 받아 outPath 에 놓는다.
 *  생성과 분리해 둔다 — 다운로드가 실패했다고 크레딧을 다시 태울 수는 없다.
 *  (`--fetch-latest` 로 단독 호출 가능) */
async function downloadLatest(tab, outPath) {
  const out = await repl(`
    await attachBrowserTab('${tab}');
    const B = (t, n) => (t.match(new RegExp('button "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];
    const G = (t, n) => (t.match(new RegExp('generic "' + n + '"[^\\n]*\\\\[ref=(e\\\\d+)\\\\]')) || [])[1];
    // ⚠️ 타일 그리드에서 "맨 앞이 최신"으로 집으면 안 된다. 실제로 그렇게 했다가
    //    전혀 다른(이전) 영상을 바이트까지 똑같이 받아왔다.
    //    채팅의 "편집기에서 동영상 열기" 는 그 생성에 묶여 있다 — 마지막 것을 연다.
    let a = await snapshot(page, { interactive: true });
    let opens = [...a.tree.matchAll(/button "편집기에서 동영상 열기"[^\\n]*\\[ref=(e\\d+)\\]/g)];
    if (!opens.length) {                                  // 패널이 닫혀 있으면 연다
      const hist = B(a.tree, '세션 기록 열기');
      if (hist) { await page.locator(hist).click(); await sleep(3000);
                  a = await snapshot(page, { interactive: true });
                  opens = [...a.tree.matchAll(/button "편집기에서 동영상 열기"[^\\n]*\\[ref=(e\\d+)\\]/g)]; }
    }
    if (!opens.length) throw new Error('채팅에서 생성 결과(편집기에서 동영상 열기)를 못 찾았다');
    await page.locator(opens[opens.length - 1][1]).click();
    await sleep(4500);

    const v = await snapshot(page, { interactive: true });
    const dlBtn = B(v.tree, '미디어 다운로드');
    if (!dlBtn) throw new Error('미디어 다운로드 버튼이 없다 — 타일이 아직 준비 중일 수 있다');
    await page.locator(dlBtn).click();
    await sleep(2500);

    const m = await snapshot(page, { interactive: true });
    const item = m.tree.match(/menuitem "720p[^"]*"[^\\n]*\\[ref=(e\\d+)\\]/);
    if (!item) throw new Error('720p 항목이 없다 — 무료 등급 상한이 바뀌었나');
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 90000 }),
      page.locator(item[1]).click(),
    ]);
    const p = path.join(pwd, 'out.mp4');
    await dl.saveAs(p);
    console.log('FILE=' + p);
  `);
  const file = pick(out, 'FILE');
  if (!file) throw new Error(`다운로드 실패:\n${out}`);

  const dst = resolve(HERE, outPath);
  await copyFile(file, dst);
  console.log(`✅ ${basename(dst)} — ${(await stat(dst)).size.toLocaleString()} bytes`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
