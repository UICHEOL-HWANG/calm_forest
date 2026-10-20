export const SHORT_BASE = 'https://calmforest.cloud/go/';
export const APPLE_PT = '129595134';
export const MEMO_MAX = 300;
export const CT_MAX = 100;

export const LANDINGS = Object.freeze({
  web:  { label: '🌐 웹', url: 'https://calmforest.cloud/', kind: 'utm' },
  wiki: { label: '📖 위키', url: 'https://calmforest.cloud/wiki/', kind: 'utm' },
  app:  { label: '📲 앱(OS 자동)', url: 'https://calmforest.cloud/app', kind: 'utm' },
  play: { label: '📱 Play', url: 'https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest', kind: 'play' },
  ios:  { label: '🍎 App Store', url: 'https://apps.apple.com/app/apple-store/id6821420691', kind: 'ios' },
});

const SLUG = /^[a-z0-9_]{1,40}$/;

export function isSlug(v) {
  return typeof v === 'string' && SLUG.test(v);
}

export function validateInput(body, allowed) {
  const b = body || {};
  if (!allowed.sources.includes(b.source)) return { error: 'source 는 시트 허용 목록에서 골라 주세요' };
  if (!allowed.mediums.includes(b.medium)) return { error: 'medium 은 시트 허용 목록에서 골라 주세요' };
  if (!isSlug(b.campaign)) return { error: 'campaign 은 소문자·숫자·밑줄 40자 이내로 적어 주세요' };
  if (b.content && !isSlug(b.content)) return { error: 'content 는 소문자·숫자·밑줄 40자 이내로 적어 주세요' };
  if (b.memo != null && (typeof b.memo !== 'string' || b.memo.length > MEMO_MAX)) return { error: `memo 는 ${MEMO_MAX}자 이내로 적어 주세요` };
  const ls = b.landings;
  if (!Array.isArray(ls) || ls.length === 0 || new Set(ls).size !== ls.length || !ls.every((l) => Object.hasOwn(LANDINGS, l))) {
    return { error: 'landing 을 하나 이상 골라 주세요' };
  }
  return { ok: true };
}

function utmQuery({ source, medium, campaign, content }) {
  const q = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign });
  if (content) q.set('utm_content', content);
  return q.toString();
}

export function buildFinalUrl(landing, input) {
  const l = LANDINGS[landing];
  if (l.kind === 'play') return `${l.url}&referrer=${encodeURIComponent(utmQuery(input))}`;
  if (l.kind === 'ios') {
    const ct = [input.source, input.campaign, input.content].filter(Boolean).join('_').slice(0, CT_MAX);
    return `${l.url}?pt=${APPLE_PT}&ct=${ct}&mt=8`;
  }
  return `${l.url}?${utmQuery(input)}`;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function makeCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (x) => ALPHABET[x % ALPHABET.length]).join('');
}

export function sheetRow({ date, source, medium, campaign, content, memo, landing, finalUrl, shortUrl }) {
  return [date, source, medium, campaign, content || '', LANDINGS[landing].url, finalUrl, memo || '', shortUrl];
}

export function kstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
