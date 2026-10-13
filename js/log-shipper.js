// =============================================================
//  calm forest · 센서 로그(game_logs) 보관함 + 전송기
//  ------------------------------------------------------------
//  스펙: dev/active/sensor-log-durability/sensor-log-durability-plan.md
//  · outbox: 메모리 + localStorage(1.5초마다 모아 저장, 최대 3,000행). 서버가 받았다고 할 때만 지운다
//    → 크래시 뒤 다시 켜면 남은 행부터 보낸다. 같은 client_row_id 로 다시 가도 DB 가 중복을 무시한다.
//  · shipper: 5초 → 15초 → 30초 주기(logger.js 가 타이머), 나갈 때는 keepalive.
//    한 번에 한 계정 행만 보낸다 — RLS 가 auth.uid() = user_id 라서 토큰과 행 주인이 같아야 한다.
//    게스트는 새로고침마다 새 익명 계정이라, 이전 계정 행은 그 계정 토큰(만료 전)으로 보내고 만료면 버린다.
//  브라우저 전역을 만지지 않는다(테스트에서 가짜 저장소·시계를 넣는다).
// =============================================================

export const OUTBOX_KEY = 'cf_glog_q';
const TOKEN_SLACK_MS = 10_000;   // 만료 10초 전부터는 쓰지 않는다(가는 동안 만료)

export function flushDelay(i) {
  return [5000, 15000][i] ?? 30000;
}

// key: 탭마다 따로(`cf_glog_q:<세션id>`) — 여러 탭이 한 키를 덮어써 서로의 미전송 행을 지우지 않게.
//   끝난 탭·옛 키(`cf_glog_q`)에 남은 행은 adoptOrphans() 가 데려온다(살아 있는 탭 것이면 두 번 가도 DB 가 중복 무시).
export function createOutbox({ storage, key = OUTBOX_KEY, now = () => Date.now(), max = 3000, persistEveryMs = 1500 }) {
  let rows = [];
  let tokens = {};               // uid → { t, exp }
  let lastPersist = -Infinity;
  let dirty = false;

  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.rows)) rows = saved.rows.slice(-max);
    if (saved && saved.tokens && typeof saved.tokens === 'object') tokens = saved.tokens;
  } catch (e) { /* 깨진 저장분 — 새로 시작 */ }

  function persistNow() {
    const live = Object.fromEntries(Object.entries(tokens).filter(([, v]) => v.exp > now()));
    tokens = live;
    try {
      if (rows.length || Object.keys(tokens).length) storage.setItem(key, JSON.stringify({ v: 1, rows, tokens }));
      else storage.removeItem(key);
    } catch (e) { /* 저장 불가 — 메모리로만 */ }
    lastPersist = now();
    dirty = false;
  }

  return {
    add(row) {
      rows = [...rows, row].slice(-max);
      dirty = true;
    },
    setToken(uid, t, exp) {
      if (!uid || !t) return;
      tokens = { ...tokens, [uid]: { t, exp } };
      dirty = true;
    },
    tokenFor(uid) {
      const v = tokens[uid];
      return v && v.exp - TOKEN_SLACK_MS > now() ? v.t : null;
    },
    persistIfDue() { if (dirty && now() - lastPersist >= persistEveryMs) persistNow(); },
    persistNow,
    peek: n => rows.slice(0, n),
    remove(ids) {
      const set = new Set(ids);
      rows = rows.filter(r => !set.has(r.client_row_id));
      persistNow();
    },
    size: () => rows.length,
    // 로그아웃 — 공용 기기에 그 계정 행·토큰을 남기지 않는다
    forget(uid) {
      if (!uid) return;
      rows = rows.filter(r => r.user_id !== uid);
      const { [uid]: _gone, ...rest } = tokens;
      tokens = rest;
      persistNow();
    },
    adoptOrphans() {
      let keys = [];
      try {
        for (let i = 0; i < (storage.length || 0); i += 1) {
          const k = storage.key(i);
          if (k && k !== key && (k === OUTBOX_KEY || k.startsWith(`${OUTBOX_KEY}:`))) keys.push(k);
        }
      } catch (e) { keys = []; }
      for (const k of keys) {
        try {
          const saved = JSON.parse(storage.getItem(k) || 'null');
          if (saved && Array.isArray(saved.rows)) rows = [...saved.rows, ...rows].slice(-max);
          if (saved && saved.tokens && typeof saved.tokens === 'object') tokens = { ...saved.tokens, ...tokens };
          storage.removeItem(k);
        } catch (e) { /* 깨진 키 — 건너뛴다 */ }
      }
      if (keys.length) persistNow();
    },
  };
}

