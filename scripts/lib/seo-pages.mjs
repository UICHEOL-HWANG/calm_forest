export const SITE = 'https://calmforest.cloud';
export const OG_IMAGE = `${SITE}/preview.jpg?v=20261006`;
export const KEYWORDS = ['고요한 숲', 'calm forest', '힐링 게임', '브라우저 게임', '농사 게임', '낚시 게임', '3D 마을 꾸미기', '무료 웹게임'];

export const SAME_AS = Object.freeze([
  'https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest',
  'https://apps.apple.com/app/id6821420691',
  'https://cheorish.itch.io/calmforest',
  'https://www.threads.com/@calm.forest.official',
  'https://www.instagram.com/calm.forest.official/',
  'https://litt.ly/calmforest',
]);

export const SEO_PAGES = Object.freeze([
  { path: '/', src: ['index.html'], title: '고요한 숲 · 설치 없이 하는 3D 힐링 농장 게임', description: '포근한 로우폴리 3D 힐링 마을 게임이에요. 걷고, 농사짓고, 낚시하고, 집을 짓고 꾸며요. 설치 없이 브라우저에서 바로, 안드로이드·iOS 앱으로도 할 수 있어요.' },
  { path: '/guide/', src: ['guide/guide.html'], lang: 'ko', title: '초보자 안내서 · 고요한 숲', description: '처음 30분을 실제 플레이 화면으로 짚어드려요. 나무 베기, 농사, 집짓기, 낚시, 주민 의뢰까지 한 번에.' },
  { path: '/guide/en/', src: ['guide/guide-en.html'], lang: 'en', title: "Beginner's Guide · calm forest", description: 'Your first 30 minutes in calm forest, with real screenshots: chopping, farming, building, fishing and villager requests.' },
  { path: '/shop', src: ['pages/shop.template.html', 'js/cosmetics/catalog.js'], file: 'shop.html', store: true, title: '가격 안내 · 고요한 숲', description: '고요한 숲 프리미엄 꾸미기 가격표. 겉모습만 바꾸는 현금 전용 아이템이며 게임 진행에 유리한 효과는 없어요.' },
  { path: '/privacy', src: ['pages/privacy.html'], file: 'privacy.html', title: '개인정보처리방침 · 고요한 숲', description: '고요한 숲이 수집하는 정보와 이용 목적, 보관 기간, 삭제 방법을 안내합니다.' },
  { path: '/terms', src: ['pages/terms.html'], file: 'terms.html', store: true, title: '이용약관 · 고요한 숲', description: '고요한 숲 서비스와 유료 아이템 이용에 관한 약관입니다.' },
  { path: '/refund', src: ['pages/refund.html'], file: 'refund.html', store: true, title: '환불 정책 · 고요한 숲', description: '고요한 숲 프리미엄 아이템의 환불 조건과 신청 방법을 안내합니다.' },
]);

export const pageOf = (path) => SEO_PAGES.find(p => p.path === path);
