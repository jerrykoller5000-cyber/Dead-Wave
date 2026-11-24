// ui/ranger-clues.js — CL-217 (D-82; docs/specs/day-missions.md §2): what the rangers left written round their camp,
// painted on canvas (Claude's). The same painters draw the small textures in the world and, bigger, the "E — Look"
// views in the panel, so what the player reads up close is what is out there. Nothing says "code" or "clue".
//
//   paintRadioLcd(ctx, w, h, ch, words)     the radio's little display, still on its channel: "CH 7"
//   paintSearchLog(ctx, w, h, day, words)   the search log pinned on their board: day 1 to `day`, the last ringed in red;
//                                           above the days, its last entry (words.last, CL-263)
//   paintUnit(ctx, w, h, unit, words)       "UNIT 2", stencilled on the truck's doors (transparent round it)
//   paintLid(ctx, w, h, order[, col, clear]) the lockbox lid's three pictures (a radio, a board, a truck) in `order`,
//                                           left to right, one, two and three pips under them (transparent round them)
//   paintKeypad(ctx, w, h)                  the hangar keypad's face (CL-146's look)
//   lookImage(doc, kind, value, words)      a data: URL of the big view: kind 'radio' | 'board' | 'truck' | 'lid'
//
// words: { log, day, ch, unit, last, areas: [9 place names] } (index.html passes ui/strings.js's); English if left out.

export const RANGER_WORDS = Object.freeze({
  log: 'SEARCH LOG', day: 'DAY', ch: 'CH', unit: 'UNIT',
  // CL-263 (docs/specs/story-chain.md §4, day 7 to day 8): the log's last entry, scrawled in above the days: the lead to
  // the old man's.
  last: 'Trapper ran us off. Horseshoes on everything. Said IRON.',
  areas: Object.freeze(['Ridge', 'Creek', 'North trail', 'Lake shore', 'Old mine', 'Quarry', 'Pines', 'Dock road', 'Tower'])
});
const W = (w) => ({ ...RANGER_WORDS, ...(w || {}) });
const TYPE = "'Courier New', Courier, monospace";
const HAND = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
// A fixed wobble, so the hand-drawn bits are the same every time they are painted.
function wobble(seed) { let s = seed | 0 || 7; return (a = 1) => { s = (s * 16807) % 2147483647; return ((s - 1) / 2147483646 - 0.5) * 2 * a; }; }

export function paintRadioLcd(c, w, h, ch, words) {
  const t = W(words);
  c.fillStyle = '#07120a'; c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f2414'); g.addColorStop(1, '#081409');
  c.fillStyle = g; c.fillRect(h * 0.06, h * 0.08, w - h * 0.12, h * 0.84);
  c.fillStyle = '#8dff95'; c.shadowColor = '#8dff95'; c.shadowBlur = h * 0.12;
  c.textBaseline = 'middle';
  c.font = `700 ${Math.round(h * 0.34)}px ${TYPE}`; c.textAlign = 'left';
  c.fillText(t.ch, w * 0.1, h * 0.52);
  c.font = `700 ${Math.round(h * 0.78)}px ${TYPE}`; c.textAlign = 'right';
  c.fillText(String(ch), w * 0.9, h * 0.55);
  c.shadowBlur = 0;
  // three signal bars, top left, faint
  c.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) c.fillRect(w * 0.1 + i * h * 0.1, h * (0.3 - i * 0.06), h * 0.06, h * (0.06 + i * 0.06));
  c.globalAlpha = 1;
}

