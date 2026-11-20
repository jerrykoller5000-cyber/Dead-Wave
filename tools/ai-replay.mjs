// CB-336 (J154 Zombie Pass 2, claude2): a top-down replay of the zombie AI, so behaviour is judged by watching it.
// Runs one scenario in the real game (headless Chrome through tools/cdp.mjs; one instance, the test slot's rules), records
// every zombie (type, position, radius, knock/stagger/shove, pose hook), the builds (HP) and the marine at 10 Hz, and writes:
//   <out>/<name>.json        the recording
//   <out>/<name>-strip.png   top-down frames, one a second (dots to scale, coloured by type; red ring: bowled over, orange:
//                            staggered, white tick: its shove; a 1 s trail behind each; the overlap stats per frame)
//   <out>/<name>.html        a scrubber over every recorded frame (open it in a browser)
//   <out>/<name>-cam-N.jpg   (--cam) the gameplay camera at a few moments
//   node tools/ai-replay.mjs <scenario> [--ai 0|1] [--out dir] [--seconds s] [--seed n] [--cam]
// Scenarios: press (30 shamblers, 2 brutes behind them, a demon charging across, at a marine in the open),
//            barricade (the same crowd at a row of barricades with the marine behind it).
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const SCEN = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'press';
const AI = opt('ai', '1') !== '0';
const OUT = opt('out', 'review/CB-336');
const SECONDS = +opt('seconds', 14);
const SEED = +opt('seed', 336);
const CAM = argv.includes('--cam'), NIGHT = argv.includes('--night');
const NAME = opt('name', `${SCEN}-${AI ? 'ai' : 'old'}${NIGHT ? '-night' : ''}`);
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's ' + m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(process.cwd(), 0);
const b = await launch({ headless: true });
const p = await b.newPage({ width: 1280, height: 720 });
let rec = null;
try {
  await p.goto(`${server.origin}/index.html?debug=1${AI ? '' : '&ai=0'}`, { timeout: 300000 });
  log('loaded ' + await p.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 900000 }));
  await p.evaluate(`DWOpening && DWOpening.dismissForTesting && DWOpening.dismissForTesting()`);
  await p.evaluate(fs.readFileSync(path.join('tools', 'tests', 'lib.js'), 'utf8'));
  await p.evaluate(`startMatch(TT, 'AI replay')`, 300000);
  log('in the match');
  await p.evaluate(`(async () => {
    const T = TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const w0 = Date.now(); while (T.marine && T.marine.getObjectByName && T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    let s = ${SEED} >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.setHp(1e6);
    if (${NIGHT}) T.setWorldTime(0.02);
    // An open, flat, dry spot: of a ring of candidates, the one with the fewest trees/rocks/props over the ground the crowd
    // crosses (the camera wants to see it); no water anywhere on it and within 2 m of level.
    let P = null, best = 1e9;
    for (let r = 20; r < 260; r += 6) for (let k = 0; k < 32; k++) {
      const a = k / 32 * 6.283, x = Math.cos(a) * r, z = Math.sin(a) * r, y0 = T.sampleHeight(x, z); let bad = 0, ok = true;
      for (let i = -3; i <= 3 && ok; i++) for (let j = -1; j <= 6 && ok; j++) { const px = x + i * 2.5, pz = z + j * 5; if (Math.abs(T.sampleHeight(px, pz) - y0) > 2 || T.waterDepthAt(px, pz) > 0.02) ok = false; }
      if (!ok) continue;
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 13; j++) { const q = T.resolveStaticProps(x + i * 2, z + j * 2, 0.9); if (Math.hypot(q.x - x - i * 2, q.z - z - j * 2) > 0.01) bad++; }
      if (bad < best) { best = bad; P = { x, z, bad }; }
      if (best === 0) break;
    }
    window.__rp = { P, yaw: 0 };
  })()`, 120000);
  const P = await p.evaluate(`__rp.P`);
  if (!P) throw new Error('no flat spot found');
  log('spot ' + JSON.stringify(P));
  // The scenario: the marine at P facing +z, the crowd 16-22 m out along +z.
  await p.evaluate(`(() => {
    const T = TT, P = __rp.P, list = [];
    const hold = () => { T.player.position.set(P.x, T.sampleHeight(P.x, P.z), P.z); T.setHp(1e6); };
    hold(); T.setAimYawDbg && T.setAimYawDbg(Math.PI);
    __rp.hold = setInterval(hold, 50);
    const put = (kind, x, z) => { const zz = T.spawnZombie(P.x + x, P.z + z, kind, true, true); if (!zz) return; zz.riseT = 0; T.hordeDbg.join(zz); if (T.aiDbg && ${AI}) T.aiDbg.join(zz); list.push(zz); };
    if ('${SCEN}' === 'senses') {   // stage 2: eight kinds standing about, most looking away; he walks, fires once, then slips off
      const K = ['shambler', 'feral', 'military', 'brute', 'screamer', 'spitter', 'leaper', 'shambler'];
      K.forEach((k, i) => { const a = i / K.length * 6.283 + 0.3, r = 16 + (i % 3) * 7; put(k, Math.cos(a) * r, 9 + Math.sin(a) * r); const zz = list[list.length - 1]; if (zz && T.aiDbg.unaware) T.aiDbg.unaware(zz); if (zz) zz.mesh.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a)) + (i % 2 ? 0 : Math.PI / 2); });
      window.__rp.list = list; T.aiDbg && T.aiDbg.reset(); return;
    }
    if ('${SCEN}' === 'barricade') for (let i = -4; i <= 4; i++) T.spawnBuild('barricade', P.x + i * 1.6, P.z + 4);
    for (let i = 0; i < 30; i++) put('shambler', (i % 6 - 2.5) * 1.1, 14 + ((i / 6) | 0) * 1.1);
    put('brute', -1.2, 21.5); put('brute', 1.2, 22);
    put('demon', '${SCEN}' === 'barricade' ? 10 : 2, '${SCEN}' === 'barricade' ? 14 : 29);
    window.__rp.list = list;
    T.aiDbg && T.aiDbg.reset();
  })()`);
  log('scenario set: ' + await p.evaluate(`TT.zombies.filter(z => z.alive).length`) + ' zombies');
  // Stepped at a true 60 fps (TT.flightHold + TT.stepFrame(1/60)): the cloud renders about one frame a second, and its own
  // frames would run the game at its 0.05 s clamp, three times the walk per frame a player's PC takes. Recorded every 6 steps
  // (10 Hz of game time); the camera shots, if asked, at full size between steps.
  await p.evaluate(`(() => {
    const T = TT, R = __rp; R.frames = []; R.t0 = T.getSimTime(); R.ids = new WeakMap(); R.nid = 0; R.steps = 0;
    clearInterval(R.hold); T.flightHold(true);
    R.record = () => {
      const zs = T.zombies.filter((z) => z.alive && z.mesh), ids = R.ids;
      const f = { t: +(R.steps / 60).toFixed(2), m: { x: T.player.position.x, z: T.player.position.z }, z: [], b: [] };
      for (const z of zs) { if (!ids.has(z)) ids.set(z, R.nid++); const a = z.ai || {};
        const m = a.mind; f.z.push([ids.get(z), z.typeKey, +z.mesh.position.x.toFixed(3), +z.mesh.position.z.toFixed(3), z.radius, z.knockT > 0 ? 1 : 0, z.hzStaggerT > 0 ? 1 : 0, +(a.shX || 0).toFixed(2), +(a.shZ || 0).toFixed(2), a.pose || '', m ? m.state : '', m && m.known ? +m.known.x.toFixed(1) : null, m && m.known ? +m.known.z.toFixed(1) : null, +z.mesh.rotation.y.toFixed(2)]); }
      for (const b of (T.builds || [])) if (b.hp > 0) f.b.push([b.type, +b.x.toFixed(2), +b.z.toFixed(2), b.radius || 0.6, +(b.hp / (b.maxHp || 1)).toFixed(3)]);
      const os = [];   // every touching pair, as a share of the summed radii
      for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) { const A = zs[i].mesh.position, B = zs[j].mesh.position; if (Math.abs(A.y - B.y) > 1.6) continue; const rr = zs[i].radius + zs[j].radius, d = Math.hypot(A.x - B.x, A.z - B.z); if (d < rr) os.push((rr - d) / rr); }
      os.sort((a, b) => a - b);
      f.o = { n: os.length, max: +(os.at(-1) || 0).toFixed(3), p95: +(os[Math.floor(os.length * 0.95)] || 0).toFixed(3), mean: +(os.reduce((a, b) => a + b, 0) / (os.length || 1)).toFixed(3) };
      f.ai = T.aiDbg ? { st: T.aiDbg.state().staggers, kn: T.aiDbg.state().knocks } : null;
      R.frames.push(f);
    };
    R.mx = R.P.x; R.mz = R.P.z;
    R.script = () => { if ('${SCEN}' !== 'senses') return; const t = R.steps / 60;
      if (t >= 3 && t < 6) R.mx += 2.5 / 60;
      if (Math.abs(t - 6) < 0.5 / 60) { T.setMouseFireDbg(true); R.fired = true; } else if (R.fired) { T.setMouseFireDbg(false); R.fired = false; }
      if (Math.abs(t - 14) < 0.5 / 60) { R.mx = R.P.x - 70; R.mz = R.P.z - 50; } };   // 86 m off: past every kind's sight
    R.step = (n) => { for (let i = 0; i < n; i++) { R.script(); T.player.position.set(R.mx, T.sampleHeight(R.mx, R.mz), R.mz); T.setHp(1e6); T.stepFrame(1 / 60); R.steps++; if (R.steps % 6 === 0) R.record(); } return R.steps; };
    R.record();
  })()`);
  const camAt = CAM ? [3, 5, 6, 7, 8, 10] : [];
  let ci = 0, steps = 0;
  if (!CAM) await p.setViewport(400, 225);
  while (steps < SECONDS * 60) {
    steps = await p.evaluate(`__rp.step(30)`, 600000);
    if (ci < camAt.length && steps >= camAt[ci] * 60) {
      await p.setViewport(1280, 720); await p.evaluate(`__rp.step(1)`); await p.evaluate(`__rp.step(1)`);
      await p.screenshot(path.join(OUT, `${NAME}-cam-${ci + 1}.png`)); log('cam ' + (ci + 1) + ' at ' + (steps / 60).toFixed(1)); ci++;
    }
    if (steps % 300 === 0) log('t ' + (steps / 60).toFixed(0) + ' s');
  }
  rec = await p.evaluate(`(() => { TT.flightHold(false); return { scen: '${SCEN}', ai: ${AI}, seed: ${SEED}, P: __rp.P, frames: __rp.frames, errors: [] }; })()`);
  rec.errors = (p.errors || []).slice(0, 8);
  fs.writeFileSync(path.join(OUT, NAME + '.json'), JSON.stringify(rec));
  log(`recorded ${rec.frames.length} frames`);
  // The strip: one frame a second, drawn as SVG, rendered to PNG by the same browser.
  const COL = { shambler: '#c9b98f', feral: '#9fbf5a', leaper: '#e8d26a', spider: '#ff5c8a', drowned: '#4fb3a8', military: '#5e8f4f', brute: '#c0392b', spitter: '#b7cc3a', screamer: '#e06cf0', bomber: '#f2c94c', demon: '#8a4dff', colossus: '#7a2020', guardian: '#bfe8ff' };
  const W = 300, SPAN = SCEN === 'senses' ? 70 : 30, cx0 = rec.P.x + (SCEN === 'senses' ? -10 : 0), cz0 = rec.P.z + (SCEN === 'senses' ? 0 : 9);
  const X = (x) => (x - cx0) / SPAN * W + W / 2, Y = (z) => W / 2 - (z - cz0) / SPAN * W, S = (r) => r / SPAN * W;
  const frameSvg = (f, i0) => {
    let g = `<rect width="${W}" height="${W}" fill="#1b1d1f"/>`;
    for (let k = -SPAN / 2; k <= SPAN / 2; k += 5) { g += `<line x1="${X(cx0 + k)}" y1="0" x2="${X(cx0 + k)}" y2="${W}" stroke="#2a2d30"/><line x1="0" y1="${Y(cz0 + k)}" x2="${W}" y2="${Y(cz0 + k)}" stroke="#2a2d30"/>`; }
    for (const [ty, x, z, r, hp] of f.b) g += `<rect x="${X(x) - S(0.8)}" y="${Y(z) - S(0.3)}" width="${S(1.6)}" height="${S(0.6)}" fill="#6d7a86" opacity="${0.35 + 0.65 * hp}"/>`;
    const past = rec.frames[Math.max(0, i0 - 10)], pm = new Map(past.z.map((q) => [q[0], q]));
    for (const q of f.z) { const o = pm.get(q[0]); if (o) g += `<line x1="${X(o[2])}" y1="${Y(o[3])}" x2="${X(q[2])}" y2="${Y(q[3])}" stroke="${COL[q[1]] || '#ccc'}" stroke-opacity="0.35" stroke-width="1.5"/>`; }
    for (const q of f.z) {
      const [, ty, x, z, r, kn, sg, shx, shz] = q;
      g += `<circle cx="${X(x)}" cy="${Y(z)}" r="${S(r)}" fill="${COL[ty] || '#ccc'}" fill-opacity="0.85" stroke="${kn ? '#ff2020' : sg ? '#ff9a2a' : '#000'}" stroke-width="${kn || sg ? 2.2 : 0.6}"/>`;
      const STC = { idle: '#8a8f96', suspicious: '#ffd84a', hunting: '#ff3b3b', searching: '#4aa8ff' };
      if (q[10]) { g += `<circle cx="${X(x)}" cy="${Y(z)}" r="${S(r) + 3}" fill="none" stroke="${STC[q[10]]}" stroke-width="2"/><line x1="${X(x)}" y1="${Y(z)}" x2="${X(x) + Math.sin(q[13]) * 9}" y2="${Y(z) - Math.cos(q[13]) * 9}" stroke="#fff" stroke-width="1"/>`;
        if (q[11] != null && q[10] !== 'idle') g += `<line x1="${X(x)}" y1="${Y(z)}" x2="${X(q[11])}" y2="${Y(q[12])}" stroke="${STC[q[10]]}" stroke-dasharray="3 3" stroke-width="1"/>`;
        if (q[9] === 'notice') g += `<text x="${X(x) + 6}" y="${Y(z) - 6}" fill="#ffd84a" font-size="10" font-family="monospace">!</text>`; }
      if (Math.hypot(shx, shz) > 0.3) g += `<line x1="${X(x)}" y1="${Y(z)}" x2="${X(x + shx * 0.5)}" y2="${Y(z + shz * 0.5)}" stroke="#fff" stroke-width="1.2"/>`;
    }
    g += `<circle cx="${X(f.m.x)}" cy="${Y(f.m.z)}" r="${S(0.4)}" fill="#3fa9ff" stroke="#fff"/>`;
    g += `<text x="6" y="14" fill="#ddd" font-size="11" font-family="monospace">t ${f.t.toFixed(1)} s · touching ${f.o.n} · max ${(f.o.max * 100).toFixed(0)}% p95 ${(f.o.p95 * 100).toFixed(0)}%</text>`;
    if (f.ai) g += `<text x="6" y="${W - 6}" fill="#ddd" font-size="11" font-family="monospace">staggered ${f.ai.st} · bowled ${f.ai.kn}</text>`;
    return g;
  };
  const picks = []; for (let s = 1; s <= SECONDS; s++) { const i = rec.frames.findIndex((f) => f.t >= s - 0.05); if (i >= 0) picks.push(i); }
  const cols = 7, rows = Math.ceil(picks.length / cols), H = 28;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * W}" height="${rows * W + H}"><rect width="100%" height="100%" fill="#111"/>`;
  svg += `<text x="8" y="19" fill="#fff" font-size="15" font-family="sans-serif">CB-336 ${SCEN} · ${AI ? 'AI (stage 1 contact)' : 'old crowd (?ai=0)'} · seed ${SEED} · 30 m square, 5 m grid · blue: the marine · tan: shamblers · dark red: brutes · violet: the demon · red ring: bowled · orange ring: staggered · white: shove${SCEN === 'senses' ? ' · outer ring: idle grey / suspicious yellow / hunting red / searching blue, dashed to what it knows, tick: facing, !: its tell' : ''}</text>`;
  picks.forEach((i, k) => { svg += `<g transform="translate(${(k % cols) * W},${H + ((k / cols) | 0) * W})">${frameSvg(rec.frames[i], i)}<rect width="${W}" height="${W}" fill="none" stroke="#000"/></g>`; });
  svg += `</svg>`;
  const svgPath = path.resolve(OUT, NAME + '-strip.svg'); fs.writeFileSync(svgPath, svg);
  const q = await b.newPage({ width: cols * W, height: rows * W + H });
  await q.goto('file://' + svgPath); await wait(300);
  await q.screenshot(path.join(OUT, NAME + '-strip.png'));
  // The scrubber.
  const html = `<!doctype html><meta charset="utf-8"><title>CB-336 ${NAME}</title><body style="background:#111;color:#ddd;font-family:sans-serif">
<h3>CB-336 ${SCEN} · ${AI ? 'AI' : 'old crowd'}</h3><input id=s type=range min=0 max=${rec.frames.length - 1} value=0 style="width:600px"> <button id=pl>play</button><div id=v></div>
<script>const R=${JSON.stringify({ frames: rec.frames })};const W=${W},SPAN=${SPAN},cx0=${cx0},cz0=${cz0},COL=${JSON.stringify(COL)};
const X=x=>(x-cx0)/SPAN*W*2+W,Y=z=>W-(z-cz0)/SPAN*W*2,S=r=>r/SPAN*W*2;
function draw(i){const f=R.frames[i];let g='<svg width='+W*2+' height='+W*2+'><rect width=100% height=100% fill=#1b1d1f />';
for(const [ty,x,z,r,hp] of f.b) g+='<rect x='+(X(x)-S(.8))+' y='+(Y(z)-S(.3))+' width='+S(1.6)+' height='+S(.6)+' fill=#6d7a86 opacity='+(.35+.65*hp)+' />';
for(const q of f.z){g+='<circle cx='+X(q[2])+' cy='+Y(q[3])+' r='+S(q[4])+' fill='+(COL[q[1]]||'#ccc')+' stroke='+(q[5]?'#f22':q[6]?'#f92':'#000')+' stroke-width='+(q[5]||q[6]?3:1)+' />';}
g+='<circle cx='+X(f.m.x)+' cy='+Y(f.m.z)+' r='+S(.4)+' fill=#3fa9ff stroke=#fff /></svg>';
document.getElementById('v').innerHTML=g+'<div>t '+f.t+' s · touching '+f.o.n+' · max '+(f.o.max*100).toFixed(0)+'% · p95 '+(f.o.p95*100).toFixed(0)+'%'+(f.ai?' · staggered '+f.ai.st+' · bowled '+f.ai.kn:'')+'</div>';}
const s=document.getElementById('s');s.oninput=()=>draw(+s.value);draw(0);let T=null;document.getElementById('pl').onclick=()=>{if(T){clearInterval(T);T=null;return;}T=setInterval(()=>{s.value=(+s.value+1)%R.frames.length;draw(+s.value);},100);};</script>`;
  fs.writeFileSync(path.join(OUT, NAME + '.html'), html);
  // Summary.
  const late = rec.frames.filter((f) => f.t >= 4);
  const sum = { frames: rec.frames.length, maxOverlap: Math.max(...late.map((f) => f.o.max)), p95: +(late.reduce((a, f) => a + f.o.p95, 0) / late.length).toFixed(3), meanTouching: +(late.reduce((a, f) => a + f.o.n, 0) / late.length).toFixed(1), staggers: rec.frames.at(-1).ai?.st, knocks: rec.frames.at(-1).ai?.kn, errors: rec.errors.length };
  console.log('SUMMARY ' + JSON.stringify(sum));
  fs.writeFileSync(path.join(OUT, NAME + '-summary.json'), JSON.stringify(sum, null, 1));
} finally { await b.close(); await server.close(); }
