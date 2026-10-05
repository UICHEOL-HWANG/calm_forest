export const COPY = {
  lookIn: '🔭 별 보기',
  title: '🔭 북두칠성',            // 렌즈 HUD 기본(별자리 없이 열렸을 때) — 실제로는 starCopy(id).title
  subtitle: '봄 하늘 · ★1',
  tapGuide: '빛과 링이 별에 닿을 때 탭!',
  perfect: '딱 좋아요!',
  good: '좋아요',
  miss: '놓쳤어요',
  missEarly: '빨랐어요',   // 놓친 이유 — 판정 시각보다 먼저 누름
  missLate: '늦었어요',    //            늦게 누르거나 안 누름
  complete: '북두칠성을 그렸어요!',
  fail: '아깝다! 다시 이어 볼까요?',
  close: '닫기',
  combo: '콤보',
  reward: '보상',
  rewardDone: '오늘 보상은 받았어요 · 내일 또 와요',   // 같은 날 다시 성공 — 보상 줄 대신
  result: '결과',
  // 🌌 별자리 수첩·해금 — 문구 묶음 1 검수, 수첩 진행·잠김·첫 별자리 문구는 사용자 수정(2026-10-05)
  bookTitle: '🔭 별자리 수첩',
  bookProgress: '{0} / {1} 가지 별자리를 그렸어요 원하는 별자리를 골라주세요!',
  bookLocked: '이전 별자리를 이어주면 열려요!',
  bookBest: '✓ 그렸어요 · 최고 {0}점',
  bookNew: '첫 별자리',
  unlockToast: '✨ 새 별자리가 보여요 · {0}',
  firstClear: '처음 그렸어요 +{0}🪙',
};

// 별자리별 이름·부제·완주 문구 — 조사(을/를)가 이름마다 달라 문장째 둔다(i18n 글루 함정 회피)
export const STAR_COPY = {
  big_dipper: { name: '북두칠성', subtitle: '봄 하늘 · ★1', complete: '북두칠성을 그렸어요!' },
  cassiopeia: { name: '카시오페이아', subtitle: '가을 하늘 · ★1', complete: '카시오페이아를 그렸어요!' },
  pegasus: { name: '페가수스', subtitle: '가을 하늘 · ★2', complete: '페가수스를 그렸어요!' },
  leo: { name: '사자자리', subtitle: '봄 하늘 · ★2', complete: '사자자리를 그렸어요!' },
  orion: { name: '오리온', subtitle: '겨울 하늘 · ★3', complete: '오리온을 그렸어요!' },
  scorpius: { name: '전갈자리', subtitle: '여름 하늘 · ★3', complete: '전갈자리를 그렸어요!' },
};
export const starCopy = id => STAR_COPY[id] || STAR_COPY.big_dipper;
export const fill = (s, ...a) => a.reduce((out, v, i) => out.replace(`{${i}}`, v), s);
