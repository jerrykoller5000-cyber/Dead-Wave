// montage2.mjs: GB-245's final before/after filmstrips, six frames per gun, before above / after below.
// Before: the pre-GB-245 hold, shot by probe.mjs at u5..u80 (qa/2026-10-29-GB-245/before/strips/).
// after: the landed framing, shot by rfocus2c.mjs at u10..u85 with a discarded warm-up frame per gun (tune/clean/f/).
// Same six-frame span of the reload, a half-step apart; each strip is labelled in the handoff.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { readPng } from './png.mjs';

const B = 'qa/2026-10-29-GB-245';
const GUNS = ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'pistol', 'revolver', 'uzi'];
const US_B = [5, 20, 35, 50, 65, 80], US_A = [10, 25, 40, 55, 70, 85];
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
function writePng(file, w, h, rgb) {
  const stride = w * 3, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body) >>> 0); return Buffer.concat([len, body, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
function half(img) {
  const w = img.width >> 1, h = img.height >> 1, out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((y * 2) * img.width + x * 2) * 3, d = (y * w + x) * 3; out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; }
  return { width: w, height: h, data: out };
}
function grid(files) {
  const tiles = files.map((f) => half(readPng(f)));
  const tw = tiles[0].width, th = tiles[0].height, cols = 3, rows = Math.ceil(tiles.length / cols);
  const w = tw * cols, h = th * rows, out = Buffer.alloc(w * h * 3, 12);
  tiles.forEach((t, i) => { const ox = (i % cols) * tw, oy = Math.floor(i / cols) * th; for (let y = 0; y < t.height; y++) t.data.copy(out, ((oy + y) * w + ox) * 3, y * t.width * 3, (y + 1) * t.width * 3); });
  return { w, h, data: out };
}
function stack(top, bot) {
  const w = Math.max(top.w, bot.w), h = top.h + bot.h, out = Buffer.alloc(w * h * 3, 12);
  for (let y = 0; y < top.h; y++) top.data.copy(out, y * w * 3, y * top.w * 3, (y + 1) * top.w * 3);
  for (let y = 0; y < bot.h; y++) bot.data.copy(out, (top.h + y) * w * 3, y * bot.w * 3, (y + 1) * bot.w * 3);
  return { w, h, data: out };
}
const ok = (f) => { try { return fs.statSync(f).size > 1000; } catch { return false; } };
const out = B + '/final';
fs.mkdirSync(out, { recursive: true });
for (const g of GUNS) {
  const bf = US_B.map((u) => `${B}/before/strips/${g}-u${u}.png`);
  const dir = 'clean';
  const af = US_A.map((u) => `${B}/tune/${dir}/f/${g}-g0-u${u}-both.png`);
  const missB = bf.filter((f) => !ok(f)), missA = af.filter((f) => !ok(f));
  if (missB.length || missA.length) { console.log(g + ': SKIPPED missing ' + JSON.stringify({ before: missB, after: missA })); continue; }
  const s = stack(grid(bf), grid(af));
  writePng(`${out}/compare-${g}.png`, s.w, s.h, s.data);
  console.log(`${g}: final/compare-${g}.png ${s.w}x${s.h} (before above, after below)`);
}
