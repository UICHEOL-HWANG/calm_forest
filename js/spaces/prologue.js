// =============================================================
//  🎬 프롤로그 컷신 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
//  🌳 2026-10-16 세계관 개편 1단계: 회색 도시 세트 → 세계수 마을 세트(살아 있던 마을 → 시든 마을)
//  🎥 2026-10-17 연출 개편: 마을과 같은 세계수(js/world/tree-art.js)·진짜 이웃(buildNPCFigure)·마을 집 모델로
//     세트를 다시 세우고(js/spaces/prologue-set.js), 컷마다 부드러운 카메라 이동 + 컷 사이 암전 디졸브.
//     게임 로직(GA4·스킵·복원)은 그대로.
// =============================================================
import {
  $w, camera, gameState, handAnchor, player, playerAnchor, scene, setSpaceVisible, snapCamera, stopOutdoorPlacing, tailPivot,
  ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { Sound, startIntroScore, stopIntroScore, stopRainSound } from '../sound.js';
import { LOOK_SPOT, TREE, WALK_FROM, WALK_TO, buildIntroSet, disposeIntroSet, updateIntroSet, witherAt } from './prologue-set.js';
import * as THREE from 'three';

//    캐릭터 선택 직후 1회 재생. 실제 비디오가 아니라 인게임 세트(로우폴리 세계수 마을)로 연출해
//    번들 무게 0, 아트스타일 통일, 선택한 캐릭터가 그대로 출연한다. 자막/페이드/스킵은 index.html DOM.
//    세트는 마을에서 멀찍이 — 카메라 먼 평면(200)·안개 밖이라 서로 안 보인다.
//    서사: 세계수 아래 이웃이 함께 살던 마을 → 세계수가 시들자 이웃이 하나둘 사라지고 마을도 잿빛 →
//          바깥에서 온 주인공이 빈 마을에 들어선다("아무도 없어요?") → 가지 끝 마지막 잎 곁에서 🦉 누군가 지켜본다.
export const WILT = new THREE.Vector3(0, 0, 480);

export let wiltSet = null;

export let intro = null;

// 자막·컷 타이밍(초) — 5박자 ~22초 + 마을 도착·타이틀(~26초), 언제든 스킵 가능
//   첫 20초에 "세계수가 힘을 잃어 마을이 비었다"는 상황 + "누가 보고 있지?"라는 질문을 심는다 —
//   "목적이 뭔지 모르겠다" 베타 피드백. 분위기만 주고 끝내면 플레이어는 목표 없이 마을에 떨궈진다.
//   말투: 해요체, 끝 마침표 없이(2026-10-17 사용자 결정)
export const INTRO_CAPTIONS = [
  { at: 0.6, until: 5.0, text: '세계수 아래, 사람과 동물은 함께 살았어요' },
  { at: 5.6, until: 10.2, text: '그런데 세계수가 힘을 잃자, 마을도 기운을 잃었어요' },
  { at: 11.0, until: 15.0, text: '…여기가 그 마을인가?' },
  { at: 15.6, until: 19.0, text: '저기요… 아무도 없어요?' },
  { at: 19.5, until: 22.0, text: '…누군가 이쪽을 보고 있어요' },
];
// 컷 경계(초) — 1·2는 한 흐름(같은 크레인 숏), 그 뒤는 짧은 암전으로 잇는다
const CUT3 = 10.6, CUT4 = 15.2, CUT5 = 19.2, FADE_WHITE = 22.2, ARRIVE = 23.4;
const DIP_AT = [CUT3, CUT4, CUT5], DIP_HALF = 0.42;

/** 예전 이름 유지 — 세트를 세운다(이미 있으면 그대로) */
export function buildWiltSet() {
  if (wiltSet) return;
  wiltSet = buildIntroSet();
  wiltSet.group.position.copy(WILT);
  scene.add(wiltSet.group);
}
function dropWiltSet() {
  if (!wiltSet) return;
  disposeIntroSet(wiltSet);
  wiltSet = null;
}

export function introStart(force = false) {
  if (intro) return true;
  if (!force && gameState.hintsSeen.intro) return false;   // 첫 시작에만
  buildWiltSet();
  wiltSet.group.visible = true;
  intro = {
    t: 0, flags: {},
    savedPos: player.position.clone(),
    savedRotY: player.rotation.y,
  };
  // 주인공: 컷1·2(옛 마을 이야기)엔 아직 없다 — 컷3에서 마을 어귀로 걸어 들어온다
  $w.sitting = false; stopOutdoorPlacing(true);
  if (handAnchor) handAnchor.visible = false;               // 등의 도구(도끼 등)는 컷신 분위기상 숨김
  playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
  player.position.set(WILT.x + WALK_FROM.x, 0, WILT.z + WALK_FROM.z);
  player.rotation.y = Math.PI;
  player.visible = false;
  updateIntroSet(wiltSet, 0, 0);
  ui.introShow?.(true);
  ui.introBars?.(true);
  stopRainSound();
  startIntroScore();
  trackEvent('intro_start');                                // [GA4] 온보딩 퍼널 첫 계단
  return true;
}

export function introEnd(skipped) {
  if (!intro) return;
  const atS = Math.round(intro.t * 10) / 10;
  // 원상 복구 — 마을 스폰 자리로, 서 있는 포즈로
  player.position.copy(intro.savedPos); player.position.y = 0;
  player.rotation.y = intro.savedRotY;
  player.visible = true;                                    // 컷1·2 숨김 복원
  playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
  if (tailPivot) tailPivot.rotation.set(0, 0, 0);
  if (handAnchor) handAnchor.visible = true;                // 도구 복원
  restoreLook();
  restoreFov();
  dropWiltSet();                                            // 세트 지오메트리·재질·텍스처 해제(다시 볼 일 없음 — __introTest 는 새로 세운다)
  intro = null;
  setSpaceVisible();
  stopIntroScore(skipped ? 0.6 : 1.2);
  gameState.hintsSeen.intro = true;                         // 다시 안 봄(저장에 포함)
  snapCamera();
  ui.introDip?.(0);
  ui.introShow?.(false);
  trackEvent(skipped ? 'intro_skip' : 'intro_complete', { at_s: atS });  // [GA4] 어디서 건너뛰는지 = 연출 개선 지표
}

// 컷신 카메라 — 타깃 기준 오프셋을 화면비에 맞게 스케일(세로 화면은 수평 시야가 좁아 더 멀리서 잡아야 안 깨짐)
export function introCam(tx, ty, tz, x, y, z) {
  const K = aspectK();
  camera.position.set(tx + (x - tx) * K, ty + (y - ty) * K, tz + (z - tz) * K);
  camera.lookAt(tx, ty, tz);
}
const portraitP = () => Math.max(1, Math.min(2.1, 0.85 / camera.aspect));
//   세로 화면은 물러나기만 하면 마을 어귀 소품이 카메라 앞을 막는다 → 반은 화각을 넓히고(42° → 최대 ~57°) 반만 물러난다
const aspectK = () => 1 + (portraitP() - 1) * 0.55;
const FOV0 = 42;
function introFov() {
  const f = FOV0 + (portraitP() - 1) * 14;
  if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
}
function restoreFov() {
  if (intro && intro.fov0 !== undefined && camera.fov !== intro.fov0) { camera.fov = intro.fov0; camera.updateProjectionMatrix(); }
}

const clamp01 = (p) => Math.max(0, Math.min(1, p));
const smooth = (p) => { p = clamp01(p); return p * p * (3 - 2 * p); };
const easeIO = (p) => { p = clamp01(p); return 0.5 - 0.5 * Math.cos(Math.PI * p); };
const lerp = (a, b, k) => a + (b - a) * k;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 🎥 컷1·2 크레인(0 → 10.6s): 이웃 눈높이(앞 풀 너머) → 꽃 핀 세계수 전체 → 시든 마을 와이드로 천천히 물러난다
const CRANE_POS = new THREE.CatmullRomCurve3([V(1.4, 1.3, 13.6), V(2.8, 3.0, 19), V(1.0, 4.6, 24.5), V(-1.4, 5.2, 27.5)]);
const CRANE_LOOK = new THREE.CatmullRomCurve3([V(-0.5, 1.9, 1.8), V(-0.3, 4.0, -1.5), V(0, 5.4, -4.5), V(0, 5.6, -5)]);
const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _o = new THREE.Vector3();

/** 카메라를 세트 로컬 좌표(pos, look)로 — 세로 화면은 시선에서 더 물러나고 살짝 높게 */
function shoot(pos, look, { lift = 0.25, minY = 0.35 } = {}) {
  const K = aspectK();
  _o.subVectors(pos, look).multiplyScalar(K);
  _o.y += (K - 1) * lift * _o.length() * 0.1;
  camera.position.set(WILT.x + look.x + _o.x, Math.max(minY, look.y + _o.y), WILT.z + look.z + _o.z);
  camera.lookAt(WILT.x + look.x, look.y, WILT.z + look.z);
}

// 매 프레임 컷신 진행 — dt 누적 기반이라 프레임 드랍/저사양에서도 순서가 밀리지 않는다
export function updateIntro(dt, t) {
  if (!intro) return;
  const T = (intro.t += dt);
  const F = intro.flags;
  const S = wiltSet;
  if (intro.fov0 === undefined) intro.fov0 = camera.fov;
  introFov();
  // 자막
  const cap = INTRO_CAPTIONS.find(c => T >= c.at && T < c.until);
  ui.introCaption?.(cap ? cap.text : null);
  // 컷 사이 암전(시각으로만 정한다 — 점프해도 안 남는다)
  let dip = 0;
  for (const b of DIP_AT) dip = Math.max(dip, 1 - Math.abs(T - b) / DIP_HALF);
  ui.introDip?.(smooth(dip));
  // 소리 — 여는 종 · 시들 때 바람
  if (T >= 0.15 && !F.chime) { F.chime = true; Sound.introChime?.(); }
  if (T >= 5.7 && !F.wind) { F.wind = true; Sound.introWind?.(); }

  if (S && S.group.visible) updateIntroSet(S, T, t);
  if (T < ARRIVE) player.visible = T >= CUT3 && T < CUT5;   // 주인공은 컷3·4에만(점프해도 맞게 매 프레임)

  // ── 컷1·2 (0~10.6s): 살아 있는 세계수와 이웃 → 꽃이 지고 잎이 물들어 떨어지고, 이웃이 하나둘 빛이 되어 흩어진다 ──
  if (T < CUT3) {
    const u = easeIO(T / CUT3) * 0.92 + clamp01(T / CUT3) * 0.08;   // 시작·끝만 살짝 느리게(멈추지 않게)
    CRANE_POS.getPoint(u, _p); CRANE_LOOK.getPoint(u, _l);
    shoot(_p, _l, { lift: 0.4 });
  }
  // ── 컷3 (10.6~15.2s): 바깥에서 온 주인공이 빈 마을 어귀로 걸어 들어온다 — 카메라가 앞에서 옆을 돌아 어깨 너머로(세계수가 드러난다) ──
  else if (T < CUT4) {
        const k = clamp01((T - CUT3) / 4.0);
    const p = k < 0.85 ? k / 0.85 * 0.92 : 0.92 + (1 - Math.pow(1 - (k - 0.85) / 0.15, 2)) * 0.08;   // 끝에서 천천히 멈춘다
    const px = lerp(WALK_FROM.x, WALK_TO.x, p), pz = lerp(WALK_FROM.z, WALK_TO.z, p);
    player.position.set(WILT.x + px, 0, WILT.z + pz);
    player.rotation.y = Math.atan2(WALK_TO.x - WALK_FROM.x, WALK_TO.z - WALK_FROM.z);
    walkPose(T - CUT3, k < 0.97 ? 1 - smooth((k - 0.85) / 0.12) : 0, dt);
    const e = easeIO((T - CUT3) / (CUT4 - CUT3));
    const a = lerp(0.5, Math.PI - 0.5, e), R = lerp(6.4, 5.2, e), h = lerp(1.5, 1.95, e);
    _p.set(px + Math.sin(a) * R, h, pz - Math.cos(a) * R);
    const r = smooth((e - 0.5) / 0.5);   // 카메라가 등 뒤로 돌아온 뒤에야 시선을 세계수 쪽으로 든다
    _l.set(px + (TREE.x - px) * 0.12 * r, lerp(0.95, 2.9, r), pz - 6.5 * r);
    shoot(_p, _l, { lift: 0.2 });
  }
  // ── 컷4 (15.2~19.2s): 불 꺼진 빈집 사이 광장 — 주인공이 이쪽저쪽 두리번 "아무도 없어요?" ──
  else if (T < CUT5) {
    if (!F.look) {
      F.look = true;
      player.position.set(WILT.x + LOOK_SPOT.x, 0, WILT.z + LOOK_SPOT.z);
      playerAnchor.position.y = 0; playerAnchor.rotation.z = 0;
    }
    const u = T - CUT4;
    // 왼쪽 집 → (멈칫) → 오른쪽 집 → 다시 앞(살짝 풀 죽어 고개를 숙인다)
    const yaw = 0.15 + smooth((u - 0.2) / 0.6) * 0.95 - smooth((u - 1.5) / 0.8) * 1.9 + smooth((u - 2.9) / 0.7) * 0.85;
    player.rotation.y = yaw;
    const call = Math.max(0, Math.sin(clamp01((u - 0.45) / 0.35) * Math.PI)) * 0.16 + Math.max(0, Math.sin(clamp01((u - 1.95) / 0.35) * Math.PI)) * 0.12;   // 부르며 발돋움
    playerAnchor.position.y = call + Math.sin(t * 2) * 0.015;
    playerAnchor.rotation.x = smooth((u - 3.1) / 0.6) * 0.12;   // 시무룩
    playerAnchor.rotation.z = Math.sin(u * 1.4) * 0.03;
    if (tailPivot) tailPivot.rotation.y = Math.sin(t * 3) * 0.12;
    const e = easeIO(u / (CUT5 - CUT4));
    _p.set(LOOK_SPOT.x + lerp(3.4, -2.6, e), lerp(1.55, 1.35, e), LOOK_SPOT.z + lerp(6.0, 6.4, e));
    _l.set(LOOK_SPOT.x + lerp(0.3, -0.2, e), lerp(1.45, 1.6, e), LOOK_SPOT.z - 2.2);
    shoot(_p, _l, { lift: 0.3 });
  }
  // ── 컷5 (19.2~22.2s): 세계수 가지 끝 마지막 잎으로 올라가는 크레인 — 그 곁에서 🦉 누군가 이쪽을 본다 ──
  else if (T < FADE_WHITE) {
    if (!F.owl && S) { F.owl = true; S.owl.g.visible = true; S.owl.y0 = S.owl.g.position.y; }
    if (S) {
      const e = easeIO((T - CUT5) / (FADE_WHITE - CUT5 + 0.4));
      const leaf = _l.copy(S.leafBase).add(TREE);
      const owl = S.owl.g.position;
      const look = V(lerp(leaf.x, owl.x, 0.42), lerp(leaf.y - 0.25, owl.y + 0.2, 0.5) + 0.15, lerp(leaf.z, owl.z, 0.42));
      _p.set(look.x + lerp(3.6, 2.3, e), look.y + lerp(-0.7, 0.05, e), look.z + lerp(5.6, 3.5, e));
      shoot(_p, look, { lift: 0, minY: 0.6 });
      S.owl.face = Math.atan2(camera.position.x - (WILT.x + owl.x), camera.position.z - (WILT.z + owl.z));
    }
  }
  // ── 컷6 (22.2s~): 화이트 페이드 → 지금의 숲 마을(원래 스폰 자리) → 타이틀 ──
  if (T >= FADE_WHITE && !F.fade) { F.fade = true; ui.introFade?.(1); }
  if (T >= ARRIVE && !F.arrive) {
    F.arrive = true;
    restoreLook();
    dropWiltSet();                                          // 세트는 여기서 끝 — 바로 버린다
    player.visible = true;
    player.position.copy(intro.savedPos); player.position.y = 0;
    player.rotation.y = Math.PI;                             // 숲(마을 안쪽)을 바라봄
    playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
    ui.introBars?.(false);                                   // 레터박스가 걷히며 마을이 화면 가득
    ui.introFade?.(0);
  }
  if (T >= ARRIVE) {
    const ve = easeIO((T - ARRIVE) / 2.4);
    const vx = intro.savedPos.x, vz = intro.savedPos.z;
    camera.position.set(vx + 0.5 - ve * 0.5, 3.4 - ve * 0.5 + (portraitP() - 1) * 1.2, vz + 6.6 - ve * 1.3 + (portraitP() - 1) * 1.6);   // 세로 화면은 화각을 넓혔으니 조금만 물러난다(뒤 소품이 앞을 막지 않게)
    camera.lookAt(vx, 1.1, vz);
    playerAnchor.position.y = Math.sin(t * 2) * 0.02;
  }
  //   타이틀은 페이드가 걷히는 도중(1.15s 전환)에 들어온다 — 마을 색채 위에 로고
  if (T >= 23.7 && !F.title) { F.title = true; ui.introTitle?.(true); Sound.blip(); }
  if (T >= 25.2 && !F.titleOut) { F.titleOut = true; ui.introTitle?.(false); }
  if (T >= 25.8) introEnd(false);
}

// 🚶 걷기 — updatePlayer 의 걸음(통통 + 좌우 흔들 + 꼬리)과 같은 식. amt 0 이면 선 자세로 가라앉는다
function walkPose(u, amt, dt) {
  const ph = u * 12;
  playerAnchor.position.y = Math.abs(Math.sin(ph)) * 0.18 * amt;
  playerAnchor.rotation.z = Math.sin(ph) * 0.05 * amt;
  playerAnchor.rotation.x = 0.04 * amt;   // 살짝 앞으로 기울여 걷는다
  if (tailPivot) {
    const tu = tailPivot.userData || {};
    tailPivot.rotation.y = Math.sin(u * (tu.wagSpeed || 8) * 1.8) * (tu.wagAmp || 0.3) * (0.6 + amt);
  }
}

// ── 💡 세트 조명 — game.js updateDayNight 끝에서 매 프레임(마을 라이트를 덮어쓴다. 마을로 돌아오면 다음 프레임에 원래대로) ──
const LOOK = {
  a: { hemiSky: 0xffe2b8, hemiGround: 0x6f8a4c, hemi: 0.95, amb: 0xffe0c0, ambI: 0.22, sun: 0xffc27c, sunI: 1.75, fog: 0xf2cc98, near: 30, far: 105 },
  b: { hemiSky: 0xa4b2ca, hemiGround: 0x434a50, hemi: 0.9, amb: 0x8693ad, ambI: 0.3, sun: 0xbccadf, sunI: 0.6, fog: 0x8e9aab, near: 16, far: 76 },
};
const _ca = new THREE.Color(), _cb = new THREE.Color();
const mix = (k, a, b) => _ca.setHex(a).lerp(_cb.setHex(b), k);
let _grade = null, _vig0 = null;
export function introLook({ scene: sc, hemiLight, ambient, sunLight, bloomPass, gradePass, playerLight }) {
  if (!intro || intro.flags.arrive || !wiltSet) return;
  const T = intro.t, w = witherAt(T), A = LOOK.a, B = LOOK.b;
  hemiLight.color.copy(mix(w, A.hemiSky, B.hemiSky)); hemiLight.groundColor.copy(mix(w, A.hemiGround, B.hemiGround));
  hemiLight.intensity = lerp(A.hemi, B.hemi, w);
  ambient.color.copy(mix(w, A.amb, B.amb)); ambient.intensity = lerp(A.ambI, B.ambI, w);
  sunLight.color.copy(mix(w, A.sun, B.sun)); sunLight.intensity = lerp(A.sunI, B.sunI, w);
  // 해 — 왼쪽 뒤 낮게(황금빛 역광) → 높이 흐린 빛
  const d = wiltSet.sky.dir;
  sunLight.position.set(WILT.x + d.x * 40, lerp(14, 30, w), WILT.z + lerp(d.z * 40, 10, w));
  sunLight.target.position.set(WILT.x + TREE.x, 0, WILT.z + TREE.z); sunLight.target.updateMatrixWorld();
  const fogC = mix(w, A.fog, B.fog);
  sc.fog.color.copy(fogC); sc.background = sc.fog.color;
  sc.fog.near = lerp(A.near, B.near, w); sc.fog.far = lerp(A.far, B.far, w);
  if (T >= CUT5) { sc.fog.near = 6; sc.fog.far = 24; hemiLight.intensity = 1.25; sunLight.intensity = 0.95; }    // 컷5 — 잎·올빼미(4~6m)만 또렷하고 뒤 숲은 안개 속으로
  if (playerLight) playerLight.intensity = T > CUT3 && T < CUT5 ? 0.9 : 0;   // 해질녘 주인공 둘레 은은한 온기
  if (bloomPass) bloomPass.strength = T >= CUT5 ? 0.5 : lerp(0.6, 0.38, w);
  if (gradePass) {
    _grade = gradePass; if (_vig0 === null) _vig0 = gradePass.uniforms.uVignette.value;
    gradePass.uniforms.uNight.value = w * 0.18;
    gradePass.uniforms.uVignette.value = 1.4;            // 시네마 비네팅
  }
}
function restoreLook() {
  if (_grade && _vig0 !== null) _grade.uniforms.uVignette.value = _vig0;
}
