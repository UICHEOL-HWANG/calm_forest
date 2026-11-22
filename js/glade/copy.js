export const NIGHT_BANNER = Object.freeze({
  stream: { title: '무리 지어 도는 밤', line: '반디들이 한 줄기로 돌아요. 길목에서 기다려 보세요' },
  low: { title: '낮게 내려앉은 밤', line: '반디가 낮고 느리게 날아요. 잡기 쉬운 밤이에요' },
});

export const MONO_BANNER = Object.freeze({
  yellow: { title: '노랑빛 밤', line: '오늘 밤은 노랑반디가 가득해요' },
  blue: { title: '푸른빛 밤', line: '오늘 밤은 푸른반디가 가득해요' },
  green: { title: '초록빛 밤', line: '오늘 밤은 초록반디가 가득해요' },
  petal: { title: '꽃잎빛 밤', line: '오늘 밤은 꽃잎반디가 가득해요' },
  ember: { title: '불씨빛 밤', line: '오늘 밤은 불씨반디가 가득해요' },
  amber: { title: '단풍빛 밤', line: '오늘 밤은 단풍반디가 가득해요' },
  frost: { title: '눈꽃빛 밤', line: '오늘 밤은 눈꽃반디가 가득해요' },
});

export const SWARM_BANNER = Object.freeze({ title: '큰 반디가 꼬마들을 데리고 왔어요', line: '맨 뒤 꼬마부터 밝아질 때 차례로 잡아 보세요' });

export const stringBanner = (step, total, next) => ({
  title: `줄등 ${step}번째 칸이 켜졌어요`,
  line: next ? `지금까지 ${total}마리, 다음 칸은 ${next}마리` : '줄등이 계곡을 한 바퀴 둘렀어요',
});

export const catchText = (ico, name, bugs) => `+${bugs} ${ico} ${name}`;
export const comboText = (ico, name, n, max) => `+1 ${ico} ${name} · 연속 ${n}/${max}`;
export const perfectText = (ico, name, bugs) => `+${bugs} ${ico} ${name} · 차례를 다 지켰어요`;
