// js/plaza/copy.js — 🌾 광장 문구(2026-09-27 사용자 확정, 전부 A안). 한국어 원문 = i18n 키
//   {0}{1}{2} 자리는 js/i18n-en.js 에 '{0}' 패턴 키로 등록돼 있다(tests/plaza-copy.test.mjs 가 영어 잔존을 잠근다)
import { PLAZA_ITEMS, PLAZA_TIERS, PLAZA_STAGE_NAMES } from '../data/plaza.js';

export const PLAZA_COPY = {
  prompt: { box: '🌾 광장에 보태기', stall: '🍂 수확제 좌판', plaque: '🌾 광장 명판 보기' },
  title: '🌾 수확제 광장 짓기',
  subtitle: '{0}단계 · {1} — 다 같이 {2}%',
  todayLeft: '오늘 {0}개 더 보탤 수 있어요',
  buttons: ['+1', '+5', '있는 만큼'],
  toast: {
    ok: '{0} {1}개를 보탰어요! 🍂+{1}',
    cap: '오늘은 여기까지! 내일 또 보태 주세요 🌙',
    need: '이 재료는 벌써 다 모였어요!',
    full: '광장이 다 지어졌어요 🎉',
    season: '수확제 기간이 아니에요',
    offline: '연결이 불안정해요. 잠시 뒤 다시 해 주세요 (재료는 그대로예요)',
    upstream: '연결이 불안정해요. 잠시 뒤 다시 해 주세요 (재료는 그대로예요)',
    qty: '연결이 불안정해요. 잠시 뒤 다시 해 주세요 (재료는 그대로예요)',
    auth: '로그인하면 함께 지을 수 있어요',
  },
  nextTier: '{0} {1}까지 {2}개',
};

export const fill = (s, ...a) => a.reduce((acc, v, i) => acc.replaceAll(`{${i}}`, String(v)), s);

export function toastText(key, item, n) {
  const it = PLAZA_ITEMS[item];
  return fill(PLAZA_COPY.toast[key] || PLAZA_COPY.toast.offline, it ? `${it.ico} ${it.name}` : '', n);
}

// 현재 단계 품목 have 합 / need 합 → 반올림 %
export function stagePct(items) {
  const need = items.reduce((s, i) => s + i.need, 0);
  return need > 0 ? Math.round((items.reduce((s, i) => s + Math.min(i.have, i.need), 0) / need) * 100) : 0;
}

export function subtitleText(stage, items) {
  return fill(PLAZA_COPY.subtitle, stage, PLAZA_STAGE_NAMES[stage] || '', stagePct(items));
}

export function nextTierText(nt) {
  const t = nt && PLAZA_TIERS.find(x => x.id === nt.id);
  return t ? fill(PLAZA_COPY.nextTier, t.ico, t.name, nt.left) : '';
}

export function tierLabel(id) {
  const t = PLAZA_TIERS.find(x => x.id === id);
  return t ? `${t.ico} ${t.name}` : '';
}
