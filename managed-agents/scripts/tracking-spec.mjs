#!/usr/bin/env node
// Extracts the GA4 tracking spec (event name -> param keys -> source files) from js/**.
// Usage: node managed-agents/scripts/tracking-spec.mjs > /tmp/spec.md
// Static and approximate: only literal names in trackEvent('name', {...}) / track('name', {...}).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const CALL = /\b(?:trackEvent|track)\(\s*['"]([a-z0-9_]+)['"]\s*(?:,\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})?/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const events = new Map();
for (const file of walk(join(ROOT, 'js'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(CALL)) {
    const [, name, body = ''] = m;
    const e = events.get(name) ?? { keys: new Set(), files: new Set() };
    const flat = body.replace(/\{[^{}]*\}/g, '').replace(/(['"`]).*?\1/g, '');
    for (const seg of flat.replace(/\([^()]*\)/g, '').split(',')) {
      const k = seg.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?::|$)/);
      if (k) e.keys.add(k[1]);
    }
    e.files.add(relative(ROOT, file));
    events.set(name, e);
  }
}

const lines = [
  '# calm forest tracking spec (generated from js/**)',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by managed-agents/scripts/tracking-spec.mjs. ${events.size} event names.`,
  'Param keys are a static best guess (spread/computed keys are missed). Treat a missing key as "check", not "bug".',
  '',
  '| event | param keys | files |',
  '|---|---|---|',
];
for (const [name, e] of [...events].sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`| ${name} | ${[...e.keys].sort().join(', ')} | ${[...e.files].sort().join(', ')} |`);
}
console.log(lines.join('\n'));
