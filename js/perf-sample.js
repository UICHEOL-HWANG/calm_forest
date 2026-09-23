// =============================================================
//  📱 FPS 샘플러 — 구글 플레이 앱에서 기기별 렌더 성능을 한 번 재서 보낸다
//  ------------------------------------------------------------
//  WebView 성능은 공개 실측이 없어 우리가 직접 잰다. USB 로 폰 한 대를 재는 대신
//  비공개 테스트 참가자 전원의 기기에서 세션당 1회 GA4 perf_sample 로 모은다.
//  플레이 중인 프레임만 세고(호출부가 mode==='play' 일 때만 frame() 을 부른다),
//  1초 넘는 간격(백그라운드·일시정지·로딩)은 측정에서 뺀다.
//
//  요약: fps_avg(평균) · fps_p10(가장 느린 10% 구간의 fps — 끊김 체감) ·
//        long_frame_pct(50ms 넘는 프레임 비율 %) · sample_sec · frames
// =============================================================

const GAP_MS = 1000;        // 이보다 긴 간격은 "멈춰 있던 시간"으로 보고 버린다
const LONG_FRAME_MS = 50;   // 20fps 미만 — 눈에 띄는 끊김

export function createPerfSampler({ sampleMs = 60000 } = {}) {
  const dts = [];
  let last = null, active = 0, done = false;

  return {
    // 매 프레임 호출. 샘플이 다 차는 그 한 번만 요약을 돌려주고 이후엔 null.
    frame(now) {
      if (done) return null;
      const dt = last == null ? null : now - last;
      last = now;
      if (dt == null || dt <= 0 || dt > GAP_MS) return null;
      dts.push(dt);
      active += dt;
      if (active + 1e-6 < sampleMs) return null;
      done = true;
      return summarize(dts, active);
    },
  };
}

function summarize(dts, active) {
  const sorted = [...dts].sort((a, b) => a - b);
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
  const long = dts.filter(d => d > LONG_FRAME_MS).length;
  return {
    fps_avg: Math.round(dts.length / (active / 1000)),
    fps_p10: Math.round(1000 / p90),
    long_frame_pct: Math.round((long / dts.length) * 100),
    sample_sec: Math.round(active / 1000),
    frames: dts.length,
  };
}

// 기기·렌더 설정 맥락 — 느린 기종을 가려 대응(그림자·해상도)할 근거. 개인정보 없음.
export function perfContext(renderer) {
  const ctx = {
    dpr: +renderer.getPixelRatio().toFixed(2),
    shadow: renderer.shadowMap.enabled ? 1 : 0,
    screen_w: screen.width,
    screen_h: screen.height,
    cores: navigator.hardwareConcurrency || 0,
    mem_gb: navigator.deviceMemory || 0,
  };
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    ctx.gpu = String(gpu || '').slice(0, 90);   // GA4 파라미터 값 100자 제한
  } catch (e) { ctx.gpu = 'unknown'; }
  return ctx;
}