const byteLen = s => new TextEncoder().encode(s).length;

// post(rows, { token, keepalive }) → true(받음) | false(다음에 다시) | 'drop'(영영 못 들어감 — 버림)
//   | 'unauth'(401 — 토큰 거절: 이전 계정이면 버리고, 지금 계정이면 갱신을 기다린다)
export function createShipper({ outbox, post, getAuth, now = () => Date.now(), maxRows = 200,
  maxBytes = 48 * 1024, keepaliveBytes = 32 * 1024 }) {
  let inFlight = false;

  // 행 주인 → 쓸 토큰. 주인이 없으면(로그인 전 행) 지금 계정으로 채운다.
  function ownerOf(row, auth) { return row.user_id || auth.uid || null; }
  function tokenOf(owner, auth) {
    if (!owner) return null;
    return owner === auth.uid ? auth.token : outbox.tokenFor(owner);
  }

  async function flush({ keepalive = false } = {}) {
    if (inFlight || !outbox.size()) return false;
    const auth = getAuth() || {};
    if (!auth.uid || !auth.token) return false;                                   // 아직 로그인 전 — 기다린다
    if (auth.exp && auth.exp - TOKEN_SLACK_MS <= now()) return false;             // 만료 — 갱신(TOKEN_REFRESHED)을 기다린다

    // 토큰을 구할 수 없는 계정의 행(만료된 이전 게스트 등)은 버린다 — RLS 가 어차피 거절한다
    const head = outbox.peek(Math.max(maxRows * 5, 1000));
    const dead = head.filter(r => !tokenOf(ownerOf(r, auth), auth)).map(r => r.client_row_id);
    if (dead.length) outbox.remove(dead);
    if (!outbox.size()) return false;

    // 나갈 때는 지금 계정 행부터 — 이전 게스트 행이 앞에 있어도 이번 세션 행이 먼저 나가야 한다
    const scan = outbox.peek(Math.max(maxRows * 5, 1000));
    const owner = keepalive && scan.some(r => ownerOf(r, auth) === auth.uid) ? auth.uid : ownerOf(scan[0], auth);
    const token = tokenOf(owner, auth);
    const cap = keepalive ? Math.min(maxBytes, keepaliveBytes) : maxBytes;
    let batch = scan
      .filter(r => ownerOf(r, auth) === owner)
      .slice(0, maxRows)
      .map(r => (r.user_id ? r : { ...r, user_id: owner }));
    while (batch.length > 1 && byteLen(JSON.stringify(batch)) > cap) {
      batch = batch.slice(0, Math.ceil(batch.length / 2));
    }

    inFlight = true;
    let result = false;
    try { result = await post(batch, { token, keepalive }); } catch (e) { result = false; } finally { inFlight = false; }

    if (result === true || result === 'drop') outbox.remove(batch.map(r => r.client_row_id));
    else if (result === 'unauth' && owner !== auth.uid) {                         // 이전 계정 토큰이 거절됨 — 그 계정 행 전부 버림
      outbox.remove(outbox.peek(outbox.size()).filter(r => r.user_id === owner).map(r => r.client_row_id));
    }
    return result === true;
  }

  // 밀린 행 비우기 — 성공하고 아직 한 묶음 이상 남았으면 이어서(최대 n번)
  async function drain(n = 5) {
    for (let i = 0; i < n; i += 1) {
      const ok = await flush();
      if (!ok || !outbox.size()) return;
    }
  }

  return { flush, drain, busy: () => inFlight };
}
