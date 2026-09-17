// =============================================================
//  📦 외부 CDN 의존을 vendor/ 로 자체 호스팅
//  ------------------------------------------------------------
//  왜 필요한가 — 지금은 three 를 unpkg, supabase-js 를 esm.sh 에서 받는다.
//  ① 앱(Capacitor)으로 감싸도 이걸 두면 오프라인에서 빈 화면이다. 웹 파일을 앱에
//     넣어봤자 정작 Three.js 를 네트워크로 받으러 가기 때문.
//  ② 웹에서도 CDN 이 흔들리면 게임이 안 뜬다. 자체 호스팅이 그냥 더 안전하다.
//
//  three 와 supabase 는 처리 방식이 다르다:
//   · three  — three.module.js 가 자기완결(외부 import 0)이라 **파일만 받으면 된다**.
//     addons 는 상대경로로 서로를 import 하므로 디렉터리 구조만 지키면 그대로 돈다.
//   · supabase-js — esm.sh 는 531B 짜리 스텁이고 jsDelivr +esm 도 하위 모듈을 다시
//     import 한다. **번들이 필요하다** → esbuild 로 단일 ESM 을 굽는다.
//
//  산출물(vendor/)은 커밋한다. 빌드 때마다 네트워크를 타면 CDN 을 쓰는 것과 다를 바 없다.
//
//  사용: node scripts/fetch-vendor.mjs
//  ※ 버전을 올릴 때는 THREE_VERSION 을 고치고 다시 실행한 뒤 실기기까지 확인할 것.
// =============================================================
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'vendor');

// index.html 의 importmap 과 반드시 같은 버전이어야 한다.
const THREE_VERSION = '0.160.0';
const BASE = `https://unpkg.com/three@${THREE_VERSION}`;

// 실제로 import 하는 것만 받는다(2026-09-17 전수 조사 · 의존 트리가 여기서 닫힌다).
// 새 addon 을 쓰기 시작하면 여기에 추가하고 다시 실행할 것.
const ADDONS = [
  'postprocessing/EffectComposer.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js',
  'postprocessing/ShaderPass.js',
  'postprocessing/RenderPass.js',
  'postprocessing/Pass.js',               // 위 Pass 들이 공통으로 상속
  'postprocessing/MaskPass.js',           // EffectComposer 가 import
  'shaders/CopyShader.js',                // EffectComposer
  'shaders/LuminosityHighPassShader.js',  // UnrealBloomPass
  'shaders/OutputShader.js',              // OutputPass
];

const EXTERNAL_IMPORT = /^\s*import[^;]*from\s+['"]https?:/m;

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${url}`);
  return r.text();
}

async function save(rel, body) {
  const dest = path.join(VENDOR, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, body);
  return `${rel} (${(body.length / 1024).toFixed(0)}KB)`;
}

// ── three ────────────────────────────────────────────────────
const core = await get(`${BASE}/build/three.module.js`);
if (EXTERNAL_IMPORT.test(core))
  throw new Error('three.module.js 가 외부 URL 을 import 합니다 — 전제가 깨졌습니다');
console.log('[three]', await save('three/three.module.js', core));

for (const rel of ADDONS) {
  const body = await get(`${BASE}/examples/jsm/${rel}`);
  // addons 는 'three' 를 bare specifier 로 import 한다 → importmap 이 vendor 를 가리키므로 그대로 둔다.
  console.log('[addon]', await save(`three/addons/${rel}`, body));
}

// ── supabase-js (번들) ───────────────────────────────────────
// devDependency 로 설치돼 있어야 한다: npm i -D esbuild @supabase/supabase-js
const entry = path.join(VENDOR, '_supabase-entry.js');
await mkdir(VENDOR, { recursive: true });
await writeFile(entry, "export { createClient } from '@supabase/supabase-js';\n");
try {
  execFileSync('npx', ['esbuild', entry, '--bundle', '--format=esm', '--minify',
    `--outfile=${path.join(VENDOR, 'supabase.js')}`], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await rm(entry, { force: true });
}

const bundled = await readFile(path.join(VENDOR, 'supabase.js'), 'utf8');
if (EXTERNAL_IMPORT.test(bundled))
  throw new Error('supabase 번들에 외부 URL import 가 남았습니다 — 자체 호스팅이 안 된 것입니다');
console.log('[supabase]', `supabase.js (${(bundled.length / 1024).toFixed(0)}KB) · 외부 import 없음`);

console.log('\n✅ vendor/ 준비 완료 — 산출물을 커밋하세요.');
