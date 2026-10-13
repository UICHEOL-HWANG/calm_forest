// =============================================================
//  calm forest · 오류 훅 — 브라우저에서 난 오류를 수집기(client-errors.js)로 넘긴다
//  ------------------------------------------------------------
//  window error(스크립트 오류·리소스 로드 실패) · unhandledrejection · console.error ·
//  fetch 404/5xx/네트워크 실패를 잡는다. 화면이 숨겨지거나 페이지를 떠나면 beacon 으로 비운다.
//  🛟 쿠션: 어떤 훅도 앱 흐름을 바꾸지 않는다 — 원래 동작을 먼저 하고, 보고는 try 로 감싼다.
//  전역은 인자로 받는다(테스트에서 가짜 window·console·fetch 를 넣는다). 실제 설치는 client-errors-boot.js.
// =============================================================

const HTTP_REPORT = s => s === 404 || s >= 500;   // 400·401·409 는 정상 흐름(중복 23505·로그인 필요 등)

export function installErrorHooks({ win, doc, reporter, consoleObj, fetchScope, endpoint }) {
  const safeReport = (entry) => { try { reporter.report(entry); } catch (e) { /* 수집 실패는 삼킨다 */ } };
  const safeFlush = () => { try { reporter.flush({ beacon: true }); } catch (e) { /* 위와 같음 */ } };

  const onError = (ev) => {
    const t = ev.target;
    if (t && t !== win && (t.src || t.href)) {
      if (/^(data|blob):/i.test(t.src || t.href)) return;   // 인라인 자원 — 원인 추적에 쓸모없고 길다
      safeReport({ kind: 'resource', msg: `${t.tagName || 'resource'} load failed`, url: t.src || t.href });
      return;
    }
    const where = ev.filename ? `${ev.filename}:${ev.lineno || 0}:${ev.colno || 0}` : '';
    safeReport({ kind: 'error', msg: ev.message || 'error', stack: ev.error?.stack || '', url: where });
  };
  const onRejection = (ev) => {
    const r = ev.reason;
    safeReport({ kind: 'rejection', msg: r?.message || String(r), stack: r?.stack || '' });
  };
  const onHidden = () => { if (doc.visibilityState === 'hidden') safeFlush(); };

  win.addEventListener('error', onError, true);   // capture — 리소스 오류는 버블링되지 않는다
  win.addEventListener('unhandledrejection', onRejection);
  win.addEventListener('pagehide', safeFlush);
  doc.addEventListener('visibilitychange', onHidden);

  const origError = consoleObj.error;
  consoleObj.error = function (...args) {
    origError.apply(this, args);
    safeReport({ kind: 'console', msg: args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : safeJson(a))).join(' '),
      stack: args.find(a => a instanceof Error)?.stack || '' });
  };

  const origFetch = fetchScope.fetch;
  const isOwnEndpoint = url => String(url).split(/[?#]/)[0].endsWith(endpoint);
  fetchScope.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    let res;
    try {
      res = await origFetch.call(this, input, init);
    } catch (e) {
      if (!isOwnEndpoint(url) && e?.name !== 'AbortError') safeReport({ kind: 'network', msg: `${method} ${e?.message || 'fetch failed'}`, url });
      throw e;
    }
    if (!isOwnEndpoint(url) && HTTP_REPORT(res?.status)) safeReport({ kind: 'http', msg: `${method} ${res.status}`, url, status: res.status });
    return res;
  };

  return function uninstall() {
    win.removeEventListener('error', onError, true);
    win.removeEventListener('unhandledrejection', onRejection);
    win.removeEventListener('pagehide', safeFlush);
    doc.removeEventListener('visibilitychange', onHidden);
    consoleObj.error = origError;
    fetchScope.fetch = origFetch;
  };
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

// beacon: sendBeacon(응답을 못 기다리는 대신 페이지가 죽어도 나간다) → 실패하면 keepalive fetch.
//   본문 타입은 text/plain — 토스·itch·앱은 다른 오리진이라 application/json 이면 sendBeacon 이 막히거나
//   fetch 가 사전 요청(OPTIONS)을 한 번 더 보낸다(Workers 무료 요청 한도 낭비). 서버는 본문을 JSON 으로 파싱한다.
//   sendBeacon 은 "큐에 넣었다"만 알려 준다 — 서버 저장 실패는 모른 채 지워질 수 있다(유실 감수 구간).
// 서버 응답 → 수집기 판정: 2xx 받음 · 400/413/422 영영 못 받는 묶음(버림) · 그 밖(429·5xx·네트워크) 다음에 다시
const DROP_STATUS = new Set([400, 413, 422]);

export function makeSender({ endpoint, beaconFn, fetchFn, timeoutMs = 15_000 }) {
  return async function send(body, { beacon = false } = {}) {
    const json = JSON.stringify(body);
    if (beacon && beaconFn) {
      try {
        if (beaconFn(endpoint, new Blob([json], { type: 'text/plain;charset=UTF-8' }))) return true;
      } catch (e) { /* fetch 로 */ }
    }
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;   // 응답이 안 오면 전송 중 상태가 고착된다
    try {
      const res = await fetchFn(endpoint, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: json, keepalive: true, signal: ctl?.signal });
      if (res?.ok) return true;
      return DROP_STATUS.has(res?.status) ? 'drop' : false;
    } catch (e) {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
