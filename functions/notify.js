// =============================================================
//  calm forest · 📧 운영 알림 메일 (Cloudflare Email Routing)
//  ------------------------------------------------------------
//  왜 이메일인가: 새 시크릿이 없다. Email Routing 을 켜면 워커가
//  `send_email` 바인딩으로 바로 보낸다. API 키도 웹훅 URL 도 필요 없다.
//
//  ⚠️ Cloudflare 는 **검증된 수신 주소로만** 보낸다. 우리는 운영자 한 명한테만
//     보내므로 제약이 아니라 안전장치다 — 코드가 폭주해도 남한테 못 간다.
//
//  ⚠️ 보내는 알림은 "승인 요청"이 아니라 "상태 보고"다.
//     카드 묶음은 만들 때 이미 검수를 통과했다. 사흘 뒤 또 물으면 소음이다.
//     사람이 움직여야 하는 두 경우만 보낸다 — 큐가 비었을 때, 발행이 깨졌을 때.
// =============================================================
import { EmailMessage } from 'cloudflare:email';

const SENDER = 'cardnews@calmforest.cloud';

/** UTF-8 → base64. 한글 제목·본문이 깨지지 않게 바이트로 먼저 돌린다 */
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));   // 스택 한도를 피해 조각으로
  }
  return btoa(bin);
}

/** base64 본문은 한 줄 76자를 넘기면 거부하는 서버가 있다 */
const wrap76 = s => s.replace(/(.{76})/g, '$1\r\n');

/** RFC 5322 평문 메일. 라이브러리를 안 쓴다 — 의존성 하나가 배포 전체를 흔든다 */
function buildMime({ to, subject, text }) {
  return [
    `From: calm forest <${SENDER}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Message-ID: <${crypto.randomUUID()}@calmforest.cloud>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(text)),
  ].join('\r\n');
}

/**
 * 운영자에게 알림을 보낸다. 실패해도 throw 하지 않는다 —
 * 알림이 안 갔다고 발행 자체를 되돌릴 수는 없다. 대신 로그에 남긴다.
 * @returns {Promise<boolean>} 보냈으면 true
 */
export async function notify(env, subject, text) {
  if (!env.NOTIFY) {
    console.warn(JSON.stringify({ message: 'notify: send_email 바인딩 없음', subject }));
    return false;
  }
  const to = env.NOTIFY_TO;
  if (!to) {
    console.warn(JSON.stringify({ message: 'notify: NOTIFY_TO 미설정', subject }));
    return false;
  }
  try {
    await env.NOTIFY.send(new EmailMessage(SENDER, to, buildMime({ to, subject, text })));
    return true;
  } catch (err) {
    // 주소 미검증·Email Routing 미설정이 여기로 온다. 원문을 그대로 남긴다.
    console.error(JSON.stringify({
      message: 'notify 실패', subject,
      error: err instanceof Error ? err.message : String(err),
    }));
    return false;
  }
}
