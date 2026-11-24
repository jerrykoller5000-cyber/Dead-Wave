// ui/relay-panel.js — CL-183: the radio relay's little devices (Claude's). No game state: index.html owns the
// puzzle (game/relay-puzzle.js) and calls render(); the panel only draws it and turns keys, the wheel and clicks into
// actions. While it is open it has the keyboard: nothing else in the game hears a key (or the wheel) until it closes.
//
//   createRelayPanel({ doc, onAction, id })   onAction({ type: 'flip', n } | { type: 'tune', d } | { type: 'digit', d } | { type: 'close' })
//     open(mode, opts)  'breakers' | 'radio' | 'keypad' | 'note' | 'look'      close()   isOpen()   mode()   render(view)   element
//
// CL-217: the ranger cache's lockbox and its "E — Look" views use a second panel (id 'rangerPanel'; ids in PANEL_IDS
// share the look). open() takes opts: keypad { title, help, strip: html over the display }, look { html, paper, help },
// and opts.key, which rebuilds the panel when it changes. A 'look' panel is like the note: it only shows a thing.
//
// CL-184 (Jerry): the panels give nothing away. No tag on the breakers (Sato's note is a scrap of paper somewhere round
// the site: the 'note' mode reads it), no code on the radio's display and no "count the beeps" (only the dial and the
// signal bars, which say how clear the station is), and no hint on the vault's keypad.

