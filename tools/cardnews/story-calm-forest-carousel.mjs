import { chromium } from './node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = '/Users/uicheol_hwang/calm_forest';
const ASSET = `${ROOT}/tools/cardnews/assets/story`;
const OUT = `${ROOT}/tools/cardnews/out/calm-forest-story`;

const img = (path) => {
  const data = readFileSync(path).toString('base64');
  return `data:image/png;base64,${data}`;
};
const a = (name) => img(`${ASSET}/${name}`);
const report = (path) => img(`${ROOT}/${path}`);

const slides = [
  {
    no: '01',
    kicker: '출발점',
    title: '10년 넘게 한 게임에서 시작된 질문',
    lead: '로드컴플릿의 크루세이더 퀘스트를 아직도 즐겨 합니다.',
    body: '내 캐릭터와 수집 기록,\n다시 돌아갈 공간이 있다는 감각이 좋았습니다.\n\n그때부터 궁금했습니다.\n게임사는 이 경험을 어떻게 운영할까?',
    stats: ['연속 방문 379일', '만난 용사 2,057명', '개인 플레이 기록'],
    image: a('cq-medal.png'),
    foot: '크루세이더 퀘스트 개인 플레이 기록'
  },
  {
    no: '02',
    kicker: '첫 화면',
    title: '처음 만든 로고 화면부터 출발했습니다',
    lead: '고요한 숲은 “나만의 공간을 통한 힐링게임”이라는 작은 문장에서 시작했습니다.',
    body: '로그인, 게스트 체험, 언어 선택 같은\n기본 입구를 먼저 만들었습니다.\n\n그 다음엔 사람들이 실제로 어디서 막히는지 보기로 했습니다.',
    stats: ['첫 로고', '게스트 체험', '로그인', '저장 흐름'],
    image: a('calm-login.png'),
    foot: '고요한 숲 첫 로고/로그인 화면'
  },
  {
    no: '03',
    kicker: '첫 개시',
    title: '처음 공개한 화면은 솔직히 많이 투박했습니다',
    lead: '고요한 숲의 첫 화면은 하고 싶은 말보다 어색함이 먼저 보였습니다.',
    body: '그래도 일단 공개해야 한다고 생각했습니다.\n\n사람들이 어디서 멈추는지,\n무엇을 헷갈려 하는지 봐야 했으니까요.',
    stats: ['초기 UI', '낮은 안내성', '행동 로그', '첫 공개'],
    image: a('rough-first-build.png'),
    foot: '초기 고요한 숲 플레이 화면'
  },
  {
    no: '04',
    kicker: '홍보',
    title: '국내 커뮤니티에 직접 올렸습니다',
    lead: 'DC인사이드에는 개발 의도와 플레이 링크를 함께 올렸습니다.',
    body: 'itch.io 커뮤니티에도 소개하며\n국내와 해외 유입을 함께 봤습니다.\n\n반응이 폭발적이진 않았지만\n첫 운영 데이터가 생겼습니다.',
    stats: ['DC 조회 1,136', '추천 8', '댓글 5', 'itch 조회 23'],
    image: a('dc-post.png'),
    foot: '국내/해외 홍보 기록'
  },
  {
    no: '05',
    kicker: '그래프 분석 1',
    title: '초기 데이터는 원인보다 한계를 먼저 보여줬습니다',
    lead: '게임 개시부터 8월 말까지의 데이터는 바로 결론을 내리기 어려웠습니다.',
    body: '무행동 기기, 해외 트래픽, 게스트 저장 구조가\n한꺼번에 섞여 있었습니다.\n\n이때 배운 건 정답보다 기록 설계였습니다.',
    stats: ['D1 9.1%', '무행동 59%', '무행동 중 해외 83%', '안내문구 클릭 0건'],
    image: report('tools/cardnews/out/linkedin-early-inconclusive-grid-only.png'),
    foot: '초기 데이터: 게임 개시~8월 말'
  },
  {
    no: '06',
    kicker: '베타',
    title: '그래서 베타테스터를 모집했습니다',
    lead: '무행동이 왜 생기는지 숫자만으로는 알 수 없었습니다.',
    body: '그래서 직접 플레이를 부탁하고,\n막힌 지점과 재미있던 지점을 같이 받았습니다.\n\n피드백은 퀘스트, 보상 경제,\n안내 흐름 개선으로 이어졌습니다.',
    stats: ['베타 10명', 'A/B 5명씩', '가설 8개', '개선 후보 정리'],
    image: a('beta-feedback-table.png'),
    foot: '베타 피드백 정리'
  },
  {
    no: '07',
    kicker: '베타',
    title: 'A/B 테스트는 결론보다 방향을 줬습니다',
    lead: '5명씩 비교했기 때문에 “무엇이 더 낫다”보다 “무엇을 다시 실험할까”에 집중했습니다.',
    body: 'A는 활동 폭,\nB는 긴 세션 쪽에서 다른 신호가 보였습니다.\n\n작은 표본이었지만\n다음 개선 우선순위를 정하는 데 충분했습니다.',
    stats: ['A/B 비교', '세션 관찰', '스트릭', '다음 개선'],
    image: a('beta-monitor.png'),
    foot: '베타 운영 모니터'
  },
  {
    no: '08',
    kicker: '개선',
    title: '피드백을 바탕으로 화면과 흐름을 다시 고쳤습니다',
    lead: '튜토리얼, 지도, 퀘스트 안내, 도감 같은 기본 흐름을 더 잘 보이게 바꿨습니다.',
    body: '처음엔 “무엇을 해야 하지?”가 먼저였다면,\n\n개선 후에는 유저가 갈 곳과 할 일을\n더 빨리 찾게 만드는 데 집중했습니다.',
    stats: ['튜토리얼 개선', '지도 노출', '퀘스트 안내', '도감 추가'],
    image: a('improved-build.png'),
    foot: '개선 후 고요한 숲 플레이 화면'
  },
  {
    no: '09',
    kicker: '출시와 운영',
    title: '앱-인토스 출시 후 DAU가 늘었습니다',
    lead: '앱-인토스에 고요한 숲을 올렸고, 첫 리뷰와 평가가 생겼습니다.',
    body: '출시 이후에는 유저가 초반에 얼마나 많은 활동을 했는지\n더 보고 싶어졌습니다.\n\n그래서 다음 질문은\n리텐션과 행동 밀도로 이어졌습니다.',
    stats: ['평점 5.0', '평가 5개', { text: '평균 DAU 1-2명 → 7-8명으로 개선', wide: true }],
    image: a('app-in-toss.png'),
    foot: '앱-인토스 출시 화면'
  },
  {
    no: '10',
    kicker: '그래프 분석 2',
    title: '그다음엔 행동 밀도와 리텐션을 봤습니다',
    lead: '“왜 떠났나?”보다 “어떤 초반 행동이 다시 올 가능성과 가까운가?”를 봤습니다.',
    body: '초반 행동 밀도가 높은 그룹은\n이후에도 의미 있는 행동을 할 가능성이 더 높아 보였습니다.\n\n확정 결론이 아니라\n다음 실험의 힌트로 읽었습니다.',
    stats: ['고밀도 34.5%', '저밀도 3.0%', '기기 95대', '양성 12대'],
    charts: true,
    foot: '리텐션/초반 행동 밀도/모델 후보'
  },
  {
    no: '11',
    kicker: '다음 질문',
    title: '이제 운영은 감상이 아니라 실험이 됐습니다',
    lead: '좋은 지표는 사람을 숫자로 줄이는 게 아니라, 다음에 더 잘 대할 방법을 알려줍니다.',
    body: '첫 로고와 투박한 공개 화면에서 시작해\n피드백, 개선, 출시, DAU 관찰까지 왔습니다.\n\n다음 목표는 사람들이 다시 오고 싶은 이유를\n계속 만드는 것입니다.',
    stats: ['피드백', '출시', '밀도 분석', '모델링'],
    image: a('calm-cafe.png'),
    foot: '고요한 숲 다음 운영 질문'
  }
];

