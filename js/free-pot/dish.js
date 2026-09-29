// =============================================================
//  🍲 자유 냄비 → 레시피 모양 객체. kitchenStart/kitchenFinish/찬장이 레시피처럼 다룬다
//  ▶ 표(약 130KB)는 첫 로딩에 넣지 않는다 — 주방을 열 때 loadFreePot() 로 한 번만 불러온다.
//    찬장에 자유 요리가 있는데 표가 아직 없으면 '🍲 냄비 요리' 대체 객체로 안전하게 보여 준다.
// =============================================================
import { BLOCKED, INGREDIENTS, buffOf, capTaste, comboKey, costOf, durOf, stageOf } from './rules.js';

export const FREE_PREFIX = 'free:';
export const isFreeId = (id) => typeof id === 'string' && id.startsWith(FREE_PREFIX);

let TABLE = null, loading = null;
export function loadFreePot() {
  if (TABLE) return Promise.resolve();
  return (loading ||= import('./table.js').then(m => { TABLE = m.FREE_POT_TABLE; }));
}
export const freePotReady = () => !!TABLE;
export const freePotTotal = () => (TABLE ? Object.keys(TABLE).length : 0);

export function freeDishOf(id) {
  if (!isFreeId(id)) return null;
  const key = id.slice(FREE_PREFIX.length);
  const parts = key.split('+');
  if (parts.length > 3 || !parts.every(k => INGREDIENTS.includes(k)) || BLOCKED[key]) return null;
  const e = TABLE?.[key];
  if (TABLE && !e) return null;
  const taste = e ? capTaste(key, e.taste) : 3;
  return {
    id, name: e?.name || '냄비 요리', name_en: e?.name_en || 'Pot Dish', ico: e?.ico || '🍲', desc: '',
    cost: costOf(key), buff: buffOf(key), dur: durOf(taste), stages: [stageOf(key)],
    free: { key, taste, judge: e?.judge || '', judge_en: e?.judge_en || '', tags: e?.tags || [] },
  };
}

export function freePotCheck(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3) return { ok: false, msg: '재료를 1~3개 골라 주세요' };
  const key = comboKey(ids);
  if (BLOCKED[key]) return { ok: false, key, blocked: BLOCKED[key], msg: '레시피가 있는 요리예요 — 메뉴에서 만들어 주세요' };
  return { ok: true, key };
}
