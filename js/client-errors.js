// =============================================================
//  calm forest · 클라이언트 오류 수집기
//  ------------------------------------------------------------
//  기기에서 난 오류만 묶어서 서버(/api/logs)로 보낸다. 일반 로그는 기기를 떠나지 않는다(devlog.js 링버퍼).
//  스펙: dev/active/client-logs/client-logs-plan.md
//
//  · 개인정보: UUID 는 앞 8자, 이메일·JWT·API 키·Bearer 토큰은 지움. URL 은 쿼리·해시를 버림.
//  · 부하: 같은 오류는 3번까지만 담고 나머지는 횟수로 센다. 전송 간격·세션당 전송 상한
//    (Workers 무료 요청 한도를 게임 API 와 같이 쓴다).
//  · 유실: 보내기 전엔 저장소(localStorage)에 적어 두고, 다음 실행 때 다시 보낸다.
//    같은 id 로 다시 갈 수 있으니 서버가 id 로 중복을 거른다.
//  이 파일은 브라우저 전역을 만지지 않는다 — 훅 설치는 client-errors-boot.js.
// =============================================================

export const ERR_STORE_KEY = 'cf_err_q';
const STORE_MAX = 50;

// 🛟 정규식은 길이를 묶어 둔다 — 무인증 /api/logs 로 긴 문자열이 들어와도 2차 시간이 안 나게.
//    그리고 maskText 는 가리기 전에 먼저 자른다(아래 PRE_CUT).
const MASKS = [
  [/\beyJ[\w-]{1,2000}\.[\w-]{1,2000}\.[\w-]{1,2000}/g, '[jwt]'],
  [/\bBearer\s+\S{1,2000}/gi, 'Bearer [token]'],
  [/\b(sb_secret_|sb_publishable_|sk-ant-|sk-|AIza|GOCSPX-)[\w-]{1,200}/g, '[key]'],
  [/"(refresh_token|access_token|provider_token|token|password)"\s*:\s*"[^"]{0,4000}"/gi, '"$1":"[token]"'],
  [/([?&](?:token|apikey|api_key|key|access_token|refresh_token|code)=)[^&\s#]{1,2000}/gi, '$1[token]'],
  // 이메일 — 도메인 뒤에 / : 가 이어지면 URL(사파리 스택 fn@https://…)이라 건드리지 않는다
  [/[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){0,4}\.[a-z]{2,24}(?![\w/:.-])/gi, '[email]'],
  [/\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '$1…'],
  // 스택 속 스크립트 URL 의 쿼리(?v=·토큰) — 줄·열 번호(:1:2)는 남긴다
  [/(\.(?:m?js|html?))\?[^\s:)]{0,500}/gi, '$1'],
];
const PRE_CUT = 3;   // 가리기 전에 max × 3 글자로 자른다(가린 뒤 길이가 줄 수 있어 여유를 둔다)

// DB(jsonb)가 거부하는 글자 — NUL·짝 없는 서로게이트. 하나만 섞여도 묶음 전체가 실패한다.
function wellFormed(s) {
  const noNul = s.replace(/\u0000/g, '');
  if (typeof noNul.toWellFormed === 'function') return noNul.toWellFormed();
  return noNul.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}

// 코드포인트 단위로 자른다 — 이모지를 반으로 가르면 짝 없는 서로게이트가 생긴다
function cutChars(s, max) {
  if (s.length <= max) return s;
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : s;
}

export function maskText(value, max = 500) {
  let s;
  try { s = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value); }
  catch (e) { s = String(value); }
  const pre = s.length > max * PRE_CUT ? s.slice(0, max * PRE_CUT) : s;
  const masked = MASKS.reduce((acc, [re, rep]) => acc.replace(re, rep), wellFormed(pre));
  return cutChars(wellFormed(masked), max);
}