export function paintSearchLog(c, w, h, day, words) {
  const t = W(words), j = wobble(31 + day);
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#eee5c8'); bg.addColorStop(0.55, '#e7dec0'); bg.addColorStop(1, '#dcd0ab');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // Subtle paper crease fold line across center + age speckles + faint coffee ring stain:
  c.fillStyle = 'rgba(85,68,38,.09)'; c.fillRect(0, h * 0.51, w, Math.max(1, h * 0.004));
  c.fillStyle = 'rgba(255,250,235,.18)'; c.fillRect(0, h * 0.515, w, Math.max(1, h * 0.004));
  c.fillStyle = 'rgba(120,96,50,.10)'; for (let i = 0; i < 34; i++) c.fillRect((i * 97) % w, (i * 53) % h, 2 + i % 6, 2 + i % 3);
  c.save();
  c.strokeStyle = 'rgba(104,68,36,.16)'; c.lineWidth = Math.max(2, w * 0.012);
  c.beginPath(); c.arc(w * 0.83, h * 0.86, w * 0.11, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(104,68,36,.08)'; c.lineWidth = Math.max(1, w * 0.005);
  c.beginPath(); c.arc(w * 0.83 + 2, h * 0.86 - 2, w * 0.10, 0.4, Math.PI * 1.8); c.stroke();
  c.restore();
  // Header + Forestry Service SAR stamp
  c.fillStyle = '#2b2618'; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  c.font = `700 ${Math.round(h * 0.076)}px ${TYPE}`; c.fillText(t.log, w / 2, h * 0.115);
  c.fillStyle = '#5c523b'; c.font = `700 ${Math.round(h * 0.029)}px ${TYPE}`;
  c.fillText('FORESTRY SAR · 6 HIKERS OVERDUE — NORTH RIDGE', w / 2, h * 0.145);
  c.fillStyle = '#2b2618'; c.fillRect(w * 0.08, h * 0.16, w * 0.84, Math.max(1.5, h * 0.005));
  // CL-263: with its last entry the days sit a little closer, under it.
  const rowH = h * (t.last ? 0.078 : 0.086), top = h * (t.last ? 0.305 : 0.24);
  c.textAlign = 'left';
  if (t.last) {   // CL-263: the last entry, added in red pencil between the title and the days, two lines at most
    c.fillStyle = '#9c2a20';
    let size = Math.round(h * 0.039), lines = null;
    for (; size >= 8; size--) {
      c.font = `${size}px ${HAND}`;
      const words = String(t.last).split(' '); lines = [''];
      for (const wd of words) { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + wd : wd; if (c.measureText(tryL).width <= w * 0.78 || !lines[lines.length - 1]) lines[lines.length - 1] = tryL; else lines.push(wd); }
      if (lines.length <= 2) break;
    }
    lines.slice(0, 2).forEach((ln, k) => c.fillText(ln, w * 0.09 + j(1), h * 0.208 + k * size * 1.12 + j(0.8)));
    // Tiny hand-drawn horseshoe margin doodle beside the IRON note:
    const hx = w * 0.90, hy = h * 0.225, hr = h * 0.022;
    c.strokeStyle = '#9c2a20'; c.lineWidth = Math.max(1.4, h * 0.005);
    c.beginPath(); c.arc(hx, hy, hr, Math.PI * 0.2, Math.PI * 0.8, true); c.stroke();
  }
  for (let i = 1; i <= 9; i++) {
    const y = top + (i - 1) * rowH;
    c.fillStyle = 'rgba(70,90,120,.34)'; c.fillRect(w * 0.08, y + rowH * 0.28, w * 0.84, 1);   // ruled line
    if (i > day) continue;                                                                       // the log stops there
    c.fillStyle = '#2b2618'; c.font = `700 ${Math.round(rowH * 0.62)}px ${TYPE}`;
    c.fillText(t.day + ' ' + i, w * 0.1, y + rowH * 0.12);
    c.fillStyle = '#28385a'; c.font = `${Math.round(rowH * 0.62)}px ${HAND}`;
    const area = t.areas[(i - 1) % t.areas.length], ay = y + rowH * 0.12 + j(1);
    c.fillText(area, w * 0.44, ay);
    if (i < day) {   // searched, nothing found: a pencil cross after it
      const cx = Math.min(w * 0.9, w * 0.44 + c.measureText(area).width + rowH * 0.5), cy = ay - rowH * 0.2, r = rowH * 0.18;
      c.strokeStyle = '#28385a'; c.lineWidth = Math.max(1.5, rowH * 0.07); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - r, cy - r); c.lineTo(cx + r, cy + r); c.moveTo(cx + r, cy - r); c.lineTo(cx - r, cy + r); c.stroke();
    }
  }
  // the last day, ringed in red pencil
  const y = top + (day - 1) * rowH - rowH * 0.12;
  c.font = `700 ${Math.round(rowH * 0.62)}px ${TYPE}`;
  const tw = c.measureText(t.day + ' ' + day).width;
  c.strokeStyle = '#b3261e'; c.lineWidth = Math.max(2, h * 0.012); c.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    c.beginPath();
    c.ellipse(w * 0.1 + tw * 0.5 + j(2), y + j(1.5), tw * 0.64 + j(2), rowH * 0.62 + j(1.5), j(0.05), 0.15 + k * 0.4, Math.PI * 2 + 0.3 + k * 0.4);
    c.stroke();
  }
  // Red push-pin at the top with soft drop shadow
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.arc(w / 2 + h * 0.008, h * 0.042, h * 0.024, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#b3261e'; c.beginPath(); c.arc(w / 2, h * 0.035, h * 0.022, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,210,200,.55)'; c.beginPath(); c.arc(w / 2 - h * 0.007, h * 0.029, h * 0.007, 0, Math.PI * 2); c.fill();
}

