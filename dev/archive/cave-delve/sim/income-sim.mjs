// Cave delve daily income Monte Carlo: compare param sets against the daily-quest baseline and current floor-0 mining.
// usage: node dev/archive/cave-delve/sim/income-sim.mjs
const PRICE = { stone: 3, coal: 6, gem: 40, crystal: 25 };
const OWL_DAILY = 70;
const FLOOR0_MEDIAN_ORE = 55;
const DAYS = 20000;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function oreTable(floor, p) {
  const deep = floor > 10;
  const k = deep ? (floor - 11) / 9 : (floor - 1) / 9;
  const gem = deep ? p.gemDeep[0] + (p.gemDeep[1] - p.gemDeep[0]) * k : p.gemShallow[0] + (p.gemShallow[1] - p.gemShallow[0]) * k;
  const crystal = deep ? p.crystal : 0;
  const rest = 1 - gem - crystal;
  const coalShare = deep ? 0.6 : 0.45;
  return [['gem', gem], ['crystal', crystal], ['coal', rest * coalShare], ['stone', rest * (1 - coalShare)]];
}

function rollOre(r, table) {
  let x = r();
  for (const [id, w] of table) { if ((x -= w) < 0) return id; }
  return 'stone';
}

function floorIncome(r, floor, p, lossRate) {
  const veins = p.veins[0] + Math.floor(r() * (p.veins[1] - p.veins[0] + 1));
  let coins = 0;
  for (let v = 0; v < veins; v++) {
    const amt = p.amt === 'fixed1' ? 1 : 1 + (r() < 0.5 ? 1 : 0);
    for (let a = 0; a < amt; a++) {
      if (r() < lossRate) continue;
      coins += PRICE[rollOre(r, oreTable(floor, p))];
    }
  }
  return coins;
}

const PLAYERS = {
  casual:  { desc: '정류장에서 1~2층만', floors: (r, top) => range(top + 1, top + 1 + Math.floor(r() * 2)), loss: 0.25 },
  regular: { desc: '정류장에서 5층 내려감', floors: (r, top) => range(top + 1, top + 5), loss: 0.15 },
  grinder: { desc: '0층부터 20층 전부(최악)', floors: () => range(1, 20), loss: 0.0 },
};
function range(a, b) { const out = []; for (let i = Math.max(1, a); i <= Math.min(20, b); i++) out.push(i); return out; }

const SETS = {
  'S0 스펙 초안 (광맥 2~3, 1~2개)': { veins: [2, 3], amt: 'rand12', gemShallow: [0.05, 0.12], gemDeep: [0.15, 0.25], crystal: 0.10 },
  'S1 광맥 1~2, 1~2개':            { veins: [1, 2], amt: 'rand12', gemShallow: [0.05, 0.12], gemDeep: [0.15, 0.25], crystal: 0.10 },
  'S2 광맥 1~2, 1개 고정':         { veins: [1, 2], amt: 'fixed1', gemShallow: [0.05, 0.12], gemDeep: [0.15, 0.25], crystal: 0.10 },
  'S3 광맥 2, 1개 고정, 보석 낮춤':  { veins: [2, 2], amt: 'fixed1', gemShallow: [0.04, 0.08], gemDeep: [0.10, 0.18], crystal: 0.10 },
};

function quantile(arr, q) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

const r = rng(20261025);
const tops = [0, 5, 10, 15];
console.log(`기준: 올빼미 일일 의뢰 ≈ ${OWL_DAILY}코인 · 0층 채굴자 중앙값 ${FLOOR0_MEDIAN_ORE}개 ≈ ${Math.round(FLOOR0_MEDIAN_ORE * 4.17)}코인(맑은 날)`);
for (const [name, p] of Object.entries(SETS)) {
  console.log(`\n${name}`);
  for (const [pid, pl] of Object.entries(PLAYERS)) {
    const days = [];
    for (let d = 0; d < DAYS; d++) {
      const top = pid === 'grinder' ? 0 : tops[Math.floor(r() * tops.length)];
      days.push(pl.floors(r, top).reduce((s, f) => s + floorIncome(r, f, p, pl.loss), 0));
    }
    const avg = days.reduce((a, b) => a + b, 0) / days.length;
    console.log(`  ${pid.padEnd(8)} ${pl.desc.padEnd(16)} 평균 ${String(Math.round(avg)).padStart(4)} · p50 ${String(quantile(days, 0.5)).padStart(4)} · p90 ${String(quantile(days, 0.9)).padStart(4)} · 올빼미 대비 ${(avg / OWL_DAILY).toFixed(2)}배`);
  }
}
