const WEATHER_NAME = { clear: '맑음', rain: '비', snow: '눈' };

export function nextFogOffset(weatherAt, maxDays = 60) {
  for (let d = 1; d <= maxDays; d++) if (weatherAt(d) === 'fog') return d;
  return null;
}

export function gemFogBanner(weather, fogOffset, dateOf) {
  if (weather === 'fog') return null;
  const today = `오늘은 ${WEATHER_NAME[weather] || WEATHER_NAME.clear}`;
  let line = '';
  if (fogOffset === 1) line = `${today} · 내일 안개 예보예요`;
  else if (fogOffset) {
    const [, m, d] = dateOf(fogOffset).split('-').map(Number);
    line = `${today} · 다음 안개 ${m}월 ${d}일`;
  }
  return { ico: '💎', title: '보석은 🌫️ 안개 낀 날에만 반짝여요', line };
}
