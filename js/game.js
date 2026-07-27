// =============================================================
//  calm forest · 3D 게임 코어 (Three.js / WebGL)
//  ------------------------------------------------------------
//  2단계 범위: 걷기 + 벌목 + 농사(밭갈기/심기/물주기/수확)
//             + 건축(정해진 터 단계 건설) + 파티클 + 블룸 + 낮/밤
//             + 모바일(아날로그) 입력 지원
//
//  ▷ 아트 디렉션: 로우폴리 + 점토/장난감 느낌, 파스텔 톤,
//    소프트 매트(툰) 셰이딩, 부드러운 그림자/안개, 은은한 블룸
//  ▷ 외부 이미지/모델/사운드 파일 미사용 — 모든 형상은 코드 생성
//
//  ▷ [연동 지점] 주석 태그:
//     · [Supabase] 저장 / [센서] 로깅 스냅샷 / [GA4] 이벤트
//     · [셰이더] 커스텀 머티리얼/포스트프로세싱
//     · [파티클] 벌목/밭갈기/물주기/수확/건축완성 연출
// =============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { sampleFrame, startLogging } from './logger.js';         // [센서] 로깅
import { saveGame, loadGame } from './supabase-client.js';       // [Supabase] 저장
import { trackChop, trackEvent } from './analytics.js';          // [GA4] 이벤트
import { Sound, initSound } from './sound.js';                   // 🔊 절차적 사운드

// 모바일 여부 — 렌더 품질/디테일을 낮춰 성능 확보
const IS_MOBILE = /Mobi|Android|iP(hone|od|ad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);

// ── 작물 종류(다양화) — 심을 때 랜덤 배정, 열매 색이 달라짐 ─────
const CROP_TYPES = [
  { name: '당근',   fruit: 0xff9e5e },
  { name: '토마토', fruit: 0xff7b7b },
  { name: '블루베리', fruit: 0x8aa8ff },
  { name: '호박',   fruit: 0xffc36e },
];

// ── 도구 하트바 (선택 도구에 따라 상호작용이 달라짐) ─────────────
const TOOLS = [
  { id: 'axe',    name: '도끼',     ico: '🪓' }, // 벌목
  { id: 'hoe',    name: '괭이',     ico: '⛏️' }, // 밭갈기 + 씨앗 심기
  { id: 'water',  name: '물조리개', ico: '💧' }, // 물주기
  { id: 'sickle', name: '낫',       ico: '🌾' }, // 수확
  { id: 'hammer', name: '망치',     ico: '🔨' }, // 건축
];
let currentTool = 0;
const BUILD_COST = 5;   // 건축 단계당 목재 소비량

// ── 마을 주민(NPC) 정의 — 각자 이름/색/퀘스트 체인 ───────────────
//   퀘스트 type: chop(벌목) harvest(수확) water(물주기) plant(심기)
//               house(집완성) collect_wood/collect_crop(보유량 달성)
const NPCS = [
  {
    id: 'farmer', name: '농부 삼촌', emoji: '🧑‍🌾', color: 0x9fe0a0, hat: 0xe9c47a, pos: [5, 0, 4],
    quests: [
      { type: 'chop',    target: 3, title: '장작 모으기', desc: '나무 3번 베기',   reward: { seed: 3 },  line: '겨울 대비 장작이 필요해. 나무 3번만 베어줄래?' },
      { type: 'harvest', target: 2, title: '수확의 기쁨', desc: '작물 2개 수확',   reward: { wood: 6 },  line: '밭에서 작물 두 개만 거둬다 주면 목재로 보답하지!' },
      { type: 'water',   target: 4, title: '촉촉하게',   desc: '물 4번 주기',     reward: { seed: 5 },  line: '모종이 목말라 해. 물 네 번만 부탁할게.' },
    ],
  },
  {
    id: 'builder', name: '목수 아저씨', emoji: '👷', color: 0xd6b48a, hat: 0xc0894f, pos: [-5, 0, 6],
    quests: [
      { type: 'collect_wood', target: 10, title: '목재 납품', desc: '목재 10개 모으기', reward: { crop: 3 },          line: '집 지으려면 목재 10개가 필요해. 모아올 수 있겠어?' },
      { type: 'house',        target: 1,  title: '보금자리',  desc: '집 완성하기',      reward: { seed: 6, crop: 3 }, line: '이제 근사한 집을 완성해보자고!' },
    ],
  },
  {
    id: 'merchant', name: '방랑 상인', emoji: '🧙', color: 0xc9a8ff, hat: 0x8a5cd0, pos: [9, 0, -3],
    quests: [
      { type: 'plant',        target: 3, title: '씨앗 뿌리기', desc: '씨앗 3번 심기',   reward: { wood: 4 }, line: '여기 좋은 씨앗들이 있소. 세 번만 심어보겠소?' },
      { type: 'collect_crop', target: 5, title: '풍년',       desc: '작물 5개 보유',   reward: { seed: 8 }, line: '작물 다섯 개만 모으면 큰 선물을 주겠소!' },
    ],
  },
];

// ── 게임 상태(저장/불러오기 대상) ────────────────────────────
const gameState = {
  inventory: { wood: 0, seed: 5, crop: 0 }, // 목재 / 씨앗 / 작물
  playerPos: { x: 0, z: 0 },
  houseStage: 0,                            // 0=없음 1=기초 2=벽 3=완성
  plots: [],                                // [{x,z,state,growth}] 저장용 스냅샷
  npcs: {},                                 // id별 {idx,progress,given,allDone}
};

let mode = 'attract';   // 'attract'(로그인 배경) | 'play'(플레이)
const npcObjs = [];     // 런타임 NPC 객체들
let nearNPC = null;     // 현재 근접한 NPC(런타임 객체) 또는 null

