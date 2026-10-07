// =============================================================
//  🏡 이웃 showcase 응답 검증 — 순수(three·game.js 없음, Node 테스트)
//  서버(neighbor_showcase)가 허용 목록만 보내지만 클라도 믿지 않는다: 모르는 id·깨진 좌표는 버리고,
//  그릴 수 없는 응답(집 단계 밖)은 null. 결과(View)만 js/neighbors/scene.js 가 받는다.
//  ⚠️ OUTDOOR·ANIMALS·HOUSE_POS 는 three/game.js 를 끌어와 여기서 import 할 수 없다 → ctx 로 주입
//     ctx = { outdoorIds:Set, animalIds:Set, fallbackAnimal:string, yard:{x,z} }
//  숫자 YARD_R·DECOR_MAX 는 sql/migrations/migrate_neighbors.sql _nb_yard 와 같아야 한다(tests/neighbors-sync)
// =============================================================
import { HOUSE_ADDONS } from '../house/addons.js';
import { findItem } from '../cosmetics/catalog.js';
import { petKindOf, stageOf } from '../pet/rules.js';
import { normalizeHouseStyle } from '../house-stage7.js';

export const YARD_R = 14;
export const DECOR_MAX = 40;
export const COSMETIC_SLOTS = Object.freeze(['head', 'neck', 'back', 'trail', 'skin']);
const MAX_STAGE = 7;
const PALETTE_N = 5;                      // ROOF/WALL/DOOR_COLORS 길이(js/data/places.js)
const NICK_FALLBACK = '이름 없는 여행자';   // SQL 의 coalesce 와 같은 문구

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const swatch = (v) => { const n = num(v); return n != null && Number.isInteger(n) && n >= 0 && n < PALETTE_N ? n : 0; };

export function sanitizeShowcase(raw, ctx) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const stage = num(raw.houseStage);
  if (stage == null || !Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) return null;

  const nick = typeof raw.nickname === 'string' ? raw.nickname.trim() : '';
  const character = typeof raw.character === 'string' && ctx.animalIds.has(raw.character) ? raw.character : ctx.fallbackAnimal;

  const eq = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
  const equipped = {};
  for (const s of COSMETIC_SLOTS) {
    const it = typeof eq[s] === 'string' ? findItem(eq[s]) : null;
    equipped[s] = it && it.slot === s ? it.id : null;
  }

  const petKind = raw.pet && typeof raw.pet === 'object' && typeof raw.pet.kind === 'string' && petKindOf(raw.pet.kind) ? raw.pet.kind : null;
  const pet = petKind ? { kind: petKind, stage: stageOf(Math.max(0, Math.floor(num(raw.pet.works) || 0))) } : null;

  const hs = raw.houseStyle && typeof raw.houseStyle === 'object' ? raw.houseStyle : {};
  const addons = Array.isArray(raw.addons)
    ? [...new Set(raw.addons.filter(id => typeof id === 'string' && HOUSE_ADDONS.some(a => a.id === id)))]
    : [];

  const outdoor = [];
  for (const o of Array.isArray(raw.outdoor) ? raw.outdoor : []) {
    if (outdoor.length >= DECOR_MAX) break;
    if (!o || typeof o !== 'object' || !ctx.outdoorIds.has(o.id)) continue;
    const x = num(o.x), z = num(o.z);
    if (x == null || z == null) continue;
    const dx = x - ctx.yard.x, dz = z - ctx.yard.z;
    if (Math.hypot(dx, dz) > YARD_R) continue;
    const r = num(o.rot);
    outdoor.push({ id: o.id, dx, dz, rot: r != null && Number.isInteger(r) ? ((r % 4) + 4) % 4 : 0 });
  }

  return {
    nickname: nick ? [...nick].slice(0, 16).join('') : NICK_FALLBACK,   // 코드 포인트 기준 — 이모지를 반으로 자르지 않게
    character, equipped, pet,
    houseStage: stage,
    houseStyle: { roof: swatch(hs.roof), wall: swatch(hs.wall), door: swatch(hs.door) },
    style: normalizeHouseStyle(typeof raw.style === 'string' ? raw.style : null, stage),
    addons, outdoor,
  };
}
