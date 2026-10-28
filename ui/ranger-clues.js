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
  c.fillStyle = '#e8e0c2'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(120,96,50,.10)'; for (let i = 0; i < 26; i++) c.fillRect((i * 97) % w, (i * 53) % h, 3 + i % 7, 2 + i % 3);   // age spots
  c.fillStyle = '#2b2618'; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  c.font = `700 ${Math.round(h * 0.085)}px ${TYPE}`; c.fillText(t.log, w / 2, h * 0.12);
  c.fillRect(w * 0.1, h * 0.145, w * 0.8, Math.max(1, h * 0.006));
  // CL-263: with its last entry the days sit a little closer, under it.
  const rowH = h * (t.last ? 0.081 : 0.088), top = h * (t.last ? 0.29 : 0.235);
  c.textAlign = 'left';
  if (t.last) {   // CL-263: the last entry, added in red pencil between the title and the days, two lines at most
    c.fillStyle = '#9c2a20';
    let size = Math.round(h * 0.04), lines = null;
    for (; size >= 8; size--) {
      c.font = `${size}px ${HAND}`;
      const words = String(t.last).split(' '); lines = [''];
      for (const wd of words) { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + wd : wd; if (c.measureText(tryL).width <= w * 0.82 || !lines[lines.length - 1]) lines[lines.length - 1] = tryL; else lines.push(wd); }
      if (lines.length <= 2) break;
    }
    lines.slice(0, 2).forEach((ln, k) => c.fillText(ln, w * 0.09 + j(1), h * 0.195 + k * size * 1.12 + j(0.8)));
  }
  for (let i = 1; i <= 9; i++) {
    const y = top + (i - 1) * rowH;
    c.fillStyle = 'rgba(70,90,120,.35)'; c.fillRect(w * 0.08, y + rowH * 0.28, w * 0.84, 1);   // ruled line
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
  // a pin at the top
  c.fillStyle = '#b3261e'; c.beginPath(); c.arc(w / 2, h * 0.035, h * 0.022, 0, Math.PI * 2); c.fill();
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
    cv.width = 520; cv.height = 250;
    c.fillStyle = '#2b2e2a'; c.fillRect(0, 0, 520, 250);                       // the radio's face
    c.fillStyle = '#1b1d1a'; for (let i = 0; i < 9; i++) c.fillRect(372 + (i % 3) * 36, 52 + Math.floor(i / 3) * 36, 24, 24);   // speaker grille
    c.save(); c.translate(36, 60); paintRadioLcd(c, 300, 130, value, words); c.restore();
    c.strokeStyle = '#555a52'; c.lineWidth = 4; c.strokeRect(34, 58, 304, 134);
  } else if (kind === 'board') {
    cv.width = 420; cv.height = 420; paintSearchLog(c, 420, 420, value, words);
  } else if (kind === 'truck') {
    cv.width = 520; cv.height = 230;
    c.fillStyle = '#58684c'; c.fillRect(0, 0, 520, 230);                       // the door's paint
    c.fillStyle = '#4d5c43'; for (let i = 0; i < 40; i++) c.fillRect((i * 89) % 520, (i * 41) % 230, 6 + i % 9, 2 + i % 4);
    c.fillStyle = '#252d28'; c.fillRect(470, 0, 6, 230);                       // the door's seam
    c.fillStyle = '#65543e'; c.fillRect(0, 196, 520, 34);                      // mud along the sill
    const off = doc.createElement('canvas'); off.width = 400; off.height = 140;   // its own canvas: the stencil's cuts mustn't cut the paint
    const oc = off.getContext('2d'); if (oc) { paintUnit(oc, 400, 140, value, words); c.drawImage(off, 40, 50); }
  } else {   // the lid
    cv.width = 480; cv.height = 150;
    c.fillStyle = '#556043'; c.fillRect(0, 0, 480, 150);
    paintLid(c, 480, 150, value, '#d6cfb1', false);
  }
  try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
}
