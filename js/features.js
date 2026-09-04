// =============================================================
//  calm forest · 이탈 예측 피처 계산 (순수 함수)
//  ------------------------------------------------------------
//  ⚠️ 이 파일의 계산은 ml/sql/churn_trigger_sample.sql 과 값이 같아야 한다.
//     한쪽만 고치면 모델이 학습한 적 없는 입력을 받는다(training/serving skew).
//     tests/features.test.mjs 가 실제 BQ 로그 17건으로 그 동등성을 잡는다.
//     SQL 을 고치면 ml/tests/make_parity_fixture.py 를 다시 돌려 픽스처를 갱신한다.
//
//  ▶ 네트워크·DOM·게임 상태를 참조하지 않는다. 그래야 테스트할 수 있다.
// =============================================================

// SQL 의 rn BETWEEN trigger_rn-9 AND trigger_rn 과 동일
export const WINDOW_SIZE = 10;

// 계수 벡터의 순서. ml/train_churn.py 와 ml/api/churn.py 가 이 순서를 따른다.
export const FEATURE_ORDER = [
  'path_len', 'net_disp', 'wander_ratio', 'yaw_total',
  'mouse_travel', 'idle_ratio', 'is_first_session', 'trigger_kind',
];

/**
 * 롤링 윈도 행 배열 → 피처.
 * @param {{char_x:number,char_z:number,cam_yaw:number,mouse_x:number,mouse_y:number}[]} rows
 *        시간 오름차순 WINDOW_SIZE 행
 * @param {{isFirstSession:boolean, triggerKind:'time15'|'quest'}} opts
 * @returns {Object} wander_ratio 는 net_disp 가 0이면 null (대치는 서버가 한다)
 */
export function computeFeatures(rows, { isFirstSession, triggerKind }) {
  if (!Array.isArray(rows) || rows.length !== WINDOW_SIZE) {
    throw new Error(`피처 계산에는 정확히 ${WINDOW_SIZE}행이 필요하다 (받은 값: ${rows?.length})`);
  }

  let pathLen = 0, mouseTravel = 0, yawTotal = 0, idleCount = 0;

  // SQL 의 LAG 와 동일 — 첫 행은 이전이 없으므로 합계에서 빠진다.
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1], c = rows[i];
    pathLen     += Math.hypot(c.char_x - p.char_x, c.char_z - p.char_z);
    mouseTravel += Math.hypot(c.mouse_x - p.mouse_x, c.mouse_y - p.mouse_y);
    yawTotal    += Math.abs(c.cam_yaw - p.cam_yaw);
    // 좌표가 직전과 완전히 같은 행 = 로거의 하트비트 = 유휴 (SQL 도 = 로 비교)
    if (c.char_x === p.char_x && c.char_z === p.char_z) idleCount++;
  }

  const first = rows[0], last = rows[rows.length - 1];
  const netDisp = Math.hypot(last.char_x - first.char_x, last.char_z - first.char_z);

  return {
    path_len: pathLen,
    net_disp: netDisp,
    // SAFE_DIVIDE(path_len, NULLIF(net_disp, 0)) — 0 나눗셈은 NULL. 대치는 서버가 한다.
    wander_ratio: netDisp === 0 ? null : pathLen / netDisp,
    yaw_total: yawTotal,
    mouse_travel: mouseTravel,
    idle_ratio: idleCount / (rows.length - 1),   // 분모 = 변화량이 정의된 행 수
    is_first_session: isFirstSession ? 1 : 0,
    trigger_kind: triggerKind === 'quest' ? 1 : 0,
  };
}
