// =============================================================
//  calm forest · 🧵 Threads API 얇은 클라이언트 + 캐러셀 발행
//  ------------------------------------------------------------
//  graph.threads.net — 인스타 Graph API 와 토큰·호스트가 별개다.
//  일반 Threads 계정이면 된다(비즈니스 전환·페이스북 페이지 불필요).
//
//  토큰은 코드·저장소·로그 어디에도 남기지 않는다.
//    ~/.config/calmforest/threads_token (chmod 600) 또는 THREADS_TOKEN 환경변수
//  장기 토큰은 60일 뒤 만료 → `node threads.mjs refresh` (발급 24시간 뒤부터 가능)
//
//  사용: node threads.mjs            ← 토큰이 살아있는지 확인(계정 이름)
//        node threads.mjs refresh    ← 장기 토큰 갱신(파일을 덮어쓴다, 토큰은 출력 안 함)
// =============================================================
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const API = 'https://graph.threads.net/v1.0';
export const THREADS_TOKEN_FILE =
  process.env.THREADS_TOKEN_FILE || resolve(homedir(), '.config/calmforest/threads_token');
export const THREADS_TEXT_MAX = 500;
// Threads 는 게시물당 주제 태그가 하나라 인스타처럼 여러 개를 달지 않는다
export const THREADS_TAG = '인디게임';

let cached = null;

/** 토큰이 없으면 null — Threads 는 선택 채널이라 없으면 건너뛴다 */
export async function threadsToken() {
  if (cached) return cached;
  if (process.env.THREADS_TOKEN) return (cached = process.env.THREADS_TOKEN.trim());
  try {
    const raw = (await readFile(THREADS_TOKEN_FILE, 'utf-8')).trim();
    return raw ? (cached = raw) : null;
  } catch {
    return null;
  }
}

/**
 * Graph 호출. 실패하면 Meta 가 준 사유를 그대로 던진다 — 조용한 폴백 금지.
 * ⚠️ 에러 메시지에 URL 전문을 넣지 않는다. access_token 이 로그·터미널에 남는다.
 */
export async function threads(path, params = {}, method = 'GET') {
  const token = await threadsToken();
  if (!token) throw new Error(`Threads 토큰이 없다 (THREADS_TOKEN 또는 ${THREADS_TOKEN_FILE})`);
  const url = new URL(API + path);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    (method === 'GET' ? url.searchParams : body).set(k, String(v));
  }
  if (method === 'GET') url.searchParams.set('access_token', token);
  else body.set('access_token', token);

  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(`Threads ${method} ${path} → ${res.status} [${e.code ?? '?'}] ${e.message || JSON.stringify(json)}`);
  }
  return json;
}

