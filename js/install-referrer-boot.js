// =============================================================
//  calm forest · 📲 Install Referrer — 저장소·네이티브·전송 바인딩 (규칙은 js/install-referrer.js)
//  ------------------------------------------------------------
//  bootInstallReferrer   : 안드로이드 앱 부팅 때. 저장된 귀속이 없을 때만 네이티브 InstallReferrer.get() →
//                          localStorage 에 확정 → GA4 install_attribution 1회 + 사용자 속성.
//  syncInstallAttribution: 로그인 상태가 바뀔 때마다. 온라인 계정마다 Supabase 에 1행(이미 넣은 계정은 건너뜀).
//  의존성은 인자로 받는다 — 테스트에서 가짜 플러그인·저장소로 돈다. 어떤 실패도 게임을 막지 않는다.
// =============================================================

import { INSTALL_STORE_KEY, attributionFromNative, installUserProps, parseStoredAttribution } from './install-referrer.js';

const NATIVE_TIMEOUT_MS = 8000;   // Play 스토어 서비스 바인딩이 안 끝나는 기기 — 다음 실행에서 다시

export function cachedInstallAttribution(storage) {
  try { return parseStoredAttribution(storage?.getItem(INSTALL_STORE_KEY)); } catch { return null; }
}

function store(storage, attr) {
  try { storage.setItem(INSTALL_STORE_KEY, JSON.stringify(attr)); } catch { /* 저장소 없음 — 이번 실행만 */ }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
}

export async function bootInstallReferrer({ plugin, storage, track, setUserProps, timeoutMs = NATIVE_TIMEOUT_MS }) {
  const cached = cachedInstallAttribution(storage);
  if (cached) return cached;
  if (!plugin) return null;                                         // 플러그인이 빠진 옛 앱 빌드
  let res;
  try { res = await withTimeout(plugin.get(), timeoutMs); } catch (e) {
    console.warn('[install-referrer] 읽기 실패:', e?.message || e);
    return null;
  }
  const attr = attributionFromNative(res);
  if (!attr) return null;                                           // 일시 장애 — 저장 안 함 → 다음 실행에서 다시
  store(storage, attr);                                             // 이벤트보다 먼저 — 두 번 쏘지 않게
  setUserProps(installUserProps(attr));
  track('install_attribution', { install_source: attr.source, install_medium: attr.medium, install_campaign: attr.campaign });
  console.log('[install-referrer] 귀속:', attr.source, attr.medium, attr.campaign);
  return attr;
}

const inFlight = new Set();   // 같은 계정으로 콜백이 연달아 와도 한 번만

export async function syncInstallAttribution({ auth, storage, insert }) {
  if (!auth?.online || !auth.userId) return;
  const attr = cachedInstallAttribution(storage);
  if (!attr) return;
  const synced = Array.isArray(attr.synced) ? attr.synced : [];
  if (synced.includes(auth.userId) || inFlight.has(auth.userId)) return;
  inFlight.add(auth.userId);
  try {
    const r = await insert({
      user_id: auth.userId, client_id: auth.clientId,
      source: attr.source, medium: attr.medium, campaign: attr.campaign, raw_referrer: attr.raw || '',
      click_ts: attr.clickTs || null, install_ts: attr.installTs || null, status: attr.status || 'ok',
    });
    if (!r?.ok) return;                                             // 실패 — 다음 상태 변경 때 다시
    const latest = cachedInstallAttribution(storage) || attr;
    const prev = Array.isArray(latest.synced) ? latest.synced : [];
    store(storage, { ...latest, synced: [...prev.filter(id => id !== auth.userId), auth.userId] });
  } finally {
    inFlight.delete(auth.userId);
  }
}
