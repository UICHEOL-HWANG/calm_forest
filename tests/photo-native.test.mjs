// 📱 앱 사진 저장·공유 — js/photo-native.js
//   WebView 는 <a download> 를 조용히 무시하고 navigator.share 도 없다(2026-09-25 실기기: 저장·공유 무반응).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitDataUrl, savePhotoNative, sharePhotoNative, shareUrlNative } from '../js/photo-native.js';

function fakePlugin({ fail } = {}) {
  const calls = [];
  const rec = (name) => async (o) => { calls.push([name, o]); if (fail) throw new Error(fail); return { ok: true }; };
  return { calls, save: rec('save'), share: rec('share'), shareText: rec('shareText') };
}

test('splitDataUrl — data URL 을 mime·base64 로 나눈다', () => {
  assert.deepEqual(splitDataUrl('data:image/png;base64,QUJD'), { mime: 'image/png', base64: 'QUJD' });
  assert.deepEqual(splitDataUrl('data:image/jpeg;base64,eHk='), { mime: 'image/jpeg', base64: 'eHk=' });
});

test('splitDataUrl — data URL 이 아니면 null', () => {
  assert.equal(splitDataUrl('https://x/y.png'), null);
  assert.equal(splitDataUrl(null), null);
});

test('savePhotoNative — 확장자는 mime 에서, base64 만 네이티브로', async () => {
  const p = fakePlugin();
  await savePhotoNative({ plugin: p, dataUrl: 'data:image/jpeg;base64,eHk=', now: 123 });
  assert.deepEqual(p.calls, [['save', { base64: 'eHk=', mime: 'image/jpeg', fileName: 'calmforest-123.jpg' }]]);
});

test('sharePhotoNative — 이미지와 문구를 함께 넘긴다', async () => {
  const p = fakePlugin();
  await sharePhotoNative({ plugin: p, dataUrl: 'data:image/png;base64,QUJD', text: '구경오세요' });
  assert.deepEqual(p.calls, [['share', { base64: 'QUJD', mime: 'image/png', text: '구경오세요' }]]);
});

test('shareUrlNative — 링크 공유는 텍스트로', async () => {
  const p = fakePlugin();
  await shareUrlNative({ plugin: p, url: 'https://a/b', title: 't' });
  assert.deepEqual(p.calls, [['shareText', { text: 'https://a/b', title: 't' }]]);
});

test('플러그인이 없거나 data URL 이 아니면 던진다(호출부가 안내)', async () => {
  await assert.rejects(savePhotoNative({ plugin: undefined, dataUrl: 'data:image/png;base64,QQ==' }), /plugin/);
  await assert.rejects(savePhotoNative({ plugin: fakePlugin(), dataUrl: 'blob:x' }), /dataUrl/);
});

test('토스에서는 💾 저장 버튼을 숨긴다(웹뷰가 download 를 무시 — 공유는 됨)', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /body\.platform-toss #photo-save \{ display: none; \}/);
});
