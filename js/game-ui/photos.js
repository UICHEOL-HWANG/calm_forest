import { Input } from '../game-lazy.js';
import { CONFIG } from '../config.js';
import { IS_ANDROID } from '../platform.js';
import { capPlugin } from '../cap-bridge.js';
import { listPhotos, insertPhotoRow, deletePhotoRow, getAccessToken } from '../supabase-client.js';
import { iconText } from '../icons/index.js';
import { savePhotoNative, sharePhotoNative, shareUrlNative } from '../photo-native.js';
import { t } from '../i18n.js';
import { trackEvent } from '../analytics.js';

let $, ui, escapeHtml, isGuestNow;

// ── 사진 찍기 (캡처 → 저장/공유) ──
let lastPhoto = null;

// ── 📸 액션샷 공유 카드 — 촬영본에 프레임·타이틀·도감 진행도를 합성(공유 시 홍보 카드가 됨) ──
function frameActionShot(dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = img.width, H = img.height;
        const S = Math.min(W, H);   // 세로 캡처(모바일)에서도 글자·바가 사진 폭에 맞게
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const c = cv.getContext('2d');
        c.drawImage(img, 0, 0);
        // 크림 프레임 테두리
        const bw = Math.max(6, Math.round(W * 0.012));
        c.strokeStyle = 'rgba(255,252,240,0.9)'; c.lineWidth = bw;
        c.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
        // 하단 정보 바(그라데이션 — 사진을 가리지 않게 은은히)
        const barH = Math.round(S * 0.11);
        const grad = c.createLinearGradient(0, H - barH * 1.7, 0, H);
        grad.addColorStop(0, 'rgba(28,42,34,0)');
        grad.addColorStop(1, 'rgba(28,42,34,0.74)');
        c.fillStyle = grad; c.fillRect(0, H - barH * 1.7, W, barH * 1.7);
        const pad = Math.round(W * 0.032), fs = Math.round(S * 0.045);
        // 좌: 게임 타이틀 + 주소(유입 링크)
        c.textAlign = 'left'; c.fillStyle = '#fffdf4';
        c.font = `800 ${fs}px sans-serif`;
        c.fillText(t('🌿 고요한 숲'), pad, H - Math.round(barH * 0.55));
        c.font = `500 ${Math.round(fs * 0.58)}px sans-serif`; c.fillStyle = 'rgba(255,253,244,0.85)';
        c.fillText('calmforest.cloud', pad, H - Math.round(barH * 0.18));
        // 우: 오늘 날씨 + 도감 진행도 + 날짜
        const dex = Input.getDex();
        const wIco = iconText($('time-emoji')) || '🌿';
        const t = new Date();
        const ds = `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`;
        c.textAlign = 'right'; c.fillStyle = '#fffdf4';
        c.font = `700 ${Math.round(fs * 0.75)}px sans-serif`;
        c.fillText(t(`${wIco}  📖 도감 ${dex.count}/${dex.total}  ·  ${ds}`), W - pad, H - Math.round(barH * 0.38));
        resolve(cv.toDataURL('image/png'));
      } catch (e) { resolve(dataURL); }   // 합성 실패 시 원본 그대로
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}
let photoBusy = false;   // 액션샷 진행 중 중복 클릭 방지

// ── 📸 사진첩(OCI 버킷) — 구글 로그인 전용, 게스트에겐 로그인 넛지 ──
//    업로드: 카드 PNG → JPEG(용량 1/3) → 같은 오리진 /api/photo (서버가 OCI 에 서명 PUT)
//    목록: photos 테이블(RLS) → /api/photo-urls 로 presigned <img> URL 일괄 발급
function toJpegDataURL(pngDataURL, quality = 0.85, maxDim = 1600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // 레티나/4K 캡처는 그대로 올리면 서버 한도(1.5MB)를 넘을 수 있어 긴 변 1600px 로 축소
        const k = Math.min(1, maxDim / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const c = cv.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);   // PNG 투명부 → 흰 배경
        c.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', quality));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = pngDataURL;
  });
}
const authHeaders = async () => { const t = await getAccessToken(); return t ? { authorization: 'Bearer ' + t } : {}; };

let cloudBusy = false;

