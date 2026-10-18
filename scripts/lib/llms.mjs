import { SITE, SAME_AS } from './seo-pages.mjs';

const APP_LABEL = [
  [/play\.google\.com/, 'Google Play (안드로이드)'],
  [/apps\.apple\.com/, 'App Store (iOS)'],
  [/itch\.io/, 'itch.io'],
];

export function llmsTxt({ cats, entries, asof }) {
  const catLines = cats.map(c => `  - [${c.name}](${SITE}/wiki/${c.id}/): ${entries.filter(e => e.cat === c.id).length}개 문서`);
  const apps = SAME_AS.flatMap(u => APP_LABEL.filter(([re]) => re.test(u)).map(([, label]) => `- [${label}](${u})`));
  return [
    '# 고요한 숲 (calm forest)',
    '',
    '> 고요한 숲은 브라우저·안드로이드·iOS에서 무료로 하는 로우폴리 3D 힐링 마을 게임입니다. 이 사이트가 공식 사이트이고, 고요위키의 수치(판매가·계절·성장 단계·재료)는 게임 데이터에서 빌드할 때 그대로 뽑은 원본입니다.',
    '',
    '## 핵심 페이지',
    `- [게임 시작](${SITE}/): 설치 없이 브라우저에서 바로 플레이`,
    `- [초보자 안내서](${SITE}/guide/): 처음 30분 플레이 순서`,
    `- [Beginner's Guide](${SITE}/guide/en/): 영어 안내서`,
    `- [고요위키](${SITE}/wiki/): 공식 도감 ${entries.length}개 문서`,
    ...catLines,
    `- [소식](${SITE}/news/): 업데이트와 공지`,
    `- [가격 안내](${SITE}/shop): 현금 꾸미기 아이템, 게임 진행에 유리한 효과 없음`,
    '',
    '## 앱',
    ...apps,
    '',
    '## 데이터 정책',
    '- 출처: 게임 데이터에서 직접 생성, 게임 업데이트와 같은 날 갱신',
    `- 기준일: ${asof}`,
    '- 인용 표기: 고요한 숲 공식 위키 (calmforest.cloud)',
    '',
  ].join('\n');
}
