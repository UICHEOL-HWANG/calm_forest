import { SNOW_CHAPTER } from '../story/chapters.js';

export const KEEPER_TALK_R = 1.6;
export const KEEPER_PROMPT = '💬 썰매지기에게 말 걸기';

const LINES = {
  guide: ['어서 와요. 산장에서 코코아로 몸부터 녹여요.', '몸이 풀리면 출발대에서 썰매를 타 봐요. 도토리를 주우면 더 빨라져요.'],
  quest: ['세계수 소식 들었어요. 이 산에도 가지가 하나 있는데, 겨우내 얼어 있어요.', '세계수 판에서 ❄️ 눈의 가지 빈터를 따뜻하게 꾸며 줄래요?'],
  thanks: ['창에 불이 다시 켜졌어요. 고마워요.'],
};
const GIFT_LINE = '이 썰매는 세계수 가지로 만든 거예요. 타고 내려가 봐요.';

const snowDone = (s) => !!s?.tree?.branches?.snow?.habitat;

export function keeperStage(s) {
  if (snowDone(s)) return 'thanks';
  return (Number(s?.story?.ch) || 0) === SNOW_CHAPTER ? 'quest' : 'guide';
}

export function keeperLines(stage, { gift = false } = {}) {
  const base = LINES[stage] || LINES.guide;
  return stage === 'thanks' && gift ? [...base, GIFT_LINE] : [...base];
}

export function keeperWantsTalk(s) {
  return keeperStage(s) === 'quest' && !s?.hintsSeen?.keeperQuest;
}
