// 🕛 KST(한국 시간) 날짜 'YYYY-MM-DD' — 보드(오늘의 대어·오늘의 뱃길)가 KST 하루로 센다.
//   ⚠️ new Date().toISOString() 은 UTC 날짜다. KST 00:00~09:00 기록이 '어제' 로 저장돼
//      오늘 보드에서 빠진 사고(2026-09-25 00:34 방어 10.4kg). 한국은 서머타임이 없어 +9 고정.
export function kstDate(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