export function paintUnit(c, w, h, unit, words) {
  const t = W(words), j = wobble(57 + unit);
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#d9d2b4'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const text = t.unit + ' ' + unit, font = (px) => `900 ${Math.round(px)}px 'Arial Black', Impact, sans-serif`;
  let px = h * 0.72;
  c.font = font(px);
  const tw = c.measureText(text).width;
  if (tw > w * 0.9) { px *= w * 0.9 / tw; c.font = font(px); }   // fits the door whatever the words are
  c.fillText(text, w / 2, h * 0.54);
  // stencil bridges and wear
  c.globalCompositeOperation = 'destination-out';
  for (let x = w * 0.08; x < w; x += w * 0.075) c.fillRect(x + j(2), 0, Math.max(1.5, w * 0.008), h);
  for (let i = 0; i < 70; i++) c.fillRect((i * 131) % w, (i * 37) % h, 2 + (i % 5), 1 + (i % 3));
  c.globalCompositeOperation = 'source-over';
}

// The three pictures, as small line drawings: a radio (box, dial, aerial), a board on two legs with pins, a pickup.
function icon(c, kind, x, y, s, col) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(2, s * 0.07); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  if (kind === 'radio') {
    c.rect(x - s * 0.42, y - s * 0.18, s * 0.84, s * 0.5);
    c.moveTo(x - s * 0.22, y - s * 0.18); c.lineTo(x - s * 0.36, y - s * 0.5);   // aerial
    c.stroke();
    c.beginPath(); c.arc(x + s * 0.18, y + s * 0.07, s * 0.12, 0, Math.PI * 2); c.stroke();
    c.fillRect(x - s * 0.32, y - s * 0.06, s * 0.26, s * 0.12);                    // the display
  } else if (kind === 'board') {
    c.rect(x - s * 0.42, y - s * 0.42, s * 0.84, s * 0.52);
    c.moveTo(x - s * 0.32, y + s * 0.1); c.lineTo(x - s * 0.36, y + s * 0.48);
    c.moveTo(x + s * 0.32, y + s * 0.1); c.lineTo(x + s * 0.36, y + s * 0.48);
    c.stroke();
    for (const [dx, dy] of [[-0.2, -0.24], [0.05, -0.08], [0.22, -0.26]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, s * 0.05, 0, Math.PI * 2); c.fill(); }
  } else {   // truck: a pickup in profile, cab to the right
    c.moveTo(x - s * 0.48, y + s * 0.18); c.lineTo(x - s * 0.48, y - s * 0.04); c.lineTo(x + s * 0.02, y - s * 0.04);
    c.lineTo(x + s * 0.1, y - s * 0.3); c.lineTo(x + s * 0.34, y - s * 0.3); c.lineTo(x + s * 0.48, y - s * 0.04);
    c.lineTo(x + s * 0.48, y + s * 0.18); c.closePath(); c.stroke();
    for (const dx of [-0.28, 0.3]) { c.beginPath(); c.arc(x + dx * s, y + s * 0.2, s * 0.11, 0, Math.PI * 2); c.fill(); }
  }
}
export function paintLid(c, w, h, order, col = '#d6cfb1', clear = true) {
  if (clear) c.clearRect(0, 0, w, h);
  const n = order.length, cell = w / n, s = Math.min(cell * 0.62, h * 0.6);
  order.forEach((kind, i) => {
    const x = cell * (i + 0.5), y = h * 0.4;
    icon(c, kind, x, y, s, col);
    for (let p = 0; p <= i; p++) { c.beginPath(); c.arc(x + (p - i / 2) * s * 0.2, h * 0.86, s * 0.055, 0, Math.PI * 2); c.fill(); }   // one, two, three pips
    if (i < n - 1) {   // a small arrow on to the next
      const ax = cell * (i + 1), ay = h * 0.4;
      c.beginPath(); c.moveTo(ax - s * 0.1, ay); c.lineTo(ax + s * 0.08, ay); c.moveTo(ax + s * 0.02, ay - s * 0.06); c.lineTo(ax + s * 0.09, ay); c.lineTo(ax + s * 0.02, ay + s * 0.06); c.stroke();
    }
  });
}

