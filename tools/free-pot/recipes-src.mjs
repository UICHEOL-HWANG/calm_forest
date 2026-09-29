// 🍲 catalog.js 원문에서 RECIPES 를 읽는다 — catalog.js 는 places.js → three 를 끌고 와 Node 에서 import 할 수 없다.
import { readFileSync } from 'node:fs';

export function recipesFromSource(text = readFileSync(new URL('../../js/data/catalog.js', import.meta.url), 'utf8')) {
  const i = text.indexOf('export const RECIPES = [');
  const block = text.slice(i, text.indexOf('\n];', i));
  return [...block.matchAll(/\{ id: '(\w+)',\s*name: '([^']+)'.*?cost: (\{[^}]*\})/g)]
    .map(m => ({ id: m[1], name: m[2], cost: Function(`return (${m[3]})`)() }));
}
