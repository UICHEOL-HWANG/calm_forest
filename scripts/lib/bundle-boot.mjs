import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VENDOR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../vendor');
const VENDOR_THREE = path.join(VENDOR, 'three');
const SUPABASE_CDN = 'https://esm.sh/@supabase/supabase-js@2.116.0';
const MODULE_RE = /<script type="module"(?: src="(\.\/js\/[^"]+\.js)")?>([\s\S]*?)<\/script>/g;
const IMPORTMAP_RE = /[ \t]*<script type="importmap">[\s\S]*?<\/script>[ \t]*\n?/;
const OUT_SUBDIR = 'js/b';

const threeFromVendor = {
  name: 'three-from-vendor',
  setup(b) {
    b.onResolve({ filter: /^three(\/addons\/.+)?$/ }, ({ path: p }) => ({
      path: p === 'three'
        ? path.join(VENDOR_THREE, 'three.module.js')
        : path.join(VENDOR_THREE, 'addons', p.slice('three/addons/'.length)),
    }));
    b.onResolve({ filter: /^https:\/\// }, ({ path: p }) => (
      p === SUPABASE_CDN ? { path: path.join(VENDOR, 'supabase.js') } : { path: p, external: true }
    ));
  },
};

function collectScripts(html, outDir) {
  const scripts = [];
  for (const m of html.matchAll(MODULE_RE)) {
    const [tagText, src, body] = m;
    if (src) {
      scripts.push({ tagText, name: path.basename(src, '.js'), file: path.join(outDir, src), temp: false });
    } else if (body.includes("'./js/game.js'")) {
      scripts.push({ tagText, name: 'main', file: path.join(outDir, '__boot_main.js'), temp: true, body });
    } else if (body.includes("'./js/i18n.js'")) {
      scripts.push({ tagText, name: 'boot-i18n', file: path.join(outDir, '__boot_i18n.js'), temp: true, body });
    }
  }
  if (!scripts.some(s => s.name === 'main')) {
    throw new Error('[bundle-boot] index.html 에서 게임 인라인 모듈(./js/game.js import)을 못 찾음');
  }
  if (!scripts.some(s => s.name === 'boot-i18n')) {
    throw new Error('[bundle-boot] index.html 에서 로딩 화면 번역 모듈(./js/i18n.js import)을 못 찾음');
  }
  return scripts;
}

export async function bundleBoot(outDir) {
  const htmlPath = path.join(outDir, 'index.html');
  let html = readFileSync(htmlPath, 'utf8');
  const scripts = collectScripts(html, outDir);
  for (const s of scripts) if (s.temp) writeFileSync(s.file, s.body);

  let result;
  try {
    result = await build({
      entryPoints: Object.fromEntries(scripts.map(s => [s.name, s.file])),
      bundle: true,
      format: 'esm',
      splitting: true,
      minify: true,
      charset: 'utf8',
      legalComments: 'none',
      outdir: path.join(outDir, OUT_SUBDIR),
      entryNames: '[name]-[hash]',
      chunkNames: 'c-[hash]',
      plugins: [threeFromVendor],
      metafile: true,
      logLevel: 'error',
    });
  } finally {
    for (const s of scripts) if (s.temp) rmSync(s.file, { force: true });
  }

  const outputs = Object.keys(result.metafile.outputs).filter(f => f.endsWith('.js'));
  const srcFor = {};
  for (const s of scripts) {
    const out = outputs.find(f => new RegExp(`^${s.name}-[A-Z0-9]+\\.js$`).test(path.basename(f)));
    if (!out) throw new Error(`[bundle-boot] ${s.name} 묶음 출력을 못 찾음`);
    srcFor[s.name] = `./${OUT_SUBDIR}/${path.basename(out)}`;
  }

  for (const s of scripts) {
    html = html.replace(s.tagText, () => `<script type="module" src="${srcFor[s.name]}"></script>`);
  }
  html = html.replace(IMPORTMAP_RE, '');
  writeFileSync(htmlPath, html);

  const staticClosure = new Set();
  const visit = (file) => {
    if (staticClosure.has(file)) return;
    staticClosure.add(file);
    for (const imp of result.metafile.outputs[file].imports) {
      if (imp.kind === 'import-statement' && !imp.external) visit(imp.path);
    }
  };
  for (const f of outputs) if (result.metafile.outputs[f].entryPoint) visit(f);

  return { files: outputs, bootFiles: [...staticClosure], entries: srcFor, metafile: result.metafile };
}
