// =============================================================
//  calm forest · ⏰ 카드뉴스 예약 발행 (Cron Trigger)
//  ------------------------------------------------------------
//  매일 깨어나서 "사흘 지났나"를 **워커가 판단한다.**
//  `0 0 */3 * *` 같은 날짜식을 쓰면 월말(31일 → 1일)에 간격이 하루로 줄어든다.
//
//  상태는 KV 키 하나다(`state`). Supabase 테이블까지 갈 일이 아니고 시크릿도 안 든다.
//    { lastPublishedAt: "2026-09-11", lastSlug: "deck-02",
//      queue: [ { slug, caption, urls: [...7] }, ... ] }
//
//  큐에 들어온 카드 묶음은 **이미 사람 검수를 통과한 것**이다
//  (`node publish.mjs <묶음이름> --queue` 로만 들어온다).
//  그래서 발행 직전에 다시 묻지 않는다. 사람이 움직여야 할 때만 메일이 간다.
// =============================================================
import { notify } from './notify.js';

const STATE_KEY = 'state';
const EVERY_DAYS = 3;
const IG = 'https://graph.instagram.com/v23.0';

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

async function loadState(env) {
  return (await env.CARDNEWS.get(STATE_KEY, 'json')) || { lastPublishedAt: null, lastSlug: null, queue: [] };
}
const saveState = (env, s) => env.CARDNEWS.put(STATE_KEY, JSON.stringify(s));

/** Graph 호출. 실패 사유를 그대로 올린다 — 조용한 폴백 금지 */
async function ig(env, path, params = {}, method = 'GET') {
  const url = new URL(IG + path);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) (method === 'GET' ? url.searchParams : body).set(k, String(v));
  }
  (method === 'GET' ? url.searchParams : body).set('access_token', env.IG_TOKEN);

  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    // ⚠️ url 을 그대로 찍으면 토큰이 로그에 남는다. 경로만 남긴다.
    throw new Error(`IG ${method} ${path} → ${res.status} [${e.code ?? '?'}] ${e.message || ''}`);
  }
  return json;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function publishCarousel(env, deck) {
  const children = [];
  for (const image_url of deck.urls) {
    const { id } = await ig(env, '/me/media', { image_url, is_carousel_item: true }, 'POST');
    children.push(id);
  }
  const { id: parent } = await ig(env, '/me/media', {
    media_type: 'CAROUSEL', children: children.join(','), caption: deck.caption,
  }, 'POST');

  for (let i = 0; ; i++) {
    const s = await ig(env, `/${parent}`, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
      throw new Error(`컨테이너 ${s.status_code}: ${s.status || ''}`);
    }
    if (i >= 30) throw new Error('컨테이너가 90초 넘게 IN_PROGRESS');
    await sleep(3000);
  }

  const { id: mediaId } = await ig(env, '/me/media_publish', { creation_id: parent }, 'POST');
  const { permalink } = await ig(env, `/${mediaId}`, { fields: 'permalink' });
  return permalink;
}

export async function runCardnewsCron(env) {
  if (!env.CARDNEWS) return { skipped: 'KV 바인딩 없음' };

  const state = await loadState(env);
  const now = today();

  // 아직 사흘이 안 지났으면 아무것도 하지 않는다. 메일도 안 보낸다.
  if (state.lastPublishedAt) {
    const gap = daysBetween(state.lastPublishedAt, now);
    if (gap < EVERY_DAYS) return { skipped: `${gap}일차 — ${EVERY_DAYS}일 주기 미달` };
  }

  // 큐가 비었다 = "카드 묶음 만들러 올 때가 됐다". 사람이 움직여야 하는 첫 번째 경우.
  if (!state.queue?.length) {
    await notify(env, '[카드뉴스] 올릴 카드 묶음이 없다',
      `올릴 카드 묶음이 없어서 오늘은 건너뛴다.\n\n` +
      `마지막 발행: ${state.lastSlug || '(없음)'} · ${state.lastPublishedAt || '(없음)'}\n\n` +
      `맥에서:\n  cd tools/cardnews\n  node news.mjs\n`);
    return { skipped: '큐 비었음' };
  }

  if (!env.IG_TOKEN) {
    await notify(env, '[카드뉴스] 발행 못 함 — 토큰 미설정',
      `IG_TOKEN 워커 시크릿이 없다.\n\n  npx wrangler secret put IG_TOKEN\n`);
    return { skipped: '토큰 없음' };
  }

  const deck = state.queue[0];
  try {
    const permalink = await publishCarousel(env, deck);
    state.queue = state.queue.slice(1);
    state.lastPublishedAt = now;
    state.lastSlug = deck.slug;
    await saveState(env, state);

    // 남은 게 없으면 성공 알림에 미리 알려 둔다 — 사흘 뒤에 또 메일받는 것보다 낫다.
    const tail = state.queue.length
      ? `남은 카드 묶음 ${state.queue.length}개`
      : `⚠️ 남은 카드 묶음이 없다. 다음 차례 전에 만들어야 한다.`;
    await notify(env, `[카드뉴스] ${deck.slug} 발행됨`, `${permalink}\n\n${tail}\n`);
    return { published: deck.slug, permalink };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 큐는 건드리지 않는다. 원인을 고치면 다음 실행에서 같은 카드 묶음이 다시 나간다.
    await notify(env, `[카드뉴스] 발행 실패 — ${deck.slug}`,
      `${msg}\n\n큐는 그대로 뒀다. 원인을 고치면 다음 실행에서 다시 시도한다.\n` +
      `토큰 만료(code 190)면 50일 갱신이 안 돈 것이다.\n`);
    console.error(JSON.stringify({ message: 'cardnews cron 발행 실패', slug: deck.slug, error: msg }));
    return { failed: deck.slug, error: msg };
  }
}