export function stripUrl(url) {
  return String(url || '').split(/[?#]/)[0];
}

function readStore(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(ERR_STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-STORE_MAX) : [];
  } catch (e) {
    return [];
  }
}

function writeStore(storage, list) {
  try {
    if (list.length) storage.setItem(ERR_STORE_KEY, JSON.stringify(list.slice(-STORE_MAX)));
    else storage.removeItem(ERR_STORE_KEY);
  } catch (e) { /* 저장 불가(사파리 개인정보 모드 등) — 메모리로만 */ }
}

const byteLen = s => new TextEncoder().encode(s).length;

// send(body, { beacon }) → true(받음) | false(다음에 다시) | 'drop'(서버가 영영 못 받는 묶음 — 버린다)
export function createErrorReporter({
  send,
  storage,
  now = () => Date.now(),
  newId = () => crypto.randomUUID(),
  context = () => ({}),       // { platform, uid, ... } — 보낼 때 읽는다(로그인 전후로 바뀜)
  enabled = true,
  maxBatch = 20,
  maxBodyBytes = 48 * 1024,   // 서버 상한(64KB)보다 작게 — 한글은 3바이트
  minIntervalMs = 30_000,
  maxSends = 20,              // 세션당 성공한 전송 수 상한(Workers 무료 요청 한도를 게임 API 와 같이 쓴다)
  maxBeacons = 10,            // 나갈 때 보내기는 따로 센다(앱을 자주 내렸다 올려도 본 예산을 안 먹게)
  maxRepeat = 3,
  backoffBaseMs = 30_000,
  backoffMaxMs = 5 * 60_000,
}) {
  let pending = enabled ? readStore(storage) : [];
  let suppressed = 0;
  let sends = 0;
  let beacons = 0;
  let fails = 0;
  let nextAllowedAt = -Infinity;
  let inFlight = false;
  const seen = new Map();     // 서명 → 담은 횟수(세션 안)

  const persist = () => { if (enabled) writeStore(storage, pending); };

  function report({ kind = 'error', msg = '', stack = '', url = '', status } = {}) {
    const m = maskText(msg);
    const sig = `${kind}|${m.slice(0, 200)}|${status ?? ''}`;
    const count = seen.get(sig) || 0;
    if (count >= maxRepeat) { suppressed += 1; return; }
    seen.set(sig, count + 1);
    const entry = { id: newId(), ts: now(), kind, msg: m };
    if (stack) entry.stack = maskText(stack, 1000);
    if (url) entry.url = maskText(stripUrl(url), 300);
    if (status !== undefined) entry.status = status;
    pending = [...pending, entry].slice(-STORE_MAX);
    persist();
    if (pending.length >= maxBatch) flush();
  }

  function buildBody(batch, sup) {
    const ctx = context() || {};
    return { v: 1, ctx: { ...ctx, uid: ctx.uid ? String(ctx.uid).slice(0, 8) : undefined }, events: batch, suppressed: sup };
  }

  async function flush({ beacon = false } = {}) {
    if (!enabled || inFlight || !pending.length) return false;
    if (beacon ? beacons >= maxBeacons : (sends >= maxSends || now() < nextAllowedAt)) return false;

    let batch = pending.slice(0, maxBatch);
    const sup = suppressed;
    let body = buildBody(batch, sup);
    while (batch.length > 1 && byteLen(JSON.stringify(body)) > maxBodyBytes) {
      batch = batch.slice(0, Math.ceil(batch.length / 2));
      body = buildBody(batch, sup);
    }

    inFlight = true;
    if (beacon) beacons += 1;
    let result = false;
    try { result = await send(body, { beacon }); } catch (e) { result = false; }
    inFlight = false;

    if (result === true || result === 'drop') {
      const sentIds = new Set(batch.map(e => e.id));
      pending = pending.filter(e => !sentIds.has(e.id));
      suppressed = Math.max(0, suppressed - sup);   // 보내는 동안 늘어난 건 남긴다
      persist();
      if (result === true && !beacon) sends += 1;
      fails = 0;
      nextAllowedAt = now() + minIntervalMs;
      return result === true;
    }
    fails += 1;
    nextAllowedAt = now() + Math.min(backoffMaxMs, backoffBaseMs * 2 ** (fails - 1));
    return false;
  }

  return { report, flush, pendingCount: () => pending.length };
}
