// =============================================================
//  calm forest · 아이콘 공통 렌더러 (의존성 0)
//  ------------------------------------------------------------
//  브랜드 마크 = assets/brand/bear-25deg-1024.png (게임 속 곰 인형 렌더)
//  민트 그라디언트 배경 위에 곰을 얹어 원하는 크기의 RGBA 버퍼를 만든다.
//  favicon · 앱인토스 아이콘 · PWA 아이콘이 전부 이 파일 하나를 거친다
//  — 그림이 갈라지지 않게 하려는 것. 색·크롭을 바꾸려면 여기만 고친다.
//
//  Chrome 헤드리스를 쓰지 않는 이유: SVG 를 <img> 로 렌더하면 외부 이미지
//  참조가 차단(secure static mode)돼 곰 PNG 가 그려지지 않는다.
// =============================================================
import { readFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BEAR_PNG = path.join(ROOT, 'assets', 'brand', 'bear-25deg-1024.png');

// ── 브랜드 상수 ────────────────────────────────────────────────
export const SKY_TOP = '#d9f0df', SKY_BOT = '#bfe8c9';   // index.html theme-color 와 같은 계열
export const ROUND_RATIO = 0.25;                          // 라운드 반지름 = 변의 25%
const BEAR_BOX = [90, 29, 844, 966];                      // 곰 알파 바운딩 박스 (x,y,w,h)

const SS = 4;                                             // 슈퍼샘플 배수
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// ── PNG 디코더 (8bit, non-interlaced) ──────────────────────────
export function decodePNG(buf) {
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG 미지원');
    } else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`8bit PNG 만 지원 (depth=${depth})`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error(`color type 미지원 (${ctype})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    raw.copy(cur, 0, p, p + stride); p += stride;
    for (let i = 0; i < stride; i++) {                    // 필터 해제
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = cur[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * ch, d = (y * w + x) * 4;
      if (ch === 4)      { out[d] = cur[s]; out[d+1] = cur[s+1]; out[d+2] = cur[s+2]; out[d+3] = cur[s+3]; }
      else if (ch === 3) { out[d] = cur[s]; out[d+1] = cur[s+1]; out[d+2] = cur[s+2]; out[d+3] = 255; }
      else if (ch === 2) { out[d] = out[d+1] = out[d+2] = cur[s]; out[d+3] = cur[s+1]; }
      else               { out[d] = out[d+1] = out[d+2] = cur[s]; out[d+3] = 255; }
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

// ── PNG 인코더 (RGBA8, filter 0) ───────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
// rgb:true 면 알파 채널을 뺀 8bit RGB(color type 2)로 굽는다 —
// 앱인토스 콘솔은 "배경 불투명" 을 요구하므로 투명도 자체가 없는 편이 안전하다.
export function encodePNG(rgba, size, { rgb = false } = {}) {
  const ch = rgb ? 3 : 4;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = rgb ? 2 : 6;                     // 8bit RGB / RGBA
  const raw = Buffer.alloc(size * (size * ch + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * ch + 1);
    raw[row] = 0;                                         // filter: none
    if (rgb) for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4, d = row + 1 + x * 3;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
    } else rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO 컨테이너 (PNG 를 그대로 담는 Vista+ 형식) ───────────────
export function encodeICO(entries) {
  const dir = Buffer.alloc(6 + entries.length * 16);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(entries.length, 4);
  let offset = dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = 6 + i * 16;
    dir[o] = dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([dir, ...entries.map(e => e.buf)]);
}

// ── 곰 원본 (모듈당 한 번만 디코드) ─────────────────────────────
let _bear = null;
const bear = () => (_bear ??= decodePNG(readFileSync(BEAR_PNG)));

// src 영역을 dst 의 사각형으로 박스필터 리샘플 + 알파 합성
function blit(dst, DW, src, [sx, sy, sw, sh], dx, dy, dw, dh) {
  for (let y = 0; y < dh; y++) {
    const py = dy + y; if (py < 0 || py >= DW) continue;
    const ys = sy + (y * sh) / dh, ye = sy + ((y + 1) * sh) / dh;
    for (let x = 0; x < dw; x++) {
      const px = dx + x; if (px < 0 || px >= DW) continue;
      const xs = sx + (x * sw) / dw, xe = sx + ((x + 1) * sw) / dw;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let iy = Math.floor(ys); iy < Math.ceil(ye); iy++) {
        if (iy < 0 || iy >= src.h) continue;
        for (let ix = Math.floor(xs); ix < Math.ceil(xe); ix++) {
          if (ix < 0 || ix >= src.w) continue;
          const i = (iy * src.w + ix) * 4, al = src.data[i + 3] / 255;
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al; a += al; n++;
        }
      }
      if (!n || a <= 0) continue;
      const A = a / n, d = (py * DW + px) * 4, da = dst[d + 3] / 255;
      const oa = A + da * (1 - A);
      dst[d]     = Math.round((r / a * A + dst[d]     * da * (1 - A)) / oa);
      dst[d + 1] = Math.round((g / a * A + dst[d + 1] * da * (1 - A)) / oa);
      dst[d + 2] = Math.round((b / a * A + dst[d + 2] * da * (1 - A)) / oa);
      dst[d + 3] = Math.round(oa * 255);
    }
  }
}

/**
 * 아이콘 한 장을 RGBA 버퍼로 렌더한다.
 * @param {number} size   한 변 픽셀
 * @param {object} opt
 *   round  라운드 사각 여부 (false = 정사각 — 앱인토스·maskable·apple-touch)
 *   pad    곰이 차지하는 비율 (1 = 프레임에 꽉)
 *   bg     false 면 배경을 그리지 않는다(투명) — 브라우저 탭 파비콘 전용.
 *          앱인토스는 불투명 배경 필수, iOS 홈화면은 투명을 검정으로 채우고,
 *          PWA maskable 은 캔버스를 꽉 채워야 하므로 그쪽엔 쓸 수 없다.
 */
export function renderIcon(size, { round = true, pad = 0.99, bg = true } = {}) {
  const W = size * SS;
  const px = Buffer.alloc(W * W * 4);

  // 배경 — 세로 그라디언트 + (선택) 라운드. bg:false 면 통째로 건너뛴다.
  if (bg) {
    const top = hex(SKY_TOP), bot = hex(SKY_BOT);
    const R = round ? W * ROUND_RATIO : 0;
    for (let y = 0; y < W; y++) {
      const t = y / (W - 1);
      const c = [0, 1, 2].map(i => Math.round(top[i] + (bot[i] - top[i]) * t));
      for (let x = 0; x < W; x++) {
        if (R) {
          const cx = Math.min(Math.max(x + .5, R), W - R), cy = Math.min(Math.max(y + .5, R), W - R);
          const dx = x + .5 - cx, dy = y + .5 - cy;
          if (dx * dx + dy * dy > R * R) continue;
        }
        const i = (y * W + x) * 4;
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
      }
    }
  }

  // 곰 — 세로 기준으로 맞춰 중앙 배치
  const [, , sw, sh] = BEAR_BOX, box = W * pad;
  const k = Math.min(box / sw, box / sh);
  const dw = Math.round(sw * k), dh = Math.round(sh * k);
  blit(px, W, bear(), BEAR_BOX, Math.round((W - dw) / 2), Math.round((W - dh) / 2), dw, dh);

  // 다운샘플 (프리멀티 평균 → 알파 복원)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const i = ((y * SS + sy) * W + (x * SS + sx)) * 4, al = px[i + 3] / 255;
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al;
    }
    const i = (y * size + x) * 4;
    out[i]     = a ? Math.round(r / a) : 0;
    out[i + 1] = a ? Math.round(g / a) : 0;
    out[i + 2] = a ? Math.round(b / a) : 0;
    out[i + 3] = Math.round(a / (SS * SS) * 255);
  }
  return out;
}

// 배경이 있는 정사각 아이콘만 전면 불투명이므로 알파 없이 굽는다.
export const iconPNG = (size, opt = {}) =>
  encodePNG(renderIcon(size, opt), size, { rgb: opt.round === false && opt.bg !== false });
