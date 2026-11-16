import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exitSaveRequest, sendExitSave } from '../js/save-guard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const client = read('../js/supabase-client.js');
const game = read('../js/game.js');
const html = read('../index.html');

const NOW = 1_800_000_000_000;
const base = () => ({
  url: 'https://x.supabase.co', table: 'game_saves', anonKey: 'anon',
  auth: { uid: 'u1', token: 'tok', exp: NOW + 60_000 },
  row: { user_id: 'u1', state: { coins: 5 }, updated_at: '2026-11-17T00:00:00.000Z' },
  now: NOW,
});

test('exitSaveRequest — 나갈 때 저장은 페이지가 닫혀도 끝까지 가는 upsert 요청이다', () => {
  const r = exitSaveRequest(base());
  assert.equal(r.url, 'https://x.supabase.co/rest/v1/game_saves');
  assert.equal(r.init.method, 'POST');
  assert.equal(r.init.keepalive, true);
  assert.equal(r.init.headers.apikey, 'anon');
  assert.equal(r.init.headers.Authorization, 'Bearer tok');
  assert.equal(r.init.headers['Content-Type'], 'application/json');
  assert.match(r.init.headers.Prefer, /resolution=merge-duplicates/);
  assert.deepEqual(JSON.parse(r.init.body), base().row);
});

test('exitSaveRequest — 토큰이 없거나 남의 것이거나 만료됐으면 만들지 않는다', () => {
  assert.equal(exitSaveRequest({ ...base(), auth: { uid: null, token: null, exp: 0 } }), null);
  assert.equal(exitSaveRequest({ ...base(), auth: { uid: 'u2', token: 'tok', exp: NOW + 60_000 } }), null);
  assert.equal(exitSaveRequest({ ...base(), auth: { uid: 'u1', token: 'tok', exp: NOW } }), null);
  assert.equal(exitSaveRequest({ ...base(), auth: { uid: 'u1', token: 'tok', exp: NOW + 4_000 } }), null);
  assert.ok(exitSaveRequest({ ...base(), auth: { uid: 'u1', token: 'tok', exp: NOW + 6_000 } }));
  assert.equal(exitSaveRequest({ ...base(), auth: undefined }), null);
});

test('exitSaveRequest — 로그 전송과 나눠 쓰는 keepalive 한도(64KB)의 절반을 넘는 세이브는 만들지 않는다', () => {
  const big = { ...base().row, state: { note: '숲'.repeat(11_000) } };
  assert.equal(exitSaveRequest({ ...base(), row: big }), null);
  const ok = { ...base().row, state: { note: '숲'.repeat(9_000) } };
  assert.ok(exitSaveRequest({ ...base(), row: ok }));
});

test('sendExitSave — 받은 요청 그대로 보내고, 서버가 거절하면 던져서 재시도로 넘긴다', async () => {
  const req = exitSaveRequest(base());
  const calls = [];
  const okFetch = async (url, init) => { calls.push([url, init]); return { ok: true, status: 201 }; };
  assert.deepEqual(await sendExitSave(req, okFetch), { ok: true });
  assert.deepEqual(calls, [[req.url, req.init]]);
  await assert.rejects(sendExitSave(req, async () => ({ ok: false, status: 401 })), /save 401/);
  await assert.rejects(sendExitSave(req, async () => { throw new TypeError('Failed to fetch'); }), /Failed to fetch/);
});

test('supabase-client 의 나갈 때 저장도 저장 잠금을 지난 뒤에만 나간다', () => {
  const body = client.slice(client.indexOf('async function writeSave('), client.indexOf('export async function saveGame('));
  const lock = body.indexOf('saveLocked && !allowLocked');
  const exit = body.indexOf('exitSaveRequest(');
  assert.ok(lock > 0 && exit > lock);
  assert.match(body, /if \(exit\) return sendExitSave\(exit\);/);
  assert.match(client, /export async function saveGame\(gameState, opts\)/);
  assert.match(client, /writeSave\(row, \{ keepalive: opts\?\.keepalive === true \}\)/);
});

test('game.js 는 나갈 때 저장 표시를 첫 시도에만 넘기고 재시도는 보통 요청으로 보낸다', () => {
  assert.match(game, /export async function requestSave\(opts\)/);
  assert.match(game, /await saveGame\(getGameState\(\), \{ keepalive: opts\?\.keepalive === true \}\)/);
  const retry = game.slice(game.indexOf('async function retrySaveUntilOk('), game.indexOf('//  렌더러 / 씬 / 조명'));
  assert.match(retry, /await saveGame\(getGameState\(\)\)\)\.ok/);
  assert.doesNotMatch(retry, /keepalive/);
});

test('index.html 은 탭 숨김·종료 때만 keepalive 로 저장하고 1초 안의 중복은 건너뛴다', () => {
  assert.match(html, /setInterval\(\(\) => requestSave\(\), 30000\);/);
  assert.match(html, /requestSave\(\{ keepalive: true \}\)/);
  assert.match(html, /if \(document\.hidden\) exitSave\(\);/);
  assert.match(html, /addEventListener\('beforeunload', exitSave\);/);
  assert.match(html, /now - lastExitSave < 1000/);
  assert.doesNotMatch(html, /if \(document\.hidden\) requestSave\(\);/);
});
