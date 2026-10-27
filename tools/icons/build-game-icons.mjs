import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'sims/icon-set');
const OUT = path.join(ROOT, 'js/icons/toss-icons.js');
const OUT_ALL = path.join(ROOT, 'js/icons/toss-icons-all.js');
const BATCHES = ['food', 'nature', 'animals', 'people', 'places', 'objects', 'symbols'];

export const GAME_EMOJI = [
  '📷', '🙂', '☰', '🐾', '🗺', '📸', '🎁', '📮', '🤝', '🏆', '📊', '📝', '📖', '⚙', '💬', '🏡', '💌',
  '🎵', '🌐', '🔒', '📜', '🗑', '🔔', '🚪',
  '🪵', '🌰', '🥕', '🪨', '⚫', '💎', '🪙', '🎒',
  '🌸', '☀', '🍂', '❄', '🌤', '🌧', '🌫', '🌙',
  '🪓', '⛏', '💧', '🪏', '🔨', '🎣', '🌾', '🏕', '✋',
  '👋', '❤', '😄', '🪑', '🚣',
  '❗', '🍄', '🪜', '🧰', '🔙', '🎃', '🍳',
  '📒', '↩', '🔇', '🔕',
];
export const GAME_IDS = ['sickle', 'net', 'homi', 'homi_long', 'homi_eye', 'homi_gold', 'homi_opt_reach', 'homi_opt_eye', 'homi_opt_spare', 'homi_opt_feet'];

export const TOSSFACE_FILES = {
  '🪓': 'u1FA93', '⛏': 'u26CF', '🌰': 'u1F330', '💧': 'u1F4A7', '🔨': 'u1F528', '🎣': 'u1F3A3', '🌾': 'u1F33E', '🏕': 'u1F3D5',
  '🍄': 'u1F344', '📒': 'u1F4D2', '↩': 'u21A9', '🔇': 'u1F507', '🔕': 'u1F515', '📱': 'u1F4F1',
};

const norm = (e) => e.replace(/\uFE0F/g, '');

function loadIcons() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  let code = readFileSync(path.join(SRC, 'icons-toss.js'), 'utf8') + '\nwindow.__BASE = TOSS_ICONS;';
  for (const b of BATCHES) code += '\n' + readFileSync(path.join(SRC, `toss-${b}.js`), 'utf8');
  vm.runInContext(code, ctx);
  return { ctx, all: [...ctx.__BASE, ...BATCHES.flatMap((b) => ctx[`TOSS_${b.toUpperCase()}`])] };
}

const tossfaceImg = (file) => `<img class="ti" src="js/icons/tossface/${file}" alt="" draggable="false">`;

function markup(ctx, icon) {
  const file = TOSSFACE_FILES[norm(icon.e)];
  if (file) return tossfaceImg(`${file}.svg`);
  if (icon.src) return tossfaceImg(path.basename(icon.src));
  return ctx.renderToss(icon, 'toss')
    .replace(/-?\d+\.\d{3,}/g, (m) => String(+(+m).toFixed(2)))
    .replace(/^<span class="i">/, '')
    .replace(/<\/span>$/, '')
    .replace('<svg ', '<svg class="ti" ');
}

export function renderModule() {
  const { ctx, all } = loadIcons();
  const missing = [];
  const byEmoji = {};
  for (const e of GAME_EMOJI) {
    const icon = all.find((i) => norm(i.e) === norm(e));
    if (TOSSFACE_FILES[norm(e)]) byEmoji[norm(e)] = tossfaceImg(`${TOSSFACE_FILES[norm(e)]}.svg`);
    else if (!icon) missing.push(e);
    else byEmoji[norm(e)] = markup(ctx, icon);
  }
  const byId = {};
  for (const id of GAME_IDS) {
    const icon = all.find((i) => i.id === id);
    if (!icon) missing.push(id);
    else byId[id] = markup(ctx, icon);
  }
  if (missing.length) throw new Error(`[icons] 아이콘 세트에 없음: ${missing.join(' ')}`);
  return `export const ICON_BY_EMOJI = ${JSON.stringify(byEmoji, null, 1)};\n\nexport const ICON_BY_ID = ${JSON.stringify(byId, null, 1)};\n`;
}

export function renderAllModule() {
  const { ctx, all } = loadIcons();
  const byEmoji = {};
  for (const icon of all) {
    const e = norm(icon.e || '');
    if (!e || e.startsWith('(') || e in byEmoji) continue;
    byEmoji[e] = markup(ctx, icon);
  }
  for (const [e, file] of Object.entries(TOSSFACE_FILES)) byEmoji[e] = tossfaceImg(`${file}.svg`);
  return `export const ICON_ALL = ${JSON.stringify(byEmoji, null, 1)};\n`;
}

function build() {
  for (const [file, out] of [[OUT, renderModule()], [OUT_ALL, renderAllModule()]]) {
    writeFileSync(file, out);
    console.log(`[icons] ${path.relative(ROOT, file)} (${(out.length / 1024).toFixed(1)}KB)`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
