// ui/relay-panel.js — CL-183: the radio relay's little devices (Claude's). No game state: index.html owns the
// puzzle (game/relay-puzzle.js) and calls render(); the panel only draws it and turns keys, the wheel and clicks into
// actions. While it is open it has the keyboard: nothing else in the game hears a key (or the wheel) until it closes.
//
//   createRelayPanel({ doc, onAction })   onAction({ type: 'flip', n } | { type: 'tune', d } | { type: 'digit', d } | { type: 'close' })
//     open(mode)  'breakers' | 'radio' | 'keypad' | 'note'      close()   isOpen()   mode()   render(view)   element
//
// CL-184 (Jerry): the panels give nothing away. No tag on the breakers (Sato's note is a scrap of paper somewhere round
// the site: the 'note' mode reads it), no code on the radio's display and no "count the beeps" (only the dial and the
// signal bars, which say how clear the station is), and no hint on the vault's keypad.

const CSS = `
#relayPanel{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;width:min(372px,calc(100vw - 32px));box-sizing:border-box;
  padding:12px 14px 10px;border-radius:6px;background:linear-gradient(180deg,#2b302a,#1a1d18);border:1px solid #59604f;
  box-shadow:0 12px 34px #000b, inset 0 1px 0 #ffffff14;color:#dfe3d2;font-family:var(--font-hud,sans-serif);pointer-events:auto;display:none}
#relayPanel.on{display:block}
#relayPanel h3{margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#cdbb7c}
#relayPanel .tag{margin:0 0 4px;padding:6px 8px;background:#e9e1c4;color:#2b2618;font:600 11px/1.35 'Courier New',monospace;transform:rotate(-.6deg);box-shadow:0 2px 4px #0007}
#relayPanel .row{display:flex;gap:10px;justify-content:center}
#relayPanel .brk{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;user-select:none}
#relayPanel .brk .lamp{width:12px;height:12px;border-radius:50%;background:#3a1a16;box-shadow:inset 0 1px 2px #000}
#relayPanel .brk.on .lamp{background:#5dff7a;box-shadow:0 0 8px #5dff7a}
#relayPanel .brk .sw{width:34px;height:52px;border-radius:4px;background:#111;border:1px solid #444;position:relative}
#relayPanel .brk .sw i{position:absolute;left:5px;right:5px;height:22px;bottom:5px;border-radius:3px;background:linear-gradient(#777,#3c3c3c);transition:bottom .08s}
#relayPanel .brk.on .sw i{bottom:25px;background:linear-gradient(#e8e2c4,#9a9479)}
#relayPanel .brk b{font-size:13px}
#relayPanel.hot .brk .sw{border-color:#ff5a2a;box-shadow:0 0 10px #ff5a2a88}
#relayPanel .scale{position:relative;height:30px;margin:4px 2px 6px;border-radius:3px;background:#0d100c;border:1px solid #3f463a;overflow:hidden}
#relayPanel .scale .ticks{position:absolute;inset:0;background:repeating-linear-gradient(90deg,#4a5240 0 1px,transparent 1px 5%)}
#relayPanel .scale .needle{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ff6a3a;box-shadow:0 0 6px #ff6a3a}
#relayPanel .freq{display:flex;justify-content:space-between;font:700 13px/1 'Courier New',monospace;color:#9fe0a0}
#relayPanel .meter{display:flex;gap:3px;height:12px;margin:6px 0}
#relayPanel .meter i{flex:1;background:#253020;border-radius:1px}
#relayPanel .meter i.lit{background:#7cff8a;box-shadow:0 0 5px #7cff8a88}
#relayPanel .lcd{margin:6px 0 2px;padding:7px 10px;background:#0b130c;border:1px solid #2f4a30;border-radius:3px;font:700 20px/1 'Courier New',monospace;letter-spacing:.35em;color:#8dff95;text-align:center;text-shadow:0 0 6px #8dff9588;min-height:20px}
#relayPanel .lcd.bad{color:#ff6a5a;border-color:#6a2a24;text-shadow:0 0 6px #ff6a5a88}
#relayPanel .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
#relayPanel .keys button{padding:7px 0;border-radius:4px;border:1px solid #4d5545;background:#252a22;color:#e6e9da;font:700 15px/1 var(--font-hud,sans-serif);cursor:pointer}
#relayPanel .keys button:active{background:#3a4234}
#relayPanel .note{margin-top:8px;font-size:11px;line-height:1.4;color:#c9cdb8}
#relayPanel.paper{background:#e6dfc3;border-color:#b9ae86;color:#2b2618;box-shadow:0 12px 34px #000b}
#relayPanel.paper h3{color:#6d6040}
#relayPanel.paper .tag{background:none;box-shadow:none;font-size:13px;padding:2px 0 6px}
#relayPanel.paper .sketch{margin:2px 0 0;transform:rotate(-1.2deg)}
#relayPanel.paper .help{color:#7d7253}
#relayPanel .help{margin-top:8px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8b917d}
`;

