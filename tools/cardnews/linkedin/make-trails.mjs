// 레퍼런스(다크 네온 광선)를 SVG 로 재현한다. 왼쪽에서 수평으로 들어와 무릎에서 꺾여
// 오른쪽 위로 빠져나가는 평행 궤적 다발. 카드마다 transform/opacity 로만 변주한다.
import { writeFileSync } from 'node:fs';

const W = 1080, H = 780, N = 22;
const HUES = ['#8B5CF6', '#E84A9E', '#4F6BFF', '#3BC9F0', '#FF6FA5', '#6D5BFF'];
const lines = [];

for (let i = 0; i < N; i++) {
  const t = i / (N - 1);
  const y0 = 250 + t * 520;
  const knee = 90 + Math.pow(t, 0.7) * 520;
  const run = W + 90 - knee;
  const y1 = y0 - run * 0.66;
  const c = i % 7 === 3 ? '#EAF2FF' : HUES[i % HUES.length];
  const w = (0.9 + (1 - Math.abs(t - 0.55) * 1.6) * 2.2).toFixed(2);
  const o = (0.30 + (1 - Math.abs(t - 0.6)) * 0.55).toFixed(2);
  const d = `M -80 ${y0.toFixed(1)} H ${knee.toFixed(1)} Q ${(knee + 70).toFixed(1)} ${y0.toFixed(1)} ${(knee + 120).toFixed(1)} ${(y0 - 79).toFixed(1)} L ${(W + 90).toFixed(1)} ${y1.toFixed(1)}`;
  lines.push({ d, c, w, o });
}

const body = lines.map(l =>
  `    <path d="${l.d}" stroke="${l.c}" stroke-width="${l.w}" opacity="${l.o}" fill="none" stroke-linecap="round"/>`
).join('\n');

writeFileSync('assets/trails.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#glow)" opacity="0.55">
${body}
  </g>
  <g>
${body}
  </g>
</svg>
`);
console.log('assets/trails.svg 생성 —', N, '개 궤적');