export function paintKeypad(c, w, h) {
  c.fillStyle = '#2a2f33'; c.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
    c.fillStyle = r === 3 && k !== 1 ? (k ? '#3f9a5c' : '#b8433a') : '#c9ced1';
    c.fillRect(w * (6 / 64) + k * w * (19 / 64), h * (6 / 80) + r * h * (18.5 / 80), w * (14 / 64), h * (13 / 80));
  }
}

// The big views for the panel.
export function lookImage(doc, kind, value, words) {
  const cv = doc.createElement('canvas'), c = cv.getContext('2d');
  if (!c) return '';
  if (kind === 'radio') {
    cv.width = 520; cv.height = 260;
    const gr = c.createLinearGradient(0, 0, 0, 260);
    gr.addColorStop(0, '#323830'); gr.addColorStop(1, '#1e221d');
    c.fillStyle = gr; c.fillRect(0, 0, 520, 260);
    c.strokeStyle = '#555d4f'; c.lineWidth = 4; c.strokeRect(6, 6, 508, 248);
    for (const [sx, sy] of [[20, 20], [500, 20], [20, 240], [500, 240]]) {
      c.fillStyle = '#5a6156'; c.beginPath(); c.arc(sx, sy, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#181a17'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - 4, sy - 2); c.lineTo(sx + 4, sy + 2); c.stroke();
    }
    c.fillStyle = '#c8c3a6'; c.font = `700 13px ${TYPE}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('FORESTRY SAR · VHF-FM TRANSCEIVER', 34, 34);
    c.fillStyle = '#ff4d38'; c.shadowColor = '#ff4d38'; c.shadowBlur = 8;
    c.beginPath(); c.arc(328, 29, 5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#141714'; c.fillRect(364, 44, 128, 128);
    c.fillStyle = '#242924';
    for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) c.fillRect(374 + col * 22, 54 + r * 22, 14, 14);
    for (const [kx, label, ang] of [[396, 'VOL', -0.9], [460, 'SQL', 0.6]]) {
      c.fillStyle = '#171917'; c.beginPath(); c.arc(kx, 204, 19, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5c6358'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#d9d3b8'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(kx, 204); c.lineTo(kx + Math.cos(ang) * 14, 204 + Math.sin(ang) * 14); c.stroke();
      c.fillStyle = '#9aa191'; c.font = `700 10px ${TYPE}`; c.textAlign = 'center'; c.fillText(label, kx, 236);
    }
    c.save(); c.translate(34, 48); paintRadioLcd(c, 304, 130, value, words); c.restore();
    c.strokeStyle = '#555d52'; c.lineWidth = 4; c.strokeRect(32, 46, 308, 134);
    c.save(); c.translate(34, 198); c.rotate(-0.015);
    c.fillStyle = '#ded5b6'; c.fillRect(0, 0, 304, 34);
    c.fillStyle = '#2e291d'; c.font = `700 14px ${TYPE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('LAST CALL 01:42 — NO REPLY', 152, 18);
    c.restore();
  } else if (kind === 'board') {
    cv.width = 420; cv.height = 420; paintSearchLog(c, 420, 420, value, words);
  } else if (kind === 'truck') {
    cv.width = 520; cv.height = 240;
    const gr = c.createLinearGradient(0, 0, 0, 240);
    gr.addColorStop(0, '#5d6e50'); gr.addColorStop(0.82, '#4f5e45'); gr.addColorStop(1, '#3d4935');
    c.fillStyle = gr; c.fillRect(0, 0, 520, 240);
    c.fillStyle = 'rgba(42,50,36,.35)';
    for (let i = 0; i < 42; i++) c.fillRect((i * 89) % 520, (i * 41) % 210, 6 + i % 9, 2 + i % 4);
    for (let i = 0; i < 12; i++) {
      const rx = 24 + i * 42;
      const rg = c.createLinearGradient(0, 0, 0, 120 + (i % 3) * 35);
      rg.addColorStop(0, 'rgba(28,34,24,.32)'); rg.addColorStop(1, 'rgba(28,34,24,0)');
      c.fillStyle = rg; c.fillRect(rx, 0, 3 + (i % 3), 120 + (i % 3) * 35);
    }
    c.fillStyle = '#252d28'; c.fillRect(472, 0, 6, 240);
    c.fillStyle = '#2a3228'; c.fillRect(390, 26, 62, 16);
    c.fillStyle = '#b9c0ba'; c.fillRect(396, 30, 50, 8);
    c.save(); c.translate(64, 118);
    c.strokeStyle = 'rgba(217,210,180,.78)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -38); c.lineTo(28, -24); c.lineTo(24, 18); c.lineTo(0, 38); c.lineTo(-24, 18); c.lineTo(-28, -24); c.closePath(); c.stroke();
    c.fillStyle = 'rgba(217,210,180,.72)';
    c.beginPath(); c.moveTo(0, -24); c.lineTo(14, 0); c.lineTo(6, 0); c.lineTo(16, 18); c.lineTo(-16, 18); c.lineTo(-6, 0); c.lineTo(-14, 0); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = '#5c4b37'; c.fillRect(0, 200, 520, 40);
    c.fillStyle = '#473928';
    for (let i = 0; i < 24; i++) { c.beginPath(); c.ellipse(i * 23, 200 + (i % 5) * 4, 8 + i % 10, 4 + i % 5, 0, 0, Math.PI * 2); c.fill(); }
    const off = doc.createElement('canvas'); off.width = 360; off.height = 136;
    const oc = off.getContext('2d'); if (oc) { paintUnit(oc, 360, 136, value, words); c.drawImage(off, 100, 52); }
  } else {
    cv.width = 480; cv.height = 156;
    const gr = c.createLinearGradient(0, 0, 0, 156);
    gr.addColorStop(0, '#5a6648'); gr.addColorStop(1, '#434d35');
    c.fillStyle = gr; c.fillRect(0, 0, 480, 156);
    c.strokeStyle = '#2d3424'; c.lineWidth = 4; c.strokeRect(4, 4, 472, 148);
    for (const [rx, ry] of [[16, 16], [464, 16], [16, 140], [464, 140]]) {
      c.fillStyle = '#333b2a'; c.beginPath(); c.arc(rx, ry, 5, 0, Math.PI * 2); c.fill();
    }
    paintLid(c, 480, 156, value, '#dfd8ba', false);
  }
  try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
}