// 씬 전역 참조
let renderer, scene, camera, composer;
let player, playerAnchor;
let sunLight, hemiLight, ambient;
let fireflies;
const trees = [];
const swayables = [];
const particles = [];
const plots = [];                 // 밭 목록 (런타임 객체)
const houseWindows = [];          // 밤에 빛나는 창문 머티리얼
let houseGroup, houseGhost;       // 집 그룹 / 미완성 터 표시
const HOUSE_POS = new THREE.Vector3(-8, 0, -8); // 정해진 집 터 위치
const clock = new THREE.Clock();

// 입력 상태
const keys = {};
const analog = { x: 0, z: 0 };    // 모바일 조이스틱 아날로그 이동(-1~1)
let wantAction = false;
let timeOfDay = 0.30;
const DAY_SPEED = 0.008;
let ui = {};

// 파스텔 팔레트
const PAL = {
  ground: 0xbfe8c9, groundDark: 0xa9dcb6,
  trunk: 0xd8a679, leaf1: 0x8fd6a0, leaf2: 0xb7e6a8, leaf3: 0xa0e0d0,
  body: 0xfff2d6, belly: 0xffd9a8, hat: 0xff9e9e,
  wood: 0xd9a066, sky: 0xdff3ff,
  soil: 0x9c6b4a, soilWet: 0x7c5236,
  sprout: 0x7fce7f, crop: 0xff9e5e, cropLeaf: 0x86d18a,
  wall: 0xffe3c4, roof: 0xff9e9e, window: 0xfff2a8,
};

// =============================================================
//  입력 API (키보드 + 모바일 터치 컨트롤이 함께 사용)
// =============================================================
export const Input = {
  setAnalog(x, z) { analog.x = x; analog.z = z; },      // 조이스틱 벡터
  doAction() { wantAction = true; },                    // 액션 버튼/클릭/Space
  selectTool(i) { currentTool = (i + TOOLS.length) % TOOLS.length; ui.setTool?.(currentTool, TOOLS); Sound.blip(); },
  getTools() { return TOOLS; },
};

// =============================================================
//  진입점
// =============================================================
// ① 로그인 화면 뒤에서 도는 "어트랙트" 씬 부팅 (플레이어 조작 X)
export async function bootWorld(uiCallbacks) {
  ui = uiCallbacks || {};
  initRenderer();
  initScene();
  initLights();
  buildWorld();
  buildHouseGhost();
  buildNPCs();              // 마을 주민들
  initPostProcessing();
  initInput();
  initSound();
  ui.setTool?.(currentTool, TOOLS);
  window.addEventListener('resize', onResize);
  player.visible = false;   // 로그인 중엔 캐릭터 숨김(카메라 자동 오빗)
  mode = 'attract';
  animate();
}

// ② 로그인 완료 후 실제 플레이 시작 (저장 로드 + 로깅 + 조작 on)
export async function enterGame() {
  const saved = await loadGame();      // [Supabase] 저장 불러오기(오프라인이면 null)
  if (saved) applySave(saved);
  refreshInventoryUI();
  ui.setTool?.(currentTool, TOOLS);
  ui.setQuest?.(null);                  // 퀘스트 패널은 주민 근처에서 표시
  npcObjs.forEach(updateNPCGlyph);     // 저장 복원 후 말풍선 상태 반영
  player.visible = true;
  player.position.set(gameState.playerPos.x || 0, 0, gameState.playerPos.z || 0);
  mode = 'play';
  startLogging();                      // [센서] 배치 전송 시작
}

function applySave(saved) {
  if (saved.inventory) Object.assign(gameState.inventory, saved.inventory);
  if (saved.npcs) gameState.npcs = { ...gameState.npcs, ...saved.npcs }; // NPC 퀘스트 복원
  if (typeof saved.houseStage === 'number') {
    for (let s = 1; s <= saved.houseStage; s++) buildHouseStage(s, true); // 조용히 복원
  }
  if (Array.isArray(saved.plots)) {
    saved.plots.forEach(p => {
      const plot = createPlot(p.x, p.z, true);
      plot.state = p.state; plot.growth = p.growth || 0;
      updatePlotVisual(plot);
    });
  }
}

export function getGameState() {
  gameState.playerPos = { x: player.position.x, z: player.position.z };
  gameState.plots = plots.map(p => ({ x: p.x, z: p.z, state: p.state, growth: p.growth }));
  return gameState;
}
export async function requestSave() { return await saveGame(getGameState()); }

// =============================================================
//  렌더러 / 씬 / 조명
// =============================================================
function initRenderer() {
  // 모바일은 안티앨리어싱 off + 픽셀비율 상한을 낮춰 GPU 부담 감소
  renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = IS_MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('app').appendChild(renderer.domElement);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.Fog(PAL.sky, 22, 60); // 부드러운 안개

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 14, 16);
  camera.lookAt(0, 0, 0);
}

function initLights() {
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.9);
  scene.add(hemiLight);
  ambient = new THREE.AmbientLight(0xfff0dd, 0.25);
  scene.add(ambient);

  sunLight = new THREE.DirectionalLight(0xffe9c4, 1.1);
  sunLight.position.set(10, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048); // 모바일 그림자 해상도 ↓
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 60;
  sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.bias = -0.0005; sunLight.shadow.radius = 6;
  scene.add(sunLight); scene.add(sunLight.target);
}

function clayMat(color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0, flatShading: flat });
}

