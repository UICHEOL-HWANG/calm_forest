// =============================================================
//  calm forest · 🌳 세계수 조망샷 — 카메라 계산 + 리그(Three/게임 상태 없음)
//  ------------------------------------------------------------
//  ▶ 마을 카메라(41° 내려다봄)로는 밑동만 보여서, 가지에 잎·꽃이 돋아도 눈에 안 들어왔다.
//    이정표(이웃 귀환·잎·꽃 · 판이 처음 열릴 때)에만 짧게(≈3.5초) 물러나 우듬지 전체를 보여 준다.
//  ▶ 🏔️ 설산 해금 리그(js/mountain/reveal.js — c68edc9 에서 사용자 결정으로 뺐다)에서 배운 것:
//    · 카메라 자리는 그대로 두고 시선만 150 앞 하늘로 홱 꺾어 3초 붙잡았다 — 건너뛸 수 없고, 플레이어가
//      한 일과 무관하게 걷던 도중 끼어들었다. 그래서 여기서는
//      ① 플레이어가 방금 만든 변화(판에서 완성)나 처음 한 번에만, ② 탭·클릭·아무 키로 즉시 넘기고,
//      ③ 카메라가 기본 시점에서 부드럽게 물러났다가 그 자리로 돌아온다(시선만 꺾지 않는다).
//  ▶ 사용: js/spaces/world-tree.js (줄 세우기·잎 자람 지연·GA4)
// =============================================================

/** 0~1 → 0~1, 양끝이 부드러운 곡선(smootherstep) */
export const ease = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * x * (x * (x * 6 - 15) + 10); };

export const SHOT_PITCH = 27;   // ° — 마을 41° 보다 눕혀 우듬지와 가지 넷이 다 들어온다
export const SHOT_HOLD = 1.7;   // 초 — 카메라가 도착한 뒤 잎·꽃이 돋는 동안 머문다
export const SHOT_FOV = 42;     // 마을 카메라 세로 시야(game.js updateCamera 가 맞춰 둔다)

/**
 * 나무 상자를 화면에 다 담는 카메라 자리.
 *   box: { cx, cy, cz, hx, hy, hz } — 월드 좌표 중심과 반폭(가지 끝·우듬지까지)
 *   aspect: camera.aspect — 폰 세로(≈0.46)는 가로 시야가 좁아 그만큼 뒤로 물린다
 * 반환 { pos: {x,y,z}, look: {x,y,z}, dist }
 */
export function shotFrame(box, aspect, { pitch = SHOT_PITCH, fov = SHOT_FOV, margin = 1.14 } = {}) {
  const p = pitch * Math.PI / 180, tv = Math.tan(fov * Math.PI / 360), th = tv * Math.max(0.2, aspect || 1);
  // 카메라가 -z 를 보며 p 만큼 내려다본다 → 화면 세로에 걸리는 반높이 = 높이·깊이의 투영
  const halfV = box.hy * Math.cos(p) + box.hz * Math.sin(p);
  const dist = Math.max(halfV / tv, box.hx / th) * margin + box.hz;
  return {
    pos: { x: box.cx, y: box.cy + Math.sin(p) * dist, z: box.cz + Math.cos(p) * dist },
    look: { x: box.cx, y: box.cy, z: box.cz },
    dist,
  };
}

/** 플레이어와 나무 사이 거리에 따라 들어가는 시간(가까우면 짧게 — 멀리서 휙 날아오지 않게) */
export function approachTime(fromPos, toPos) {
  const d = Math.hypot(fromPos.x - toPos.x, fromPos.y - toPos.y, fromPos.z - toPos.z);
  return Math.min(1.4, Math.max(0.9, 0.8 + d / 60));
}

/**
 * 카메라 리그 — setCameraRig 에 꽂아 쓴다. 들어가기 → 머물기 → 기본 시점으로 돌아오기.
 *   from: { pos, look } 시작 시점(지금 카메라) · to: shotFrame 결과
 *   home(pos, look): 돌아올 기본 시점을 매 프레임 채운다(game.js defaultCamPose)
 *   onHold(): 카메라가 도착한 순간 1회(잎·꽃 자람을 이때 풀어 준다)
 * update(dt) → 'in' | 'hold' | 'out' | 'done'.  skip() → 바로 짧게 돌아온다.
 */
export function createShotRig({ from, to, home, onHold, hold = SHOT_HOLD }) {
  const tin = approachTime(from.pos, to.pos);
  let t = 0, phase = 'in', outT = 0, outDur = tin * 0.85, held = false;
  const outFrom = { pos: { ...to.pos }, look: { ...to.look } };
  const hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  const cur = { pos: { ...from.pos }, look: { ...from.look } };
  const mix = (o, a, b, k) => { o.x = a.x + (b.x - a.x) * k; o.y = a.y + (b.y - a.y) * k; o.z = a.z + (b.z - a.z) * k; };
  const fireHold = () => { if (!held) { held = true; onHold?.(); } };
  return {
    get phase() { return phase; },
    cur,
    skip() {
      if (phase === 'done' || phase === 'out') return;
      fireHold();
      outFrom.pos = { ...cur.pos }; outFrom.look = { ...cur.look };
      phase = 'out'; outT = 0; outDur = 0.45;
    },
    update(dt) {
      if (phase === 'done') return phase;
      t += dt;
      if (phase === 'in') {
        const k = ease(t / tin);
        mix(cur.pos, from.pos, to.pos, k); mix(cur.look, from.look, to.look, k);
        if (t >= tin) { phase = 'hold'; t = 0; fireHold(); }
      } else if (phase === 'hold') {
        cur.pos = { ...to.pos }; cur.look = { ...to.look };
        if (t >= hold) { phase = 'out'; outT = 0; }
      }
      if (phase === 'out') {
        outT += dt;
        home(hp, hl);
        const k = ease(outT / outDur);
        mix(cur.pos, outFrom.pos, hp, k); mix(cur.look, outFrom.look, hl, k);
        if (outT >= outDur) phase = 'done';
      }
      return phase;
    },
  };
}
