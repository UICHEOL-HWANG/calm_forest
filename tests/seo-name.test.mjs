import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const HEAD = HTML.slice(0, HTML.indexOf('</head>'));

test('검색 제목은 이름+키워드, 공유 제목은 한국어 이름 "고요한 숲 🌿"', () => {
  assert.match(HEAD, /<title>고요한 숲 · 설치 없이 하는 3D 힐링 농장 게임<\/title>/);
  assert.match(HEAD, /<meta property="og:title" content="고요한 숲 🌿" \/>/);
  assert.match(HEAD, /<meta name="twitter:title" content="고요한 숲 🌿" \/>/);
  assert.match(HEAD, /<meta property="og:site_name" content="고요한 숲" \/>/);
  assert.match(HEAD, /<meta name="application-name" content="고요한 숲" \/>/);
});

test('AI·검색엔진용 구조화 데이터 — 이름은 고요한 숲, calm forest 는 별칭', () => {
  const m = HEAD.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'JSON-LD 가 head 에 있다');
  const ld = JSON.parse(m[1])['@graph'].find(x => x['@type'] === 'VideoGame');
  assert.equal(ld.name, '고요한 숲');
  assert.ok(ld.alternateName.includes('calm forest'));
  assert.equal(ld.url, 'https://calmforest.cloud/');
  assert.ok(ld.inLanguage.includes('ko'));
});
