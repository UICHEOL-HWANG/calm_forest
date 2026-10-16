// =============================================================
//  calm forest · 🔓 마을 해금 표 + 판정 (순수 함수 — DOM/Three/import 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-unlocks-design.md
//  ▶ 새 세이브는 이웃(NPC)·마을 시설이 안 보이는 채로 시작하고, 진행하며 하나씩 돌아온다(포코피아식).
//    혼자 하는 기본 활동(벌목·채굴·텃밭·호수 낚시)은 처음부터 열려 있다 — 잠그는 건 "같이 살 이웃과 시설"뿐.
//  ▶ 해금은 **저장하지 않고 계산한다** — STORY_RULES 처럼 기존 진행 필드에서 매번 판정.
//    저장하는 건 기존 필드로 알 수 없는 사건(flags.bridge 등)뿐이다.
//  ▶ 기존 유저는 전부 열림 — 세이브에 unlocks 가 없으면 legacy(js/mountain/unlock.js resolveFirstDay 와 같은 원리).
//    새 세이브는 applySave 를 안 거치므로 defaultUnlocks()(legacy:false) 그대로 남는다.
//  ▶ 🎣 호수 낚시는 처음부터 연다 — E3 트리거(첫 물고기) 경로를 바꾸지 않기 위해서.
//  ▶ 테스트: npm test (tests/world-unlocks.test.mjs)
// =============================================================

export const UNLOCKS_V = 1;

// 세계수 가지 진행 — 서식지(habitat)·꾸러미(bundles) 완성 여부. 판(board)은 아직 없다(스펙 §8 의 5단계).
//   ⚠️ 판이 생기기 전에는 가지 조건이 영원히 false 다 → CONFIG.UNLOCKS 를 'off' 로 두고 배포한다.
const branch = (s, id, part) => !!s?.tree?.branches?.[id]?.[part];
const always = () => true;

/**
 * 해금 표 — 배열 순서 = 일반적인 해금 순서(newlyUnlocked 가 이 순서로 돌려준다).
 *   kind  'npc'   → id 는 js/data/npcs.js 의 NPC id
 *         'place' → 마을 시설·입구 키(doors.js / villagePlaces 에서 쓰는 이름)
 *   when(state) → 열렸는가
 */
export const UNLOCKS = [
  // ── 시작부터 ──
  { id: 'courier',    kind: 'npc',   when: always },   // 🦉 데일리 의뢰를 주는 이 — 없으면 데일리 체계가 멈춘다
  { id: 'house',      kind: 'place', when: always },
  { id: 'bench',      kind: 'place', when: always },
  { id: 'farm',       kind: 'place', when: always },   // E1 처치 무리가 텃밭에서 시작한다
  { id: 'mine',       kind: 'place', when: always },   // 다리 수리용 돌 공급처 — 다리 앞에 있다
  { id: 'rank',       kind: 'place', when: always },
  { id: 'cosShop',    kind: 'place', when: always },
  { id: 'plaza',      kind: 'place', when: always },   // 계절 규칙(plazaMapVisible)은 그대로
  { id: 'mountain',   kind: 'place', when: always },   // 둘째 날 규칙(isMountainOpen)은 그대로
  // ── ① 상인 환영 방문(목재 5 또는 물고기 1) — js/spaces/npc.js 의 기존 연출을 귀환으로 쓴다 ──
  { id: 'merchant',   kind: 'npc',   when: s => !!s?.hintsSeen?.merchantVisit },
  { id: 'shop',       kind: 'place', when: s => !!s?.hintsSeen?.merchantVisit },
  { id: 'market',     kind: 'place', when: s => !!s?.hintsSeen?.merchantVisit },
  // ── ② 집 기초 ──
  { id: 'builder',    kind: 'npc',   when: s => (s?.houseStage || 0) >= 1 },
  // ── ③ 집 완성 → 다리 수리 가능 / ④ 다리 수리 → 박물관·할아버지 ──
  { id: 'bridgeRepair', kind: 'place', when: s => (s?.houseStage || 0) >= 3 },
  { id: 'museum',     kind: 'place', when: s => !!s?.unlocks?.flags?.bridge },
  { id: 'curator',    kind: 'npc',   when: s => !!s?.unlocks?.flags?.bridge },
  // ── ⑤ 물의 가지 ──
  { id: 'angler',     kind: 'npc',   when: s => branch(s, 'water', 'habitat') },
  { id: 'river',      kind: 'place', when: s => branch(s, 'water', 'habitat') },
  // ── ⑥ 밭의 가지 ──
  { id: 'farmer',     kind: 'npc',   when: s => branch(s, 'farm', 'habitat') },
  { id: 'coop',       kind: 'place', when: s => branch(s, 'farm', 'habitat') },
  { id: 'orchard',    kind: 'place', when: s => branch(s, 'farm', 'habitat') },   // 기존 PROGRESS_GATE 는 그대로 겹쳐 적용
  { id: 'rancher',    kind: 'npc',   when: s => !!s?.coop?.built },
  // ── ⑦ 부엌의 가지 ──
  { id: 'chef',       kind: 'npc',   when: s => branch(s, 'kitchen', 'habitat') },
  { id: 'kitchen',    kind: 'place', when: s => branch(s, 'kitchen', 'habitat') },
  { id: 'cafe',       kind: 'place', when: s => branch(s, 'kitchen', 'habitat') },
  // ── ⑧ 숲의 가지 ──
  { id: 'forager',    kind: 'npc',   when: s => branch(s, 'forest', 'habitat') },
  { id: 'forest',     kind: 'place', when: s => branch(s, 'forest', 'habitat') },
  { id: 'mist',       kind: 'place', when: s => branch(s, 'forest', 'habitat') },
  { id: 'glade',      kind: 'place', when: s => branch(s, 'forest', 'habitat') },
  { id: 'lightWorkshop', kind: 'place', when: s => branch(s, 'forest', 'habitat') },
  // ── ⑨ 나루터 꾸러미 ──
  { id: 'ferryman',   kind: 'npc',   when: s => branch(s, 'water', 'bundles') },
  { id: 'sea',        kind: 'place', when: s => branch(s, 'water', 'bundles') },
  // ── ⑩ 6장(숲의 기억) 완료 — story.ch 는 끝낸 장 수 ──
  { id: 'observatory', kind: 'place', when: s => (s?.story?.ch || 0) >= 6 },
  { id: 'stargazer',  kind: 'npc',   when: s => (s?.story?.ch || 0) >= 6 },
  // ── ⑪ 7장(별을 잇는 밤) 완료 ──
  { id: 'neighbor',   kind: 'place', when: s => (s?.story?.ch || 0) >= 7 },
  { id: 'mirror',     kind: 'place', when: s => (s?.story?.ch || 0) >= 7 },
];