// =============================================================
//  월드 구성
// =============================================================
function buildWorld() {
  const groundGeo = new THREE.CircleGeometry(60, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, clayMat(PAL.ground, false));
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 40; i++) {
    const r = 6 + Math.random() * 26, a = Math.random() * Math.PI * 2;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2.5, 12), clayMat(PAL.groundDark, false));
    patch.geometry.rotateX(-Math.PI / 2);
    patch.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  for (let i = 0; i < 14; i++) {
    const r = 8 + Math.random() * 22, a = Math.random() * Math.PI * 2;
    spawnTree(Math.cos(a) * r, Math.sin(a) * r);
  }

  for (let i = 0; i < (IS_MOBILE ? 40 : 80); i++) {   // 모바일 풀 개수 ↓
    const r = 4 + Math.random() * 30, a = Math.random() * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5), clayMat([PAL.leaf1, PAL.leaf2, PAL.leaf3][i % 3]));
    blade.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
    blade.castShadow = true;
    blade.userData.swayPhase = Math.random() * Math.PI * 2;
    scene.add(blade); swayables.push(blade);
  }

  buildPlayer();
  buildFireflies();
}

function spawnTree(x, z) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 7), clayMat(PAL.trunk));
  trunk.position.y = 0.8; trunk.castShadow = true; tree.add(trunk);

  const leafColor = [PAL.leaf1, PAL.leaf2, PAL.leaf3][Math.floor(Math.random() * 3)];
  const canopy = new THREE.Group(); canopy.position.y = 2.0;
  [[0, 0.4, 0, 1.2], [0.7, 0, 0.2, 0.85], [-0.6, 0.05, -0.3, 0.9], [0.1, 0.9, -0.2, 0.7]].forEach(([bx, by, bz, s]) => {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), clayMat(leafColor));
    blob.position.set(bx, by, bz); blob.castShadow = true; canopy.add(blob);
  });
  tree.add(canopy);
  canopy.userData.swayPhase = Math.random() * Math.PI * 2; swayables.push(canopy);

  tree.userData = { hp: 3, canopy, trunk, squash: 0, fallen: false, respawnAt: 0, leafColor };
  scene.add(tree); trees.push(tree);
}

function buildPlayer() {
  playerAnchor = new THREE.Group();
  player = new THREE.Group();
  player.add(playerAnchor);

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), clayMat(PAL.body, false));
  body.position.y = 0.6; body.castShadow = true; body.scale.set(1, 1.05, 1); playerAnchor.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), clayMat(PAL.belly, false));
  belly.position.set(0, 0.5, 0.32); belly.scale.set(1, 1.1, 0.6); playerAnchor.add(belly);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), clayMat(PAL.body, false));
  head.position.y = 1.25; head.castShadow = true; playerAnchor.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 8), clayMat(PAL.hat));
  hat.position.y = 1.7; hat.castShadow = true; playerAnchor.add(hat);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.14, 0.14].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(ex, 1.3, 0.34); playerAnchor.add(eye);
  });

  player.position.set(gameState.playerPos.x, 0, gameState.playerPos.z);
  scene.add(player);
}

function buildFireflies() {
  const N = IS_MOBILE ? 60 : 120;   // 모바일 반딧불이 ↓
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 34, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.5 + Math.random() * 4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xfff2a8, size: 0.22, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  fireflies = new THREE.Points(geo, mat);
  fireflies.userData.base = pos.slice();
  scene.add(fireflies);
}

// =============================================================
//  집(건축) — 정해진 터, 단계별 건설
// =============================================================
function buildHouseGhost() {
  // 미완성 터 표시(반투명 점선 느낌의 바닥 + 살랑이는 화살표 대신 링)
  houseGhost = new THREE.Group();
  houseGhost.position.copy(HOUSE_POS);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 5),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 1 })
  );
  pad.geometry.rotateX(-Math.PI / 2); pad.position.y = 0.02;
  houseGhost.add(pad);
  scene.add(houseGhost);

  houseGroup = new THREE.Group();
  houseGroup.position.copy(HOUSE_POS);
  scene.add(houseGroup);
}

// stage: 1=기초 2=벽 3=지붕(완성). silent=true 면 파티클 없이 복원.
function buildHouseStage(stage, silent = false) {
  if (stage === 1) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), clayMat(0xcdb79e));
    base.position.y = 0.15; base.castShadow = base.receiveShadow = true;
    base.name = 'stage1'; houseGroup.add(base);
    [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), clayMat(PAL.trunk));
      post.position.set(px, 1.0, pz); post.castShadow = true; post.name = 'stage1'; houseGroup.add(post);
    });
  } else if (stage === 2) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.6, 2.9), clayMat(PAL.wall));
    wall.position.y = 1.1; wall.castShadow = wall.receiveShadow = true; wall.name = 'stage2'; houseGroup.add(wall);
    // 창문(밤에 빛남) — emissive 사용
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(winMat);
    [[0, 1.45], [1.46, 0], [0, -1.46], [-1.46, 0]].forEach(([wx, wz], i) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.05), winMat);
      win.position.set(wx, 1.2, wz);
      if (i % 2 === 1) win.rotation.y = Math.PI / 2;
      win.name = 'stage2'; houseGroup.add(win);
    });
  } else if (stage === 3) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 4), clayMat(PAL.roof));
    roof.position.y = 2.65; roof.rotation.y = Math.PI / 4; roof.castShadow = true; roof.name = 'stage3'; houseGroup.add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), clayMat(0xd98b8b));
    chimney.position.set(0.9, 3.1, 0.9); chimney.castShadow = true; chimney.name = 'stage3'; houseGroup.add(chimney);
  }

  gameState.houseStage = Math.max(gameState.houseStage, stage);
  if (stage >= 3) houseGhost.visible = false; // 완성되면 터 표시 제거

  if (!silent) {
    // 각 단계 톡 튀는 팝 애니메이션
    houseGroup.children.filter(c => c.name === 'stage' + stage).forEach(c => { c.userData.pop = 1; c.scale.set(0.01, 0.01, 0.01); });
    spawnDust(HOUSE_POS.x, HOUSE_POS.z, 14);
    Sound.build();
    if (stage >= 3) {
      // [파티클] 집 완성 축하: 색종이 + 반짝이
      spawnConfetti(HOUSE_POS.x, 3.5, HOUSE_POS.z);
      spawnSparkle(HOUSE_POS.x, 3.2, HOUSE_POS.z, 30);
      Sound.complete();
      ui.toast?.('🎉 집 완성! 축하해요');
      questEvent('house');                     // 퀘스트 진행
      trackEvent('house_complete');           // [GA4] 집 완성 이벤트
    }
  }
}