// 사진첩 열기 — 그리드(최신순) + 크게 보기/공유/삭제
let albumCur = null;   // 크게 보는 사진 { key, url }
async function openAlbum() {
  if (isGuestNow()) { ui.loginNudge('album'); return; }
  $('topleft').classList.remove('open');
  const grid = $('album-grid');
  grid.innerHTML = '<div class="album-empty">불러오는 중…</div>';
  $('album-count').textContent = '';
  Input.setAnalog(0, 0);
  $('album-modal').classList.add('show');
  const rows = await listPhotos();
  $('album-count').textContent = `${rows.length}/100`;
  trackEvent('album_open', { count: rows.length });               // [GA4]
  if (!rows.length) {
    grid.innerHTML = '<div class="album-empty">아직 사진이 없어요. 📷 액션샷을 찍고 ☁️ 버튼으로 저장해보세요!</div>';
    return;
  }
  let urls = {};
  try {
    const res = await fetch(CONFIG.PHOTO_URLS_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ keys: rows.map(r => r.object_key) }),
    });
    urls = (await res.json())?.urls || {};
  } catch (e) { console.warn('[사진첩] URL 발급 실패:', e?.message || e); }
  grid.innerHTML = '';
  let shown = 0;
  rows.forEach(r => {
    const url = urls[r.object_key]; if (!url) return;
    shown++;
    const d = new Date(r.taken_at);
    const cell = document.createElement('div'); cell.className = 'album-cell';
    cell.innerHTML = `<img loading="lazy" src="${url}" alt="${escapeHtml(`고요한 숲 사진 · ${r.weather || ''} ${d.getMonth() + 1}/${d.getDate()}`)}"><span class="album-date">${escapeHtml(r.weather || '')} ${d.getMonth() + 1}/${d.getDate()}</span>`;
    cell.addEventListener('click', () => {
      albumCur = { key: r.object_key, url };
      $('album-img').src = url;
      $('album-view').classList.add('show');
    });
    grid.appendChild(cell);
  });
  if (!shown) grid.innerHTML = '<div class="album-empty">사진을 불러오지 못했어요. ☁️ 서버 설정을 확인해주세요</div>';
}

