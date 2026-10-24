// =============================================================
//  관리자 홈(dashboards/index.html) — 관리자 판정 후 페이지 카드를 연다.
//  애널리틱스 카드에는 최근 7일 요약(북극성·평균 DAU·D1)을 붙인다.
// =============================================================
import { $, nf, esc, CHAR, bootAdmin, showMsg, showNotAdmin } from './admin-common.js';

(async () => {
  const sb = await bootAdmin({ allowShare: false });   // 허브는 공유 링크로 열지 않는다(목록 자체가 관리자용)
  if (!sb) { $('who').textContent = ''; return; }
  const [{ data: isAdmin, error }, { data: sess }] = await Promise.all([sb.rpc('cf_is_admin'), sb.auth.getSession()]);
  if (error || !isAdmin) {
    $('who').textContent = '';
    showNotAdmin(sb, showMsg, { email: sess?.session?.user?.email, prefix: `<img class="msg-char" src="${CHAR('panda')}" alt="">` });
    return;
  }
  $('who').innerHTML = `<b>${esc(sess.session.user.email)}</b> 로 로그인됨`;
  $('hubWrap').hidden = false;

  const live = $('liveKpi');
  const { data, error: e2 } = await sb.rpc('cf_admin_dashboard', { days: 7 });
  live.classList.remove('skel');
  if (e2 || !data?.kpis) { live.textContent = '요약을 불러오지 못했어요 — 페이지에서 직접 확인하세요.'; return; }
  const k = data.kpis;
  live.innerHTML = `<span>★ 북극성 <b>${k.nsm ?? '—'}</b>/일</span><span>평균 DAU <b>${k.avg_dau ?? '—'}</b></span>`
    + `<span>D1 <b>${k.d1 == null ? '—' : k.d1 + '%'}</b></span><span>신규 <b>${nf(k.new_users)}</b></span>`;
})();
