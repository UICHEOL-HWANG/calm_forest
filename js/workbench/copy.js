export const FORGE_COPY = Object.freeze({
  hint: '도구를 누르면 별 강화를 볼 수 있어요',
  note: '망치질 5번 · 내일 아침 완성 · 그동안도 쓸 수 있어요',
  max: '최고 별이에요',
  noTool: '먼저 만들어야 별을 달 수 있어요',
  busy: '모루에 다른 도구가 있어요',
  short: '재료가 부족해요',
  ringHint: '고리가 금색 원에 닿을 때 탭해요',
  judge: Object.freeze(['빗나감', '좋아요!', '완벽!']),
  resultTitle: '좋은 망치질이에요!',
  quit: '그만두기',
  ok: '좋아요',
});

export const EFFECT_LABEL = Object.freeze({ rod: '입질 여유', water: '물 성장', pot: '요리 버프', net: '포획', hammer: '목재' });

export const SHORT_NAME = Object.freeze({ rod: '낚싯대', water: '물조리개', pot: '냄비', net: '포충망', hammer: '망치' });

export const METER = Object.freeze([
  Object.freeze({ label: '0~4점', rate: '0%' }),
  Object.freeze({ label: '5~7점', rate: '10%' }),
  Object.freeze({ label: '8~9점', rate: '20%' }),
  Object.freeze({ label: '10점', rate: '30%' }),
]);

const DIGIT_BATCHIM = { 0: 'ㅇ', 1: 'ㄹ', 2: '', 3: 'ㅁ', 4: '', 5: '', 6: 'ㄱ', 7: 'ㄹ', 8: 'ㄹ', 9: '' };
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function finalOf(word) {
  const ch = String(word).trim().slice(-1);
  if (/\d/.test(ch)) return DIGIT_BATCHIM[ch];
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return '';
  return JONG[code % 28];
}

export function iga(word) { return finalOf(word) ? '이' : '가'; }

export function eulo(word) {
  const f = finalOf(word);
  return f && f !== 'ㄹ' ? '으로' : '로';
}

const trimNum = v => String(Math.round(v * 100) / 100);

export function effectValue(tool, v) {
  if (tool === 'rod') return `${v.toFixed(1)}초`;
  if (tool === 'water') return `×${trimNum(v)}`;
  if (tool === 'pot') return `${trimNum(v)}배`;
  if (tool === 'net') return `+${Math.round(v * 100)}%`;
  if (tool === 'hammer') return `${Math.round((1 - v) * 100)}% 덜`;
  return '';
}

export function effectText(tool, v) { return `${EFFECT_LABEL[tool]} ${effectValue(tool, v)}`; }

export function upgradeLabel(star) { return `🔨 ★${star}${eulo(`★${star}`)} 강화하기`; }

export function pendingTag(star) { return `🌙 ★${star} 내일`; }

export function gameTitle(tool, star) { return `🔨 ${SHORT_NAME[tool]} ★${star} 강화`; }

export function refundLine(coins) { return `🪙 ${coins} 돌려받았어요`; }

export function foretell(star) { return `🌙 내일 아침 ★${star}${iga(`★${star}`)} 돼요. 그동안도 쓸 수 있어요`; }

export function doneToast(ico, name, star) { return `${ico} ${name}${iga(name)} ★${star}${iga(`★${star}`)} 됐어요`; }
