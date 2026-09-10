// =============================================================
//  📱 calm forest · service worker (PWA 설치 조건용 최소 구성)
//  ------------------------------------------------------------
//  ⚠️ 게임 자산(js/·index.html)은 절대 캐시하지 않는다.
//     _headers 가 no-cache 로 "새로고침 = 최신 코드"를 보장하는데, SW 가 코드를 들고 있으면
//     배포 후에도 옛 코드가 남는 함정이 생긴다(과거 ?v=NN 캐시 사고와 같은 종류).
//  하는 일: 오프라인 안내 페이지 한 장만 미리 담아 두고, 화면 이동(navigate) 요청이
//  네트워크에서 실패했을 때만 그 페이지를 보여준다. 나머지 요청은 손대지 않는다.
// =============================================================
const CACHE = 'calmforest-offline-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ⚠️ 캐시에 담긴 응답을 그대로 돌려주면 안 된다.
//    Cloudflare 가 /offline.html → /offline 로 307 하므로 캐시된 응답은 redirected:true 인데,
//    navigate 요청은 redirect 모드가 'manual' 이라 브라우저가 "redirected response" 라며 거부한다
//    (= 오프라인일 때 우리 안내 대신 브라우저 기본 오류 화면이 뜬다).
//    본문·헤더만 옮겨 새 Response 로 만들면 그 표식이 떨어진다.
async function offlinePage() {
  const cached = await caches.match(OFFLINE_URL);
  if (!cached) return Response.error();
  return new Response(await cached.blob(), { status: 200, headers: cached.headers });
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;   // 자산·API 는 브라우저 기본 동작 그대로
  event.respondWith(
    fetch(event.request).catch(() => offlinePage()),
  );
});
