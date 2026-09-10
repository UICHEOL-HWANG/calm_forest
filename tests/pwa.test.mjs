// =============================================================
//  📱 PWA 구성 검증 — 매니페스트·아이콘 치수·index.html 연결·배포 포함 여부
//  구글 플레이 TWA(PWABuilder/Bubblewrap)는 manifest 를 읽어 앱을 만들므로
//  여기서 깨지면 스토어 빌드가 조용히 실패한다.
// =============================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const PWA_DIR = 'assets/pwa/';

// PNG IHDR 에서 폭·높이를 읽는다(라이브러리 없이)
function pngSize(path) {
  const buf = readFileSync(new URL(path, ROOT));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${path} 는 PNG 가 아님`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const manifest = () => JSON.parse(read(PWA_DIR + 'manifest.webmanifest'));

test('manifest 필수 필드 — TWA 생성기가 요구하는 것', () => {
  const m = manifest();
  assert.equal(m.name, 'calm forest');
  assert.ok(m.short_name && m.short_name.length <= 12, 'short_name 12자 이하');
  assert.equal(m.start_url, '/?ref=pwa');   // js/analytics.js 가 ref= 를 GA4 세션 소스로 주입 → 설치 앱 유입 구분
  assert.equal(m.scope, '/');
  assert.equal(m.id, '/');
  assert.equal(m.display, 'standalone');
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
  assert.ok(Array.isArray(m.categories) && m.categories.includes('games'));
});

test('manifest 아이콘 — 192·512·maskable 512 가 실제 파일·치수와 일치', () => {
  const m = manifest();
  const bySize = (s, purpose) => m.icons.find(i => i.sizes === s && (i.purpose || 'any') === purpose);
  assert.ok(bySize('192x192', 'any'), '192 any 없음');
  assert.ok(bySize('512x512', 'any'), '512 any 없음');
  assert.ok(bySize('512x512', 'maskable'), '512 maskable 없음');
  for (const icon of m.icons) {
    assert.match(icon.src, /^\/[a-z0-9-]+\.png$/, `${icon.src} 는 루트 절대경로 PNG 여야 함`);
    assert.equal(icon.type, 'image/png');
    const repoPath = PWA_DIR + icon.src.slice(1);
    assert.ok(existsSync(new URL(repoPath, ROOT)), `${repoPath} 없음`);
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(repoPath), { w, h }, `${icon.src} 치수가 sizes 와 다름`);
  }
});

test('assetlinks.json — 구조는 갖추고 지문은 콘솔 키 생성 후 채운다', () => {
  const links = JSON.parse(read(PWA_DIR + 'assetlinks.json'));
  assert.ok(Array.isArray(links) && links.length === 1);
  const [{ relation, target }] = links;
  assert.deepEqual(relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(target.namespace, 'android_app');
  assert.match(target.package_name, /^[a-z]+(\.[a-z][a-z0-9_]*)+$/);
  assert.ok(Array.isArray(target.sha256_cert_fingerprints));
  for (const fp of target.sha256_cert_fingerprints) assert.match(fp, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
});

test('index.html — manifest 링크 + web 플랫폼에서만 SW 등록', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
  assert.match(html, /serviceWorker\.register\('\/sw\.js'/);
  // 토스 웹뷰·itch iframe 에서는 등록하지 않는다
  assert.match(html, /__APPS_IN_TOSS__[\s\S]{0,200}serviceWorker\.register|serviceWorker\.register[\s\S]{0,200}__APPS_IN_TOSS__/);
  assert.match(html, /__ITCH__[\s\S]{0,200}serviceWorker\.register|serviceWorker\.register[\s\S]{0,200}__ITCH__/);
});

test('sw.js — 게임 자산은 캐시하지 않고 오프라인 페이지만 미리 담는다', () => {
  const sw = read('sw.js');
  assert.ok(existsSync(new URL('offline.html', ROOT)), 'offline.html 없음');
  assert.match(sw, /\/offline\.html/);
  assert.doesNotMatch(sw, /['"]\/js\//, 'js/ 를 프리캐시하면 배포 후 옛 코드가 남는다');
  assert.doesNotMatch(sw, /['"]\/index\.html['"]/, 'index.html 을 캐시하지 말 것');
});

test('build-web INCLUDE — PWA 파일이 공개 URL 로 배포된다', () => {
  const src = read('scripts/build-web.mjs');
  for (const [from, to] of [
    ['assets/pwa/manifest.webmanifest', 'manifest.webmanifest'],
    ['assets/pwa/icon-192.png', 'icon-192.png'],
    ['assets/pwa/icon-512.png', 'icon-512.png'],
    ['assets/pwa/icon-maskable-512.png', 'icon-maskable-512.png'],
    ['assets/pwa/assetlinks.json', '.well-known/assetlinks.json'],
  ]) assert.ok(src.includes(`['${from}', '${to}']`), `INCLUDE 에 ${from} → ${to} 없음`);
  assert.ok(src.includes("'sw.js'"), 'INCLUDE 에 sw.js 없음');
  assert.ok(src.includes("'offline.html'"), 'INCLUDE 에 offline.html 없음');
});

test('toss·itch 번들은 manifest 링크(와 설명 주석)를 제거한다 — 실제 빌드 산출물 검사', () => {
  const cwd = new URL('.', ROOT).pathname;
  for (const [script, out] of [['scripts/build-ait.mjs', 'dist-toss/index.html'], ['scripts/build-itch.mjs', 'dist-itch/index.html']]) {
    execFileSync('node', [script], { cwd, stdio: 'ignore' });
    const html = read(out);
    assert.doesNotMatch(html, /rel="manifest"/, `${out} 에 manifest 링크가 남음`);
    assert.doesNotMatch(html, /📱 PWA —/, `${out} 에 manifest 설명 주석이 남음`);
    assert.match(html, /serviceWorker\.register/, `${out} 의 SW 등록 코드는 플래그로 막히므로 그대로 둔다`);
  }
  // 웹 배포본은 링크를 유지한다
  assert.match(read('index.html'), /rel="manifest"/);
});

// 위 테스트가 만든 빌드 산출물 정리(.gitignore 대상이지만 테스트가 잡파일을 남기지 않게)
after(() => {
  for (const p of ['dist-toss', 'dist-itch', 'dist-itch.zip']) rmSync(new URL(p, ROOT), { recursive: true, force: true });
});
