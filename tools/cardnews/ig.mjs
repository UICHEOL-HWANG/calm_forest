// =============================================================
//  calm forest · 📷 Instagram Graph API 얇은 클라이언트
//  ------------------------------------------------------------
//  "Instagram 로그인" 경로(graph.instagram.com)를 쓴다.
//  이 경로를 고른 이유:
//    · 페이스북 페이지가 필요 없다
//    · 토큰 갱신에도 앱 시크릿을 안 쓴다 → 이 파이프라인은 시크릿을 아예 안 들고 있다
//
//  토큰은 코드·저장소·로그 어디에도 남기지 않는다.
//    ~/.config/calmforest/ig_token (chmod 600) 또는 IG_TOKEN 환경변수
// =============================================================
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const API = 'https://graph.instagram.com/v23.0';
export const TOKEN_FILE = process.env.IG_TOKEN_FILE || resolve(homedir(), '.config/calmforest/ig_token');

let cached = null;

export async function igToken() {
  if (cached) return cached;
  if (process.env.IG_TOKEN) return (cached = process.env.IG_TOKEN.trim());
  let raw;
  try { raw = await readFile(TOKEN_FILE, 'utf-8'); }
  catch {
    throw new Error(
      `IG 토큰이 없다.\n` +
      `  → Meta 대시보드 > Instagram > "토큰 생성" 으로 받은 뒤(복사해두고):\n` +
      `    mkdir -p ~/.config/calmforest && pbpaste | tr -d '[:space:]' > ${TOKEN_FILE}`);
  }
  cached = raw.trim();
  if (!cached) throw new Error(`${TOKEN_FILE} 이 비어 있다`);
  return cached;
}

/**
 * Graph 호출. 실패하면 Meta 가 준 사유를 그대로 던진다 — 조용한 폴백 금지.
 * ⚠️ 에러 메시지에 URL 전문을 넣지 않는다. access_token 이 로그·터미널에 남는다.
 */
export async function ig(path, params = {}, method = 'GET') {
  const token = await igToken();
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
    throw new Error(`IG ${method} ${path} → ${res.status} [${e.code ?? '?'}] ${e.message || JSON.stringify(json)}`);
  }
  return json;
}

/** 내 계정 확인 — 토큰이 살아있는지 보는 가장 싼 호출 */
export const me = () => ig('/me', { fields: 'id,username,account_type,media_count' });

/** 24시간 발행 한도(100건) 잔여 */
export const quota = () => ig('/me/content_publishing_limit', { fields: 'config,quota_usage' });

export const sleep = ms => new Promise(r => setTimeout(r, ms));