export const threadsMe = () => threads('/me', { fields: 'id,username' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * 인스타 캡션(최대 2200자)을 Threads 본문(500자)으로 줄인다.
 * 해시태그 줄이 보통 맨 끝이라 문단 단위로 앞에서부터 담고, 넘기 직전에서 멈춘다.
 * 첫 문단만으로 넘치면 문장 끝에서 자른다. 자른 흔적은 "…" 하나.
 */
export function toThreadsText(caption, max = THREADS_TEXT_MAX, tag = THREADS_TAG) {
  // 인스타용 해시태그 줄은 빼고, Threads 는 주제 태그 하나(#인디게임)만 맨 끝에 붙인다.
  const body = (caption || '')
    .split('\n')
    .filter(line => !/^\s*(#\S+\s*)+$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const suffix = tag ? `\n\n#${tag}` : '';
  const room = max - suffix.length;
  return fit(body, room) + suffix;
}

/** 본문을 room 자 안으로: 문단 단위로 담고, 첫 문단이 넘치면 문장 끝에서 자른다 */
function fit(text, room) {
  if (text.length <= room) return text;
  let out = '';
  for (const p of text.split(/\n{2,}/)) {
    const next = out ? `${out}\n\n${p}` : p;
    if (next.length > room) break;
    out = next;
  }
  if (out) return out;
  const cut = text.slice(0, room - 1);
  const end = Math.max(...['. ', '! ', '? ', '요.', '다.'].map(m => cut.lastIndexOf(m)));
  return (end > room * 0.5 ? cut.slice(0, end + 1) : cut).trimEnd() + '…';
}

/**
 * 이미지 N장(2~20) → Threads 캐러셀 게시물. 게시물 URL(permalink)을 돌려준다.
 * 절차: 자식 컨테이너 → 부모 캐러셀 컨테이너(+본문) → FINISHED 폴링 → threads_publish
 */
export async function publishThreadsCarousel({ urls, text }) {
  if (urls.length < 2 || urls.length > 20) throw new Error(`Threads 캐러셀은 2~20장이다. 현재 ${urls.length}장`);
  if (text.length > THREADS_TEXT_MAX) throw new Error(`본문 ${text.length}자 — Threads 상한 ${THREADS_TEXT_MAX}자 초과`);

  const children = [];
  for (const image_url of urls) {
    const { id } = await threads('/me/threads', { media_type: 'IMAGE', image_url, is_carousel_item: true }, 'POST');
    children.push(id);
  }
  const { id: parent } = await threads('/me/threads', {
    media_type: 'CAROUSEL', children: children.join(','), text,
  }, 'POST');

  return finishAndPublish(parent, 30);
}

/**
 * 영상 1편 → Threads 게시물. 게시물 URL 을 돌려준다.
 * ⚠️ 영상은 인코딩이 있어 이미지보다 오래 걸린다(최대 5분 기다린다).
 */
export async function publishThreadsVideo({ videoUrl, text }) {
  if (text.length > THREADS_TEXT_MAX) throw new Error(`본문 ${text.length}자 — Threads 상한 ${THREADS_TEXT_MAX}자 초과`);
  const { id } = await threads('/me/threads', { media_type: 'VIDEO', video_url: videoUrl, text }, 'POST');
  return finishAndPublish(id, 100);
}

/** 컨테이너가 FINISHED 가 될 때까지 3초 간격으로 기다렸다가 발행한다(Meta 권고) */
async function finishAndPublish(container, maxTries) {
  for (let i = 0; ; i++) {
    const s = await threads(`/${container}`, { fields: 'status,error_message' });
    if (s.status === 'FINISHED') break;
    if (s.status === 'ERROR' || s.status === 'EXPIRED') {
      throw new Error(`Threads 컨테이너 ${s.status}: ${s.error_message || ''}`);
    }
    if (i >= maxTries) throw new Error(`Threads 컨테이너가 ${maxTries * 3}초 넘게 IN_PROGRESS`);
    await sleep(3000);
  }

  const { id: mediaId } = await threads('/me/threads_publish', { creation_id: container }, 'POST');
  const { permalink } = await threads(`/${mediaId}`, { fields: 'permalink' });
  return permalink;
}

/** 장기 토큰 갱신. 새 토큰은 파일에만 쓰고 화면에 찍지 않는다 */
async function refreshToken() {
  const token = await threadsToken();
  if (!token) throw new Error('갱신할 토큰이 없다');
  const url = new URL('https://graph.threads.net/refresh_access_token');
  url.searchParams.set('grant_type', 'th_refresh_token');
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Threads 토큰 갱신 실패 → ${res.status} ${json.error?.message || ''}`);
  }
  await writeFile(THREADS_TOKEN_FILE, json.access_token + '\n', { mode: 0o600 });
  return Math.round((json.expires_in || 0) / 86400);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] === 'refresh') {
    const days = await refreshToken();
    console.log(`갱신 완료 — ${days}일 유효. ${THREADS_TOKEN_FILE} 을 덮어썼다.`);
    console.log('워커 시크릿도 바꿔야 한다:  npx wrangler secret put THREADS_TOKEN');
  } else {
    const me = await threadsMe();
    console.log(`Threads 계정  @${me.username} (${me.id})`);
  }
}
