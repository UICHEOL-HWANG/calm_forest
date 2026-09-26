// =============================================================
//  🌾 밭 인스턴싱 — 흙 121칸이 121드로우콜이던 걸 1콜로
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, HINT_H, HINT_W, _hintAnyPrev, atOrchard, clock, cycleSapSel, farmBuildingRecs, farmCropMeshes, farmSoilMesh,
  gameState, harvestTexture, npcObjs, onPlotArea, pestTexture, plots, scene, seedHintTexture, spawnDust,
  syncFarmHints, ui, warnTexture, weedTexture,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { PAL } from '../data/world.js';
import { buildingCells } from '../farm-building.js';
import { ADV_CROPS, nextSeedSel, seedKeyOf } from '../farm-crops.js';
import { PLOT_CAP, popScale, poppingPlots } from '../farm-render.js';
import { CELL, CELL_SEG, SPRIG_PER_PLOT, indicesPerCell, mottleAt, mottleMix, nextSunk, reliefAt, seamAt, soilSignature, soilSink, sprigOffsets, vertsPerCell } from '../farm-soil.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export let farmSoilCap = 0;

export let farmSigPrev = NaN;

export let farmHintMeshes = null;

//   ⚠️ 아틀라스 1장 + onBeforeCompile 대신 종류별 텍스처 3장 + 메시 3개(컨트롤러 판정, task-5:
//     1콜과 3콜 차이는 무의미한데 커스텀 GLSL 은 three 버전마다 깨지기 쉽다).
export const _fmM = new THREE.Matrix4(), _fmC = new THREE.Color();

