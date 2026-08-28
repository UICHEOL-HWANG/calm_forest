#!/usr/bin/env node
// =============================================================
//  calm forest · 파비콘 파일 생성기 (의존성 0)
//  ------------------------------------------------------------
//  왜 필요한가: index.html 에 파비콘을 data:image/svg+xml 인라인으로
//  넣어두면 브라우저 탭에는 보이지만, 구글 검색결과 파비콘은 뜨지 않습니다.
//  구글은 크롤러가 따로 GET 할 수 있는 "실제 파일 URL" 만 인정하기 때문.
//  → 여기서 같은 그림을 실제 파일(.svg/.ico/.png)로 굽습니다.
//
//  사용: node scripts/make-favicon.mjs
//  산출: assets/favicon/ 아래 favicon.svg · favicon.ico(16/32/48) · favicon-96.png · apple-touch-icon.png(180)
//        (배포 시 scripts/build-web.mjs 가 dist 루트로 펴 준다 — 공개 URL 은 /favicon.ico 그대로)
//  (셋 다 build-web.mjs 의 INCLUDE 에 있어야 배포됩니다)
// =============================================================
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = path.join(ROOT, 'assets', 'favicon');

// ── 그림 정의 (64x64 좌표계 · 기존 인라인 SVG 와 동일) ──────────
const BG = '#bfe8c9', TRUNK = '#d8a679';
const LEAF_MAIN = '#8fd6a0', LEAF_L = '#a0e0d0', LEAF_R = '#b7e6a8';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="${BG}"/>
  <rect x="29" y="34" width="6" height="20" rx="3" fill="${TRUNK}"/>
  <circle cx="32" cy="24" r="15" fill="${LEAF_MAIN}"/>
  <circle cx="22" cy="30" r="9" fill="${LEAF_L}"/>
  <circle cx="42" cy="30" r="9" fill="${LEAF_R}"/>
</svg>
`;

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// ── 래스터라이저: 64x64 좌표계를 size 픽셀로, 4x 슈퍼샘플링 ─────
function render(size, { round = true } = {}) {
  const SS = 4, W = size * SS, s = W / 64;           // 64단위 → 서브픽셀
  const px = new Float64Array(W * W * 4);            // RGBA 누산 버퍼

  const put = (x, y, [r, g, b]) => {
    const i = (y * W + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };

  // 라운드 사각형 (x,y,w,h,r 은 64단위)
  const rrect = (x, y, w, h, r, color) => {
    const c = hex(color);
    const [x0, y0, x1, y1] = [x * s, y * s, (x + w) * s, (y + h) * s];
    const rr = r * s;
    for (let py = Math.max(0, Math.floor(y0)); py < Math.min(W, Math.ceil(y1)); py++) {
      for (let pxx = Math.max(0, Math.floor(x0)); pxx < Math.min(W, Math.ceil(x1)); pxx++) {
        // 모서리 안쪽 원 중심까지의 거리로 라운드 판정
        const cx = Math.min(Math.max(pxx + .5, x0 + rr), x1 - rr);
        const cy = Math.min(Math.max(py + .5, y0 + rr), y1 - rr);
        const dx = pxx + .5 - cx, dy = py + .5 - cy;
        if (dx * dx + dy * dy <= rr * rr) put(pxx, py, c);
      }
    }
  };

  const circle = (cx, cy, r, color) => {
    const c = hex(color);
    const [Cx, Cy, R] = [cx * s, cy * s, r * s];
    for (let py = Math.max(0, Math.floor(Cy - R)); py < Math.min(W, Math.ceil(Cy + R)); py++) {
      for (let pxx = Math.max(0, Math.floor(Cx - R)); pxx < Math.min(W, Math.ceil(Cx + R)); pxx++) {
        const dx = pxx + .5 - Cx, dy = py + .5 - Cy;
        if (dx * dx + dy * dy <= R * R) put(pxx, py, c);
      }
    }
  };

  // SVG 와 같은 순서로 겹쳐 그린다
  rrect(0, 0, 64, 64, round ? 16 : 0, BG);
  rrect(29, 34, 6, 20, 3, TRUNK);
  circle(32, 24, 15, LEAF_MAIN);
  circle(22, 30, 9, LEAF_L);
  circle(42, 30, 9, LEAF_R);

  // 다운샘플 → 안티앨리어싱 (배경 밖 투명 영역은 알파로 남김)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
      }
      const n = SS * SS, i = (y * size + x) * 4;
      const cov = a / n / 255;                       // 픽셀 커버리지
      // 색은 "덮인 서브픽셀들의 평균" 이어야 하므로 alpha 로 나눠 복원
      out[i]     = cov ? Math.round(r / n / cov) : 0;
      out[i + 1] = cov ? Math.round(g / n / cov) : 0;
      out[i + 2] = cov ? Math.round(b / n / cov) : 0;
      out[i + 3] = Math.round(cov * 255);
    }
  }
  return out;
}

// ── 최소 PNG 인코더 (RGBA8, filter 0) ──────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function png(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // 8bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;                                        // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO 컨테이너 (PNG 를 그대로 담는 Vista+ 형식) ───────────────
function ico(entries) {
  const dir = Buffer.alloc(6 + entries.length * 16);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(entries.length, 4);
  let offset = dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = 6 + i * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir[o + 2] = 0; dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([dir, ...entries.map(e => e.buf)]);
}

// ── 굽기 ────────────────────────────────────────────────────────
await mkdir(ICONS, { recursive: true });
await writeFile(path.join(ICONS, 'favicon.svg'), SVG);

// 구글 권장은 48px 의 배수 → 16/32/48 을 한 ico 에 담는다(탭·검색 모두 커버)
const sizes = [16, 32, 48];
await writeFile(path.join(ICONS, 'favicon.ico'),
  ico(sizes.map(size => ({ size, buf: png(render(size), size) }))));

// 검색결과가 SVG 를 못 읽는 경우를 대비한 PNG 원본 + iOS 홈화면 아이콘
await writeFile(path.join(ICONS, 'favicon-96.png'), png(render(96), 96));
await writeFile(path.join(ICONS, 'apple-touch-icon.png'), png(render(180, { round: false }), 180));

console.log('✅ assets/favicon/ — favicon.svg · favicon.ico(16/32/48) · favicon-96.png · apple-touch-icon.png 생성');
