import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CALL = /(?:\btrackEvent|\btrack|\.track|\bemit)\s*(?:\?\.)?\(\s*([^,{)]*)/g;
const EVENT_KEY = /\bevent:\s*'([a-z][a-z0-9_]*)'/g;
const TUPLE = /\[\s*'([a-z][a-z0-9_]*)'\s*,\s*\{/g;
const LITERAL = /(===|!==|==|!=)?\s*['"`]([a-z][a-z0-9_]*)['"`]/g;
const COMMENT = /\/\/\s*(.*)$/;
const OPEN_TAIL = /(?:\btrackEvent|\btrack|\.track|\bemit)\s*(?:\?\.)?\(\s*$|\[\s*'[a-z][a-z0-9_]*'\s*,\s*$/;
const FORWARD = /\b(?:openPolicyPage|fillReloadPrompt)\([^;]*?,\s*'([a-z][a-z0-9_]*)'\s*\)/g;
const TUPLE_FILE = /(^|\/)track\.js$/;
const EVENT_KEY_FILE = /^js\/plaza\//;
const ROOT_FILES = ['index.html'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js') || p.endsWith('.mjs')) out.push(p);
  }
  return out;
}

function cleanComment(line) {
  const m = line.match(COMMENT);
  if (!m) return '';
  return m[1].replace(/\[GA4\]\s*/g, '').trim();
}

export function namesInLine(line, rel) {
  const names = [];
  for (const m of line.matchAll(CALL)) {
    if (m[1].trimStart().startsWith('...')) continue;
    for (const l of m[1].matchAll(LITERAL)) if (!l[1]) names.push(l[2]);
  }
  if (EVENT_KEY_FILE.test(rel)) for (const m of line.matchAll(EVENT_KEY)) names.push(m[1]);
  for (const m of line.matchAll(FORWARD)) names.push(m[1]);
  if (TUPLE_FILE.test(rel)) for (const m of line.matchAll(TUPLE)) names.push(m[1]);
  return names;
}

export function scanEventNames(root) {
  const found = new Map();
  const files = [...walk(join(root, 'js')), ...ROOT_FILES.map(f => join(root, f))];
  for (const file of files) {
    const rel = relative(root, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((raw, i) => {
      const line = OPEN_TAIL.test(raw) && i + 1 < lines.length ? raw + ' ' + lines[i + 1].trim() : raw;
      for (const name of namesInLine(line, rel)) {
        const hit = found.get(name) || { files: new Set(), comment: '', line: '' };
        hit.files.add(rel);
        if (!hit.comment) hit.comment = cleanComment(line);
        if (!hit.line) hit.line = `${rel}:${i + 1}`;
        found.set(name, hit);
      }
    });
  }
  return found;
}