const css = `
  :root {
    --ink:#17201c; --muted:#607067; --line:#dbe6dd; --paper:#fbfcf8;
    --green:#28745c; --green2:#dff1e6; --black:#101519;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; width:1080px; height:1350px; overflow:hidden;
    background:var(--paper); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;
    letter-spacing:0;
  }
  .slide {
    width:1080px; height:1350px; padding:42px 48px;
    display:grid; grid-template-rows:auto 700px auto auto; gap:18px;
  }
  header {
    display:grid; grid-template-columns:1fr auto; gap:24px; align-items:start;
    border-bottom:2px solid var(--line); padding-bottom:18px;
  }
  .eyebrow { color:var(--green); font-size:22px; font-weight:850; margin-bottom:8px; }
  h1 { margin:0; font-size:48px; line-height:1.08; font-weight:900; word-break:keep-all; }
  .num {
    width:84px; height:84px; border-radius:8px; border:1px solid var(--line);
    background:white; display:flex; align-items:center; justify-content:center;
    color:var(--green); font-size:34px; font-weight:900;
  }
  .visual {
    min-height:0; border:1px solid var(--line); border-radius:8px; overflow:hidden;
    background:#f4f7f2; display:flex; align-items:center; justify-content:center;
  }
  .visual img {
    width:100%; height:100%; object-fit:contain; display:block;
  }
  .copy {
    display:grid; grid-template-columns:395px 1fr; gap:22px; align-items:stretch;
  }
  .lead {
    background:#11161a; color:white; border-radius:8px; padding:20px 22px;
    font-size:23px; line-height:1.42; font-weight:800; word-break:keep-all;
    display:flex; align-items:center;
  }
  .body-copy {
    background:white; border:1px solid var(--line); border-radius:8px; padding:20px 24px;
    color:#2b3832; font-size:20px; line-height:1.55; font-weight:700; word-break:keep-all;
    display:flex; align-items:center;
  }
  .text-stack {
    width:100%; display:grid; gap:16px;
  }
  .lead .text-stack {
    gap:12px;
  }
  .text-stack p {
    margin:0;
  }
  .stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
  .stat {
    min-height:72px; background:var(--green2); border:1px solid #c6e2d0; border-radius:8px;
    padding:14px; color:var(--green); font-size:20px; line-height:1.18; font-weight:900;
    display:flex; align-items:center; justify-content:center; text-align:center; word-break:keep-all;
  }
  .stat.wide {
    grid-column:span 2;
  }
  .chart-grid {
    width:100%; height:100%; padding:18px;
    display:grid; grid-template-columns:1fr 1fr; gap:14px;
    background:white;
  }
  .chart-card {
    min-height:0; background:white; border:1px solid var(--line); border-radius:8px;
    padding:16px 18px; display:grid; grid-template-rows:auto 1fr auto; gap:8px;
  }
  .chart-head { display:flex; justify-content:space-between; gap:16px; align-items:start; }
  .chart-title { font-size:21px; line-height:1.15; font-weight:900; color:#183027; }
  .chart-note { font-size:15px; line-height:1.2; font-weight:800; color:var(--green); text-align:right; }
  .mini-svg { width:100%; height:100%; min-height:170px; display:block; }
  .mini-svg text { font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; }
  .bars { display:flex; align-items:end; gap:34px; padding:10px 10px 4px; border-bottom:2px solid #cfdcd3; }
  .bar-wrap { flex:1; display:grid; grid-template-rows:1fr auto; gap:8px; height:100%; }
  .bar {
    align-self:end; min-height:8px; border-radius:6px 6px 0 0; background:#d16555;
    display:flex; justify-content:center; align-items:start; padding-top:8px;
    color:white; font-size:18px; font-weight:900;
  }
  .bar.alt { background:#76634f; }
  .bar-label { text-align:center; font-size:16px; line-height:1.15; font-weight:800; color:#53635b; }
  .line-chart { position:relative; padding:30px 24px 20px; display:grid; align-items:center; }
  .axis { position:absolute; left:24px; right:24px; top:50%; height:2px; background:#cfddd3; }
  .point {
    position:absolute; width:18px; height:18px; margin:-9px 0 0 -9px; border-radius:50%;
    background:#28745c; box-shadow:0 0 0 8px rgba(40,116,92,.14);
  }
  .point.low { left:18%; top:70%; background:#76634f; }
  .point.high { left:78%; top:30%; background:#d16555; }
  .point-label {
    position:absolute; font-size:18px; font-weight:900; color:#183027; white-space:nowrap;
  }
  .point-label.low { left:8%; top:74%; }
  .point-label.high { right:6%; top:20%; color:#b9483d; }
  .hbars { display:grid; align-content:center; gap:18px; padding:8px 0; }
  .hbar-row { display:grid; grid-template-columns:88px 1fr 58px; gap:12px; align-items:center; }
  .hbar-name { font-size:17px; font-weight:900; color:#53635b; }
  .hbar-track { height:20px; border-radius:99px; background:#e8f1eb; overflow:hidden; }
  .hbar-fill { height:100%; border-radius:99px; background:#28745c; }
  .hbar-value { font-size:18px; font-weight:900; color:#183027; text-align:right; }
  .chart-caption { color:#5c6d64; font-size:16px; line-height:1.28; font-weight:750; word-break:keep-all; white-space:pre-line; }
  .foot {
    border-top:1px solid var(--line); padding-top:14px;
    display:flex; justify-content:space-between; gap:20px; color:var(--muted);
    font-size:17px; line-height:1.35; font-weight:700;
  }
  .brand { color:var(--green); font-weight:900; }
`;

