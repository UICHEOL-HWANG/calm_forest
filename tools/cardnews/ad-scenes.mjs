// =============================================================
//  calm forest · 🎬 광고 대본 — ad-record.mjs 가 프레임마다 at(t) 를 부른다
//  ------------------------------------------------------------
//  at(t) → { cam: { p, l, fov }, keys: [누르고 있는 키], press: [이 프레임에 한 번], run: [게임 함수 호출] }
//    cam.p / cam.l 은 **플레이어 기준 오프셋**(m). 기본 추적 카메라는 p=[0,14,16] (위에서 내려다봄)
//    — 광고는 그보다 훨씬 낮고 가깝게 잡는다. +z 가 카메라 쪽, KeyS 는 카메라 쪽으로 걷는다.
//    run 은 문자열 함수 `g => …`(g = game.js 모듈) — 브라우저 안에서 그대로 eval 된다.
//
//  레퍼런스(2026-10-21 조사, dev/active/meta-ads/ad-video.md):
//    ① 첫 2초 안에 실제 게임 플레이 ② 빈 마당 → 하나씩 채우기(비포/애프터, 딸깍)
//    ③ 의상은 캐릭터 둘레를 도는 카메라로 ④ 끝을 덜 끝난 채로 CTA ⑤ 마감일 자막(할로윈)
//  자막·엔드카드 문구와 시각은 ad-compose.mjs 의 CAPTIONS 에 같이 둔다(이 파일의 구간과 1:1).
// =============================================================

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // easeInOutCubic
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
/** 두 자세 사이를 시간 구간 안에서 부드럽게 */
const move = (t, a, b, from, to, e = ease) => {
  const k = e(span(t, a, b));
  return { p: lerp(from.p, to.p, k), l: lerp(from.l, to.l, k), fov: from.fov + ((to.fov ?? from.fov) - from.fov) * k };
};
/** 플레이어 둘레를 도는 카메라 — 각도는 +z(정면)에서 시계 반대 방향, 라디안 */
const orbit = (t, a, b, { r, h, a0, a1, look = 1.0, fov = 38 }) => {
  const ang = a0 + (a1 - a0) * ease(span(t, a, b));
  return { p: [r * Math.sin(ang), h, r * Math.cos(ang)], l: [0, look, 0], fov };
};
/** 이 시각 프레임 하나에만 실행 */
let sceneFps = 30;
export const setSceneFps = (f) => { sceneFps = f; };
const once = (t, at, fps = sceneFps) => t >= at && t < at + 1 / fps;

// 집 앞 마당 — HOUSE_POS(-8,-8) 의 정면(+z). 장식은 플레이어 좌우·뒤로 놓아 카메라와 겹치지 않게
const YARD = [-8, -3.6];
const FACE_CAM = 0;   // 카메라(+z)를 보는 방향 — game.js 가 rotation.y = atan2(dx, dz) 로 돈다(-z 쪽은 π)
// 🪓 베기용 나무 — 세이브마다 나무 위치가 무작위라 앞에 다른 물건이 낀다. 마당 왼쪽에 하나를 직접 심는다
const CHOP = [YARD[0] - 5.5, YARD[1] + 1.0];
const plantTree = `g => {
  g.spawnTree(${CHOP[0]}, ${CHOP[1]});
  window.__tp(${CHOP[0]}, ${CHOP[1] + 1.4}); g.player.rotation.y = Math.PI;
}`;
const place = (id, dx, dz, rot = 0) => `g => g.placeOutdoor(${YARD[0] + dx}, ${YARD[1] + dz}, true, '${id}', ${rot})`;
const tpYard = `g => { window.__tp(${YARD[0]}, ${YARD[1]}); g.player.rotation.y = ${FACE_CAM}; }`;

