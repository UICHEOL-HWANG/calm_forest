import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadWiki } from '../scripts/lib/wiki/load-data.mjs';
import { buildIndex, renderHome, renderArticle } from '../scripts/lib/wiki/render.mjs';
import { parseArticle, loadArticles, articlePath } from '../scripts/lib/wiki/articles.mjs';
import { linkedRefs, toPlain } from '../scripts/lib/wiki/content.mjs';
import { writeWiki } from '../scripts/lib/wiki/build.mjs';

const wiki = await loadWiki();
const index = buildIndex(wiki.entries);
const articles = loadArticles();

test('parseArticle: 머리말과 ## 절', () => {
  const a = parseArticle('title: 제목\ndescription: 요약.\n---\n## 첫 절\n문단 하나.\n\n문단 둘.\n## 둘째 절\n끝.\n', 'demo');
  assert.equal(a.slug, 'demo');
  assert.equal(a.title, '제목');
  assert.equal(a.description, '요약.');
  assert.deepEqual(a.sections, [['첫 절', '문단 하나.\n\n문단 둘.'], ['둘째 절', '끝.']]);
  assert.throws(() => parseArticle('## 머리말 없음\n본문', 'bad'), /bad/);
  assert.deepEqual(parseArticle('title: 가\ndescription: 나.\n---\n## 앞\n하나.\n---\n## 뒤\n둘.\n', 'rule').sections.map(([h]) => h), ['앞', '뒤']);
});

test('공략 글: 여덟 편 이상, 글마다 분량·절·문체 규칙', () => {
  assert.ok(articles.length >= 8, `글 ${articles.length}`);
  for (const a of articles) {
    const body = a.sections.map(([, t]) => toPlain(t, index)).join('');
    const len = body.replace(/\s/g, '').length;
    assert.ok(len >= 2000, `${a.slug} 본문 ${len}자`);
    assert.ok(a.sections.length >= 5 && a.sections.length <= 8, `${a.slug} 절 ${a.sections.length}`);
    assert.ok(a.title.length <= 30 && a.description.length <= 80, a.slug);
    const all = a.title + a.description + a.sections.flat().join('');
    assert.doesNotMatch(all, /\d/, `${a.slug} 숫자`);
    assert.doesNotMatch(all, /—/, `${a.slug} 엠대시`);
    assert.doesNotMatch(all, /놀(다|아|았|고|자|며)/, `${a.slug} 놀다`);
    for (const r of a.sections.flatMap(([, t]) => linkedRefs(t))) assert.ok(index.has(r), `${a.slug} 링크 ${r}`);
  }
});

test('renderArticle: 제목·canonical·Article 구조화 데이터·색인 허용', () => {
  const a = parseArticle('title: 낚시 이야기\ndescription: 낚시를 다룬다.\n---\n## 시작\n[[fish/rare]]는 비 오는 날 낚인다.\n', 'demo');
  const html = renderArticle(a, { index, articles: [a] });
  assert.match(html, /<title>낚시 이야기 · 고요위키<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/wiki\/guides\/demo"/);
  assert.match(html, /<a href="\/wiki\/fish\/rare">무지개 물고기<\/a>/);
  assert.match(html, /"@type":"Article"/);
  assert.doesNotMatch(html, /noindex/);
  assert.equal(articlePath(a), '/wiki/guides/demo');
});

test('renderHome: 공략 글 목록을 싣는다', () => {
  const home = renderHome(wiki.cats, wiki.entries, articles);
  for (const a of articles) assert.match(home, new RegExp(`href="/wiki/guides/${a.slug}"`));
});

test('writeWiki: sitemap 은 대문·분류·공략 글만, 개별 문서는 뺀다', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'wiki-'));
  const paths = (await writeWiki(dist)).map(p => p.path);
  assert.ok(paths.includes('/wiki/'));
  assert.ok(paths.includes('/wiki/fish/'));
  assert.ok(!paths.includes('/wiki/fish/rare'));
  for (const a of articles) assert.ok(paths.includes(articlePath(a)), a.slug);
  assert.equal(paths.length, 1 + wiki.cats.length + articles.length);
  assert.match(await readFile(path.join(dist, 'wiki/guides', `${articles[0].slug}.html`), 'utf8'), /<h1>/);
});
