import { stepView } from './rules.js';

export function minerCard(delve, inv, inCave) {
  if (!inCave) return null;
  const v = stepView(delve, inv);
  if (!v) return null;
  return { id: 'delve_miner', name: '광부 아저씨', title: `⛏️ ${v.title}`, desc: v.desc, how: '⛏️ 동굴 0층 승강기 옆 광부 아저씨에게 가요', progress: v.progress, target: v.target, ready: v.ready };
}

export function shouldStartLine(delve, tutorialDone) {
  return tutorialDone && !delve.started;
}
