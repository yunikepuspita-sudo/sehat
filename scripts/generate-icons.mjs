// Dependency-free PNG icon generator for the SEHAT PWA.
// Renders a rounded teal tile with a white medical cross + heartbeat line
// and encodes it as a real PNG using only Node's built-in zlib.
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "icons");
mkdirSync(OUT, { recursive: true });

// ---- CRC32 (for PNG chunks) ------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression, filter, interlace = 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- Drawing ---------------------------------------------------------------
function lerp(a, b, t) { return a + (b - a) * t; }
function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const r = maskable ? size * 0.5 : size * 0.22; // corner radius (full circle-ish for maskable)
  const set = (x, y, col) => {
    const i = (y * size + x) * 4;
    buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = col[3];
  };
  const inRounded = (x, y) => {
    const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
    if (cx >= r && cy >= r) return true;
    if (cx >= r || cy >= r) return true;
    const dx = r - cx, dy = r - cy;
    return dx * dx + dy * dy <= r * r;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) { set(x, y, [0, 0, 0, 0]); continue; }
      // vertical teal gradient: #0ea5e9 -> #0e9f6e
      const t = y / size;
      const col = [
        Math.round(lerp(14, 14, t)),
        Math.round(lerp(165, 159, t)),
        Math.round(lerp(233, 110, t)),
        255,
      ];
      set(x, y, col);
    }
  }
  // White medical cross within safe zone
  const cx = size / 2, cy = size * 0.46;
  const armLen = size * 0.30; // half-length
  const armW = size * 0.105;  // half-width
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) continue;
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const inV = dx <= armW && dy <= armLen;
      const inH = dy <= armW && dx <= armLen;
      if (inV || inH) set(x, y, [255, 255, 255, 255]);
    }
  }
  // Heartbeat line near the bottom
  const baseY = size * 0.80, amp = size * 0.07, thick = Math.max(2, size * 0.022);
  const pts = [0.12, 0.34, 0.40, 0.46, 0.52, 0.60, 0.88];
  const ys = [0, 0, -1, 1.4, -0.4, 0, 0];
  const xAt = (p) => p * size;
  for (let s = 0; s < pts.length - 1; s++) {
    const x0 = xAt(pts[s]), x1 = xAt(pts[s + 1]);
    const y0 = baseY - ys[s] * amp, y1 = baseY - ys[s + 1] * amp;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(lerp(x0, x1, i / steps));
      const y = Math.round(lerp(y0, y1, i / steps));
      for (let oy = -thick; oy <= thick; oy++) {
        for (let ox = -thick; ox <= thick; ox++) {
          const px = x + ox, py = y + oy;
          if (px >= 0 && py >= 0 && px < size && py < size && inRounded(px, py)) {
            set(px, py, [255, 255, 255, 235]);
          }
        }
      }
    }
  }
  return buf;
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];
for (const t of targets) {
  const png = encodePNG(t.size, t.size, draw(t.size, { maskable: t.maskable }));
  writeFileSync(join(OUT, t.name), png);
  console.log("wrote", t.name, png.length, "bytes");
}
