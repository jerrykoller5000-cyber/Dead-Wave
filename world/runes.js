// world/runes.js — the Pit's eight glyphs and the word the stones pulse (CL-80, P-95, docs/specs/secret-quest.md).
// Claude's. One drawing for everyone: the stones round the Pit carve these, and the HQ radio's Tune row (GP-70)
// draws the same eight, so what he reads from the tower is what he taps at the radio.
//
//   RUNE_COUNT                       8: stone k carries glyph k
//   traceGlyph(ctx, k)               adds glyph k's strokes to a 2D path, in a 24 x 24 box centred on 0, 0
//   drawGlyph(ctx, k, x, y, size, { color, width })   strokes it, centred on x, y, `size` px across
//   makeGlyphAtlas(doc, cell = 128)  a canvas with the eight glyphs in a row, glowing, for a texture
//   PULSE                            the stones' timing: each flare ON s, GAP s between, REST s dark after the word
//   pulseAt(word, t) -> { stone, glow }   which stone of the word is lit at time t (or -1) and how bright (0..1)

export const RUNE_COUNT = 8;

export function traceGlyph(ctx, k) {
  switch (((k % RUNE_COUNT) + RUNE_COUNT) % RUNE_COUNT) {
    case 0: ctx.moveTo(0, -12); ctx.lineTo(8, 11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.moveTo(3, 3); ctx.arc(0, 3, 3, 0, Math.PI * 2); break;   // the eye in the peak
    case 1: ctx.moveTo(-9, -11); ctx.lineTo(9, -11); ctx.lineTo(0, 12); ctx.closePath(); ctx.moveTo(0, -4); ctx.lineTo(0, 6); break;                // the cup
    case 2: ctx.arc(0, 0, 9, 0.3, Math.PI * 1.7); ctx.moveTo(6, -7); ctx.lineTo(12, -12); ctx.moveTo(-3, 0); ctx.lineTo(4, 0); break;               // the hook moon
    case 3: ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(-6, -7); ctx.lineTo(6, 7); ctx.moveTo(6, -7); ctx.lineTo(-6, 7); break;   // the star
    case 4: for (const y of [-9, 0, 9]) { ctx.moveTo(-9, y); ctx.lineTo(9, y); } ctx.moveTo(0, -12); ctx.lineTo(0, 12); break;                          // the ladder
    case 5: ctx.moveTo(-9, 10); ctx.lineTo(-9, -10); ctx.lineTo(0, -3); ctx.lineTo(9, -10); ctx.lineTo(9, 10); break;                                 // the crown
    case 6: ctx.arc(0, -4, 7, 0, Math.PI * 2); ctx.moveTo(0, 3); ctx.lineTo(0, 12); ctx.lineTo(-6, 8); ctx.moveTo(0, 12); ctx.lineTo(6, 8); break;   // the drop
    default: ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.moveTo(-10, 0); ctx.arc(0, 0, 10, Math.PI, Math.PI * 2); break;   // the gate
  }
}

export function drawGlyph(ctx, k, x, y, size, { color = 'rgba(160, 245, 255, 1)', width = 2 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 26, size / 26);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  traceGlyph(ctx, k);
  ctx.stroke();
  ctx.restore();
}

export function makeGlyphAtlas(doc, cell = 128) {
  const cv = doc.createElement('canvas');
  cv.width = cell * RUNE_COUNT; cv.height = cell;
  const ctx = cv.getContext('2d');
  for (let k = 0; k < RUNE_COUNT; k++) drawGlyph(ctx, k, (k + 0.5) * cell, cell / 2, cell * 0.8, { width: 2.4 });
  // A soft glow round the strokes, so it reads through the water as light.
  const glow = doc.createElement('canvas'); glow.width = cv.width; glow.height = cv.height;
  const g = glow.getContext('2d');
  g.filter = 'blur(' + Math.round(cell / 16) + 'px)';
  g.drawImage(cv, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(glow, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return cv;
}

export const PULSE = Object.freeze({ ON: 0.9, GAP: 0.4, REST: 4 });

export function pulseAt(word, t) {
  if (!word || !word.length) return { stone: -1, glow: 0 };
  const step = PULSE.ON + PULSE.GAP, cycle = word.length * step + PULSE.REST;
  const u = ((t % cycle) + cycle) % cycle;
  const i = Math.floor(u / step);
  if (i >= word.length) return { stone: -1, glow: 0 };
  const v = u - i * step;
  if (v >= PULSE.ON) return { stone: -1, glow: 0 };
  // Up fast, hold, down: a flare, not a blink.
  const glow = Math.min(1, v / 0.15, (PULSE.ON - v) / 0.3);
  return { stone: word[i], glow: Math.max(0, glow) };
}

// CL-111 (docs/specs/secret-quest.md §6): the rune finish for a gun's furniture, the true ending's reward. Dark oiled
// wood with its grain, the eight glyphs etched across it in staggered rows; the grooves dark by day and the Pit's
// cold light by night (`level` 0..1, the carvings' own glow level). A seamless tile, the same every time.
//   paintRuneFinish(ctx, size, level)   the colour tile
//   paintRuneGlow(ctx, size, level)     the same glyphs alone on black, for the emissive map (night's faint light)
export const RUNE_FINISH = Object.freeze({ WOOD: '#3b2c21', GRAIN: '#47362a', GRAIN_DARK: '#291f17', GROOVE: [22, 17, 13], GLOW: [158, 238, 255] });
const lerpRGB = (a, b, u) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, u)))).join(',') + ')';
function eachRuneSpot(size, f) {
  const cell = size / 4;   // four rows of four, each row half a cell along from the last: every face of a stock gets some
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const k = (r * 3 + c * 5 + r * r) % RUNE_COUNT, x = (c + 0.5 + (r % 2) * 0.5) * cell, y = (r + 0.5) * cell;
    for (const dx of [0, -size, size]) if (x + dx > -cell && x + dx < size + cell) f(k, x + dx, y, cell * 0.58);
  }
}
export function paintRuneFinish(ctx, size, level = 0) {
  const F = RUNE_FINISH;
  ctx.fillStyle = F.WOOD; ctx.fillRect(0, 0, size, size);
  let s = 1234567;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 36; i++) {
    const y0 = rnd() * size, amp = (1 + rnd() * 3) * size / 256, ph = rnd() * 6.283;
    ctx.strokeStyle = i % 3 ? F.GRAIN : F.GRAIN_DARK; ctx.lineWidth = (0.6 + rnd() * 1.6) * size / 256;
    for (const dy of [0, -size, size]) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += size / 64) { const y = y0 + dy + Math.sin(x / size * Math.PI * 4 + ph) * amp; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  eachRuneSpot(size, (k, x, y, sz) => {
    drawGlyph(ctx, k, x + 1.5 * size / 256, y + 1.5 * size / 256, sz, { color: 'rgba(255, 228, 196, 0.28)', width: 2.6 });   // the cut's lit edge
    drawGlyph(ctx, k, x, y, sz, { color: lerpRGB(F.GROOVE, F.GLOW, level), width: 2.2 });
  });
}
export function paintRuneGlow(ctx, size, level = 0) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, size);
  const g = Math.max(0, Math.min(1, level));
  eachRuneSpot(size, (k, x, y, sz) => drawGlyph(ctx, k, x, y, sz, { color: lerpRGB([0, 0, 0], RUNE_FINISH.GLOW, g), width: 2.2 }));
}
