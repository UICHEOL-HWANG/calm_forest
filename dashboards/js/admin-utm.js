import { $, esc, CHAR, bootAdmin, showMsg } from './admin-common.js';

const API = '/api/utm-links';
const DEFAULT_LANDINGS = ['web', 'play', 'ios'];
let sb = null;
let state = { sources: [], mediums: [], landings: [], recent: [] };
let toastT = 0;

const slugify = (v) => String(v || '').toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40);
const lastMediumFor = (source, recent) => recent.find((r) => r.source === source && r.medium)?.medium || '';

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 1800);
}

async function api(method, body) {
  const { data } = await sb.auth.getSession();
  const res = await fetch(API, {
    method,
    headers: { Authorization: `Bearer ${data?.session?.access_token || ''}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `요청 실패 (${res.status})`);
  return out;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); } catch { toast('복사하지 못했어요. 길게 눌러 복사해 주세요'); }
}

function qrImg(text) {
  if (typeof window.qrcode !== 'function') return '';
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createDataURL(6, 2);
}

function fillOptions(sel, values, keep) {
  sel.innerHTML = values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (keep && values.includes(keep)) sel.value = keep;
}

function fillDatalist(id, values) {
  $(id).innerHTML = [...new Set(values.filter(Boolean))].slice(0, 30).map((v) => `<option value="${esc(v)}"></option>`).join('');
}

function renderForm() {
  fillOptions($('source'), state.sources, $('source').value);
  fillOptions($('medium'), state.mediums, $('medium').value || lastMediumFor($('source').value, state.recent));
  fillDatalist('campaignList', state.recent.map((r) => r.campaign));
  fillDatalist('contentList', ['post', 'story', 'profile_bio', 'share', ...state.recent.map((r) => r.content)]);
  if (!$('lands').children.length) {
    $('lands').innerHTML = state.landings.map((l) => `<label><input type="checkbox" value="${esc(l.id)}"${DEFAULT_LANDINGS.includes(l.id) ? ' checked' : ''}>${esc(l.label)}</label>`).join('');
  }
}

function renderRecent() {
  const rows = state.recent.map((r) => `<tr>
      <td class="mut">${esc(String(r.date).slice(5))}</td>
      <td><b>${esc(r.source)}</b><br><span class="mut">${esc(r.medium)}</span></td>
      <td>${esc(r.campaign)}${r.content ? `<br><span class="mut">${esc(r.content)}</span>` : ''}</td>
      <td class="hide-m mut">${esc(r.memo)}</td>
      <td>${r.shortUrl
        ? `<button class="btn sm" data-copy="${esc(r.shortUrl)}">/go/${esc(r.code)}</button>`
        : (r.finalUrl ? `<button class="btn sm" data-copy="${esc(r.finalUrl)}">원본 복사</button>` : '<span class="mut">—</span>')}</td>
      <td class="n">${r.clicks == null ? '<span class="mut">—</span>' : r.clicks}</td>
    </tr>`).join('');
  $('recent').innerHTML = rows || '<tr><td colspan="6" class="mut">아직 기록이 없어요.</td></tr>';
}

function renderResult(links) {
  const label = Object.fromEntries(state.landings.map((l) => [l.id, l.label]));
  $('res').innerHTML = links.map((l, i) => `<div class="lk">
      <div class="lk-h"><span>${esc(label[l.landing] || l.landing)}</span>
        <span class="acts"><button class="btn sm" data-copy="${esc(l.finalUrl)}">원본 복사</button><button class="btn sm" data-qr="${i}">QR</button></span></div>
      <div class="lk-s"><code>${esc(l.shortUrl)}</code><button class="btn sm" data-copy="${esc(l.shortUrl)}">복사</button></div>
      <div class="lk-f">${esc(l.finalUrl)}</div>
      <div class="lk-q" id="qr${i}"><img alt="QR" src="${qrImg(l.shortUrl)}"></div>
    </div>`).join('');
}

async function load() {
  state = await api('GET');
  renderForm();
  renderRecent();
}

function wire() {
  for (const id of ['campaign', 'content']) {
    $(id).addEventListener('input', (e) => {
      const v = slugify(e.target.value);
      if (v !== e.target.value) e.target.value = v;
    });
  }
  $('source').addEventListener('change', () => {
    const m = lastMediumFor($('source').value, state.recent);
    if (m && state.mediums.includes(m)) $('medium').value = m;
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) return copy(c.dataset.copy);
    const q = e.target.closest('[data-qr]');
    if (q) $(`qr${q.dataset.qr}`).classList.toggle('on');
  });
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('err').textContent = '';
    const landings = [...$('lands').querySelectorAll('input:checked')].map((x) => x.value);
    if (!landings.length) { $('err').textContent = '보낼 곳을 하나 이상 골라 주세요.'; return; }
    const body = {
      source: $('source').value, medium: $('medium').value,
      campaign: slugify($('campaign').value), content: slugify($('content').value),
      memo: $('memo').value.trim(), landings,
    };
    $('submit').disabled = true;
    $('submit').textContent = '만드는 중…';
    try {
      const out = await api('POST', body);
      renderResult(out.links);
      toast(`시트에 ${out.links.length}줄 기록했어요`);
      await load();
    } catch (err) {
      $('err').textContent = err.message;
    } finally {
      $('submit').disabled = false;
      $('submit').textContent = '링크 만들고 시트에 기록';
    }
  });
}

(async () => {
  sb = await bootAdmin({ allowShare: false });
  if (!sb) { $('who').textContent = ''; return; }
  const [{ data: isAdmin, error }, { data: sess }] = await Promise.all([sb.rpc('cf_is_admin'), sb.auth.getSession()]);
  if (error || !isAdmin) {
    $('who').textContent = '';
    showMsg(`<img class="msg-char" src="${CHAR('panda')}" alt="">🚫 관리자 계정이 아닙니다.<br><small style="opacity:.6">${esc(sess?.session?.user?.email || '')}</small>`);
    return;
  }
  $('who').innerHTML = `<b>${esc(sess.session.user.email)}</b> 로 로그인됨`;
  $('dash').hidden = false;
  wire();
  try { await load(); } catch (err) { $('err').textContent = err.message; }
})();