export const UNLOCK_IDS = UNLOCKS.map(u => u.id);
const BY_ID = new Map(UNLOCKS.map(u => [u.id, u]));

/** 새 세이브 기본값. legacy:false = 해금 규칙을 따른다 */
export function defaultUnlocks() {
  return { v: UNLOCKS_V, legacy: false, flags: {} };
}

/**
 * 세이브 복원. **필드가 없거나 깨졌으면 legacy**(= 이 기능 전의 세이브 → 전부 열림).
 * flags 는 true 인 키만 살린다(모르는 값·문자열 주입 방어).
 */
export function restoreUnlocks(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { v: UNLOCKS_V, legacy: true, flags: {} };
  const flags = {};
  if (saved.flags && typeof saved.flags === 'object' && !Array.isArray(saved.flags)) {
    for (const [k, v] of Object.entries(saved.flags)) if (v === true) flags[k] = true;
  }
  return { v: UNLOCKS_V, legacy: saved.legacy === true, flags };
}

/**
 * 지금 열린 id 집합.
 * @param {object} state  gameState(또는 같은 모양)
 * @param {{enabled?: boolean}} opts  enabled=false(CONFIG.UNLOCKS 'off') 면 전부 열림
 */
export function unlockedSet(state, { enabled = true } = {}) {
  if (!enabled || !state?.unlocks || state.unlocks.legacy) return new Set(UNLOCK_IDS);
  const out = new Set();
  for (const u of UNLOCKS) if (u.when(state)) out.add(u.id);
  return out;
}

/** 표에 없는 id 는 해금 대상이 아니다 → 항상 열림(새 NPC·시설을 추가해도 실수로 숨지 않게) */
export function isUnlocked(state, id, opts) {
  if (!BY_ID.has(id)) return true;
  return unlockedSet(state, opts).has(id);
}

/** 이전 → 지금 사이에 새로 열린 id(표 순서). 귀환 연출·GA4 `unlock` 이벤트용 */
export function newlyUnlocked(prev, next) {
  return UNLOCK_IDS.filter(id => next.has(id) && !prev.has(id));
}

/** 숨겨야 할 NPC id — 반복·데일리 의뢰 풀과 상호작용에서 뺄 때 */
export function lockedNpcIds(state, opts) {
  const open = unlockedSet(state, opts);
  return UNLOCKS.filter(u => u.kind === 'npc' && !open.has(u.id)).map(u => u.id);
}