// CL-185 (Jerry): "Note should actually be a fuse diagram without explicitly stating what it is. Just a picture of the
// box with the correct sequence and let the players figure it out." A pencil sketch of the breaker box: its switches,
// the ones in the order ringed with 1, 2, 3 and a looping arrow through them, the one to leave alone crossed out. No
// words. (Wobbled by a fixed seed, so it is the same sketch every time.)
export function fuseSketch(order, count = 4) {
  let seed = 9;
  const j = (a = 1.2) => { seed = (seed * 16807) % 2147483647; return ((seed - 1) / 2147483646 - 0.5) * 2 * a; };
  const line = (x0, y0, x1, y1, w = 2) => `<path d="M${(x0 + j()).toFixed(1)} ${(y0 + j()).toFixed(1)} Q${((x0 + x1) / 2 + j(2)).toFixed(1)} ${((y0 + y1) / 2 + j(2)).toFixed(1)} ${(x1 + j()).toFixed(1)} ${(y1 + j()).toFixed(1)}" stroke-width="${w}"/>`;
  const rect = (x, y, w, h, sw = 2) => line(x, y, x + w, y, sw) + line(x + w, y, x + w, y + h, sw) + line(x + w, y + h, x, y + h, sw) + line(x, y + h, x, y, sw);
  const W = 300, x0 = 34, y0 = 52, bw = 232, bh = 112, gap = bw / count;
  let s = `<svg viewBox="0 0 ${W} 190" width="100%" fill="none" stroke="#3a3326" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
  s += rect(x0, y0, bw, bh, 2.4) + rect(x0 + 8, y0 + 8, bw - 16, bh - 16, 1.2);
  const cx = (n) => x0 + gap * (n - 0.5);
  for (let n = 1; n <= count; n++) {
    const x = cx(n) - 13, y = y0 + 30;
    s += rect(x, y, 26, 48, 1.8);
    const on = order.includes(n);
    s += rect(x + 6, on ? y + 6 : y + 24, 14, 18, 1.4);   // the lever, up where it should be thrown
    s += line(cx(n), y + 56, cx(n), y + 62, 1.2) + line(cx(n) - 3, y + 62, cx(n) + 3, y + 62, 1.2);
    if (!on) s += line(x - 6, y - 6, x + 32, y + 54, 2.6) + line(x + 32, y - 6, x - 6, y + 54, 2.6);   // leave it
  }
  order.forEach((n, i) => {   // the order, ringed over each
    const x = cx(n), y = y0 - 22;
    s += `<ellipse cx="${(x + j()).toFixed(1)}" cy="${(y + j()).toFixed(1)}" rx="${(12 + j(1.5)).toFixed(1)}" ry="${(11 + j(1.5)).toFixed(1)}" stroke-width="1.8"/>`;
    s += `<text x="${x}" y="${y + 6}" fill="#3a3326" stroke="none" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="17" font-weight="700" text-anchor="middle">${i + 1}</text>`;
  });
  if (order.length > 1) {   // a loose arrow looping from one to the next
    let d = `M${cx(order[0])} ${y0 - 8}`;
    for (let i = 1; i < order.length; i++) { const a = cx(order[i - 1]), b = cx(order[i]); d += ` Q${((a + b) / 2).toFixed(1)} ${(y0 + (i % 2 ? 24 : -40)).toFixed(1)} ${b} ${y0 - 8}`; }
    s += `<path d="${d}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
    const e = cx(order[order.length - 1]);
    s += line(e, y0 - 8, e - 7, y0 - 15, 1.6) + line(e, y0 - 8, e + 3, y0 - 17, 1.6);
  }
  s += `<path d="M232 170 q8 -6 18 -2 q6 4 -2 9 q-10 4 -16 -7z" fill="rgba(110,40,20,.28)" stroke="none"/>`;   // a smudge
  return s + '</svg>';
}

