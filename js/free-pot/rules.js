// =============================================================
//  🍲 자유 냄비 규칙 — 조합 키·막힌 조합·버프/지속/미니게임·항목 검증
//  ------------------------------------------------------------
//  ▶ 글(이름·평)과 맛 ★ 만 Gemini 가 정한다(오프라인 생성, js/free-pot/table.js).
//    버프·지속·미니게임·원가는 여기 규칙이 정한다 — LLM 이 경제 수치를 정하면 밸런스를 못 잡는다.
//  ▶ 순수 함수만. game.js 를 import 하지 않는다(생성기·테스트가 Node 에서 읽는다).
// =============================================================
export const INGREDIENTS = ['crop', 'forage', 'fish', 'egg', 'flour', 'wheat', 'corn', 'grape', 'honey',
  'apple', 'pear', 'peach', 'persimmon', 'chestnut'];
export const TAGS = ['sweet', 'salty', 'savory', 'fresh', 'hearty', 'fruity', 'fishy', 'veggie', 'weird'];
export const BANNED_JUDGE = ['그냥', '별로', '평범', '단순', '그저', '밋밋', '그럭저럭'];
export const NAME_MAX = 9, JUDGE_MAX = 28;

const ORDER = Object.fromEntries(INGREDIENTS.map((k, i) => [k, i]));
export const comboKey = (ids) => [...ids].sort((a, b) => ORDER[a] - ORDER[b]).join('+');
export const parseKey = (key) => key.split('+');

export function allCombos() {
  const out = [], n = INGREDIENTS.length;
  for (let a = 0; a < n; a++) {
    out.push(INGREDIENTS[a]);
    for (let b = a; b < n; b++) {
      out.push(`${INGREDIENTS[a]}+${INGREDIENTS[b]}`);
      for (let c = b; c < n; c++) out.push(`${INGREDIENTS[a]}+${INGREDIENTS[b]}+${INGREDIENTS[c]}`);
    }
  }
  return out;
}

// 레시피와 재료가 똑같은 조합 — 자유 냄비에선 막고 레시피 메뉴로 안내한다.
//   ⚠️ 리터럴로 둔다: catalog.js 는 three 를 끌고 와 Node(생성기·테스트)에서 import 할 수 없다.
//      레시피 재료를 바꾸면 tests/free-pot.test.mjs 가 원문과 대조해 잡아낸다.
export const BLOCKED = {
  'crop+crop+crop': ['veg_stew'], 'forage+forage+forage': ['mushroom_soup'], 'crop+crop': ['rice_ball'],
  'crop+forage+forage': ['baked_yam', 'herb_salad'], 'fish+fish': ['grilled_fish'],
  'crop+egg+egg': ['omelette'], 'flour+flour': ['bread'],
};
export const freeCombos = () => allCombos().filter(k => !BLOCKED[k]);

export function capTaste(key, taste) {
  const t = Math.max(1, Math.min(5, Math.round(taste)));
  return new Set(parseKey(key)).size === 1 ? Math.min(3, t) : t;
}

// 재료 계열 → 버프. 동률이면 BUFF_ORDER 앞쪽
const FAMILY = { fish: 'luck', grape: 'speed', honey: 'speed', apple: 'speed', pear: 'speed', peach: 'speed', persimmon: 'speed',
  flour: 'chop', wheat: 'chop', corn: 'chop', crop: 'mine', forage: 'mine', egg: 'mine', chestnut: 'mine' };
const BUFF_ORDER = ['luck', 'speed', 'chop', 'mine'];
export function buffOf(key) {
  const n = {};
  for (const k of parseKey(key)) n[FAMILY[k]] = (n[FAMILY[k]] || 0) + 1;
  const max = Math.max(...Object.values(n));
  return BUFF_ORDER.find(b => n[b] === max);
}

const DUR = [20, 30, 45, 60, 90];
export const durOf = (taste) => DUR[Math.max(1, Math.min(5, taste)) - 1];

const SWEET = new Set(['grape', 'honey', 'apple', 'pear', 'peach', 'persimmon']);
export function stageOf(key) {
  const ids = parseKey(key);
  if (ids.includes('fish')) return 'grill';
  if (ids.every(k => SWEET.has(k))) return 'chop';
  return 'pot';
}

export function costOf(key) {
  const c = {};
  for (const k of parseKey(key)) c[k] = (c[k] || 0) + 1;
  return c;
}

const EMOJI = /^\p{Extended_Pictographic}/u;
export function validateEntry(key, e, { recipeNames, seenNames }) {
  if (!e || typeof e !== 'object') return ['항목 없음'];
  const bad = [];
  const name = String(e.name || '').trim();
  if (name.length < 2 || name.length > NAME_MAX) bad.push(`이름 길이 ${name.length}`);
  if (recipeNames.has(name)) bad.push(`레시피 이름과 충돌: ${name}`);
  if (seenNames.has(name)) bad.push(`이름 중복: ${name}`);
  if (!e.name_en || /[가-힣]/.test(e.name_en)) bad.push('name_en 없음/한글 섞임');
  if (!EMOJI.test(e.ico || '') || /[A-Za-z]/.test(e.ico || '')) bad.push(`이모지 아님: ${e.ico}`);
  if (!Number.isInteger(e.taste) || e.taste < 1 || e.taste > 5) bad.push(`taste 범위: ${e.taste}`);
  const judge = String(e.judge || '');
  if (!judge || judge.length > JUDGE_MAX) bad.push(`평 길이 ${judge.length}`);
  const hit = BANNED_JUDGE.find(w => judge.includes(w));
  if (hit) bad.push(`금지어: ${hit}`);
  if (!e.judge_en || /[가-힣]/.test(e.judge_en)) bad.push('judge_en 없음/한글 섞임');
  if (!Array.isArray(e.tags) || !e.tags.length || e.tags.some(t => !TAGS.includes(t))) bad.push('tags 형식');
  if (e.taste <= 2 && !e.tags?.includes('weird')) bad.push('괴요리(★1~2)는 weird 태그 필요');
  if (!bad.length) seenNames.add(name);
  return bad;
}