export function buildFarmInstances(cap = PLOT_CAP) {
  // 🌾 A안 — 흙은 인스턴스가 아니라 **갈아둔 영역을 덮는 면 하나**다.
  //    인스턴싱은 지오메트리를 공유하니 121칸이 전부 같은 얼룩이 되어 격자가 눈에 보인다.
  //    무늬는 월드 좌표로 굽기 때문에 칸 경계를 넘어 이어진다. 드로우콜은 여전히 1.
  if (farmSoilMesh) { scene.remove(farmSoilMesh); farmSoilMesh.geometry.dispose(); farmSoilMesh.material.dispose(); $w.farmSoilMesh = null; }
  const vpc = vertsPerCell(), ipc = indicesPerCell();
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * vpc * 3), 3).setUsage(THREE.DynamicDrawUsage));
  sgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * vpc * 3), 3));
  sgeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cap * vpc * 3), 3));
  sgeo.setIndex(new THREE.BufferAttribute(cap * vpc > 65535 ? new Uint32Array(cap * ipc) : new Uint16Array(cap * ipc), 1));
  sgeo.setDrawRange(0, 0);
  $w.farmSoilMesh = new THREE.Mesh(sgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }));
  farmSoilMesh.castShadow = false;      // 바닥에 붙어 있어 드리울 그림자가 없다(그림자 패스 절감)
  farmSoilMesh.receiveShadow = true;
  farmSoilMesh.frustumCulled = false;   // 밭이 넓어지면 경계 상자가 커져 판정이 부정확해진다
  farmSoilCap = cap;
  farmSigPrev = NaN;
  scene.add(farmSoilMesh);

  // 🌱 작물 — 단계별 지오메트리는 고정, 색은 인스턴스 색으로(열매는 작물종 색, 나머지는 시듦 여부만).
  //   ⚠️ 전부 인스턴스 색을 쓴다 — sprout/stem/leaf/bush 도 시들면 갈색으로 바뀌어야 하기 때문
  //   (원래 wiltPlot 은 traverse 로 작물 그룹 전체를 물들였다. fruit 만 색을 입히면 새싹·줄기 단계에서
  //   시들어도 색이 그대로라 "기능 변화 0" 을 깬다 — task-4-report 자체 검증에서 발견).
  //   flat 은 기존 clayMat(color, flat) 의 그 인자 — 원래 sprout/stem/leaf/bush 는 flatShading:true(각진 클레이 룩),
  //   fruit 만 flatShading:false(매끈)였다. 색이 인스턴스로 옮겨가도 이 구분은 그대로 유지한다.
  const mk = (geo, count, flat = true) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.95, metalness: 0, flatShading: flat,
    }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    // ⚠️ 옛 buildCropStage(c621d19)는 작물 파츠에 castShadow/receiveShadow 를 **한 군데도 설정하지 않았다**(= 둘 다 false).
    //   켜면 없던 작물 그림자가 새로 생기고 그림자 패스가 +5콜 상시다 — 기능 변화 0 계약을 깬다.
    //   (스펙 §5-3-4 는 "작물은 유지"라고 적었지만 그건 현행 동작을 잘못 안 것 — 컨트롤러 판정)
    m.castShadow = false; m.receiveShadow = false; m.count = 0; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  //  🌾 A안 — 칸마다 큰 작물 하나가 아니라 **작은 포기 여러 개**를 흩뿌린다.
  //     그래서 용량이 칸당 SPRIG_PER_PLOT 배다(잎은 포기당 2장). 인스턴스라 콜 수는 그대로 5.
  if (farmCropMeshes) for (const k of ['sprout', 'stem', 'leaf', 'bush', 'fruit']) scene.remove(farmCropMeshes[k]);
  const sc = cap * SPRIG_PER_PLOT;
  $w.farmCropMeshes = {
    sprout: mk(new THREE.ConeGeometry(0.09, 0.3, 5), sc),
    stem:   mk(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), sc),
    leaf:   mk(new THREE.SphereGeometry(0.14, 8, 6), sc * 2),
    bush:   mk(new THREE.IcosahedronGeometry(0.3, 0), sc),
    fruit:  mk(new THREE.IcosahedronGeometry(0.19, 0), sc, false),
  };
  farmCropSigPrev = NaN;

  // 🌾 알림 배지 — '물!'·'수확!'·'씨앗을 넣어요' 는 동시에 하나만 뜬다(updatePlots 가 배타 토글).
  //   종류별 캔버스 텍스처 + 종류별 InstancedMesh 3개(아틀라스·커스텀 셰이더 없음).
  const hgeo = new THREE.PlaneGeometry(1.5, 1.5 * HINT_H / HINT_W);
  const mkHint = (tex) => {
    const m = new THREE.InstancedMesh(hgeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = false; m.receiveShadow = false; m.count = 0; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  if (farmHintMeshes) for (const k of ['warn', 'harvest', 'seedHint', 'weed', 'pest']) scene.remove(farmHintMeshes[k]);
  farmHintMeshes = {
    warn: mkHint(warnTexture()),
    harvest: mkHint(harvestTexture()),
    seedHint: mkHint(seedHintTexture()),
    weed: mkHint(weedTexture()),   // 🌿 고급 작물 공정 배지 2종(+2콜)
    pest: mkHint(pestTexture()),
  };
  $w._hintAnyPrev = false;   // 재할당 직후엔 카운트가 전부 0 — 다음 syncFarmHints 가 필요하면 다시 채운다
}

// 🌾 흙 면 다시 굽기 — 시그니처가 바뀌었을 때만. force 는 부팅·복원용.
//    칸마다 (CELL_SEG+1)² 정점을 찍고, 얼룩·기복은 **월드 좌표**로 계산해 경계를 넘어 잇는다.
//    젖은 칸은 그 칸 정점만 어둡게 물들인다(칸 경계에서 색이 갈리는 건 의도 — 물 준 칸이 보여야 한다).
export const _soilBase = { y: null };

export const _soilSunk = new Set();

export const _fmC2 = new THREE.Color();

export function syncFarmSoil(force = false) {
  if (!farmSoilMesh) return;
  // ⚠️ 용량 판정이 시그니처 조기반환보다 **먼저**여야 한다 — 뒤에 두면 force 없이 칸이 늘었을 때
  //    버퍼 밖으로 쓰게 된다(Float32Array 라 조용히 무시돼 "칸이 안 그려짐"으로만 보인다).
  if (plots.length > farmSoilCap) {
    buildFarmInstances(plots.length + 40);
    syncFarmCrops(true);   // 🌱 재할당으로 새로 만든 작물 버퍼(count 전부 0)를 다시 채운다
    syncFarmHints(clock.elapsedTime);   // 🌾 배지 버퍼도 지금 떠 있는 배지가 있으면 즉시 다시 채운다
    force = true;          // 새 버퍼는 비어 있으니 시그니처와 무관하게 다시 굽는다
  }
  const sig = soilSignature(plots);
  if (!force && sig === farmSigPrev) return;
  farmSigPrev = sig;

  const seg = CELL_SEG, vpc = vertsPerCell(), half = CELL / 2, step = CELL / seg;
  const g = farmSoilMesh.geometry;
  const pos = g.attributes.position.array, col = g.attributes.color.array, nrm = g.attributes.normal.array;
  const idx = g.index.array;
  if (!_soilBase.y || _soilBase.y.length < farmSoilCap * vpc) _soilBase.y = new Float32Array(farmSoilCap * vpc);
  _soilSunk.clear();   // 버퍼를 새로 구웠으니 "내려가 있던" 기록도 리셋

  const cBase = new THREE.Color(PAL.soil), cWet = new THREE.Color(PAL.soilWet);
  const cDark = new THREE.Color(PAL.soilDark), cLight = new THREE.Color(PAL.soilLight);
  let v = 0, ii = 0;
  for (let i = 0; i < plots.length; i++) {
    const p = plots[i];
    const v0 = v;
    for (let r = 0; r <= seg; r++) {
      for (let c = 0; c <= seg; c++) {
        const wx = p.x - half + c * step, wz = p.z - half + r * step;
        const y = 0.2 + reliefAt(wx, wz);           // 예전 흙 상자 윗면(중심 0.1 + 높이 0.1)과 같은 높이
        pos[v * 3] = wx; pos[v * 3 + 1] = y; pos[v * 3 + 2] = wz;
        _soilBase.y[v] = y;
        // 얼룩: 어두움↔기본↔밝음. 젖은 칸은 그 결과를 젖은 색 쪽으로 한 번 더 당긴다
        const mix = mottleMix(mottleAt(wx, wz));
        const from = mix.from === 'dark' ? cDark : cBase;
        const to = mix.to === 'base' ? cBase : cLight;
        _fmC2.copy(from).lerp(to, mix.t);
        if (p.watered) _fmC2.lerp(cWet, 0.55);
        const seam = seamAt(c, r, seg);                 // 칸 경계에 아주 얕은 이음매(빈 밭 가독성)
        if (seam) _fmC2.multiplyScalar(1 - seam);
        col[v * 3] = _fmC2.r; col[v * 3 + 1] = _fmC2.g; col[v * 3 + 2] = _fmC2.b;
        nrm[v * 3] = 0; nrm[v * 3 + 1] = 1; nrm[v * 3 + 2] = 0;   // 기복이 얕아 위 방향이면 충분하다
        v++;
      }
    }
    for (let r = 0; r < seg; r++) {
      for (let c = 0; c < seg; c++) {
        const a = v0 + r * (seg + 1) + c, b = a + 1, d = a + seg + 1, e = d + 1;
        idx[ii++] = a; idx[ii++] = d; idx[ii++] = b;
        idx[ii++] = b; idx[ii++] = d; idx[ii++] = e;
      }
    }
  }
  g.setDrawRange(0, ii);
  g.attributes.position.needsUpdate = true;
  g.attributes.color.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  g.index.needsUpdate = true;
  applySoilPops();   // 구운 직후 지금 팝 중인 칸을 즉시 반영(안 그러면 한 프레임 튄다)
}

// 🌾 팝(밭이 새로 생길 때 솟아오름) — 구워 둔 정점의 y 만 내렸다 올린다.
//    면이 하나라 칸별 스케일을 쓸 수 없다. 대신 갓 생긴 칸을 땅 밑에 묻었다가 끌어올린다.
export function applySoilPops() {
  if (!farmSoilMesh || !_soilBase.y) return;
  const g = farmSoilMesh.geometry, pos = g.attributes.position.array;
  const vpc = vertsPerCell();
  const sinks = plots.map(p => soilSink(p.pop, popScale));
  const step = nextSunk(sinks, _soilSunk);                   // 규칙은 js/farm-soil.js(테스트가 잠근다)
  _soilSunk.clear(); for (const i of step.sunk) _soilSunk.add(i);
  for (const i of step.write) {
    for (let k = i * vpc; k < (i + 1) * vpc; k++) pos[k * 3 + 1] = _soilBase.y[k] - sinks[i];
  }
  if (step.write.length) g.attributes.position.needsUpdate = true;
}

// 🌱 작물 인스턴스 버퍼 — 단계가 바뀔 때만 다시 쓴다(성장도는 단계 안에서 모양이 안 변한다)
export let farmCropSigPrev = NaN;

export function cropsSignature() {
  let sig = plots.length | 0;
  for (const p of plots) {
    sig = (Math.imul(sig, 31) + (p.x | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.z | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.crop ? p.stage + 2 : 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.wilted ? 1 : 0)) | 0;
  }
  return sig;
}

export function syncFarmCrops(force = false) {
  if (!farmCropMeshes) return;
  const sig = cropsSignature();
  if (!force && sig === farmCropSigPrev) return;
  farmCropSigPrev = sig;
  const M = farmCropMeshes;
  let nSprout = 0, nStem = 0, nLeaf = 0, nBush = 0, nFruit = 0;
  const LEAF = [[-0.16, 0.3], [0.16, 0.42]];
  const base = 0.26;                                   // 기존 crop 그룹의 position.y
  const WILT_COL = 0x9a844f;                            // 🥀 시든 색 — 기존 wiltPlot 이 모든 파츠에 칠하던 그 색
  //  포기 배치는 칸 좌표로 고정된다 — 매번 흔들리면 자랄 때마다 작물이 순간이동한다.
  //    포기가 여러 개라 하나하나는 작아야 한다(SPRIG_SCALE). 크기 그대로 6개면 덩어리가 된다.
  const SPRIG_SCALE = 0.5;
  for (const p of plots) {
    if (!p.crop) continue;
    const s = popScale(p.cropPop || 0);
    // ⚠️ +512 로 음수 좌표를 양수 영역으로 민다 — 안 그러면 (x,z) 와 (-x,-z) 가 같은 해시를
    //    받아 원점 대칭인 두 칸이 완전히 같은 6포기 배치가 된다(마을 격자에서 100쌍 충돌).
    for (const sp of sprigOffsets((Math.imul((p.x | 0) + 512, 73856093) ^ Math.imul((p.z | 0) + 512, 19349663)) | 0)) {
      const k = s * SPRIG_SCALE * sp.scale;                // 팝 × 포기 축소 × 개체 편차
      const px = p.x + sp.dx * s, pz = p.z + sp.dz * s;    // 팝 중엔 가운데서 퍼져 나온다
      if (p.stage === 0) {
        _fmM.makeScale(k, k, k); _fmM.setPosition(px, base + 0.15 * k, pz);
        M.sprout.setMatrixAt(nSprout, _fmM);
        _fmC.setHex(p.wilted ? WILT_COL : 0x9be89b);
        M.sprout.setColorAt(nSprout++, _fmC);
      } else if (p.stage === 1) {
        _fmM.makeScale(k, k, k); _fmM.setPosition(px, base + 0.25 * k, pz);
        M.stem.setMatrixAt(nStem, _fmM);
        _fmC.setHex(p.wilted ? WILT_COL : PAL.sprout);
        M.stem.setColorAt(nStem++, _fmC);
        _fmC.setHex(p.wilted ? WILT_COL : (p.cropType?.leaf ?? PAL.cropLeaf));   // 🌾 고급 작물은 잎 색으로 구분(새 메시 없음)
        for (const [lx, ly] of LEAF) {
          _fmM.makeScale(k, 0.5 * k, 0.7 * k);
          _fmM.setPosition(px + lx * k, base + ly * k, pz);
          M.leaf.setMatrixAt(nLeaf, _fmM);
          M.leaf.setColorAt(nLeaf++, _fmC);
        }
      } else if (p.stage === 2) {
        _fmM.makeScale(k, 0.82 * k, k);
        _fmM.setPosition(px, base + 0.32 * k, pz);
        M.bush.setMatrixAt(nBush, _fmM);
        _fmC.setHex(p.wilted ? WILT_COL : (p.cropType?.leaf ?? PAL.cropLeaf));
        M.bush.setColorAt(nBush++, _fmC);
        // 🌼 열매(=수확 신호)는 일부 포기에만 — 레퍼런스의 "드문드문 핀 노란 꽃" 느낌.
        //    다 달면 칸이 열매로 뒤덮여 무엇이 수확 대상인지 오히려 안 보인다.
        if (sp.flower) {
          _fmM.makeScale(k, k, k);
          _fmM.setPosition(px, base + 0.56 * k, pz);
          M.fruit.setMatrixAt(nFruit, _fmM);
          _fmC.setHex(p.wilted ? WILT_COL : (p.cropType?.fruit ?? PAL.crop));
          M.fruit.setColorAt(nFruit++, _fmC);
        }
      }
    }
  }
  M.sprout.count = nSprout; M.stem.count = nStem; M.leaf.count = nLeaf;
  M.bush.count = nBush; M.fruit.count = nFruit;
  for (const k of ['sprout', 'stem', 'leaf', 'bush', 'fruit']) {
    M[k].instanceMatrix.needsUpdate = true;
    M[k].instanceColor.needsUpdate = true;
  }
}

// 팝 중인 칸만 매 프레임 갱신 — 아무도 안 튀면 버퍼를 건드리지 않는다(인스턴싱 이득 보존)
export function updateFarmPops(dt) {
  if (!farmSoilMesh) return;
  // 🌱 작물 팝 — 흙 팝과 독립 사건이다. 씨앗 심기·단계 상승은 흙이 그대로인 채 작물만 튀는
  //   가장 흔한 경우라, 아래 흙 쪽 조기 반환에 갇히면 안 된다(브리프 결함 수정 — task-4-brief §Step5 참고).
  let cropPopping = false;
  for (const p of plots) if ((p.cropPop || 0) > 0) { p.cropPop = Math.max(0, p.cropPop - dt * 3); cropPopping = true; }
  if (cropPopping) syncFarmCrops(true);

  const idx = poppingPlots(plots);
  if (!idx.length && !_soilSunk.size) return;
  for (const i of idx) plots[i].pop = Math.max(0, plots[i].pop - dt * 3);   // updatePops 와 같은 감쇠율
  applySoilPops();
}

export function createPlot(x, z, silent = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  // 🌾 흙은 이어진 면 하나가, 작물은 InstancedMesh 가 그린다. 여기선 앵커 Group 만.
  //    🪏삽 1타 연출(흙더미·파인 자리)만 이 그룹의 자식으로 붙는다.
  scene.add(g);
  const plot = { group: g, crop: null, state: 'empty', growth: 0, stage: -1, x, z, watered: false, digAt: 0, digBackT: 0, pop: 0 };
  plots.push(plot);
  // 🌾 발밑에 밭이 생긴 주민은 바로 비켜선다 — 다음 배회 틱(최대 7초)까지 기다리지 않게 목적지를 즉시 다시 고르게 한다.
  //    (silent=true 는 세이브 복원 — 그땐 주민이 아직 없거나 제자리를 잡는 중이라 건드리지 않는다)
  if (!silent) for (const o of npcObjs) if (onPlotArea(o.group.position.x, o.group.position.z)) o.wanderTimer = 0;
  if (!silent) {
    plot.pop = 1;                                    // 🌾 흙·이랑(인스턴스 행렬)은 updateFarmPops 가 튀어오르게 한다
    spawnDust(x, z, 14);
  }
  syncFarmSoil(true);
  return plot;
}

export function seedSelCrop() { return ADV_CROPS.find(c => c.id === gameState.farm.seedSel) || null; }

// 🍇 지지대 인접 — 밭 칸(2×2 격자)과 지지대 발자국이 맞닿아 있으면. 시설(gameState.farmBuildings)은 4단계에서 놓인다
export function trellisAdjacent(x, z) {   // 시설 레코드는 gameState.outdoor 에 산다(js/farm-building.js 머리말)
  return farmBuildingRecs().some(b => b.id === 'trellis' && buildingCells([1, 3], b.x, b.z, b.rot || 0).some(([cx, cz]) => Math.abs(cx - x) <= 2.01 && Math.abs(cz - z) <= 2.01 && (Math.abs(cx - x) > 0.5 || Math.abs(cz - z) > 0.5)));
}

export function trellisAnywhere() { return farmBuildingRecs().some(b => b.id === 'trellis'); }

// 🌰 씨앗 도구 아이콘은 종류와 무관하게 🌰 고정(사용자 결정 2026-09-13) — 고른 종류는 토스트로만 알린다
export function syncSeedToolIcon() { /* 의도적으로 비움 — 슬롯 아이콘을 바꾸지 않는다 */ }

export function cycleSeedSel() {
  if (atOrchard) return cycleSapSel();   // 🍎 과수원에선 묘목만 돈다
  const cur = gameState.farm.seedSel || 'basic';
  const next = nextSeedSel(cur, gameState.inventory, trellisAnywhere());
  if (next === cur) {
    ui.toast?.(cur === 'basic' ? '🌰 고급 씨앗이 없어요. 상점에서 🌾밀·🌽옥수수·🍇포도 씨앗을 팔아요' : '🌰 다른 씨앗이 없어요', 2600);
    return;
  }
  gameState.farm.seedSel = next; syncSeedToolIcon(); Sound.blip();
  const c = seedSelCrop();
  ui.toast?.(c ? `${c.ico} ${c.name} 씨앗 (${gameState.inventory[seedKeyOf(next)] || 0}개) — 다시 누르면 바꿔요` : '🌰 기본 씨앗 — 다시 누르면 바꿔요', 2200);
  trackEvent('seed_select', { sel: next });   // [GA4] 고급 씨앗 채택 여부
}