export function installPhotos(ctx) {
  ({ $, ui, escapeHtml, isGuestNow } = ctx);
  $('photo-btn').addEventListener('click', async () => {
    if (photoBusy) return;
    photoBusy = true;
    Input.setAnalog(0, 0); $('photo-btn').classList.remove('pulse');
    ui.toast('📸 찰칵…!');
    // 카메라가 캐릭터에 밀착 + 랜덤 포즈 → 포즈 정점 프레임에서 캡처(역동샷)
    let data = await Input.captureActionShot();
    photoBusy = false;
    if (!data) { ui.toast('사진 캡처에 실패했어요'); return; }
    data = await frameActionShot(data);   // 📸 공유 카드 합성(프레임+타이틀+도감 진행도)
    lastPhoto = data; $('photo-img').src = data;
    const pc = $('photo-cloud'); pc.disabled = false; pc.textContent = '☁️ 사진첩';   // 새 사진 → 저장 버튼 초기화
    const ps = $('photo-save'); ps.disabled = false; ps.textContent = '💾 저장';        // 📱 앱의 '✅ 저장됨' 되돌리기
    $('photo-modal').classList.add('show');
    trackEvent('photo_capture');   // [GA4]
  });
  $('photo-close').addEventListener('click', () => $('photo-modal').classList.remove('show'));
  $('photo-cloud').addEventListener('click', async () => {
    if (isGuestNow()) { ui.loginNudge('album'); return; }       // 게스트 → 회원 전환 넛지
    if (!lastPhoto || cloudBusy) return;
    cloudBusy = true;
    const btn = $('photo-cloud'); btn.disabled = true; btn.textContent = '☁️ 저장 중…';
    try {
      const jpeg = await toJpegDataURL(lastPhoto);
      if (!jpeg) throw new Error('convert_failed');
      const res = await fetch(CONFIG.PHOTO_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: jpeg }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) { ui.toast('📸 사진첩 가득 · 지우면 더 담겨요', 3200); }
      else if (res.status === 503) { ui.toast('☁️ 사진첩 서버 준비 중이에요. 조금만 기다려주세요'); }
      else if (!res.ok || !d.ok) { throw new Error(d.error || 'HTTP ' + res.status); }
      else {
        insertPhotoRow(d.key, iconText($('time-emoji')) || null);   // 목록용 메타 행
        btn.textContent = '✅ 저장됨';                                  // 같은 사진 중복 저장 방지(비활성 유지)
        ui.toast(`☁️ 사진첩에 저장했어요! (${d.count}/${d.max})`);
        trackEvent('photo_upload', { count: d.count });               // [GA4] 사진첩 퍼널
        cloudBusy = false;
        return;
      }
    } catch (err) {
      console.warn('[사진첩] 업로드 실패:', err?.message || err);
      ui.toast('☁️ 저장에 실패했어요. 잠시 후 다시 시도해주세요');
    }
    btn.disabled = false; btn.textContent = '☁️ 사진첩'; cloudBusy = false;
  });
  $('album-btn').addEventListener('click', openAlbum);
  $('album-close').addEventListener('click', () => $('album-modal').classList.remove('show'));
  $('album-modal').addEventListener('click', (e) => { if (e.target === $('album-modal')) $('album-modal').classList.remove('show'); });
  $('album-view-close').addEventListener('click', () => $('album-view').classList.remove('show'));
  $('album-view').addEventListener('click', (e) => { if (e.target === $('album-view')) $('album-view').classList.remove('show'); });
  $('album-share').addEventListener('click', async () => {
    if (!albumCur) return;
    if (IS_ANDROID) {                                  // 📱 앱: 링크를 공유 시트로
      try { await shareUrlNative({ plugin: capPlugin('Photo'), url: albumCur.url, title: t('🌿 고요한 숲') }); } catch (e) { ui.toast('공유하지 못했어요'); }
      return;
    }
    try {
      if (navigator.share) await navigator.share({ title: t('🌿 고요한 숲'), url: albumCur.url });
      else { await navigator.clipboard.writeText(albumCur.url); ui.toast('🔗 사진 링크를 복사했어요 (1시간 유효)'); }
    } catch (e) {}   // 공유 시트 취소는 정상 흐름
  });
  $('album-delete').addEventListener('click', async () => {
    if (!albumCur) return;
    try {
      const res = await fetch(`${CONFIG.PHOTO_API}?key=${encodeURIComponent(albumCur.key)}`, {
        method: 'DELETE', headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      deletePhotoRow(albumCur.key);
      trackEvent('photo_delete');                                   // [GA4]
      $('album-view').classList.remove('show');
      ui.toast('🗑️ 사진을 지웠어요');
      openAlbum();                                                  // 목록 갱신
    } catch (err) { ui.toast('삭제에 실패했어요. 잠시 후 다시'); }
  });
  $('photo-save').addEventListener('click', async () => {
    if (!lastPhoto) return;
    if (IS_ANDROID) {                                  // 📱 앱: 갤러리(사진/calmforest)에 바로 저장
      const btn = $('photo-save');
      //  처음 한 번은 시스템 "사진 접근 허용" 창이 뜬다 — 놓치지 않게 먼저 알려 준다(2026-09-25 실기기: 창을 못 보고 안 되는 줄 앎)
      let first = false; try { first = !localStorage.getItem('cf_photo_saved'); } catch {}
      if (first) ui.toast('📷 사진 저장 권한을 물어보면 \'허용\'을 눌러 주세요', 4000);
      try {
        await savePhotoNative({ plugin: capPlugin('Photo'), dataUrl: lastPhoto });
        try { localStorage.setItem('cf_photo_saved', '1'); } catch {}
        btn.textContent = '✅ 저장됨'; btn.disabled = true;   // 새 사진을 찍으면 되돌린다(photo-btn)
        ui.toast('🖼️ 갤러리 calmforest 앨범에 저장했어요');
      } catch (e) {
        ui.toast(/legacy/.test(e?.message) ? '이 기기는 바로 저장이 안 돼요 — 📤공유로 보내 주세요'
                                           : '사진을 저장하지 못했어요 — 사진 권한을 허용했는지 확인해 주세요', 4000);
      }
      return;
    }
    const a = document.createElement('a'); a.href = lastPhoto; a.download = 'calmforest-' + Date.now() + '.png'; a.click();
  });
  $('photo-share').addEventListener('click', async () => {
    if (!lastPhoto) return;
    if (IS_ANDROID) {                                  // 📱 앱: 안드로이드 공유 시트
      try {
        await sharePhotoNative({ plugin: capPlugin('Photo'), dataUrl: lastPhoto, text: t('내 마을 구경오세요 · https://calmforest.cloud') });
        trackEvent('photo_share');   // [GA4] 공유 훅
      } catch (e) { ui.toast('공유하지 못했어요'); }
      return;
    }
    try {
      const blob = await (await fetch(lastPhoto)).blob();
      const file = new File([blob], 'calmforest.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '고요한 숲 🌿', text: t('내 마을 구경오세요 · https://calmforest.cloud') });
        trackEvent('photo_share');   // [GA4] 공유 훅
      } else {
        ui.toast('이 기기는 바로 공유가 안 되니 💾저장으로 받아 공유해요');
      }
    } catch (e) { /* 사용자 취소 등은 무시 */ }
  });
  return {  };
}
