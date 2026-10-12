// =============================================================
//  calm forest · 🔔 푸시 — 오늘 누구에게 무엇을 보낼지(순수)
//  ------------------------------------------------------------
//  유저당 하루 1통. 우선순위 🦝 밤손님 예고 > 🔥🫙 가공 완료 > 🌱 복귀.
//  "돌아올 이유가 실제로 있는 날"에만 보낸다 — 이유 없는 날은 조용히(힐링 톤).
//  날짜는 KST 기준(세이브의 날짜는 기기 로컬이지만 1차 유저는 한국).
//  row 는 push_candidates RPC 한 줄(sql/migrations/migrate_push_tokens.sql).
//  (테스트: node --test tests/push-pick.test.mjs)
// =============================================================
import { isReady, stationOf } from '../../js/craft/slots.js';
import { blockedAnimals } from '../../js/duel/truce.js';
import { computeNightDefense } from '../../js/duel/night-defense.js';

const KST_MS = 9 * 3600 * 1000;
const DAY_MS = 86400000;
const RETURN_AFTER_DAYS = 3;     // 이만큼 안 들어오면 🌱
const RETURN_MAX_7D = 2;         // 🌱 는 7일에 2번까지
const GIVE_UP_DAYS = 30;         // 한 달 넘게 떠난 사람에겐 더 보내지 않는다

const ymd = ms => new Date(ms).toISOString().slice(0, 10);

/** now(UTC ms) → KST 날짜들 + 오늘 KST 0시의 UTC ms */
export function kstDates(now) {
  const k = now + KST_MS;
  const todayStartMs = Math.floor(k / DAY_MS) * DAY_MS - KST_MS;
  return { today: ymd(k), yesterday: ymd(k - DAY_MS), tomorrow: ymd(k + DAY_MS), todayStartMs };
}

const sprouting = plots => (Array.isArray(plots) ? plots : []).filter(p => p && (p.state === 'growing' || p.state === 'mature'));

/** 🦝 판정 입력(judgeNight 에 그대로) — 대상이 아니면 null.
 *  ⚠️ 오늘 접속한 사람(night_last === 오늘)만. 클라이언트는 lastDate !== 접속일이면 **접속한 그날 날짜**로
 *     판정하므로(js/spaces/night-visit.js resolveNightVisit), 오늘 안 들어온 사람은 오늘 밤 접속하면
 *     오늘 날짜로 판정돼 예고(내일 날짜 판정)와 어긋난다. 오늘 들어온 사람의 다음 판정은 확실히 내일이다.
 *  date 는 그 내일 — 휴전 만료 비교에도 쓴다. */
export function nightInput(row, date, dates) {
  const cands = sprouting(row.plots);
  if (!cands.length || !row.night_last || row.night_last !== dates?.today) return null;
  const { scarecrow, fence } = computeNightDefense(cands, row.outdoor);
  return { plotCount: cands.length, scarecrow, fence, blocked: blockedAnimals(row.truce, date) };
}

/** → { kind:'night' } | { kind:'craft', stations } | { kind:'return' } | null
 *  night: 이 유저의 judgeNight 결과(대상이 아니면 null) */
export function pickPush(row, dates, night) {
  const lastMs = Date.parse(row.updated_at) || 0;
  const awayDays = (dates.todayStartMs + DAY_MS - lastMs) / DAY_MS;   // 오늘 자정 기준 경과일
  if (awayDays > GIVE_UP_DAYS) return null;

  if (night?.visited) return { kind: 'night' };

  // 🔥🫙 어젯밤 넣은 것만 — 며칠 묵은 완성품으로 매일 울리지 않는다. 오늘 이미 들어왔으면 게임에서 봤다.
  if (lastMs < dates.todayStartMs) {
    const ready = (row.craft?.slots || []).filter(s => s?.day === dates.yesterday && isReady(s, dates.today));
    const stations = [...new Set(ready.map(s => stationOf(s.item)).filter(Boolean))].sort();
    if (stations.length) return { kind: 'craft', stations };
  }

  if (awayDays >= RETURN_AFTER_DAYS && sprouting(row.plots).length && (row.returns_7d | 0) < RETURN_MAX_7D) {
    return { kind: 'return' };
  }
  return null;
}

const STATION = {
  ko: { kiln: ['🔥', '화덕'], vat: ['🫙', '발효통'] },
  en: { kiln: ['🔥', 'kiln'], vat: ['🫙', 'vat'] },
};

/** 확정 문구(2026-10-12 사용자 검수) — lang 은 'ko' | 'en' */
export function messageFor(pick, lang = 'ko') {
  const en = lang === 'en';
  if (pick.kind === 'night') {
    return en ? { title: '🌙 Something feels off at the farm', body: 'Someone might visit tonight.' }
              : { title: '🌙 밭이 조금 수상해요', body: '오늘 밤 누군가 찾아올지도 몰라요.' };
  }
  if (pick.kind === 'craft') {
    const st = (pick.stations || ['kiln']).map(s => STATION[en ? 'en' : 'ko'][s] || STATION.ko.kiln);
    const ico = st.map(s => s[0]).join('');
    if (en) return { title: `${ico} Your ${st.map(s => s[1]).join(' & ')} is done`, body: 'Come pick it up 🌿' };
    return { title: `${ico} ${st.map(s => s[1]).join('·')}에 넣어 둔 게 다 됐어요`, body: '꺼내러 와 주세요 🌿' };
  }
  return en ? { title: '🍓 There might be something to harvest', body: 'The forest is quietly waiting.' }
            : { title: '🍓 수확할 게 생겼을지도 몰라요', body: '숲이 조용히 기다리고 있어요.' };
}
