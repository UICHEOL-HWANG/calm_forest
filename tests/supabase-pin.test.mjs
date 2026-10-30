import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FLOATING = /esm\.sh\/@supabase\/supabase-js@\d+(?![.\d])/;
const PAGES = [
  'beta/diary.html',
  'dashboards/analytics.html',
  'dashboards/beta_monitor.html',
  'dashboards/js/admin-common.js',
  'dashboards/notices_admin.html',
  'pages/delete-account.html',
];

test('supabase-js: 저장소 어디에도 떠다니는 메이저 버전 import 가 없다', () => {
  const hits = execSync("git grep -lE 'esm\\.sh/@supabase/supabase-js@' -- ':!dev' ':!sims' ':!docs' ':!tests'", { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
    .filter(f => FLOATING.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});

test('supabase-js: 공개 단독 페이지는 자체 호스팅 번들을 쓴다', () => {
  for (const f of PAGES) {
    const src = readFileSync(f, 'utf8');
    assert.ok(src.includes("'/vendor/supabase.js'"), f);
    assert.ok(!src.includes('esm.sh/@supabase'), f);
  }
});

test('supabase-js: 웹 빌드가 자체 호스팅 번들을 내보낸다', () => {
  assert.ok(readFileSync('scripts/build-web.mjs', 'utf8').includes("'vendor/supabase.js'"));
});

test('supabase-js: devDependency 가 vendor 번들과 같은 정확한 버전이다', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const want = pkg.devDependencies?.['@supabase/supabase-js'] ?? pkg.dependencies?.['@supabase/supabase-js'];
  assert.match(want, /^\d+\.\d+\.\d+$/);
  assert.ok(readFileSync('vendor/supabase.js', 'utf8').includes(want));
});

test('supabase-js: 게임 클라이언트와 빌드 치환 앵커가 같은 고정 버전을 가리킨다', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const want = `https://esm.sh/@supabase/supabase-js@${pkg.devDependencies['@supabase/supabase-js']}`;
  for (const f of ['js/supabase-client.js', 'scripts/build-cap.mjs', 'scripts/lib/bundle-boot.mjs']) {
    const urls = readFileSync(f, 'utf8').match(/https:\/\/esm\.sh\/@supabase\/supabase-js@[\d.]+/g) ?? [];
    assert.ok(urls.length > 0, f);
    assert.ok(urls.every(u => u === want), `${f}: ${urls}`);
  }
});