function paragraphs(text) {
  return `<div class="text-stack">${text
    .split('\n\n')
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
}

function slideHtml(slide) {
  const stats = slide.stats
    .map((s) => {
      const item = typeof s === 'string' ? { text: s } : s;
      return `<div class="stat${item.wide ? ' wide' : ''}">${item.text}</div>`;
    })
    .join('');
  const visual = slide.charts ? `
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-head"><div class="chart-title">1. 첫날 행동 폭</div><div class="chart-note">국내 유입 비교</div></div>
        <svg class="mini-svg" viewBox="0 0 420 210" role="img">
          <line x1="48" y1="24" x2="48" y2="172" stroke="#cfdcd3" stroke-width="2"/>
          <line x1="48" y1="172" x2="394" y2="172" stroke="#cfdcd3" stroke-width="2"/>
          <line x1="48" y1="98" x2="394" y2="98" stroke="#edf2ee" stroke-width="1"/>
          <rect x="105" y="102" width="86" height="70" rx="5" fill="#7b674f"/>
          <rect x="250" y="24" width="86" height="148" rx="5" fill="#d16555"/>
          <text x="148" y="93" text-anchor="middle" font-size="20" font-weight="900" fill="#7b674f">17.2%</text>
          <text x="293" y="18" text-anchor="middle" font-size="20" font-weight="900" fill="#d16555">36.4%</text>
          <text x="148" y="198" text-anchor="middle" font-size="16" font-weight="800" fill="#53635b">9/4</text>
          <text x="293" y="198" text-anchor="middle" font-size="16" font-weight="800" fill="#53635b">9/10</text>
        </svg>
        <div class="chart-caption">첫날 의미 있는 행동을 한 국내 기기 비율이 캠페인별로 달랐습니다.</div>
      </div>
      <div class="chart-card">
        <div class="chart-head"><div class="chart-title">2. 초반 행동 밀도</div><div class="chart-note">후속 행동률</div></div>
        <svg class="mini-svg" viewBox="0 0 420 210" role="img">
          <line x1="48" y1="24" x2="48" y2="172" stroke="#cfdcd3" stroke-width="2"/>
          <line x1="48" y1="172" x2="394" y2="172" stroke="#cfdcd3" stroke-width="2"/>
          <line x1="48" y1="98" x2="394" y2="98" stroke="#edf2ee" stroke-width="1"/>
          <rect x="105" y="159" width="86" height="13" rx="5" fill="#7b674f"/>
          <rect x="250" y="24" width="86" height="148" rx="5" fill="#d16555"/>
          <text x="148" y="151" text-anchor="middle" font-size="20" font-weight="900" fill="#7b674f">3.0%</text>
          <text x="293" y="18" text-anchor="middle" font-size="20" font-weight="900" fill="#d16555">34.5%</text>
          <text x="148" y="198" text-anchor="middle" font-size="16" font-weight="800" fill="#53635b">저밀도</text>
          <text x="293" y="198" text-anchor="middle" font-size="16" font-weight="800" fill="#53635b">고밀도</text>
        </svg>
        <div class="chart-caption">초반 행동이 촘촘한 그룹에서 이후 행동률이 더 높았습니다.</div>
      </div>
      <div class="chart-card">
        <div class="chart-head"><div class="chart-title">3. 탐색 깊이</div><div class="chart-note">재방문 후보</div></div>
        <svg class="mini-svg" viewBox="0 0 420 210" role="img">
          <line x1="48" y1="172" x2="394" y2="172" stroke="#cfdcd3" stroke-width="2"/>
          <line x1="48" y1="124" x2="394" y2="124" stroke="#edf2ee" stroke-width="1"/>
          <line x1="48" y1="76" x2="394" y2="76" stroke="#edf2ee" stroke-width="1"/>
          <polyline points="75,148 140,136 205,106 270,83 345,57" fill="none" stroke="#28745c" stroke-width="5" stroke-linecap="round"/>
          <circle cx="75" cy="148" r="8" fill="#7b674f"/>
          <circle cx="345" cy="57" r="9" fill="#d16555"/>
          <text x="75" y="184" text-anchor="middle" font-size="15" font-weight="800" fill="#53635b">얕은 탐색</text>
          <text x="345" y="42" text-anchor="middle" font-size="17" font-weight="900" fill="#d16555">깊은 탐색</text>
        </svg>
        <div class="chart-caption">초반에 얼마나 많은 활동을 했는지가 이후 행동을 읽는 데 더 설명력이 있었습니다.</div>
      </div>
      <div class="chart-card">
        <div class="chart-head"><div class="chart-title">4. 모델 후보 비교</div><div class="chart-note">해석 보조</div></div>
        <svg class="mini-svg" viewBox="0 0 420 210" role="img">
          <line x1="128" y1="56" x2="338" y2="56" stroke="#edf2ee" stroke-width="16" stroke-linecap="round"/>
          <line x1="128" y1="56" x2="312" y2="56" stroke="#7b674f" stroke-width="16" stroke-linecap="round"/>
          <line x1="128" y1="120" x2="338" y2="120" stroke="#edf2ee" stroke-width="16" stroke-linecap="round"/>
          <line x1="128" y1="120" x2="320" y2="120" stroke="#28745c" stroke-width="16" stroke-linecap="round"/>
          <text x="24" y="62" font-size="17" font-weight="900" fill="#53635b">Raw</text>
          <text x="24" y="126" font-size="17" font-weight="900" fill="#53635b">Refined</text>
          <text x="390" y="62" text-anchor="end" font-size="19" font-weight="900" fill="#183027">0.883</text>
          <text x="390" y="126" text-anchor="end" font-size="19" font-weight="900" fill="#183027">0.914</text>
        </svg>
        <div class="chart-caption">모델은 결론을 대신하기보다 다음 실험 후보를 고르는 보조 도구로 썼습니다.</div>
      </div>
    </div>` : `<img src="${slide.image}" />`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
    <style>${css}</style></head><body>
    <main class="slide">
      <header>
        <div><div class="eyebrow">${slide.kicker}</div><h1>${slide.title}</h1></div>
        <div class="num">${slide.no}</div>
      </header>
      <section class="visual">${visual}</section>
      <section class="copy">
        <div class="lead">${paragraphs(slide.lead)}</div>
        <div class="body-copy">${paragraphs(slide.body)}</div>
      </section>
      <section class="stats">${stats}</section>
      <footer class="foot"><span><span class="brand">calm forest</span> 개발/분석 기록</span><span>${slide.foot}</span></footer>
    </main>
  </body></html>`;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

for (const slide of slides) {
  await page.setContent(slideHtml(slide), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = resolve(OUT, `${slide.no}.png`);
  await page.screenshot({ path: out });
  console.log(out);
}

await browser.close();
