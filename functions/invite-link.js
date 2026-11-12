import { readInviteParam } from '../js/referral/rules.js';

const AASA = '/.well-known/apple-app-site-association';

export function inviteLinkTarget(pathname) {
  const code = readInviteParam(pathname);
  return code ? `/?invite=${code}` : '/';
}

export async function onRequestGet({ request }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const dest = new URL(inviteLinkTarget(url.pathname), url.origin);
  for (const [k, v] of url.searchParams) if (k !== 'invite') dest.searchParams.append(k, v);
  return new Response(null, { status: 302, headers: { Location: dest.toString(), 'Cache-Control': 'no-store' } });
}

export async function wellKnown({ request, env }) {
  const page = await env.ASSETS.fetch(new Request(new URL(AASA, request.url), request));
  const res = new Response(page.body, page);
  if (page.ok) res.headers.set('Content-Type', 'application/json');
  return res;
}
