// =============================================================
//  calm forest · 🦋 텃밭 방문객 스폰·등록
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-17-habitat-design.md
//  판정 규칙은 js/habitat.js 가 단일 출처다. 여기는 "언제 뜨고 언제 사라지나" 만 맡는다.
//  ▶ 텃밭 체류 중에만 뜬다. 오프라인 방문·흔적은 비범위(서버 판정이 필요해진다).
//  ▶ 등록은 1회, 방문은 반복 — 다 모은 뒤에도 정원 설계가 의미를 잃지 않게.
//  ▶ 메시는 farmGroup 자식이라 텃밭을 나가면 같이 숨는다.
//  ▶ 의존은 전부 주입받는다 — 메시 생성까지 호출부가 한다. 그래서 테스트가 THREE 없이 돈다.
//  ▶ 테스트: npm test (tests/farm-visitors.test.mjs)
// =============================================================

export const MAX_ALIVE = 2;
export const SPAWN_DELAY_MIN = 6;    // 조건 충족 즉시 뜨면 싸구려가 된다
export const SPAWN_DELAY_MAX = 14;
export const STAY = 25;              // 등록 여부와 무관하게 이만큼 머물고 떠난다
export const CATCH_R = 2.5;          // 다가가면 등록되는 거리
export const FADE = 1.2;             // 페이드 인/아웃 시간

/** 메시와 자식들의 불투명도 — 재질을 공유하는 조형이면 호출부가 clone 해서 넘겨야 한다 */
function setOpacity(obj, v) {
  obj.traverse?.(o => {
    if (!o.material) return;
    o.material.transparent = true;
    o.material.opacity = v;
  });
}

/**
 * @param {object} deps
 *   group          THREE.Group             farmGroup — 여기에 메시를 붙인다
 *   origin         {x, z}                  ⚠️ group 의 **월드 오프셋**. farmGroup 은 (0,0,84) 다.
 *                                          없으면 0 으로 본다(월드 = 로컬).
 *   makeMesh       (visitorId) => Object3D  y 높이는 조형이 스스로 정한다
 *   cells          () => {x,z}[]           후보 지점(월드)
 *   envAt          (x,z) => env
 *   matchVisitors  (env, ctx) => Visitor[]
 *   ctx            () => {night, rain}
 *   playerPos      () => {x,z}
 *   onSpawn        (id) => void
 *   onDiscover     (id) => void            이미 등록된 종이면 호출부가 재방문으로 처리한다
 *   random         () => number            테스트에서 고정 가능(기본 Math.random)
 */
export function createVisitors(deps) {
  const rnd = deps.random || Math.random;
  // ⚠️ 실제 사고(2026-09-18): farmGroup.position = (0,0,84) 인데 월드 좌표를 mesh.position 에
  //   그대로 넣어, 방문객이 월드 z=168(밭에서 84 떨어진 허공)에 떠서 화면에 안 보였다.
  //   근접 판정도 같은 로컬 값을 써서 "등록은 되는" 상태라 눈치채기 어려웠다.
  //   → 메시는 **로컬로 변환해** 놓고, 근접 판정은 레코드에 들고 있는 **월드 좌표**로 한다.
  const ox = deps.origin?.x || 0, oz = deps.origin?.z || 0;
  const nextDelay = () => SPAWN_DELAY_MIN + rnd() * (SPAWN_DELAY_MAX - SPAWN_DELAY_MIN);
  let alive = [];
  // ⚠️ 0 으로 시작하면 첫 update 에서 곧바로 뜬다 — 텃밭에 들어서자마자 나비가 튀어나온다.
  //    첫 손님도 기다려야 "환경을 만들었더니 찾아왔다" 로 읽힌다.
  let nextTry = nextDelay();

  function clear() {
    for (const a of alive) deps.group?.remove(a.mesh);
    alive = [];
    nextTry = nextDelay();   // 다시 들어와도 즉시 스폰되지 않게
  }

  /** 지금 뜰 수 있는 (종, 자리) 후보 중 하나. 이미 떠 있는 종은 뺀다 — 같은 종이 둘이면 어색하다. */
  function pickSpot() {
    const ctx = deps.ctx();
    const taken = new Set(alive.map(a => a.id));
    const spots = [];
    for (const c of deps.cells()) {
      for (const v of deps.matchVisitors(deps.envAt(c.x, c.z), ctx)) {
        if (!taken.has(v.id)) spots.push({ id: v.id, c });
      }
    }
    return spots.length ? spots[Math.floor(rnd() * spots.length)] : null;
  }

  function update(dt) {
    nextTry -= dt;

    // ── 살아 있는 것들 — 수명·페이드·근접 등록 ──
    for (const a of alive) {
      a.life += dt;
      const fadeIn = Math.min(1, a.life / FADE);
      const fadeOut = Math.min(1, Math.max(0, (STAY - a.life) / FADE));
      setOpacity(a.mesh, Math.min(fadeIn, fadeOut));
      if (!a.caught) {
        const p = deps.playerPos();
        if (Math.hypot(a.wx - p.x, a.wz - p.z) <= CATCH_R) {
          a.caught = true;
          deps.onDiscover(a.id);
        }
      }
    }
    const leaving = alive.filter(a => a.life >= STAY);
    for (const a of leaving) deps.group?.remove(a.mesh);
    alive = alive.filter(a => a.life < STAY);
    // ⚠️ 떠난 자리를 같은 프레임에 채우지 않는다 — 한 마리가 사라지자마자 다른 마리가 뜨면
    //    "정원이 불러들였다" 가 아니라 "계속 뭔가 깜빡인다" 로 읽힌다.
    //    체류 25초 동안에도 타이머는 계속 깎이므로, 다시 감지 않으면 크게 음수가 돼 즉시 스폰된다.
    if (leaving.length) { nextTry = nextDelay(); return; }

    // ── 새로 띄우기 ──
    if (nextTry > 0 || alive.length >= MAX_ALIVE) return;
    // ⚠️ 후보가 없어도 타이머를 새로 감는다 — 안 그러면 조건 미충족인 동안 매 프레임 밭 전체를 훑는다
    nextTry = nextDelay();
    const pick = pickSpot();
    if (!pick) return;
    const mesh = deps.makeMesh(pick.id);
    mesh.position.x = pick.c.x - ox; mesh.position.z = pick.c.z - oz;   // 부모 오프셋만큼 뺀다
    setOpacity(mesh, 0);
    deps.group?.add(mesh);
    alive.push({ id: pick.id, mesh, life: 0, caught: false, wx: pick.c.x, wz: pick.c.z });
    deps.onSpawn(pick.id);
  }

  return { update, clear, get alive() { return alive.map(a => a.id); } };
}