export function createRelayPanel({ doc = document, onAction = () => {} } = {}) {
  if (!doc.getElementById('relayPanelCss')) { const st = doc.createElement('style'); st.id = 'relayPanelCss'; st.textContent = CSS; (doc.head || doc.body).append(st); }
  const el = doc.createElement('div'); el.id = 'relayPanel'; el.setAttribute('role', 'dialog');
  (doc.getElementById('hud') || doc.body).append(el);
  let mode = null, built = null;
  const win = doc.defaultView || window;
  const act = (a) => { try { onAction(a); } catch (e) { console.info('relay panel', e); } };
  const onKey = (e) => {
    if (!mode) return;
    const c = e.code;
    let handled = true;
    if (c === 'KeyE' || c === 'Escape') { if (!e.repeat) act({ type: 'close' }); }
    else if (mode === 'note') handled = !/^F\d+$/.test(c);
    else if (/^(Digit|Numpad)[0-9]$/.test(c)) { const d = +c.slice(-1); if (!e.repeat) act(mode === 'breakers' ? { type: 'flip', n: d } : { type: 'digit', d }); }
    else if (c === 'KeyA' || c === 'ArrowLeft') act({ type: 'tune', d: e.shiftKey ? -1 : -0.1 });
    else if (c === 'KeyD' || c === 'ArrowRight') act({ type: 'tune', d: e.shiftKey ? 1 : 0.1 });
    else handled = !/^F\d+$/.test(c);   // every other key is swallowed too (no walking off, no weapon swaps), but F-keys
    if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  const onWheel = (e) => { if (!mode || mode === 'note') return; e.preventDefault(); e.stopImmediatePropagation(); if (mode === 'radio') act({ type: 'tune', d: e.deltaY < 0 ? 0.1 : -0.1 }); };
  win.addEventListener('keydown', onKey, true);
  win.addEventListener('wheel', onWheel, { capture: true, passive: false });

  function build(m) {
    el.replaceChildren(); built = { mode: m };
    const h = doc.createElement('h3'); el.append(h); built.h = h;
    if (m === 'breakers') {
      h.textContent = 'Relay cabinet · breakers';
      const row = doc.createElement('div'); row.className = 'row'; el.append(row);
      built.brk = [];
      for (let n = 1; n <= 4; n++) {
        const b = doc.createElement('div'); b.className = 'brk';
        b.innerHTML = '<span class="lamp"></span><span class="sw"><i></i></span><b>' + n + '</b>';
        b.addEventListener('click', () => act({ type: 'flip', n }));
        row.append(b); built.brk.push(b);
      }
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = '1-4 flip a breaker · E leave'; el.append(help);
    } else if (m === 'radio') {
      h.textContent = 'Relay radio';
      const scale = doc.createElement('div'); scale.className = 'scale'; scale.innerHTML = '<div class="ticks"></div><div class="needle"></div>'; el.append(scale);
      built.needle = scale.querySelector('.needle');
      const freq = doc.createElement('div'); freq.className = 'freq'; freq.innerHTML = '<span>88</span><span class="f"></span><span>108</span>'; el.append(freq);
      built.f = freq.querySelector('.f');
      const meter = doc.createElement('div'); meter.className = 'meter'; for (let i = 0; i < 12; i++) meter.append(doc.createElement('i')); el.append(meter);
      built.bars = [...meter.children];
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = 'A / D or the wheel tune · Shift for big steps · E leave'; el.append(help);
    } else if (m === 'note') {
      h.remove();   // CL-185: nothing says what it is
      const sk = doc.createElement('div'); sk.className = 'sketch'; el.append(sk); built.sketch = sk;
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = 'E put it back'; el.append(help);
    } else {
      h.textContent = 'Supply vault';
      const lcd = doc.createElement('div'); lcd.className = 'lcd'; el.append(lcd); built.lcd = lcd;
      const keys = doc.createElement('div'); keys.className = 'keys'; el.append(keys);
      for (let d = 1; d <= 9; d++) { const b = doc.createElement('button'); b.type = 'button'; b.textContent = String(d); b.addEventListener('click', () => act({ type: 'digit', d })); keys.append(b); }
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = '1-9 enter the code · E leave'; el.append(help);
    }
  }
  return {
    element: el,
    open(m) { if (mode !== m) build(m); mode = m; el.classList.add('on'); el.classList.toggle('paper', m === 'note'); },
    close() { mode = null; el.classList.remove('on', 'hot', 'paper'); },
    isOpen: () => !!mode,
    mode: () => mode,
    // view: breakers { on, hot } · radio { dial, band, clarity } · keypad { entry, len, bad, open } · note { order, count }
    render(v) {
      if (!mode || !built) return;
      if (mode === 'note') { const k = (v.order || []).join(',') + '/' + (v.count || 4); if (built.sketchKey !== k) { built.sketchKey = k; built.sketch.innerHTML = fuseSketch(v.order || [], v.count || 4); } return; }
      if (mode === 'breakers') {
        built.brk.forEach((b, i) => b.classList.toggle('on', !!v.on[i]));
        el.classList.toggle('hot', !!v.hot);
      } else if (mode === 'radio') {
        const [lo, hi] = v.band;
        built.needle.style.left = ((v.dial - lo) / (hi - lo) * 100).toFixed(2) + '%';
        built.f.textContent = v.dial.toFixed(1) + ' MHz';
        const lit = Math.round(v.clarity * built.bars.length);
        built.bars.forEach((b, i) => b.classList.toggle('lit', i < lit));
      } else {
        const s = Array.from({ length: v.len }, (_, i) => (v.entry[i] != null ? String(v.entry[i]) : '_')).join(' ');
        built.lcd.textContent = v.bad ? 'WRONG' : v.open ? 'OPEN' : s;
        built.lcd.classList.toggle('bad', !!v.bad);
      }
    },
    destroy() { win.removeEventListener('keydown', onKey, true); win.removeEventListener('wheel', onWheel, { capture: true }); el.remove(); }
  };
}
