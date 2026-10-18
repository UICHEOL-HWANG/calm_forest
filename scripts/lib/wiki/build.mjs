import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWiki, WIKI_DATA_FILES } from './load-data.mjs';
import { gitDate } from '../git-date.mjs';
import { parseContent, SECTION_ORDER } from './content.mjs';
import { renderDoc, renderCat, renderHome, searchIndex, buildIndex, docPath, catPath } from './render.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CONTENT_DIR = path.join(ROOT, 'wiki', 'content');

export function loadAllContent() {
  const out = new Map();
  if (!existsSync(CONTENT_DIR)) return out;
  for (const f of readdirSync(CONTENT_DIR).filter(n => n.endsWith('.md'))) {
    const cat = f.replace(/\.md$/, '');
    for (const [id, secs] of parseContent(readFileSync(path.join(CONTENT_DIR, f), 'utf8'))) out.set(`${cat}/${id}`, secs);
  }
  return out;
}

export async function writeWiki(dist) {
  const { cats, entries } = await loadWiki();
  const index = buildIndex(entries);
  const content = loadAllContent();
  const ctx = { index, entries, cats };
  const missing = entries.filter(e => !content.has(`${e.cat}/${e.id}`)).map(e => `${e.cat}/${e.id}`);
  if (missing.length) throw new Error(`위키 본문 없음: ${missing.join(', ')}`);
  const problems = [];
  for (const [key, secs] of content) {
    if (!index.has(key)) problems.push(`대응 문서 없음 ${key}`);
    if (!secs.get('개요')?.trim()) problems.push(`개요 없음 ${key}`);
    for (const h of secs.keys()) if (!SECTION_ORDER.includes(h)) problems.push(`모르는 절 ${key} ${h}`);
  }
  if (problems.length) throw new Error(`위키 본문 오류: ${problems.join(', ')}`);
  const catDate = Object.fromEntries(cats.map(c => [c.id, gitDate([`wiki/content/${c.id}.md`, ...WIKI_DATA_FILES])]));
  const allDate = gitDate(['wiki/content', ...WIKI_DATA_FILES]);
  const paths = [{ path: '/wiki/', lastmod: allDate }];
  const put = async (p, html) => {
    const file = p.endsWith('/') ? path.join(dist, p, 'index.html') : path.join(dist, `${p}.html`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
  };
  await put('/wiki/', renderHome(cats, entries));
  for (const c of cats) {
    await put(catPath(c), renderCat(c, entries.filter(e => e.cat === c.id), ctx));
    paths.push({ path: catPath(c), lastmod: catDate[c.id] });
  }
  for (const e of entries) {
    await put(docPath(e), renderDoc(e, content.get(`${e.cat}/${e.id}`), { ...ctx, lastmod: catDate[e.cat] }));
    paths.push({ path: docPath(e), lastmod: catDate[e.cat] });
  }
  await writeFile(path.join(dist, 'wiki', 'search.json'), searchIndex(entries, cats));
  return paths;
}
