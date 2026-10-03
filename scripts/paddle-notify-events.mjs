// scripts/paddle-notify-events.mjs
// =============================================================
//  calm forest · 📊 Paddle 웹훅 알림 구독에 결제 퍼널 이벤트(transaction.*) 추가
//  ------------------------------------------------------------
//  사용(키는 키체인에서 — 출력하지 않는다):
//    PADDLE_ENV=production PADDLE_API_KEY="$(security find-generic-password -s calmforest-paddle-live -w)" \
//      node scripts/paddle-notify-events.mjs            # 지금 구독 목록만 본다
//    ... node scripts/paddle-notify-events.mjs --apply  # calmforest 웹훅 대상에 FUNNEL_EVENTS 를 더한다(기존 구독은 유지)
//  ▶ 대상 = destination 이 calmforest.cloud/api/paddle-webhook 인 알림 설정. 없으면 아무것도 안 바꾼다.
//  ▶ API 키에 notification_setting 읽기/쓰기 권한이 있어야 한다(없으면 403 — 대시보드에서 권한 추가).
// =============================================================
import { FUNNEL_EVENTS } from '../functions/api/_paddle.js';

const BASES = { sandbox: 'https://sandbox-api.paddle.com', production: 'https://api.paddle.com' };
const base = BASES[process.env.PADDLE_ENV || 'sandbox'];
const key = process.env.PADDLE_API_KEY;
const apply = process.argv.includes('--apply');
if (!base) fail('PADDLE_ENV 는 sandbox 또는 production');
if (!key) fail('PADDLE_API_KEY 가 없다 — 키체인에서 읽어 넘길 것');

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }
async function api(method, path, body) {
  const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${method} ${path} → ${res.status} ${json?.error?.code || ''} ${json?.error?.detail || ''}`);
  return json.data;
}

const settings = await api('GET', '/notification-settings');
const target = settings.find(s => /calmforest\.cloud\/api\/paddle-webhook/.test(s.destination || ''));
if (!target) fail(`calmforest 웹훅 대상이 없다 — 대상: ${settings.map(s => s.destination).join(', ') || '(없음)'}`);
const have = target.subscribed_events.map(e => e.name);
const missing = FUNNEL_EVENTS.filter(e => !have.includes(e));
console.log(`대상: ${target.destination} (${target.active ? '활성' : '비활성'})`);
console.log(`지금 구독: ${have.join(', ')}`);
console.log(`퍼널용으로 빠진 것: ${missing.join(', ') || '(없음)'}`);
if (!apply || !missing.length) process.exit(0);
await api('PATCH', `/notification-settings/${target.id}`, { subscribed_events: [...have, ...missing] });
console.log(`✓ ${missing.length}개 추가 완료`);