const PANEL_IDS = ['relayPanel', 'rangerPanel'];
const CSS_SRC = `
#relayPanel{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;width:min(384px,calc(100vw - 32px));box-sizing:border-box;
  padding:13px 16px 11px;border-radius:4px;
  background:linear-gradient(180deg,#272d25 0%,#181c17 65%,#131612 100%);
  border:2px solid #59624e;
  box-shadow:0 16px 40px rgba(0,0,0,.84), inset 0 1px 0 rgba(255,255,255,.12), inset 0 -2px 0 rgba(0,0,0,.55);
  color:#dfe3d2;font-family:'Courier New',ui-monospace,monospace;pointer-events:auto;display:none}
#relayPanel::before,#relayPanel::after{content:'';position:absolute;left:7px;right:7px;height:6px;pointer-events:none;
  background:radial-gradient(circle at 4px 3px,#6d7564 0 2.4px,#1b1f1a 2.8px,transparent 3.2px),
             radial-gradient(circle at calc(100% - 4px) 3px,#6d7564 0 2.4px,#1b1f1a 2.8px,transparent 3.2px)}
#relayPanel::before{top:6px}
#relayPanel::after{bottom:6px}
#relayPanel.on{display:block}
#relayPanel h3{margin:0 0 9px;padding:0 14px 6px;border-bottom:1px solid rgba(154,166,134,.22);font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#d6c486;text-align:center}
#relayPanel .tag{margin:0 0 4px;padding:6px 8px;background:#e9e1c4;color:#2b2618;font:600 11px/1.35 'Courier New',monospace;transform:rotate(-.6deg);box-shadow:0 2px 4px #0007}
#relayPanel .row{display:flex;gap:10px;justify-content:center;padding:4px 2px 2px}
#relayPanel .brk{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:6px 4px;border-radius:3px;background:rgba(0,0,0,.22);border:1px solid rgba(120,130,108,.18);transition:border-color .1s,background .1s}
#relayPanel .brk:hover{border-color:rgba(214,196,134,.45);background:rgba(255,255,255,.04)}
#relayPanel .brk .lamp{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#5a2822,#28100d);border:1px solid #161814;box-shadow:inset 0 1px 2px #000}
#relayPanel .brk.on .lamp{background:radial-gradient(circle at 35% 35%,#baffc6,#3be85d);box-shadow:0 0 10px rgba(93,255,122,.8),inset 0 1px 1px #fff8}
#relayPanel .brk .sw{width:36px;height:54px;border-radius:3px;background:linear-gradient(180deg,#0c0e0c,#181b17);border:1px solid #484f42;box-shadow:inset 0 2px 5px rgba(0,0,0,.85);position:relative}
#relayPanel .brk .sw i{position:absolute;left:4px;right:4px;height:22px;bottom:4px;border-radius:2px;background:linear-gradient(180deg,#7c8276,#3d413a);border:1px solid #242722;box-shadow:0 2px 3px rgba(0,0,0,.65);transition:bottom .08s ease-out}
#relayPanel .brk.on .sw i{bottom:26px;background:linear-gradient(180deg,#f0e9cc,#9e977b);border-color:#d4cca9}
#relayPanel .brk b{font-size:12px;letter-spacing:.12em;color:#c9cdb8}
#relayPanel.hot .brk .sw{border-color:#ff5a2a;box-shadow:0 0 14px rgba(255,90,42,.65),inset 0 0 8px rgba(255,90,42,.35)}
#relayPanel .scope-wrap{position:relative;height:54px;margin:0 0 7px;border-radius:3px;background:#071009;border:1px solid #2f4a32;box-shadow:inset 0 0 14px rgba(0,0,0,.85);overflow:hidden}
#relayPanel .scope-wrap::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(140,255,155,.045) 0 1px,transparent 1px 3px)}
#relayPanel .scope{display:block;width:100%;height:100%}
#relayPanel .scope-led{position:absolute;top:5px;right:7px;width:7px;height:7px;border-radius:50%;background:#263828;border:1px solid #101911}
#relayPanel .scope-led.lock{background:#7cff8a;box-shadow:0 0 8px #7cff8a}
#relayPanel .scale{position:relative;height:28px;margin:4px 0 6px;border-radius:3px;background:linear-gradient(180deg,#0b100b,#111711);border:1px solid #3f4a3a;overflow:hidden;box-shadow:inset 0 2px 5px rgba(0,0,0,.8)}
#relayPanel .scale .ticks{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(155,175,140,.42) 0 1px,transparent 1px 5%),repeating-linear-gradient(90deg,rgba(216,196,134,.55) 0 1px,transparent 1px 25%)}
#relayPanel .scale .needle{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ff6a3a;box-shadow:0 0 8px #ff6a3a}
#relayPanel .freq{display:flex;justify-content:space-between;align-items:center;font:700 13px/1 'Courier New',monospace;color:#9fe0a0;text-shadow:0 0 5px rgba(124,255,138,.35)}
#relayPanel .freq span:first-child,#relayPanel .freq span:last-child{font-size:10px;color:#89947d;text-shadow:none}
#relayPanel .meter{display:flex;gap:3px;height:11px;margin:6px 0 4px}
#relayPanel .meter i{flex:1;background:#1c2519;border:1px solid rgba(110,130,96,.18);border-radius:1px;transition:background .08s}
#relayPanel .meter i.lit{background:#7cff8a;border-color:#aaffb4;box-shadow:0 0 6px rgba(124,255,138,.6)}
#relayPanel .lcd{position:relative;margin:6px 0 4px;padding:8px 10px;background:linear-gradient(180deg,#081209,#0d1a0e);border:1px solid #345436;border-radius:3px;font:700 20px/1 'Courier New',monospace;letter-spacing:.35em;color:#8dff95;text-align:center;text-shadow:0 0 8px rgba(141,255,149,.6);box-shadow:inset 0 2px 8px rgba(0,0,0,.85);min-height:22px}
#relayPanel .lcd.bad{color:#ff6a5a;border-color:#743028;text-shadow:0 0 8px rgba(255,106,90,.65)}
#relayPanel .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
#relayPanel .keys button{padding:8px 0;border-radius:3px;border:1px solid #525b49;background:linear-gradient(180deg,#30372c,#20251e);color:#e6e9da;font:700 15px/1 'Courier New',monospace;cursor:pointer;box-shadow:0 2px 0 #10130f,inset 0 1px 0 rgba(255,255,255,.1);transition:transform .05s,background .08s}
#relayPanel .keys button:hover{background:linear-gradient(180deg,#3b4436,#272d24);border-color:#8a947a}
#relayPanel .keys button:active{transform:translateY(1px);background:#3a4234;box-shadow:none}
#relayPanel .note{margin-top:8px;font-size:11px;line-height:1.4;color:#c9cdb8}
#relayPanel.paper{background:radial-gradient(circle at 82% 18%,rgba(148,108,62,.16),transparent 42%),linear-gradient(180deg,#ebe3c7,#ded4b2);border:2px solid #9e9069;color:#2b2618;box-shadow:0 16px 40px rgba(0,0,0,.82),inset 0 0 24px rgba(120,96,58,.22)}
#relayPanel.paper::before,#relayPanel.paper::after{display:none}
#relayPanel.paper h3{color:#6d6040;border-bottom-color:rgba(109,96,64,.25)}
#relayPanel.paper .tag{background:none;box-shadow:none;font-size:13px;padding:2px 0 6px}
#relayPanel.paper .sketch{margin:2px 0 0;transform:rotate(-1.0deg)}
#relayPanel.paper .help{color:#695d40}
#relayPanel .help{margin-top:9px;padding-top:6px;border-top:1px solid rgba(154,166,134,.16);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#a8b099;text-align:center}
#relayPanel .look img,#relayPanel .strip img{display:block;width:100%;height:auto;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.6)}
#relayPanel .strip{margin:0 0 8px}
#relayPanel.wide{width:min(448px,calc(100vw - 32px))}
#relayPanel{transform:translateX(-50%) scale(var(--relay-panel-scale,1));transform-origin:50% 100%}
@media (min-width:900px) and (min-height:640px){#relayPanel{--relay-panel-scale:1.35}}
@media (min-width:1500px) and (min-height:860px){#relayPanel{--relay-panel-scale:1.6}}
#relayPanel .help{font-size:10.5px;color:#b9bfa8}
#relayPanel.paper .help{color:#62563a;border-top-color:rgba(109,96,64,.22)}
`;   // CL-258 (Jerry's N2): bigger on a desktop screen, so its switches, dial and keys are easy to hit and read
const CSS = CSS_SRC.replaceAll('#relayPanel', ':is(' + PANEL_IDS.map((i) => '#' + i).join(',') + ')');   // id specificity kept

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

