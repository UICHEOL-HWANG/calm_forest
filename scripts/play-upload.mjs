#!/usr/bin/env node
// =============================================================
//  📤 구글 플레이 테스트 트랙 업로드 — Play Developer API(edits)
//  ------------------------------------------------------------
//  서비스 계정 **키 파일 없이** 간다(조직 정책 iam.disableServiceAccountKeyCreation).
//  로그인된 gcloud 계정이 play-publisher 서비스 계정을 잠깐 빌려(impersonation) 토큰을 받는다.
//   · GCP: agriquant 의 play-publisher@… — GCP 역할 없음, cheorish.hw 에게 TokenCreator 만
//   · Play Console: 그 서비스 계정에 calm forest "앱 정보 보기 + 테스트 트랙 출시"만
//     → 프로덕션 출시는 권한상 불가능하다.
//  한 번도 공개 출시된 적 없는 앱은 API 로 draft 만 만들 수 있다 — 그 경우 콘솔에서 출시 버튼을 누른다.
//
//  사용: npm run upload:play [-- --track internal --notes "메모"]
//        (먼저 npm run build:cap && cd android && ./gradlew bundleRelease)
// =============================================================
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SA = 'play-publisher@agriquant.iam.gserviceaccount.com';
const GCLOUD_ACCOUNT = 'cheorish.hw@gmail.com';
const AAB = 'android/app/build/outputs/bundle/release/app-release.aab';
const PKG = JSON.parse(readFileSync('capacitor.config.json', 'utf8')).appId;
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const TRACK = arg('track', 'internal');
const NOTES = arg('notes', '');
if (!['internal', 'alpha', 'beta'].includes(TRACK)) throw new Error(`테스트 트랙만 허용: ${TRACK}`);

const token = execFileSync('gcloud', ['auth', 'print-access-token',
  `--impersonate-service-account=${SA}`,   // 위임 토큰은 cloud-platform 범위 — Play API 가 받아 준다(--scopes 는 무시됨)
  `--account=${GCLOUD_ACCOUNT}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const auth = { Authorization: `Bearer ${token}` };

async function call(method, url, body, headers = {}) {
  const res = await fetch(url, { method, headers: { ...auth, ...headers }, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(/\?.*/, '')} → ${res.status}\n${text}`);
  return text ? JSON.parse(text) : {};
}
const json = (o) => [JSON.stringify(o), { 'Content-Type': 'application/json' }];

const mb = (statSync(AAB).size / 1024 / 1024).toFixed(2);
console.log(`[play-upload] ${PKG} → ${TRACK} · ${AAB} (${mb} MB)`);

const edit = await call('POST', `${API}/edits`, ...json({}));
const bundle = await call('POST', `${UPLOAD}/edits/${edit.id}/bundles?uploadType=media`,
  readFileSync(AAB), { 'Content-Type': 'application/octet-stream' });
console.log(`[play-upload] 업로드 완료 — versionCode ${bundle.versionCode}`);

async function setTrack(status) {
  const release = { versionCodes: [String(bundle.versionCode)], status };
  if (NOTES) release.releaseNotes = [{ language: 'ko-KR', text: NOTES }];
  await call('PUT', `${API}/edits/${edit.id}/tracks/${TRACK}`, ...json({ track: TRACK, releases: [release] }));
  return call('POST', `${API}/edits/${edit.id}:commit`);
}

try {
  await setTrack('completed');
  console.log(`[play-upload] ✅ ${TRACK} 트랙 출시 완료 (versionCode ${bundle.versionCode})`);
} catch (e) {
  if (!/draft/i.test(e.message)) throw e;
  // 미출시 앱은 draft 만 허용된다 — 같은 edit 에 draft 로 다시 건다
  await setTrack('draft');
  console.log(`[play-upload] 📝 ${TRACK} 트랙에 초안으로 올림 (versionCode ${bundle.versionCode})`);
  console.log('[play-upload]    앱이 아직 미출시라 API 는 초안만 만들 수 있다 → 콘솔 내부 테스트에서 "출시" 를 눌러 주세요.');
}
