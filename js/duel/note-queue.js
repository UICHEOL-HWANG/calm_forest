export const initNoteQueue = () => ({ note: null, shown: false });

export const NOTE_AUTHOR = '농부 삼촌';

export const FALLBACK_NOTES = {
  boar: '멧돼지가 오늘은 한 수 위였네요. 가져간 작물은 숲속 새끼들이랑 나눠 먹을 거예요. 너무 속상해하지 말아요.',
  raccoon: '너구리 녀석, 그릇 섞는 솜씨가 보통이 아니네요. 가져간 작물은 겨울 준비에 쓰려나 봐요. 다음엔 꼭 찾아낼 수 있을 거예요.',
};

export function noteArrived(state, note) {
  return note?.text ? { note, shown: false } : state;
}

export function afterDuel(state, { result, fallback }) {
  if (result !== 'lose' || state.shown) return { state, show: null };
  const note = state.note || (fallback?.text ? fallback : null);
  if (!note) return { state, show: null };
  return { state: { ...state, shown: true }, show: note };
}

export function defenseTip({ scarecrow, fence }) {
  if (!scarecrow) return '🎃 밭 가까이 허수아비를 세워 봐요';
  if (!fence) return '🪵 밭 둘레에 울타리를 4개 이상 둘러 봐요';
  return '🤝 다음에 이기면 당분간 안 와요';
}