// =============================================================
//  포스트 프로세싱
// =============================================================
function initPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 모바일은 블룸 해상도를 절반으로 낮춰 부담 감소
  const bloomRes = IS_MOBILE ? new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) : new THREE.Vector2(window.innerWidth, window.innerHeight);
  const bloom = new UnrealBloomPass(bloomRes, 0.55, 0.9, 0.85);
  composer.addPass(bloom);

  // [셰이더] 비네팅 + 따뜻한 컬러 그레이딩
  const gradePass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVignette: { value: 1.15 }, uWarm: { value: new THREE.Color(1.05, 1.0, 0.92) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uVignette; uniform vec3 uWarm; varying vec2 vUv;
      void main(){
        vec4 col = texture2D(tDiffuse, vUv);
        col.rgb *= uWarm;
        vec2 d = vUv - 0.5;
        float vig = smoothstep(0.85, 0.35, length(d) * uVignette);
        col.rgb *= mix(0.78, 1.0, vig);
        gl_FragColor = col;
      }`,
  });
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}

// =============================================================
//  입력
// =============================================================
function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') { wantAction = true; e.preventDefault(); }
    // 숫자키 1~5 로 도구 선택
    if (/^Digit[1-5]$/.test(e.code)) Input.selectTool(parseInt(e.code.slice(5)) - 1);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  renderer.domElement.addEventListener('pointerdown', () => { wantAction = true; });
}

// =============================================================
//  메인 루프
// =============================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 'play') {
    updatePlayer(dt, t);
    updateCamera(dt);
    handleAction();
    updateNPCInteract();
    // [센서] 매 프레임 스냅샷 → logger throttle 후 배치 전송
    sampleFrame(() => ({
      char: { x: player.position.x, y: 0, z: player.position.z },
      cam: { yaw: camera.rotation.y, pitch: camera.rotation.x },
    }));
  } else {
    updateAttractCamera(t);   // 로그인 배경: 카메라 천천히 회전
  }

  updateDayNight(dt);
  updateSway(t);
  updateTrees(dt);
  updatePlots(dt);
  updatePops(dt);
  updateParticles(dt);
  updateNPC(dt, t);
  composer.render();
}

// 로그인 배경용 부드러운 오빗 카메라
function updateAttractCamera(t) {
  const r = 19, y = 12;
  camera.position.set(Math.cos(t * 0.11) * r, y + Math.sin(t * 0.3) * 0.6, Math.sin(t * 0.11) * r);
  camera.lookAt(0, 1.6, 0);
}

let walkPhase = 0;
function updatePlayer(dt, t) {
  const speed = 6;
  let mx = 0, mz = 0;
  if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  // 모바일 조이스틱 아날로그 합산
  mx += analog.x; mz += analog.z;

  const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;
  if (moving) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    player.position.x += mx * speed * dt;
    player.position.z += mz * speed * dt;
    player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(mx, mz), 0.2);
    walkPhase += dt * 12;
    playerAnchor.position.y = Math.abs(Math.sin(walkPhase)) * 0.18;
    playerAnchor.rotation.z = Math.sin(walkPhase) * 0.05;
  } else {
    playerAnchor.position.y = Math.sin(t * 2) * 0.03;
    playerAnchor.rotation.z *= 0.9;
  }

  const maxR = 42, pr = Math.hypot(player.position.x, player.position.z);
  if (pr > maxR) { player.position.x *= maxR / pr; player.position.z *= maxR / pr; }
}

const camOffset = new THREE.Vector3(0, 14, 16);
function updateCamera(dt) {
  const target = new THREE.Vector3().copy(player.position).add(camOffset);
  camera.position.lerp(target, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, 1.2, player.position.z);
}

function updateDayNight(dt) {
  timeOfDay = (timeOfDay + DAY_SPEED * dt) % 1;
  const daylight = Math.max(0, Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
  sunLight.intensity = 0.15 + daylight * 1.1;
  hemiLight.intensity = 0.25 + daylight * 0.7;
  const day = new THREE.Color(PAL.sky), night = new THREE.Color(0x2a2c50);
  const sky = night.clone().lerp(day, daylight);
  scene.background = sky; scene.fog.color = sky;
  sunLight.color = new THREE.Color(0xffb070).lerp(new THREE.Color(0xffe9c4), daylight);
  const ang = timeOfDay * Math.PI * 2;
  sunLight.position.set(Math.cos(ang) * 18, Math.sin(ang) * 18 + 2, 8);

  const nightAmt = 1 - daylight;
  fireflies.material.opacity = Math.max(0, nightAmt - 0.35) * 1.4;
  // 밤엔 집 창문에 따뜻한 불빛
  houseWindows.forEach(m => { m.emissiveIntensity = nightAmt * 1.6; });

  ui.setTime?.(daylight > 0.4 ? 'day' : 'night', daylight);
}

function updateSway(t) {
  for (const s of swayables) {
    const ph = s.userData.swayPhase || 0;
    s.rotation.z = Math.sin(t * 1.3 + ph) * 0.08;
    s.rotation.x = Math.cos(t * 1.1 + ph) * 0.05;
  }
  if (fireflies) {
    const base = fireflies.userData.base, pos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) pos[i + 1] = base[i + 1] + Math.sin(t * 1.5 + i) * 0.25;
    fireflies.geometry.attributes.position.needsUpdate = true;
  }
}

function updateTrees(dt) {
  const now = clock.elapsedTime;
  for (const tree of trees) {
    const ud = tree.userData;
    if (ud.squash > 0) {
      ud.squash = Math.max(0, ud.squash - dt * 4);
      const sq = ud.squash;
      tree.scale.set(1 + Math.sin(sq * Math.PI) * 0.14, 1 - Math.sin(sq * Math.PI) * 0.18, 1 + Math.sin(sq * Math.PI) * 0.14);
      tree.rotation.z = Math.sin(sq * 22) * 0.06 * sq;
    }
    if (ud.fallen && now > ud.respawnAt) { ud.fallen = false; ud.hp = 3; tree.visible = true; tree.scale.set(0.01, 0.01, 0.01); ud.growing = true; }
    if (ud.growing) {
      const s = THREE.MathUtils.lerp(tree.scale.x, 1, dt * 5);
      tree.scale.set(s, s, s);
      if (s > 0.98) { tree.scale.set(1, 1, 1); ud.growing = false; }
    }
  }
}

// =============================================================
//  상호작용: 선택 도구에 따라 분기
// =============================================================
function handleAction() {
  if (!wantAction) return;
  wantAction = false;
  // NPC 근처면 도구 대신 "대화"가 우선
  if (nearNPC) return talkToNPC();
  switch (TOOLS[currentTool].id) {
    case 'axe': return tryChop();
    case 'hoe': return tryHoe();
    case 'water': return tryWater();
    case 'sickle': return tryHarvest();
    case 'hammer': return tryBuild();
  }
}

// ── 벌목 ─────────────────────────────────────────────────────
function tryChop() {
  let nearest = null, nd = 2.6;
  for (const tree of trees) {
    if (tree.userData.fallen) continue;
    const d = dist2D(tree.position, player.position);
    if (d < nd) { nd = d; nearest = tree; }
  }
  if (!nearest) { ui.toast?.('가까운 나무가 없어요'); return; }
  const ud = nearest.userData;
  ud.squash = 1;
  Sound.chop();
  spawnLeafBurst(nearest); spawnWoodChips(nearest);
  ud.hp -= 1;
  if (ud.hp <= 0) {
    gameState.inventory.wood += 3; ud.fallen = true; ud.respawnAt = clock.elapsedTime + 12;
    nearest.visible = false; spawnLeafBurst(nearest, 26);
  } else gameState.inventory.wood += 1;
  refreshInventoryUI();
  questEvent('chop');                                          // 퀘스트 진행
  trackChop(trees.indexOf(nearest), gameState.inventory.wood); // [GA4]
}

// =============================================================
//  농사: 밭 타일 상태머신
//  state: 'empty'(갈아둔 흙) → 'planted'(성장 0~1) → 'mature'
// =============================================================
function createPlot(x, z, silent = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), clayMat(PAL.soil, false));
  soil.position.y = 0.1; soil.receiveShadow = true; g.add(soil);
  scene.add(g);
  const plot = { group: g, soil, crop: null, state: 'empty', growth: 0, x, z, watered: false };
  plots.push(plot);
  if (!silent) { soil.userData.pop = 1; soil.scale.set(0.01, 0.01, 0.01); spawnDust(x, z, 10); }
  return plot;
}

function plantSeed(plot) {
  if (gameState.inventory.seed <= 0) { ui.toast?.('씨앗이 없어요 🌰'); return; }
  gameState.inventory.seed -= 1;
  plot.state = 'planted'; plot.growth = 0.05;
  plot.cropType = CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)]; // 작물 종류 랜덤
  Sound.plant();
  // 새싹 메쉬
  const sprout = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), clayMat(PAL.sprout));
  stem.position.y = 0.35; sprout.add(stem);
  sprout.position.y = 0.2;
  plot.group.add(sprout); plot.crop = sprout;
  refreshInventoryUI(); updatePlotVisual(plot);
  questEvent('plant');      // 퀘스트 진행
  trackEvent('plant_seed'); // [GA4]
}

// 괭이: 빈 땅이면 밭 만들기(+씨앗 심기), 갈아둔 밭이면 씨앗 심기
function tryHoe() {
  const gx = Math.round(player.position.x / 2) * 2;
  const gz = Math.round(player.position.z / 2) * 2;
  let plot = plots.find(p => dist2D(p.group.position, player.position) < 1.6);
  if (!plot) {
    if (dist2D(HOUSE_POS, { x: gx, z: gz }) < 3) { ui.toast?.('집 터 근처엔 밭을 못 만들어요'); return; }
    plot = createPlot(gx, gz);
    Sound.till();
    if (gameState.inventory.seed > 0) plantSeed(plot);
    return;
  }
  if (plot.state === 'empty') plantSeed(plot);
  else ui.toast?.('이미 작물이 자라는 중이에요');
}

// 물조리개: 자라는 밭에 물 → 성장 촉진 + 물방울/무지개 파티클
function tryWater() {
  const plot = plots.find(p => p.state === 'planted' && dist2D(p.group.position, player.position) < 1.8);
  if (!plot) { ui.toast?.('물 줄 작물이 없어요 💧'); return; }
  plot.growth = Math.min(1, plot.growth + 0.34); plot.watered = true;
  Sound.water();
  spawnWater(plot.x, plot.z);         // [파티클] 물방울 + 무지개 반짝임
  if (plot.growth >= 1) maturePlot(plot);
  updatePlotVisual(plot);
  questEvent('water');      // 퀘스트 진행
  trackEvent('water_crop'); // [GA4]
}

// 낫: 다 자란 작물 수확 → 톡 튀는 팝 + 스파클
function tryHarvest() {
  const plot = plots.find(p => p.state === 'mature' && dist2D(p.group.position, player.position) < 1.8);
  if (!plot) { ui.toast?.('수확할 작물이 없어요 🌾'); return; }
  gameState.inventory.crop += 2;
  gameState.inventory.seed += 1; // 수확 시 씨앗 하나 되돌려줌
  Sound.harvest();
  ui.toast?.(`${plot.cropType?.name || '작물'} 수확! 🌾`);
  spawnSparkle(plot.x, 0.8, plot.z, 20); // [파티클] 별/스파클
  // 작물 팝 후 제거 → 다시 빈 밭으로
  if (plot.crop) { plot.group.remove(plot.crop); plot.crop = null; }
  plot.state = 'empty'; plot.growth = 0; plot.watered = false;
  refreshInventoryUI();
  questEvent('harvest');                                          // 퀘스트 진행
  trackEvent('harvest_crop', { crop: gameState.inventory.crop }); // [GA4]
}

// 시간 경과에 따른 완만한 성장(물주기가 주 성장 동력)
function updatePlots(dt) {
  for (const plot of plots) {
    if (plot.state === 'planted') {
      plot.growth = Math.min(1, plot.growth + dt * 0.015);
      updatePlotVisual(plot);
      if (plot.growth >= 1) maturePlot(plot);
    }
  }
}

function updatePlotVisual(plot) {
  // 젖은 흙 색
  plot.soil.material.color.set(plot.watered ? PAL.soilWet : PAL.soil);
  if (plot.crop && plot.state === 'planted') {
    const s = 0.4 + plot.growth * 1.1;
    plot.crop.scale.set(s, s, s);
  }
}

function maturePlot(plot) {
  plot.state = 'mature';
  // 새싹 위에 작물 열매 톡 얹기
  if (plot.crop) {
    const fruitColor = plot.cropType?.fruit ?? PAL.crop; // 작물 종류별 열매 색
    const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), clayMat(fruitColor, false));
    fruit.position.y = 0.75; fruit.userData.pop = 1; fruit.scale.set(0.01, 0.01, 0.01);
    plot.crop.add(fruit);
    // 잎 두 장
    [[-0.2, 0.2], [0.2, -0.2]].forEach(([lx, lz]) => {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), clayMat(PAL.cropLeaf));
      leaf.position.set(lx, 0.55, lz); leaf.rotation.z = lx * 1.5; plot.crop.add(leaf);
    });
    plot.crop.scale.set(1.3, 1.3, 1.3);
  }
  spawnSparkle(plot.x, 0.8, plot.z, 10);
}

// =============================================================
//  건축: 망치로 집 터에서 단계 건설
// =============================================================
function tryBuild() {
  if (dist2D(HOUSE_POS, player.position) > 3.2) { ui.toast?.('집 터(반투명 자리)로 가세요 🏠'); return; }
  if (gameState.houseStage >= 3) { ui.toast?.('집이 이미 완성됐어요 🎉'); return; }
  if (gameState.inventory.wood < BUILD_COST) { ui.toast?.(`목재가 부족해요 (필요 ${BUILD_COST} 🪵)`); return; }
  gameState.inventory.wood -= BUILD_COST;
  buildHouseStage(gameState.houseStage + 1);
  refreshInventoryUI();
}

// =============================================================
//  팝 애니메이션(밭/작물/집 부재 톡 튀어오름)
// =============================================================
function updatePops(dt) {
  // group 을 순회하기 부담스러우니 scene 전체에서 pop 표시 객체만 처리
  scene.traverse(obj => {
    if (obj.userData && obj.userData.pop > 0) {
      obj.userData.pop = Math.max(0, obj.userData.pop - dt * 3);
      const p = 1 - obj.userData.pop;
      // 통통 튀는 오버슛(EaseOutBack 비슷)
      const s = p < 1 ? p + Math.sin(p * Math.PI) * 0.25 : 1;
      obj.scale.set(s, s, s);
      if (obj.userData.pop === 0) obj.scale.set(1, 1, 1);
    }
  });
}

// =============================================================
//  [파티클] 공용 파티클 풀
// =============================================================
const _leafGeo = new THREE.PlaneGeometry(0.22, 0.22);
const _chipGeo = new THREE.TetrahedronGeometry(0.12);
const _dropGeo = new THREE.SphereGeometry(0.07, 6, 6);
const _confGeo = new THREE.PlaneGeometry(0.16, 0.24);

function makeParticle(geo, color, additive = false) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, side: THREE.DoubleSide, transparent: true,
    emissive: additive ? color : 0x000000, emissiveIntensity: additive ? 1.2 : 0,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive,
  });
  const m = new THREE.Mesh(geo, mat); scene.add(m); return m;
}

function spawnLeafBurst(tree, count = 14) {
  const c = new THREE.Color(tree.userData.leafColor);
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_leafGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5), 2 + Math.random() * 1.2, tree.position.z + (Math.random() - 0.5));
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(6), life: 1.4, gravity: -4, flutter: true };
    particles.push(p);
  }
}
function spawnWoodChips(tree) {
  const c = new THREE.Color(PAL.wood);
  for (let i = 0; i < 8; i++) {
    const p = makeParticle(_chipGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5) * 0.4, 0.9, tree.position.z + (Math.random() - 0.5) * 0.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 4), spin: rndSpin(10), life: 1.0, gravity: -9, flutter: false };
    particles.push(p);
  }
}
// 밭갈기/건축: 흙먼지가 살짝 피어오름
function spawnDust(x, z, count = 12) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xc9a988));
    p.position.set(x + (Math.random() - 0.5) * 1.4, 0.2, z + (Math.random() - 0.5) * 1.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2), spin: rndSpin(4), life: 0.9, gravity: -1.2, flutter: false, grow: 2 };
    particles.push(p);
  }
}
// 물주기: 물방울 + 무지개 반짝임
function spawnWater(x, z) {
  for (let i = 0; i < 12; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(0x8fd0ff), true);
    p.position.set(x + (Math.random() - 0.5) * 0.8, 1.6, z + (Math.random() - 0.5) * 0.8);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8), spin: rndSpin(2), life: 1.0, gravity: -6, flutter: false };
    particles.push(p);
  }
  // 작은 무지개 반짝임(색색의 발광 점)
  const rainbow = [0xff8a8a, 0xffd28a, 0xfff58a, 0x8affa0, 0x8ad2ff, 0xc08aff];
  for (let i = 0; i < 6; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(rainbow[i]), true);
    p.position.set(x + (Math.random() - 0.5) * 1.0, 1.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * 1.0);
    p.userData = { vel: new THREE.Vector3(0, 0.4, 0), spin: rndSpin(1), life: 0.9, gravity: 0.5, flutter: false };
    particles.push(p);
  }
}
// 수확: 별/스파클(발광)
function spawnSparkle(x, y, z, count = 16) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xfff2a0), true);
    p.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), spin: rndSpin(8), life: 1.0, gravity: -3, flutter: false };
    particles.push(p);
  }
}
// 집 완성: 색종이(색색의 평면 조각)
function spawnConfetti(x, y, z) {
  const cols = [0xff8a8a, 0xffd28a, 0x8affa0, 0x8ad2ff, 0xc08aff, 0xfff58a];
  for (let i = 0; i < 40; i++) {
    const p = makeParticle(_confGeo, new THREE.Color(cols[i % cols.length]));
    p.position.set(x + (Math.random() - 0.5) * 1.5, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 1.5);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(12), life: 2.2, gravity: -3.5, flutter: true };
    particles.push(p);
  }
}
function rndSpin(m) { return new THREE.Vector3(Math.random() * m, Math.random() * m, Math.random() * m); }

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], u = p.userData;
    u.life -= dt;
    u.vel.y += u.gravity * dt;
    if (u.flutter) u.vel.x += Math.sin(clock.elapsedTime * 8 + i) * dt * 1.5;
    p.position.addScaledVector(u.vel, dt);
    p.rotation.x += u.spin.x * dt; p.rotation.y += u.spin.y * dt; p.rotation.z += u.spin.z * dt;
    if (u.grow) p.scale.multiplyScalar(1 + u.grow * dt); // 먼지 퍼짐
    if (p.position.y < 0.05) { p.position.y = 0.05; u.vel.set(0, 0, 0); }
    p.material.opacity = Math.min(1, u.life);
    if (u.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
}

// =============================================================
//  NPC (마을 주민 다중) + 퀘스트 체인
// =============================================================
let trackedNPC = null;                 // 퀘스트 패널에 표시할 NPC
const RES_LABEL = { wood: '목재', seed: '씨앗', crop: '작물' };

// id별 퀘스트 진행 상태(없으면 생성)
function npcState(id) {
  if (!gameState.npcs[id]) gameState.npcs[id] = { idx: 0, progress: 0, given: false, allDone: false };
  return gameState.npcs[id];
}

// 모든 주민 생성 (데이터 기반)
function buildNPCs() {
  for (const def of NPCS) {
    const g = new THREE.Group();
    g.position.set(def.pos[0], 0, def.pos[2]);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(def.color, false));
    body.position.y = 0.55; body.castShadow = true; body.scale.set(1, 1.05, 1); g.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(0xffe0c0, false));
    head.position.y = 1.15; head.castShadow = true; g.add(head);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), clayMat(def.hat));
    brim.position.y = 1.4; g.add(brim);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), clayMat(def.hat));
    top.position.y = 1.5; g.add(top);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
    [-0.13, 0.13].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); e.position.set(ex, 1.18, 0.32); g.add(e); });
    scene.add(g);

    // 머리 위 상태 말풍선(캔버스 텍스처 — 외부 파일 없음)
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(0.9, 0.9, 0.9); sprite.position.y = 2.15; g.add(sprite);

    const o = {
      def, group: g, body, sprite, ctx, tex, lastGlyph: null,
      home: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      target: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      wanderTimer: Math.random() * 3, phase: Math.random() * 6,
    };
    npcObjs.push(o);
    updateNPCGlyph(o);
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// 상태 글리프: ! 수락가능 / … 진행중 / ✓ 완료 / (없음) 전부완료
function npcGlyph(o) {
  const st = npcState(o.def.id);
  if (st.allDone) return '';
  if (!st.given) return '!';
  return st.progress >= o.def.quests[st.idx].target ? '✓' : '…';
}
function updateNPCGlyph(o) {
  if (!o || !o.ctx) return;
  const g = npcGlyph(o);
  if (g === o.lastGlyph) return; o.lastGlyph = g;
  const c = o.ctx; c.clearRect(0, 0, 128, 128);
  if (!g) { o.sprite.visible = false; o.tex.needsUpdate = true; return; }
  o.sprite.visible = true;
  c.fillStyle = g === '✓' ? '#8fd6a0' : g === '!' ? '#ffd27a' : '#cfe3ff';
  roundRect(c, 18, 14, 92, 82, 22); c.fill();
  c.beginPath(); c.moveTo(54, 94); c.lineTo(74, 94); c.lineTo(60, 118); c.closePath(); c.fill();
  c.fillStyle = '#3a4a40'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(g, 64, 55);
  o.tex.needsUpdate = true;
}

// 주민 애니메이션: 숨쉬기 + 말풍선 부유 + 근접 시 바라보기 / 아니면 배회
function updateNPC(dt, t) {
  for (const o of npcObjs) {
    o.body.position.y = 0.55 + Math.sin(t * 2 + o.phase) * 0.04;
    if (o.sprite) o.sprite.position.y = 2.15 + Math.sin(t * 2.5 + o.phase) * 0.08;
    if (mode === 'play' && nearNPC === o) {
      const dx = player.position.x - o.group.position.x, dz = player.position.z - o.group.position.z;
      o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.2); // 플레이어 바라보기
    } else {
      wanderNPC(o, dt);                                                            // 홈 주변 배회
    }
    updateNPCGlyph(o);
  }
}
function wanderNPC(o, dt) {
  o.wanderTimer -= dt;
  if (o.wanderTimer <= 0) {
    o.wanderTimer = 3 + Math.random() * 4;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
    o.target.set(o.home.x + Math.cos(a) * r, 0, o.home.z + Math.sin(a) * r);
  }
  const dx = o.target.x - o.group.position.x, dz = o.target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.06) {
    o.group.position.x += (dx / d) * 0.5 * dt;
    o.group.position.z += (dz / d) * 0.5 * dt;
    o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.1);
  }
}

// 근접 시 가장 가까운 주민 선택 → 프롬프트 + 퀘스트 패널
function updateNPCInteract() {
  let near = null, nd = 2.6;
  for (const o of npcObjs) { const d = dist2D(o.group.position, player.position); if (d < nd) { nd = d; near = o; } }
  if (near !== nearNPC) {
    nearNPC = near;
    ui.setInteractPrompt?.(near ? `💬 ${near.def.name} · Space 로 대화` : null);
    if (near) { const st = npcState(near.def.id); if (st.given && !st.allDone) { trackedNPC = near; refreshQuestPanel(); } }
  }
}

// 대화 시작 = 현재 주민 상태를 담은 모달을 연다(수락/보상은 버튼으로)
function talkToNPC() {
  const view = npcDialogState();
  if (view) { Sound.blip(); ui.openNPCModal?.(view); }
}

// 근접 주민의 현재 대화/퀘스트 상태를 뷰 객체로 반환
//   mode: 'offer'(수락 전) | 'progress'(진행 중) | 'claim'(보상 대기) | 'done'(전부 완료)
export function npcDialogState() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (st.allDone) return { npc: o.def, mode: 'done', line: '덕분에 마을이 살아났어요. 정말 고마워요! 🌼' };
  const q = o.def.quests[st.idx];
  const base = { npc: o.def, title: q.title, desc: q.desc, target: q.target, reward: rewardText(q.reward) };
  if (!st.given) return { ...base, mode: 'offer', line: q.line, progress: 0 };
  if (st.progress < q.target) return { ...base, mode: 'progress', line: '조금만 더 부탁해요!', progress: st.progress };
  return { ...base, mode: 'claim', line: '다 해냈네요! 보상을 받아요 🎁', progress: st.progress };
}

// 퀘스트 수락(모달 "수락하기" 버튼) → 갱신된 상태 반환
export function npcAccept() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (!st.given && !st.allDone) {
    st.given = true; st.progress = 0; st.readyToasted = false;
    trackedNPC = o; refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
    trackEvent('quest_accept', { quest: o.def.quests[st.idx].title, npc: o.def.id }); // [GA4]
  }
  return npcDialogState();
}

// 보상 수령(모달 "보상 받기" 버튼) → 갱신된 상태 반환
export function npcClaim() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (st.allDone) return npcDialogState();
  const q = o.def.quests[st.idx];
  if (st.given && st.progress >= q.target) {
    giveReward(q.reward); Sound.harvest();
    trackEvent('quest_complete', { quest: q.title, npc: o.def.id }); // [GA4]
    st.idx++; st.given = false; st.progress = 0; st.readyToasted = false;
    if (st.idx >= o.def.quests.length) { st.allDone = true; ui.setQuest?.(null); }
    if (trackedNPC === o) trackedNPC = null;
    refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
  }
  return npcDialogState();
}

// 이벤트형 퀘스트 진행(벌목/수확/물주기/심기/건축) — 모든 주민 검사
function questEvent(type, amount = 1) {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (st.allDone || !st.given) continue;
    const q = o.def.quests[st.idx];
    if (q.type !== type) continue;
    st.progress = Math.min(q.target, st.progress + amount);
    if (st.progress >= q.target) ui.toast?.(`✅ ${o.def.name}의 목표 달성!`);
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

// 보유량형 퀘스트(collect_wood/collect_crop) — 인벤토리 변할 때 재계산
function refreshCollectQuests() {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (st.allDone || !st.given) continue;
    const q = o.def.quests[st.idx];
    if (q.type === 'collect_wood') st.progress = Math.min(q.target, gameState.inventory.wood);
    else if (q.type === 'collect_crop') st.progress = Math.min(q.target, gameState.inventory.crop);
    else continue;
    if (st.progress >= q.target && !st.readyToasted) { st.readyToasted = true; ui.toast?.(`✅ ${o.def.name}의 목표 달성!`); }
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

function questView(o) {
  const st = npcState(o.def.id);
  if (st.allDone || !st.given) return null;
  const q = o.def.quests[st.idx];
  return { name: o.def.name, title: q.title, desc: q.desc, progress: st.progress, target: q.target, ready: st.progress >= q.target };
}
function refreshQuestPanel() { ui.setQuest?.(trackedNPC ? questView(trackedNPC) : null); }
function rewardText(r) { return Object.entries(r).map(([k, v]) => `${RES_LABEL[k] || k}+${v}`).join(', '); }

function giveReward(r) {
  for (const k in r) gameState.inventory[k] = (gameState.inventory[k] || 0) + r[k];
  refreshInventoryUI();
}

// =============================================================
//  UI / 유틸
// =============================================================
function refreshInventoryUI() {
  ui.setInventory?.(gameState.inventory);
  refreshCollectQuests();   // 보유량형 퀘스트 진행 갱신
}
function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
