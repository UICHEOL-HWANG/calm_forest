// =============================================================
//  🌾 밭 알림 배지 — '물!'·'수확!'·'씨앗을 넣어요' 세 배지를 종류별 텍스처 + InstancedMesh 로.
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  HINT_H, HINT_W, roundRect,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { syncFarmCrops } from '../spaces/farm.js';
import * as THREE from 'three';

export function _hintCanvas() {
  const cv = document.createElement('canvas'); cv.width = HINT_W; cv.height = HINT_H;
  return [cv, cv.getContext('2d')];
}

// 알약 폭은 **그릴 문자열을 직접 재서** 정한다.
//   ⚠️ padX 를 한국어 폭에서 뽑은 상수로 넘기면 t() 가 돌려준 다른 언어에서 글자가 알약 밖으로 넘친다
//     (영어 '🌾 Harvest!' 는 bold 28px 에서 140.5px — padX 60 이 만드는 136px 알약을 4.5px 삐져나갔다).
//   캔버스는 언어당 한 번만 그리므로 measureText 비용은 없고, 어떤 언어가 와도 자가치유된다.
//   ⚠️ measureText 전에 c.font 를 먼저 설정해야 폭이 맞는다.
export function _drawHintBadge(c, bg, ink, text, fontPx) {
  c.font = `bold ${fontPx}px sans-serif`;
  const w = c.measureText(text).width;
  const padX = Math.max(8, (HINT_W - (w + 44)) / 2);   // 글자 좌우 22px 여백
  c.fillStyle = bg; roundRect(c, padX, 8, HINT_W - padX * 2, 64, 18); c.fill();
  c.beginPath(); c.moveTo(HINT_W / 2 - 10, 72); c.lineTo(HINT_W / 2 + 10, 72); c.lineTo(HINT_W / 2 - 4, 94); c.closePath(); c.fill();
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, HINT_W / 2, 40);
}

export function _hintTexFromCanvas(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

// 배지 빌보드 갱신 — 카메라를 향해 돌리고 살짝 둥실거린다(기존 연출 유지).
//   떠 있는 배지가 하나도 없고(now) 이전 프레임에도 없었다면(prev) 버퍼를 건드리지 않는다.
export const _hintQ = new THREE.Quaternion(), _hintP = new THREE.Vector3();

// 단계별 작물 — 메시는 farmCropMeshes(InstancedMesh)가 그린다. 여기선 상태만 바꾸고 팝을 건다.
export function buildCropStage(plot) {
  plot.crop = true;          // "작물이 있다" 플래그 — 기존 코드가 truthy 검사만 한다
  plot.cropPop = 1;          // 단계 전환 시 톡 튀는 팝
  syncFarmCrops(true);
}
