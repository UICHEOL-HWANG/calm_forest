import { stepView, jobFor } from './rules.js';

export function minerCard(delve, inv, inCave) {
  if (!inCave) return null;
  const v = stepView(delve, inv);
  if (!v) return null;
  return { id: 'delve_miner', name: '광부 아저씨', title: `⛏️ ${v.title}`, desc: v.desc, how: '⛏️ 동굴 0층 승강기 옆 광부 아저씨에게 가요', progress: v.progress, target: v.target, ready: v.ready };
}

export function shouldStartLine(delve, tutorialDone) {
  return tutorialDone && !delve.started;
}

export function jobCard(delve, inv, inCave, date, progress) {
  if (!inCave || delve.stage < 8 || delve.jobDate === date) return null;
  const j = jobFor(date);
  const desc = j.kind === 'ore' ? `⛏️ 지하 ${j.floorMin}층 이하에서 광석 ${j.n}개` : `🐛 굴에서 되찾기 ${j.n}번`;
  return { id: 'delve_job', name: '광부 아저씨', title: '⛏️ 오늘의 갱도 일감', desc, how: '⛏️ 끝나면 광부 아저씨에게 가요', progress: Math.min(progress, j.n), target: j.n, ready: progress >= j.n };
}