export function createRelayPanel({ doc = document, onAction = () => {}, id = 'relayPanel' } = {}) {
  if (!doc.getElementById('relayPanelCss')) { const st = doc.createElement('style'); st.id = 'relayPanelCss'; st.textContent = CSS; (doc.head || doc.body).append(st); }
  const el = doc.createElement('div'); el.id = id; el.setAttribute('role', 'dialog');
  (doc.getElementById('hud') || doc.body).append(el);
  let mode = null, built = null, opts = {};
  const win = doc.defaultView || window;
  const act = (a) => { try { onAction(a); } catch (e) { console.info('relay panel', e); } };
  const onKey = (e) => {
    if (!mode) return;
    const c = e.code;
    let handled = true;
    if (c === 'KeyE' || c === 'Escape') { if (!e.repeat) act({ type: 'close' }); }
    else if (mode === 'note' || mode === 'look') handled = !/^F\d+$/.test(c);
    else if (/^(Digit|Numpad)[0-9]$/.test(c)) { const d = +c.slice(-1); if (!e.repeat) act(mode === 'breakers' ? { type: 'flip', n: d } : { type: 'digit', d }); }
    else if (c === 'KeyA' || c === 'ArrowLeft') act({ type: 'tune', d: e.shiftKey ? -1 : -0.1 });
    else if (c === 'KeyD' || c === 'ArrowRight') act({ type: 'tune', d: e.shiftKey ? 1 : 0.1 });
    else handled = !/^F\d+$/.test(c);   // every other key is swallowed too (no walking off, no weapon swaps), but F-keys
    if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  const onWheel = (e) => { if (!mode || mode === 'note' || mode === 'look') return; e.preventDefault(); e.stopImmediatePropagation(); if (mode === 'radio') act({ type: 'tune', d: e.deltaY < 0 ? 0.1 : -0.1 }); };
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
      h.textContent = 'Relay radio · VHF receiver';
      const swrap = doc.createElement('div'); swrap.className = 'scope-wrap';
      const canvas = doc.createElement('canvas'); canvas.className = 'scope'; canvas.width = 320; canvas.height = 54;
      const led = doc.createElement('span'); led.className = 'scope-led';
      swrap.append(canvas, led); el.append(swrap);
      built.scope = canvas; built.scopeLed = led; built.clarity = 0; built.dial = 88;
      const scale = doc.createElement('div'); scale.className = 'scale'; scale.innerHTML = '<div class="ticks"></div><div class="needle"></div>'; el.append(scale);
      built.needle = scale.querySelector('.needle');
      const freq = doc.createElement('div'); freq.className = 'freq'; freq.innerHTML = '<span>88.0</span><span class="f"></span><span>108.0</span>'; el.append(freq);
      built.f = freq.querySelector('.f');
      const meter = doc.createElement('div'); meter.className = 'meter'; for (let i = 0; i < 12; i++) meter.append(doc.createElement('i')); el.append(meter);
      built.bars = [...meter.children];
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = 'A / D or the wheel tune · Shift for big steps · E leave'; el.append(help);
    } else if (m === 'note') {
      h.remove();   // CL-185: nothing says what it is
      const sk = doc.createElement('div'); sk.className = 'sketch'; el.append(sk); built.sketch = sk;
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = 'E put it back'; el.append(help);
    } else if (m === 'look') {
      h.remove();   // CL-217: like the note, it only shows the thing
      const look = doc.createElement('div'); look.className = 'look'; look.innerHTML = opts.html || ''; el.append(look);
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = opts.help || 'E step back'; el.append(help);
    } else {
      h.textContent = opts.title || 'Supply vault';
      if (opts.strip) { const strip = doc.createElement('div'); strip.className = 'strip'; strip.innerHTML = opts.strip; el.append(strip); }
      const lcd = doc.createElement('div'); lcd.className = 'lcd'; el.append(lcd); built.lcd = lcd;
      const keys = doc.createElement('div'); keys.className = 'keys'; el.append(keys);
      for (let d = 1; d <= 9; d++) { const b = doc.createElement('button'); b.type = 'button'; b.textContent = String(d); b.addEventListener('click', () => act({ type: 'digit', d })); keys.append(b); }
      const help = doc.createElement('div'); help.className = 'help'; help.textContent = opts.help || '1-9 enter the code · E leave'; el.append(help);
    }
  }
  let rafId = 0;
  function drawScope(tMs) {
    if (mode !== 'radio' || !built || !built.scope) return;
    const ctx = typeof built.scope.getContext === 'function' ? built.scope.getContext('2d') : null;
    if (!ctx) return;
    const w = built.scope.width, h = built.scope.height, mid = h * 0.5;
    const clarity = Math.max(0, Math.min(1, built.clarity || 0));
    const t = (tMs || 0) * 0.004;
    ctx.fillStyle = '#071109';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(110, 175, 118, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const noiseAmp = (1 - clarity) * 16 + 1.2;
    const sigAmp = clarity * 15 + 2.5;
    const freq = 0.045 + (built.dial || 88) * 0.0005;
    ctx.strokeStyle = clarity > 0.85 ? '#96ffa6' : '#6ce07c';
    ctx.lineWidth = clarity > 0.85 ? 2.1 : 1.5;
    ctx.shadowColor = clarity > 0.85 ? '#7cff8a' : '#42b852';
    ctx.shadowBlur = clarity > 0.85 ? 8 : 4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const n = Math.sin(x * 0.67 + t * 17.3) * Math.cos(x * 0.29 - t * 11.1) + Math.sin(x * 1.13 + t * 23.7) * 0.5;
      const carrier = Math.sin(x * freq + t * 4.2) * Math.cos(x * 0.012 - t * 1.1);
      const y = mid + carrier * sigAmp + n * noiseAmp * 0.62;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function stopScope() {
    if (rafId && typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(rafId);
    rafId = 0;
  }
  function startScope() {
    stopScope();
    if (typeof win.requestAnimationFrame !== 'function') return;
    const tick = (now) => {
      if (mode !== 'radio') { rafId = 0; return; }
      drawScope(now);
      rafId = win.requestAnimationFrame(tick);
    };
    rafId = win.requestAnimationFrame(tick);
  }
  return {
    element: el,
    open(m, o = {}) {
      const key = o.key ?? null;
      if (mode !== m || (built && built.key !== key)) { opts = o; build(m); built.key = key; }
      mode = m; el.classList.add('on');
      el.classList.toggle('paper', m === 'note' || (m === 'look' && !!o.paper));
      el.classList.toggle('wide', m === 'look');
      if (m === 'radio') startScope(); else stopScope();
    },
    close() { stopScope(); mode = null; el.classList.remove('on', 'hot', 'paper', 'wide'); },
    isOpen: () => !!mode,
    mode: () => mode,
    // view: breakers { on, hot } · radio { dial, band, clarity } · keypad { entry, len, bad, open } · note { order, count } · look (none)
    render(v) {
      if (!mode || !built || mode === 'look') return;
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
        built.clarity = v.clarity; built.dial = v.dial;
        if (built.scopeLed) built.scopeLed.classList.toggle('lock', v.clarity >= 0.88);
        drawScope(typeof performance !== 'undefined' ? performance.now() : 0);
      } else {
        const s = Array.from({ length: v.len }, (_, i) => (v.entry[i] != null ? String(v.entry[i]) : '_')).join(' ');
        built.lcd.textContent = v.bad ? 'WRONG' : v.open ? 'OPEN' : s;
        built.lcd.classList.toggle('bad', !!v.bad);
      }
    },
    destroy() { stopScope(); win.removeEventListener('keydown', onKey, true); win.removeEventListener('wheel', onWheel, { capture: true }); el.remove(); }
  };
}
