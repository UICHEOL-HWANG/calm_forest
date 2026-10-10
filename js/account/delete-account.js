// =============================================================
//  🗑️ 앱 안 계정 삭제 — pages/delete-account.html 과 같은 순서
//  ------------------------------------------------------------
//  App Store 5.1.1(v): 계정을 만들 수 있는 앱은 앱 안에서 삭제가 끝까지 돼야 한다.
//  웹 삭제 페이지는 새 탭(Safari)으로 열려 앱의 게임센터·Apple 세션이 없고 구글 로그인만 지원한다
//  → iOS 앱은 이 모듈로 지금 세션 그대로 지운다.
//   ① 사진 원본(오브젝트 스토리지) — 계정을 먼저 지우면 photos 행이 cascade 로 사라져 파일이 고아가 된다
//   ② delete_own_account RPC — auth.uid() 본인 행만, 나머지 테이블은 cascade
//  의존성은 인자로 받는다 — 테스트가 Supabase·fetch 를 흉내 낸다.
// =============================================================

// → { photoFailures }. 계정 RPC 실패는 throw(삭제됐다고 말하지 않게).
export async function deleteOwnAccount({ supabase, accessToken, apiBase = '', fetch = globalThis.fetch }) {
  const { data: photos } = await supabase.from('photos').select('object_key');
  let photoFailures = 0;
  for (const p of (photos || [])) {
    const r = await fetch(`${apiBase}/api/photo?key=${encodeURIComponent(p.object_key)}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer ' + accessToken },
    }).catch(() => ({ ok: false }));
    if (!r.ok) photoFailures++;
  }
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw new Error(error.message || String(error));
  return { photoFailures };
}