const MF0 = [400, 300], DV0 = [400, -300];
const mudPrep = (spId, near) => `g => {
  const run = window.__mudflat().run, P = g.player.position;
  const lx = P.x - ${MF0[0]}, lz = P.z - ${MF0[1]};
  const pool = run.holes.filter(h => h.z < lz - 1.5 && h.z > lz - 7 && Math.abs(h.x - lx) < 5);
  const h = (pool.length ? pool : run.holes)[${near}] || run.holes[0];
  h.sp = window.__MUD_SP.find(s => s.id === '${spId}'); h.period = 2.4; h.phase = .72; h.miss = 0;
  P.set(${MF0[0]} + h.x, 0, ${MF0[1]} + h.z + .85); g.player.rotation.y = Math.PI;
}`;
const diveMark = `g => {
  const run = window.__dive().run, P = g.player.position;
  run.air = 1;
  const lx = P.x - ${DV0[0]}, lz = P.z - ${DV0[1]};
  const byDist = [...run.items].sort((a, b) => Math.hypot(a.x - lx, a.z - lz) - Math.hypot(b.x - lx, b.z - lz));
  const a = byDist[0], b = byDist.find(i => i !== a && Math.hypot(i.x - a.x, i.z - a.z) > 2.5);
  window.__pearl = { id: 90001, x: b.x, z: b.z, d: b.d, ph: b.ph, sp: window.__DIVE_SP.find(s => s.id === 'pearl') };
  run.items = [...run.items.filter(i => i !== b), window.__pearl];
  P.set(${DV0[0]} + a.x, P.y, ${DV0[1]} + a.z + .9); g.player.rotation.y = Math.PI;
}`;
const diveToPearl = `g => {
  const p = window.__pearl, P = g.player.position;
  P.set(${DV0[0]} + p.x, P.y, ${DV0[1]} + p.z + .95); g.player.rotation.y = Math.PI;
}`;

export const SEA_SCENES = {
  mudflat_catch: {
    duration: 4.4,
    query: 'season=summer&weather=clear&time=0.42&dbg=1&mudflat=1&mudflatdebug=1',
    char: '곰',
    setup: { init: `async g => { window.__MUD_SP = (await import('/js/forage/logic.js')).MUD_SPECIES; }` },
    at(t) {
      const run = [], press = [];
      if (once(t, 0)) run.push(mudPrep('clam', 0));
      if (once(t, 0.95)) press.push('Space');
      if (once(t, 2.2)) run.push(mudPrep('octo', 1));
      if (once(t, 3.15)) press.push('Space');
      const cam = t < 2.2
        ? move(t, 0, 2.2, { p: [3.5, 6.5, 8.5], l: [0, 0, -5], fov: 56 }, { p: [2.4, 4.2, 6.0], l: [0, 0.2, -3], fov: 52 })
        : move(t, 2.2, 4.4, { p: [-2.5, 2.0, -3.9], l: [0, 1.25, -0.5], fov: 50 }, { p: [-2.2, 1.9, -3.6], l: [0, 1.3, -0.5], fov: 50 });
      return { cam, keys: [], press, run };
    },
  },
  sea_fish: {
    duration: 4.0,
    query: 'season=summer&weather=clear&time=0.42&dbg=1&sea=1&seadebug=1',
    char: '곰',
    setup: {},
    at(t) {
      const run = [];
      if (once(t, 0.1)) run.push(`g => window.__sea.action()`);
      if (once(t, 0)) run.push(`g => g.setCameraRig((cam) => {
        const P = g.player.position, mg = window.__sea.mg, f = mg.fmesh && mg.st === 'fight' ? mg.fmesh.getWorldPosition(mg.fmesh.position.clone()) : null;
        const tx = f ? f.x : P.x, tz = f ? f.z : P.z - 6, ty = f ? Math.max(0.3, f.y) : 0.3;
        window.__fl = window.__fl || { x: tx, y: ty, z: tz };
        const k = 0.12; window.__fl.x += (tx - window.__fl.x) * k; window.__fl.y += (ty - window.__fl.y) * k; window.__fl.z += (tz - window.__fl.z) * k;
        const L = window.__fl;
        cam.position.set(P.x + (P.x - L.x) * 0.25 + 1.2, 2.3, P.z + 3.2);
        if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
        cam.lookAt(P.x * 0.45 + L.x * 0.55, 0.7 + L.y * 0.35, P.z * 0.45 + L.z * 0.55);
      })`);
      run.push(`g => { const mg = window.__sea.mg; if (mg.st === 'wait' && mg.biteAt > mg.t + 0.35) { mg.biteAt = mg.t + 0.35; mg.nibbles = []; } if (mg.st === 'hook' && mg.t > 0.12) window.__sea.action(); }`);
      for (const at of [1.75, 3.0]) if (once(t, at)) run.push(`g => { const mg = window.__sea.mg; if (mg.st === 'fight' && !mg.jump) mg.jump = { k: 0, dur: 0.8, h: 1.3 + mg.sp.scale * 0.7 }; }`);
      for (const at of [2.6, 2.75, 3.6]) if (once(t, at)) run.push(`g => { if (window.__sea.mg.st === 'fight') window.__sea.action(); }`);
      const cam = move(t, 0, 4.0, { p: [2.6, 1.7, 2.4], l: [-0.6, 0.7, -5], fov: 50 }, { p: [2.2, 1.5, 2.0], l: [-0.4, 0.8, -5], fov: 48 });
      return { cam, keys: [], run };
    },
  },
  dive_entry: {
    duration: 2.4,
    query: 'season=summer&weather=clear&time=0.42&dbg=1&dive=1&divedebug=1',
    char: '곰',
    setup: {},
    at(t) {
      const press = [];
      if (once(t, 0.45)) press.push('Space');
      const cam = move(t, 0, 2.4, { p: [2.4, 1.9, 3.4], l: [0, 0.1, -0.6], fov: 50 }, { p: [2.0, 1.2, 2.8], l: [0, -1.2, -0.6], fov: 50 });
      return { cam, keys: [], press, run: [] };
    },
  },
  dive_pearl: {
    duration: 4.0,
    query: 'season=summer&weather=clear&time=0.42&dbg=1&dive=1&divedebug=1',
    char: '곰',
    setup: { init: `async g => { window.__DIVE_SP = (await import('/js/forage/logic.js')).DIVE_SPECIES; const r = window.__dive().run; r.state = 'swim'; r.breath = 1e6; }` },
    at(t) {
      const run = [], press = [];
      if (once(t, 0)) run.push(diveMark);
      if (once(t, 0.4)) press.push('Space');
      if (once(t, 1.2)) run.push(diveToPearl);
      if (once(t, 2.1)) press.push('Space');
      const cam = t < 1.2
        ? move(t, 0, 1.2, { p: [3.4, 1.4, -3.8], l: [0, 0, -0.9], fov: 46 }, { p: [3.0, 1.3, -3.5], l: [0, 0, -0.9], fov: 46 })
        : t < 1.7
          ? { p: [1.6, 0.4, -5.2], l: [0, -0.5, -1.0], fov: 40 }
          : t < 2.15
            ? move(t, 1.7, 2.05, { p: [1.6, 0.4, -5.2], l: [0, -0.5, -1.0], fov: 40 }, { p: [-0.8, -0.15, -2.3], l: [0, -0.55, -0.95], fov: 32 })
            : move(t, 2.15, 3.1, { p: [-0.8, -0.15, -2.3], l: [0, -0.55, -0.95], fov: 32 }, { p: [-2.8, 1.0, -5.8], l: [0, 1.5, -0.4], fov: 48 });
      const dtScale = t >= 2.0 && t < 3.3 ? 0.3 : 1;
      return { cam, keys: [], press, run, dtScale };
    },
  },
};

