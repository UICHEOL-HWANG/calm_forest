#!/usr/bin/env node
// =============================================================
//  calm forest · 웹 배포 번들 만들기 (dist/)
//  ------------------------------------------------------------
//  왜 필요한가: 폴더를 통째로 올리면 .git · sql · scripts 까지 전부 공개됩니다.
//  (실제로 https://…/.git/config 가 200 으로 열려 있었음)
//  여기서 "공개해도 되는 것만" 화이트리스트로 골라 dist/ 에 복사하고,
//  wrangler 는 dist/ 만 정적 자산으로 업로드합니다.
//
//  사용: node scripts/build-web.mjs   (npx wrangler deploy 전에 실행)
// =============================================================
import { copyFile, rm, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fs.cp 는 Node 버전에 따라 experimental 경고/미지원이라 CI 에서 불안정 → 직접 복사
async function copyInto(src, dest) {
  if ((await stat(src)).isDirectory()) {
    await mkdir(dest, { recursive: true });
    for (const name of await readdir(src)) await copyInto(path.join(src, name), path.join(dest, name));
  } else {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// 배포에 포함할 것만 나열 — 여기 없는 건 절대 올라가지 않는다.
const INCLUDE = [
  'index.html',      // 게임 본체
  'js',              // 게임 모듈
  'assets',          // 아이콘
  'dashboards',      // 관리자·분석 페이지(index.html 에서 링크)
  'preview.png',     // og:image
  'favicon.ico',     // 파비콘 — 구글 검색결과 아이콘의 기본 fallback
  'favicon.svg',     // 파비콘 — 모던 브라우저용 벡터
  'favicon-96.png',  // 파비콘 — SVG 를 못 읽는 크롤러용 래스터
  'apple-touch-icon.png', // iOS 홈화면 아이콘
  '_headers',        // 캐시 헤더
];

// 실수로 섞여 들어가면 안 되는 것(방어용 2차 점검)
const FORBIDDEN = [/^\.env/, /^\.git$/, /^node_modules$/, /\.sql$/, /^functions$/, /^scripts$/, /^docs$/, /\.md$/];

async function walk(dir, base = '') {
  const out = [];
  for (const name of await readdir(dir)) {
    const rel = path.join(base, name);
    const abs = path.join(dir, name);
    if ((await stat(abs)).isDirectory()) out.push(...await walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const missing = [];
for (const item of INCLUDE) {
  const src = path.join(ROOT, item);
  if (!existsSync(src)) { missing.push(item); continue; }
  await copyInto(src, path.join(DIST, item));
}

// 결과 검증 — 금지 패턴이 하나라도 들어갔으면 배포 전에 멈춘다
const files = await walk(DIST);
const leaked = files.filter(f => FORBIDDEN.some(re => f.split(path.sep).some(seg => re.test(seg))));
if (leaked.length) {
  console.error('❌ 공개되면 안 되는 파일이 dist 에 섞였습니다:\n  ' + leaked.join('\n  '));
  process.exit(1);
}

console.log(`✅ dist/ 준비 완료 — ${files.length}개 파일`);
if (missing.length) console.log(`   (없어서 건너뜀: ${missing.join(', ')})`);
console.log('   다음: npx wrangler deploy');
