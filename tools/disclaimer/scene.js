// CL-191: the disclaimer, as a pure function of time. render.mjs calls renderAt(t) for every frame and screenshots it;
// nothing animates on its own (no CSS transitions or animations), so every frame is exactly reproducible.
// Times: t is video seconds; s = t - DROP is song seconds (Been Warned 9.151494 s and the dancer's frame 0 at s = 0).
(() => {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const outExpo = (x) => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  const outBack = (x, k = 1.9) => { x = clamp(x) - 1; return 1 + (k + 1) * x * x * x + k * x * x; };
  const inCubic = (x) => { x = clamp(x); return x * x * x; };
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const px = (v) => v.toFixed(2) + 'px';

  let TL, WORDS, BOX, DROP, BEAT, FPS, SHOT, END, FRAMES = 'frames/', curLight = { r: 0, b: 0 };
  const L = {};            // per line: { el, rows, words: [{el, at}], ... }
  const sparks = [];

  function el(tag, cls, parent, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent.appendChild(e); return e; }
  // A row of words; spec: [[text, voiceWordIndex | null, cls?], ...]; returns the word list with their appear times.
  function row(line, top, spec, extraCls) {
    const r = el('div', 'row' + (extraCls ? ' ' + extraCls : ''), line.el); r.style.top = top + 'px';
    const out = [];
    for (const [text, wi, cls, lettered] of spec) {
      const w = el('span', 'w' + (cls ? ' ' + cls : ''), r);
      if (lettered) for (const ch of text) el('span', 'l', w, ch); else w.textContent = text;
      const ww = WORDS[line.voice][wi];
      out.push({ el: w, at: line.voiceAt + (ww ? ww[1] : 0) - 0.045, dur: ww ? ww[2] - ww[1] : 0.3 });
    }
    line.rows.push(r);
    return out;
  }

  function build() {
    const text = $('text');
    for (const spec of TL.lines) {
      const line = { ...spec, el: el('div', 'line', text), rows: [], words: [] };
      line.voice = spec.voice.replace('.mp3', '');
      line.el.style.position = 'absolute'; line.el.style.inset = '0';
      L[spec.id] = line;
    }
    // ATTENTION!
    { const a = L.attention; a.tapeA = el('div', 'tape', a.el); a.tapeA.style.top = '352px'; a.tapeB = el('div', 'tape', a.el); a.tapeB.style.top = '612px';
      a.words = row(a, 376, [['ATTENTION!', 0, 'attn']]); }
    // This game was made entirely using / ARTIFICIAL INTELLIGENCE.
    { const m = L.made;
      m.words = row(m, 396, [['This', 0], ['game', 1], ['was', 2], ['made', 3], ['entirely', 4], ['using', 5]]);
      m.ai = row(m, 492, [['artificial', 6, 'ai', true], ['intelligence.', 7, 'ai', true]]);
      // the scan sweep: the same words again, clipped to a moving band of light
      m.scan = el('div', 'row', m.el); m.scan.style.top = '492px';
      for (const t of ['artificial', 'intelligence.']) { const w = el('span', 'w ai', m.scan, t); w.style.opacity = 1; w.style.color = 'transparent';
        w.style.backgroundImage = 'linear-gradient(100deg, rgba(255,255,255,0) 42%, rgba(255,255,255,.95) 50%, rgba(255,255,255,0) 58%)';
        w.style.backgroundSize = '320% 100%'; w.style.webkitBackgroundClip = 'text'; w.style.backgroundClip = 'text'; }
    }
    // Whether you like it... / ...or it's just more SOULLESS AI SLOP... / ...is up to you.
    { const c = L.slop;
      c.r1 = row(c, 342, [['Whether', 0], ['you', 1], ['like', 2], ['it...', 3]]);
      c.r2 = row(c, 446, [['or', 4], ["it's", 5], ['just', 6], ['more', 7], ['soulless', 8, 'slop'], ['AI', 9, 'slop'], ['slop...', 10, 'slop', true]]);
      c.r3 = row(c, 556, [['is', 11], ['up', 12], ['to', 13], ['you.', 14]]);
      c.r3.forEach((w) => { w.el.style.fontSize = '80px'; });
      c.drips = [0, 1].map(() => { const d = el('div', null, c.el); d.style.cssText = 'position:absolute;width:9px;border-radius:0 0 6px 6px;background:linear-gradient(#ff4a3a,#c41d12);opacity:0;height:0'; return d; });
    }
    // But I do hope you are able to / have some FUN.
    { const f = L.fun;
      f.r1 = row(f, 396, [['But', 0], ['I', 1], ['do', 2], ['hope', 3], ['you', 4], ['are', 5], ['able', 6], ['to', 7]]);
      f.r2 = row(f, 486, [['have', 8], ['some', 9], ['fun.', 10, 'fun']]);
      for (let i = 0; i < 12; i++) sparks.push(el('div', 'spark', f.el));
    }
    // Now go on! / GIT!
    { const g = L.git;
      g.r1 = row(g, 392, [['Now', 0], ['go', 1], ['on!', 2]]);
      g.r1.forEach((w) => { w.el.style.fontSize = '80px'; });
      g.r2 = row(g, 470, [['GIT!', 3, 'git']]);
    }
  }

  // ---- lights ----
  function lights(t, s) {
    let r = 0, b = 0, flash = 0, speed = 1;
    if (t >= TL.sirenAt && t < DROP + 0.02) {
      // the siren: hard wig-wag, 2.2 flashes a second a side (under the 3/s photosensitivity line)
      const u = (t - TL.sirenAt) * 2.2;
      const pulse = (x) => { x -= Math.floor(x); if (x < 0.03) return x / 0.03; if (x < 0.28) return 1; if (x < 0.42) return 1 - (x - 0.28) / 0.14; return 0; };
      r = 0.95 * pulse(u); b = 0.95 * pulse(u + 0.5); speed = 2.4;
    } else if (s >= 0 && s < SHOT - DROP) {
      const show = s >= TL.lines[3].out && s < TL.lines[4].in;   // the floorwork: the lights go to eighths
      const step = show ? BEAT / 2 : BEAT, peak = show ? 0.8 : 0.7, tau = show ? 0.16 : 0.27;
      const k = Math.floor(s / step), f = s - k * step;
      const cur = peak * Math.exp(-f / tau), prev = peak * Math.exp(-(f + step) / tau);
      if (k % 2 === 0) { r = cur; b = prev; } else { b = cur; r = prev; }
      r += 0.1; b += 0.1;
      flash = 0.95 * Math.exp(-s / 0.32);           // the drop
      const gi = DROP + TL.lines[4].voiceAt + WORDS['5-git'][3][1] - DROP;
      if (s >= gi) flash = Math.max(flash, 0.7 * Math.exp(-(s - gi) / 0.25));   // GIT!
      speed = show ? 1.8 : 1;
    }
    return { r: clamp(r + flash), b: clamp(b + flash), speed };
  }

  // ---- shake: drop, GIT!, the shot ----
  function shake(s, f) {
    let a = 0;
    const imp = (at, amp, tau) => { if (s >= at) a += amp * Math.exp(-(s - at) / tau); };
    imp(0, 16, 0.12);
    imp(TL.lines[4].voiceAt + WORDS['5-git'][3][1], 20, 0.11);
    imp(SHOT - DROP, 30, 0.15);
    return [a * (hash(f * 2.1) - 0.5) * 2, a * (hash(f * 3.7 + 1) - 0.5) * 2];
  }

  function wordIn(w, s, opt = {}) {
    const age = s - w.at;
    if (age < 0) { w.el.style.opacity = 0; return -1; }
    const p = clamp(age / (opt.dur || 0.17));
    const y = (1 - outExpo(p)) * (opt.rise || 34);
    const sc = 1 + (1 - outExpo(p)) * (opt.grow || 0.12);
    w.el.style.opacity = smooth(p * 1.5).toFixed(3);
    w.el.style.transform = `translateY(${px(y)}) scale(${sc.toFixed(4)})`;
    w.el.style.filter = p < 1 ? `blur(${px((1 - p) * 9)})` : 'none';
    if (!opt.keepColor) {   // born in the colour of the light that was on when it was said, then white
      const hot = clamp(1 - age / 0.32), lb = lights(DROP + w.at, w.at), red = lb.r >= lb.b;
      w.el.style.color = hot > 0 ? (red ? `rgb(255,${Math.round(lerp(241, 140, hot))},${Math.round(lerp(234, 130, hot))})` : `rgb(${Math.round(lerp(243, 150, hot))},${Math.round(lerp(241, 195, hot))},255)`) : '';
    }
    return age;
  }
  const lineAlpha = (line, s) => (s < line.in - 0.2 ? 0 : 1);

  function renderText(s, f) {
    const shotS = SHOT - DROP;
    // ATTENTION!
    { const a = L.attention, w = a.words[0], age = s - a.in;
      const vis = s >= a.in && s < a.out;
      a.el.style.display = vis ? '' : 'none';
      if (vis) {
        const p = clamp(age / 0.13);
        let sc = 1.9 - 0.9 * outExpo(p), op = clamp(age / 0.05), blur = 16 * (1 - p);
        const c = 20 * Math.exp(-age / 0.18) + 1.6;
        let tx = 0, clip = 'none', skew = 0;
        if (age > 0.3) op *= 0.93 + 0.07 * hash(f);
        const gl = s - (a.out - 0.2);                 // the glitch out
        if (gl > 0) {
          const g = gl / 0.2; tx = (hash(f * 5.3) - 0.5) * 80 * (0.4 + g); skew = (hash(f * 9.1) - 0.5) * 30 * g;
          const t0 = hash(f * 2.9) * 70, t1 = hash(f * 4.4) * (70 - t0 * 0.5);
          clip = `inset(${t0.toFixed(1)}% 0 ${t1.toFixed(1)}% 0)`; op *= hash(f * 7.7) > 0.25 * (1 + g) ? 1 : 0.15;
        }
        w.el.style.opacity = op.toFixed(3);
        w.el.style.transform = `translateX(${px(tx)}) skewX(${skew.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        w.el.style.filter = blur > 0.1 ? `blur(${px(blur)})` : 'none';
        w.el.style.clipPath = clip;
        w.el.style.textShadow = `${px(-c)} 0 0 rgba(255,0,80,.75), ${px(c)} 0 0 rgba(0,220,255,.6), 0 0 46px rgba(255,40,20,.6), 0 0 120px rgba(255,30,10,.38)`;
        const tp = outExpo(clamp((age - 0.06) / 0.4));
        for (const tape of [a.tapeA, a.tapeB]) { tape.style.transform = `scaleX(${tp.toFixed(4)})`; tape.style.opacity = (gl > 0 ? (hash(f * 3.3 + 2) > 0.5 ? 1 : 0.1) : 1) * op; }
      }
      const ring = $('ring'), ra = s - a.in;
      if (ra >= 0 && ra < 0.6) { const k = outExpo(ra / 0.6); ring.style.opacity = (0.9 * (1 - ra / 0.6)).toFixed(3); ring.style.transform = `scale(${(0.6 + k * 9).toFixed(3)})`; ring.style.borderWidth = px(Math.max(1, 8 * (1 - k))); }
      else ring.style.opacity = 0;
    }
    // This game was made entirely using ARTIFICIAL INTELLIGENCE.
    { const m = L.made, vis = s >= m.in - 0.1 && s < m.out;
      m.el.style.display = vis ? '' : 'none';
      if (vis) {
        const ex = clamp((s - (m.out - 0.21)) / 0.21);
        m.words.forEach((w) => wordIn(w, s));
        // the two big words come on letter by letter as they are said, like a terminal
        m.ai.forEach((w) => {
          const ls = [...w.el.children]; w.el.style.opacity = 1;
          ls.forEach((l, i) => {
            const at = w.at + (i / ls.length) * w.dur * 0.85, age = s - at;
            let op = 0; if (age >= 0) op = age < 0.025 ? 1 : age < 0.05 ? 0.25 : age < 0.09 ? 0.85 : 1;
            l.style.opacity = op;
            const hot = clamp(1 - age / 0.25);
            l.style.textShadow = `0 0 ${px(18 + 30 * hot)} rgba(90,225,255,${(0.5 + 0.4 * hot).toFixed(2)}), 0 0 4px rgba(255,255,255,${(0.6 * hot).toFixed(2)})`;
            l.style.color = hot > 0 ? `rgb(${Math.round(lerp(212, 255, hot))},${Math.round(lerp(248, 255, hot))},255)` : '';
          });
        });
        const sweepAt = m.voiceAt + 3.4, sp = clamp((s - sweepAt) / 0.6);
        [...m.scan.children].forEach((w) => { w.style.backgroundPosition = `${(100 - sp * 100).toFixed(2)}% 0`; w.style.opacity = s >= sweepAt && sp < 1 ? 1 : 0; });
        const rows = [m.rows[0], m.rows[1], m.scan];
        rows.forEach((r, i) => { const e = inCubic(clamp(ex * 1.15 - i * 0.12)); r.style.transform = `translateY(${px(-60 * e)})`; r.style.opacity = (1 - e).toFixed(3); r.style.filter = e > 0 ? `blur(${px(10 * e)})` : 'none'; });
      }
    }
    // Whether you like it... or it's just more SOULLESS AI SLOP... is up to you.
    { const c = L.slop, vis = s >= c.in - 0.1 && s < c.out;
      c.el.style.display = vis ? '' : 'none';
      if (vis) {
        c.r1.forEach((w) => wordIn(w, s)); c.r2.forEach((w) => wordIn(w, s)); c.r3.forEach((w) => wordIn(w, s, { rise: 20, grow: 0.2 }));
        // the slop: chromatic jitter once said; the letters of SLOP sag and drip
        c.r2.slice(4).forEach((w, i) => {
          const age = s - w.at; if (age < 0) return;
          const j = 2 + 3 * hash(f * 1.3 + i * 7);
          w.el.style.textShadow = `${px(-j)} 0 0 rgba(255,0,90,.7), ${px(j)} 0 0 rgba(0,210,255,.55), 0 0 26px rgba(255,40,30,.45)`;
          if (age > 0.17) w.el.style.transform = `translate(${px((hash(f + i * 3) - 0.5) * 3)}, ${px((hash(f * 2 + i) - 0.5) * 2)})`;
        });
        const slopW = c.r2[6], sAge = s - slopW.at;
        [...slopW.el.children].forEach((l, i) => {
          const k = smooth((sAge - 0.2) / 1.3), sag = (6 + 12 * hash(i * 13.1)) * k;
          l.style.transform = `translateY(${px(sag)}) rotate(${((hash(i * 5.7) - 0.5) * 9 * k).toFixed(2)}deg) scaleY(${(1 + 0.08 * k).toFixed(3)})`;
        });
        const sl = slopW.el.getBoundingClientRect();
        c.drips.forEach((d, i) => {
          const k = smooth((sAge - 0.45 - i * 0.25) / 1.1);
          d.style.left = px(sl.left + sl.width * (0.22 + i * 0.4)); d.style.top = px(sl.bottom - 14 + 10 * k);
          d.style.height = px(70 * k * (0.7 + 0.5 * i)); d.style.opacity = sAge > 0.45 ? (0.9 * (1 - 0.3 * k)).toFixed(3) : 0;
        });
        // "is up to you." lands: the rest steps back
        const r3a = s - c.r3[0].at, dim = smooth(r3a / 0.35);
        [c.rows[0], c.rows[1]].forEach((r) => { r.style.opacity = (1 - 0.62 * dim).toFixed(3); r.style.filter = dim > 0 ? `blur(${px(1.2 * dim)})` : 'none'; });
        c.r3.forEach((w) => { if (s >= w.at) w.el.style.textShadow = '0 0 24px rgba(255,255,255,.35)'; });
        const ex = clamp((s - (c.out - 0.2)) / 0.2);
        if (ex > 0) c.rows.forEach((r, i) => { const e = ex * ex; r.style.transform = `translateY(${px(80 * e)}) rotate(${((i - 1) * 3 * e).toFixed(2)}deg)`; r.style.opacity = ((1 - e) * (i < 2 ? 1 - 0.62 * dim : 1)).toFixed(3); });
        c.drips.forEach((d) => { if (ex > 0) d.style.opacity = (parseFloat(d.style.opacity || 0) * (1 - ex)).toFixed(3); });
      }
    }
    // But I do hope you are able to / have some FUN.
    { const fl = L.fun, vis = s >= fl.in - 0.1 && s < fl.out;
      fl.el.style.display = vis ? '' : 'none';
      if (vis) {
        fl.r1.forEach((w) => wordIn(w, s)); fl.r2.slice(0, 2).forEach((w) => wordIn(w, s));
        const fun = fl.r2[2], age = s - fun.at;
        if (age < 0) fun.el.style.opacity = 0;
        else {
          // a pop with some give: up past size, back under, settle; then it rides the beat
          const k = [[0, 0], [0.11, 1.32], [0.21, 0.9], [0.3, 1.05], [0.4, 1]];
          let sc = 1; for (let i = 1; i < k.length; i++) if (age < k[i][0]) { const u = (age - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); sc = lerp(k[i - 1][1], k[i][1], smooth(u)); break; }
          if (age >= 0.4) { const bf = (s / BEAT) % 1; sc = 1 + 0.045 * Math.exp(-bf * 5); }
          fun.el.style.opacity = clamp(age / 0.05).toFixed(3);
          fun.el.style.transform = `scale(${sc.toFixed(4)}) rotate(${(-4 * Math.exp(-age / 0.3)).toFixed(2)}deg)`;
          fun.el.style.filter = 'none';
          fun.el.style.textShadow = `0 0 ${px(30 + 40 * Math.exp(-age / 0.3))} rgba(255,175,50,.7), 0 0 4px rgba(255,240,200,.6)`;
          const fr = fun.el.getBoundingClientRect(), cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
          sparks.forEach((sp, i) => {
            const ang = (i / sparks.length) * Math.PI * 2 + hash(i * 3.1) * 0.5, d = (150 + 120 * hash(i * 1.7)) * outExpo(age / 0.55);
            const o = clamp(1 - age / 0.55);
            sp.style.left = px(cx + Math.cos(ang) * d - 2.5); sp.style.top = px(cy + Math.sin(ang) * d - 13);
            sp.style.transform = `rotate(${(ang * 180 / Math.PI + 90).toFixed(1)}deg) scaleY(${(0.3 + 0.7 * o).toFixed(3)})`;
            sp.style.opacity = o.toFixed(3);
          });
        }
        const ex = clamp((s - (fl.out - 0.2)) / 0.2);
        fl.rows.forEach((r, i) => { const e = inCubic(clamp(ex * 1.1 - i * 0.08)); r.style.transform = `translateX(${px(-260 * e)}) skewX(${(-14 * e).toFixed(2)}deg)`; r.style.opacity = (1 - e).toFixed(3); r.style.filter = e > 0 ? `blur(${px(12 * e)})` : 'none'; });
      }
    }
    // Now go on! / GIT!  — and the shot
    { const g = L.git, vis = s >= g.in - 0.1 && s < shotS + 0.2;
      g.el.style.display = vis ? '' : 'none';
      if (vis) {
        g.r1.forEach((w) => wordIn(w, s, { grow: 0.18 }));
        const gw = g.r2[0], age = s - gw.at;
        const up = outExpo(clamp(age / 0.18));
        g.rows[0].style.transform = `translateY(${px(-46 * up)})`;
        if (age < 0) gw.el.style.opacity = 0;
        else {
          const p = clamp(age / 0.1), c = 22 * Math.exp(-age / 0.15) + 2;
          gw.el.style.opacity = clamp(age / 0.04).toFixed(3);
          gw.el.style.transform = `scale(${(2.3 - 1.3 * outExpo(p)).toFixed(4)})`;
          gw.el.style.filter = p < 1 ? `blur(${px(14 * (1 - p))})` : 'none';
          gw.el.style.textShadow = `${px(-c)} 0 0 rgba(255,0,80,.75), ${px(c)} 0 0 rgba(0,220,255,.6), 0 0 50px rgba(255,60,30,.7), 0 0 130px rgba(255,40,10,.4)`;
        }
        const sh = s - shotS;
        if (sh >= 0) {   // blown off the screen by the shot
          const k = clamp(sh / 0.14), e = outExpo(k);
          g.rows.forEach((r, i) => { r.style.transform = `translateY(${px((i ? 0 : -46) - 20 * e)}) scale(${(1 + 0.6 * e).toFixed(4)})`; r.style.opacity = (1 - k).toFixed(3); r.style.filter = `blur(${px(26 * e)})`; });
        }
      }
    }
    // the distant guy, subtitled where he is (left, far)
    { const sub = $('sub'); let shown = false;
      for (const line of [L.made, L.slop]) {
        const ch = line.chirps[0], at = line.voiceAt + ch.at + ch.lead, age = s - at;
        if (age >= -0.05 && age < 0.95) {
          shown = true; sub.textContent = ch.text;
          const o = clamp((age + 0.05) / 0.1) * clamp((0.95 - age) / 0.35);
          sub.style.opacity = (0.75 * o).toFixed(3);
          const y = line === L.made ? 300 : 690, x = line === L.made ? 250 : 280;
          sub.style.left = px(x); sub.style.top = px(y - 14 * age); sub.style.filter = 'blur(0.6px)';
        }
      }
      if (!shown) sub.style.opacity = 0;
    }
  }

  async function renderAt(t) {
    const f = Math.round(t * FPS), s = t - DROP, shotS = SHOT - DROP;
    const lt = lights(t, s); curLight = lt;
    $('glowR').style.opacity = lt.r.toFixed(3); $('glowB').style.opacity = lt.b.toFixed(3);
    $('washR').style.opacity = (lt.r * (s < 0 ? 0.9 : 0.45)).toFixed(3); $('washB').style.opacity = (lt.b * (s < 0 ? 0.9 : 0.45)).toFixed(3);
    $('barR').style.opacity = clamp(lt.r * 1.1).toFixed(3); $('barB').style.opacity = clamp(lt.b * 1.1).toFixed(3);
    $('floorR').style.opacity = (lt.r * 0.85).toFixed(3); $('floorB').style.opacity = (lt.b * 0.85).toFixed(3);
    const sw = Math.sin(t * 1.3 * lt.speed);
    $('beamR').style.opacity = (lt.r * 0.85).toFixed(3); $('beamR').style.transform = `rotate(${(14 + 12 * sw).toFixed(2)}deg)`;
    $('beamB').style.opacity = (lt.b * 0.85).toFixed(3); $('beamB').style.transform = `scaleX(-1) rotate(${(14 - 12 * sw).toFixed(2)}deg)`;
    // smoke the lights cut through, drifting
    $('fogR').style.opacity = (0.08 + lt.r * 0.62).toFixed(3); $('fogR').style.transform = `translate(${px(t * 14)}, ${px(Math.sin(t * 0.4) * 10)})`;
    $('fogB').style.opacity = (0.08 + lt.b * 0.62).toFixed(3); $('fogB').style.transform = `translate(${px(-t * 12)}, ${px(Math.cos(t * 0.35) * 10)})`;

    // the stage: he struts in out of the dark, then the spot snaps on (with a flicker) on beat 2
    const spotAt = 2 * BEAT;
    let spot = 0;
    if (s >= spotAt) {
      const u = s - spotAt;
      spot = u < 0.05 ? 1 : u < 0.09 ? 0.15 : u < 0.13 ? 1 : u < 0.2 ? 0.35 : 1;
      spot *= 0.93 + 0.07 * Math.exp(-((s / BEAT) % 1) * 4);
    }
    const sh = s - shotS;
    if (sh >= 0.08) spot = 0;
    const strut = s >= 0 ? 0.38 * smooth(s / spotAt) : 0;
    let dOp = s < 0 ? 0 : Math.max(strut, 0.38 + 0.62 * spot);
    if (sh >= 0.08) dOp = 0.55 * clamp(1 - (sh - 0.08) / 0.27);
    $('cone').style.opacity = (spot * 0.95).toFixed(3); $('pool').style.opacity = spot.toFixed(3);
    $('coneFog').style.opacity = (spot * 0.32).toFixed(3); $('coneFog').style.backgroundPosition = `${px(-t * 9)} ${px(-t * 4)}`;
    $('haze').style.opacity = (s < 0 ? 0 : sh >= 0.08 ? 0.3 * clamp(1 - (sh - 0.08) / 0.27) : smooth(s / spotAt) * 0.55 + 0.45 * spot).toFixed(3);
    const dk = clamp(Math.floor(Math.max(0, s) * TL.dance.fps), 0, TL.dance.frames - 1);
    const src = FRAMES + 'd' + String(dk + 1).padStart(4, '0') + '.png';
    const dancer = $('dancer'), refl = $('reflect');
    if (dancer.getAttribute('src') !== src) { dancer.src = src; refl.src = src; }
    dancer.style.opacity = dOp.toFixed(3);
    const bb = BOX[dk], S = 589 / 1280;
    if (bb) {
      const line = bb[3] * S;   // where he meets the floor (his feet, or hands and back in the floorwork)
      refl.style.transformOrigin = `50% ${px(line)}`;
      refl.style.webkitMaskImage = `linear-gradient(to bottom, rgba(0,0,0,0) ${px(line - 120)}, rgba(0,0,0,1) ${px(line)}, rgba(0,0,0,0) ${px(line + 1)})`;
      refl.style.opacity = (dOp * 0.24).toFixed(3);
    }

    renderText(s, f);
    // a lens streak across the screen as each line comes in, alternating the light's colours
    { const ids = ['attention', 'made', 'slop', 'fun', 'git'], ys = [480, 455, 400, 455, 430];
      let a = 0, b = 0;
      ids.forEach((id, i) => {
        const age = s - L[id].in; if (age < -0.02 || age > 0.5) return;
        const k = age < 0 ? 0 : Math.exp(-age / 0.13) * clamp(age / 0.03 + 0.2);
        const el = i % 2 ? $('streakB') : $('streakA');
        const col = i % 2 ? '120,170,255' : '255,110,90';
        el.style.top = px(ys[i]); el.style.opacity = (0.9 * k).toFixed(3);
        el.style.background = `linear-gradient(90deg, rgba(${col},0), rgba(${col},.7) 30%, rgba(255,255,255,.95) 50%, rgba(${col},.7) 70%, rgba(${col},0))`;
        el.style.boxShadow = `0 0 18px 4px rgba(${col},.55)`;
        el.style.transform = `scaleX(${(0.4 + 0.6 * outExpo(age / 0.25)).toFixed(3)}) scaleY(${(1 + 2 * k).toFixed(2)})`;
        if (i % 2) b = 1; else a = 1;
      });
      if (!a) $('streakA').style.opacity = 0; if (!b) $('streakB').style.opacity = 0; }
    const [sx, sy] = shake(s, f);
    $('scene').style.transform = `translate(${px(sx)}, ${px(sy)})`;

    // dashcam frame
    const hud = $('hud');
    let hOp = smooth((t - 0.25) / 0.4);
    if (sh >= 0) hOp *= sh < 0.12 ? (hash(f * 6.1) > 0.4 ? 1 : 0.2) : 0;
    hud.style.opacity = (0.8 * hOp).toFixed(3);
    const slide = 34 * (1 - outExpo((t - 0.25) / 0.5));
    $('brTL').style.transform = `translate(${px(-slide)}, ${px(-slide)})`; $('brTR').style.transform = `translate(${px(slide)}, ${px(-slide)})`;
    $('brBL').style.transform = `translate(${px(-slide)}, ${px(slide)})`; $('brBR').style.transform = `translate(${px(slide)}, ${px(slide)})`;
    $('rec').firstChild.style.opacity = (t % 1) < 0.55 ? 1 : 0.15;
    const fr30 = Math.floor(t * 30), ss = Math.floor(fr30 / 30);
    $('tc').textContent = `00:00:${String(ss).padStart(2, '0')}:${String(fr30 % 30).padStart(2, '0')}`;
    if (sh >= 0 && sh < 0.12) hud.style.transform = `translateX(${px((hash(f * 8.8) - 0.5) * 40)})`; else hud.style.transform = '';

    // the shot
    $('flash').style.opacity = sh >= 0 ? (0.95 * Math.exp(-sh / 0.055)).toFixed(3) : 0;
    $('grain').style.transform = `translate(${px(-64 * hash(f * 1.1))}, ${px(-64 * hash(f * 2.3))})`;
    $('black').style.opacity = (t < TL.sirenAt ? 1 : sh >= 0.22 ? smooth((sh - 0.22) / 0.2) : 0).toFixed(3);

    const imgs = [dancer, refl].filter((i) => i.getAttribute('src'));
    await Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? Promise.resolve() : i.decode().catch(() => {}))));
    return { f, s: +s.toFixed(3), dk };
  }

  window.sceneReady = (async () => {
    TL = await fetch('timeline.json').then((r) => r.json());
    WORDS = await fetch('words.json').then((r) => r.json());
    BOX = await fetch('dance-bbox.json').then((r) => r.json());
    FRAMES = new URLSearchParams(location.search).get('frames') || FRAMES;
    DROP = TL.drop; BEAT = 60 / TL.song.bpm; FPS = TL.fps;
    const gl = TL.lines[4]; SHOT = DROP + gl.voiceAt + gl.shotAt; END = SHOT + TL.tail;
    await document.fonts.load('400 100px "Black Ops One"'); await document.fonts.load('700 64px "Chakra Petch"'); await document.fonts.load('500 30px "Chakra Petch"'); await document.fonts.load('600 26px "Chakra Petch"');
    build();
    window.renderAt = renderAt;
    return { end: END, fps: FPS, frames: Math.round(END * FPS) + 1, shot: SHOT, drop: DROP };
  })();
})();
