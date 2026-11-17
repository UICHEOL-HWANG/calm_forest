import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'wiki', 'articles');

export const articlePath = (a) => `/wiki/guides/${a.slug}`;

export function parseArticle(md, slug) {
  const sep = md.match(/^---\s*$/m);
  const head = sep ? md.slice(0, sep.index) : '';
  const body = sep ? md.slice(sep.index + sep[0].length) : '';
  const meta = Object.fromEntries([...head.matchAll(/^(title|description):\s*(.+)$/gm)].map(m => [m[1], m[2].trim()]));
  if (!meta.title || !meta.description) throw new Error(`공략 글 머리말 없음: ${slug}`);
  const sections = [];
  for (const line of body.split('\n')) {
    const h = line.match(/^## +(.+?)\s*$/);
    if (h) sections.push([h[1], []]);
    else if (sections.length) sections.at(-1)[1].push(line);
  }
  return { slug, title: meta.title, description: meta.description, sections: sections.map(([h, l]) => [h, l.join('\n').trim()]) };
}

export function loadArticles() {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR).filter(n => n.endsWith('.md')).sort()
    .map(n => parseArticle(readFileSync(path.join(DIR, n), 'utf8'), n.replace(/\.md$/, '')));
}
