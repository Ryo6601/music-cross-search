// 依存なしの PNG ジェネレータ。3本のサウンドバーを描いた拡張機能アイコンを生成する。
// 使い方: node tools/gen-icons.mjs
//
// PNG 仕様: https://www.w3.org/TR/png/

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---- CRC32 ----
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- PNG エンコード ----
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10-12: compression / filter / interlace = 0
  // 各行先頭に filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- 描画ユーティリティ (アンチエイリアス: 4×4 スーパーサンプリング) ----
const SS = 4; // サブピクセル分割数

function makeCanvas(size) {
  const w = size * SS;
  const h = size * SS;
  const buf = Buffer.alloc(w * h * 4);
  return { w, h, buf, size };
}

function fillRoundedRect(canvas, x, y, w, h, r, color) {
  const { buf, w: cw, h: ch } = canvas;
  const sx = Math.round(x * SS);
  const sy = Math.round(y * SS);
  const sw = Math.round(w * SS);
  const sh = Math.round(h * SS);
  const sr = Math.round(r * SS);
  for (let py = sy; py < sy + sh; py++) {
    if (py < 0 || py >= ch) continue;
    for (let px = sx; px < sx + sw; px++) {
      if (px < 0 || px >= cw) continue;
      // 角丸判定: 4隅の円内/直線内かチェック
      let inside = true;
      const lx = px - sx;
      const ly = py - sy;
      if (lx < sr && ly < sr) {
        const dx = sr - lx;
        const dy = sr - ly;
        inside = dx * dx + dy * dy <= sr * sr;
      } else if (lx >= sw - sr && ly < sr) {
        const dx = lx - (sw - sr - 1);
        const dy = sr - ly;
        inside = dx * dx + dy * dy <= sr * sr;
      } else if (lx < sr && ly >= sh - sr) {
        const dx = sr - lx;
        const dy = ly - (sh - sr - 1);
        inside = dx * dx + dy * dy <= sr * sr;
      } else if (lx >= sw - sr && ly >= sh - sr) {
        const dx = lx - (sw - sr - 1);
        const dy = ly - (sh - sr - 1);
        inside = dx * dx + dy * dy <= sr * sr;
      }
      if (inside) {
        const i = (py * cw + px) * 4;
        buf[i] = color[0];
        buf[i + 1] = color[1];
        buf[i + 2] = color[2];
        buf[i + 3] = color[3];
      }
    }
  }
}

function downsample(canvas) {
  const { buf, w: cw, h: ch, size } = canvas;
  const out = Buffer.alloc(size * size * 4);
  const factor = SS;
  const count = factor * factor;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * cw + (x * factor + sx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const oi = (y * size + x) * 4;
      out[oi] = Math.round(r / count);
      out[oi + 1] = Math.round(g / count);
      out[oi + 2] = Math.round(b / count);
      out[oi + 3] = Math.round(a / count);
    }
  }
  return out;
}

// ---- アイコン描画 ----
const BG_COLOR = [99, 102, 241, 255]; // indigo-500
const FG_COLOR = [255, 255, 255, 255];

function drawIcon(size) {
  const canvas = makeCanvas(size);
  const r = size * 0.2; // 角丸半径
  fillRoundedRect(canvas, 0, 0, size, size, r, BG_COLOR);

  // 3本のサウンドバー (高さで波形を表現)
  const barCount = 3;
  const barWidth = size * 0.13;
  const gap = size * 0.08;
  const totalWidth = barCount * barWidth + (barCount - 1) * gap;
  const startX = (size - totalWidth) / 2;
  const heights = [0.4, 0.7, 0.55]; // 比率
  const barRadius = barWidth / 2;

  for (let i = 0; i < barCount; i++) {
    const x = startX + i * (barWidth + gap);
    const h = size * heights[i];
    const y = (size - h) / 2;
    fillRoundedRect(canvas, x, y, barWidth, h, barRadius, FG_COLOR);
  }

  return encodePng(size, size, downsample(canvas));
}

// ---- 出力 ----
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });

const sizes = [16, 48, 128];
for (const s of sizes) {
  const png = drawIcon(s);
  const path = resolve(outDir, `icon${s}.png`);
  writeFileSync(path, png);
  console.log(`✓ ${path} (${png.length} bytes)`);
}
