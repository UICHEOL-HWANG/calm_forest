// =============================================================
//  calm forest · 이탈 예측용 롤링 윈도 (최근 WINDOW_SIZE 샘플)
//  ------------------------------------------------------------
//  ▶ 왜 logger.js 안이 아니라 여기인가:
//    ① logger.js 의 전송 버퍼는 1.5초마다 비워진다(buffer = []). 트리거 시점에
//       직전 10행을 읽으려면 별도 보관이 필요하다.
//    ② logger.js 는 최상위에서 window.addEventListener 를 부르므로 Node 에서
//       import 할 수 없다. 링 버퍼만 떼어두면 node --test 로 검증할 수 있다.
//  ▶ 브라우저 전역을 참조하지 않는다.
// =============================================================
import { WINDOW_SIZE } from './features.js';

let buf = [];

/** 샘플 하나를 밀어넣는다. WINDOW_SIZE 를 넘으면 가장 오래된 것을 버린다. */
export function pushSample(s) {
  buf.push(s);
  if (buf.length > WINDOW_SIZE) buf.shift();
}

/** 트리거 시점의 롤링 윈도. 얕은 복사로 내보내 내부 상태를 보호한다. */
export function getWindow() {
  return buf.map(s => ({ ...s }));
}

/** 세션이 바뀌면 비운다. */
export function resetWindow() {
  buf = [];
}
