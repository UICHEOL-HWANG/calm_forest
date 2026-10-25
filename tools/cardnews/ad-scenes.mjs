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
const once = (t, at, fps = 30) => t >= at && t < at + 1 / fps;

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
};
