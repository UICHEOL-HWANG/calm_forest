// tests/js-syntax.test.mjs — 🧱 js/ 의 모든 모듈이 ES 모듈로 파싱되는가
//  소스 텍스트 정규식 테스트는 문법이 깨져도 통과한다. 2026-10-08 한 줄 if 뒤에 붙인 주석이 본문과 } 를 삼켜
//  cafe.js 가 SyntaxError 로 죽었는데(→ game.js 순환 import 전체가 안 떠서 로딩 화면에 멈춤) 테스트 2165개가 전부 통과했다.
//  자식 프로세스 하나에서 vm.SourceTextModule 로 파싱만 한다(링크·실행 안 함 — three 없이도 돈다).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const PARSER = `
const fs = require('fs'), path = require('path'), vm = require('vm');
const bad = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (p.endsWith('.js')) {
    try { new vm.SourceTextModule(fs.readFileSync(p, 'utf8'), { identifier: p }); }
    catch (err) { bad.push(path.relative(process.argv[1], p) + ': ' + err.message); }
  }
} };
walk(path.join(process.argv[1], 'js'));
process.stdout.write(JSON.stringify(bad));
`;

test('js/**/*.js 는 전부 ES 모듈 문법이 맞다', () => {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', PARSER, ROOT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const bad = JSON.parse(r.stdout || '[]');
  assert.deepEqual(bad, [], bad.join('\n'));
});
