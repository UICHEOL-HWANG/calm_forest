import { PLAZA_ITEMS } from '../data/plaza.js';
import { fill, PLAZA_COPY } from './copy.js';

export const WINTER_COPY = {
  prompt: '❄️ 내 분수에 보태기',
  title: '❄️ 내 분수 짓기',
  subtitle: '{0}단계 · {1}',
  stages: ['', '받침돌 놓기', '아랫단과 기둥', '윗단 올리기', '얼음 분수 완성'],
  myBar: '내 분수',
  yardNote: '다 지으면 내 마당에 꼬마 분수가 생겨요',
  doneNote: '내 분수를 다 지었어요. 시즌이 끝나도 광장에 남아요',
  closed: '겨울 분수 기간이 끝났어요. 내 분수는 그대로 남아요',
  guestLine: '로그인하면 꾸미기 선물도 받아요',
  complete: '❄️ 내 분수를 다 지었어요! 마당 분수를 받았어요',
  completeGuest: '❄️ 내 분수를 다 지었어요! 로그인하면 마당 분수를 받아요',
  stored: '🧺 겨울 선물을 보관함에 넣었어요. 작업대 장식 탭에서 꺼내 놓아요',
  village: {
    title: '마을 등불',
    next: '다음 등불까지 마을 재료 {0}개 남았어요',
    all: '마을 등불이 모두 켜졌어요',
    note: '등불이 켜지면 보탠 분 모두 선물을 받아요',
  },
  lampToast: '🏮 등불 {0}개가 켜졌어요! 선물을 받았어요',
  lampToastGuest: '🏮 등불 {0}개가 켜졌어요! 로그인하면 선물을 받아요',
  fireworks: '🎆 12월 31일, 마을 등불이 모두 켜졌어요',
  banner: { title: '❄️ 겨울 분수를 함께 지어요', line: '광장에서 재료를 보태 내 분수를 지어요' },
  card: { name: '겨울 분수', title: '❄️ 내 분수', desc: '광장 분수에 재료 보태기', how: '광장 분수에서 보태요' },
  toast: {
    ok: '{0} {1}개를 보탰어요!',
    need: '이 재료는 다 모았어요!',
    season: '겨울 분수 기간이 아니에요',
    full: '내 분수를 다 지었어요',
    cap: PLAZA_COPY.toast.cap,
  },
};

export function winterToast(key, item, n) {
  const it = PLAZA_ITEMS[item];
  return fill(WINTER_COPY.toast[key] || PLAZA_COPY.toast.offline, it ? `${it.ico} ${it.name}` : '', n);
}