export const SCENES = {
  // 🎃 할로윈 — 겨울 밤 + 눈. 마녀 옷·박쥐 망토·호박등 자국. 11/2 까지
  halloween: {
    duration: 13,
    query: 'season=winter&weather=snow&time=0.95&dbg=1',
    char: '곰',
    setup: {
      at: YARD, face: FACE_CAM,
      wear: { skin: 'witch_starry', back: 'bat_cape', trail: 'pumpkin_glow', tools: 'tools_batnight' },
      decor: [['pumpkinlamp', YARD[0] - 4.2, YARD[1] - 3.2], ['pumpkinlamp', YARD[0] + 4.2, YARD[1] - 3.2]],
      build: 5,
    },
    at(t) {
      const run = [];
      let cam, keys = [];
      if (t < 2.4) {                       // ① 훅: 밤 마당으로 천천히 밀고 들어가 마녀 여우를 잡는다
        cam = move(t, 0, 2.4, { p: [0, 5.5, 12.5], l: [0, 1.0, -1], fov: 40 }, { p: [0, 2.3, 6.2], l: [0, 1.2, 0], fov: 36 });
      } else if (t < 5.2) {                // ② 딸깍: 유령 등·묘비 울타리·거미줄 아치가 하나씩 생긴다
        cam = move(t, 2.4, 5.2, { p: [2.2, 3.4, 8.4], l: [0, 0.9, -1.2], fov: 42 }, { p: [1.0, 3.8, 9.4], l: [0, 0.9, -1.5], fov: 42 });
        if (once(t, 2.7)) run.push(place('ghostlamp', -1.7, -1.1));
        if (once(t, 3.3)) run.push(place('ghostlamp', 1.7, -1.1));
        if (once(t, 3.9)) run.push(place('gravefence', -3.0, -2.8, 0));
        if (once(t, 4.5)) run.push(place('webarch', 0, -2.6));
      } else if (t < 8.6) {                // ③ 의상: 둘레를 반 바퀴 — 망토가 보이게 등 뒤까지
        cam = orbit(t, 5.2, 8.6, { r: 4.8, h: 2.1, a0: 0.7, a1: -1.9, look: 1.1, fov: 38 });
      } else if (t < 11) {                 // ④ 산책: 카메라 쪽으로 걸어오고 호박등 자국이 따라온다
        keys = ['KeyS'];
        if (t > 9.6) keys.push('KeyD');
        cam = move(t, 8.6, 11, { p: [-1.6, 1.9, 6.4], l: [0, 1.1, 0], fov: 40 }, { p: [1.4, 2.1, 6.8], l: [0, 1.1, 0], fov: 40 });
      } else {                             // ⑤ 엔드카드: 위로 빠지며 밤 마을 전체 — 마당은 덜 꾸며진 채로
        cam = move(t, 11, 13, { p: [0.6, 2.6, 7.2], l: [0, 1.0, -1], fov: 40 }, { p: [0, 13, 18], l: [0, 0, -5], fov: 44 });
      }
      if (once(t, 2.4) || once(t, 0)) run.push(tpYard);   // ①·② 시작 자세 고정(걸은 뒤가 아니라)
      cam.fill = t < 11 ? 45 : 45 * (1 - span(t, 11, 12));   // 밤 — 얼굴에 보조광, 빠질 땐 꺼서 마을 불빛이 살게
      return { cam, keys, run };
    },
  },

  // 🌲 기본 — 겨울 낮 + 눈. 나무 베기(탁탁) → 마당 채우기 → 앉아 쉬기 → 마을 전체
  cozy: {
    duration: 13,
    query: 'season=winter&weather=snow&time=0.42&dbg=1',
    char: '곰',
    setup: { at: YARD, face: FACE_CAM, wear: {}, decor: [], build: 5 },
    at(t) {
      const run = [], press = [];
      let cam, keys = [];
      if (t < 2.8) {                       // ① 훅: 첫 프레임부터 도끼질 — 나무 조각이 튄다
        cam = move(t, 0, 2.8, { p: [5.8, 2.0, -0.6], l: [0, 1.35, -0.7], fov: 42 }, { p: [4.7, 1.8, -0.6], l: [0, 1.35, -0.7], fov: 40 });   // 옆에서 — 곰과 나무가 나란히
        if (once(t, 0)) run.push(plantTree, `g => { const e = c => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); window.dispatchEvent(new KeyboardEvent('keyup', { code: c })); }; if (g.toolPage !== 'out') e('Digit1'); e('Digit2'); }`);
        for (const s of [0.25, 0.95, 1.65, 2.35]) if (once(t, s)) press.push('Space');
      } else if (t < 6.2) {                // ② 마당 채우기 — 꽃밭·가로등·건초·울타리가 하나씩
        cam = move(t, 2.8, 6.2, { p: [2.4, 3.6, 8.6], l: [0, 0.8, -1.4], fov: 42 }, { p: [1.0, 3.9, 9.6], l: [0, 0.8, -1.6], fov: 42 });
        if (once(t, 2.8)) run.push(tpYard);
        if (once(t, 3.1)) run.push(place('flowerbed', -1.9, -1.0));
        if (once(t, 3.7)) run.push(place('postlamp', 1.9, -1.0));
        if (once(t, 4.3)) run.push(place('haybale', -3.2, -2.6));
        if (once(t, 4.9)) run.push(place('fence', 3.2, -2.6, 0));
      } else if (t < 9.8) {                // ③ 쉬기 — 눈 오는 마당에 앉고, 카메라가 천천히 둘레를 돈다
        if (once(t, 6.3)) press.push('KeyC');
        cam = orbit(t, 6.2, 9.8, { r: 5.0, h: 2.2, a0: -0.9, a1: 0.9, look: 0.9, fov: 38 });
      } else {                             // ④ 엔드카드: 위로 빠지며 마을 전체 — 마당은 덜 꾸며진 채로
        cam = move(t, 9.8, 13, { p: [0.8, 2.8, 7.2], l: [0, 1.0, -1], fov: 40 }, { p: [0, 13, 18], l: [0, 0, -5], fov: 44 });
      }
      return { cam, keys, press, run };
    },
  },
  ...SEA_SCENES,
};
