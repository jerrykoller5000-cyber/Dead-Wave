// CB-335 (claude2, 15 Nov): the first switch to first person after the Training warm. Real renderer (headless Chrome
// through tools/cdp.mjs), the real game: into the Training Ground from the title, wait for the blackout and the background
// warm, settle, then switch to first person (TT.setViewFirstDbg) and back, twice. For each switch: every NodeBuilder build
// (a miss in renderer._nodes' nodeBuilderCache: stage, ms, object, its bone count, material), the rig skin's bakes and
// bone counts, and the longest frame (rAF gap) and the sum of frames over 50 ms in the 2.5 s after the switch.
//   node tools/cb335-fpwarm-probe.mjs [out.json]
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const server = await serve(process.cwd(), 0);
const b = await launch({ headless: true });
const p = await b.newPage({ width: 1280, height: 720 });
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's ' + m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await p.goto(`${server.origin}/index.html?debug=1`, { timeout: 300000 });
  log('loaded ' + await p.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 900000 }));
  await p.evaluate(`(() => {
    window.__nb = { stage: 'training-entry', miss: [], frames: [] };
    const N = TT.renderer._nodes, orig = N.getForRender.bind(N);
    const chain = (o) => { const c = []; for (let n = o; n && c.length < 4; n = n.parent) c.push(n.name || ''); return c.join('<'); };
    N.getForRender = (ro, ...a) => {
      const n0 = N.nodeBuilderCache.size, t = performance.now();
      const r = orig(ro, ...a);
      if (N.nodeBuilderCache.size > n0) { const o = ro.object; __nb.miss.push({ stage: __nb.stage, ms: +(performance.now() - t).toFixed(1), type: o.type, bones: o.skeleton ? o.skeleton.bones.length : undefined, mat: ro.material && (ro.material.name || ro.material.type), shadow: !!(ro.material && ro.material.isShadowPassMaterial), name: chain(o) }); }
      return r;
    };
    let last = performance.now();
    const f = (t) => { __nb.frames.push({ stage: __nb.stage, dt: +(t - last).toFixed(1) }); last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.__rig = () => { const m = TT.getMarine ? TT.getMarine() : window.worldMarine; const r = m && m.userData.rigSkin; const f = TT.fpDbg ? TT.fpDbg() : {}; return r ? { bakes: r.bakes, skins: r.skins.map((s) => s.skeleton.bones.length + (s.userData.rigSplit ? 's' + s.userData.rigSplit : '')), first: f.first, w: f.w != null ? +f.w.toFixed(2) : null, headHidden: f.headHidden, head: !!(m.userData.headG && m.userData.headG.visible), out: r.out.size } : null; };
  })()`);
  await p.evaluate(`(() => { DWOpening.dismissForTesting(); document.getElementById('playerName').value = 'CB335 probe'; document.getElementById('modeTraining').click(); document.activeElement && document.activeElement.blur(); })()`);
  log('training ' + await p.waitFor('TT.trainingDbg.state().active', { timeout: 900000 }));
  log('blackout off ' + await p.waitFor(`!document.getElementById('trainingBlackout') || !document.getElementById('trainingBlackout').classList.contains('on')`, { timeout: 900000 }));
  await p.evaluate(`__nb.stage = 'bgwarm'`);
  log('background warm done ' + await p.evaluate(`(async () => { const s = TT.trainingDbg.state(); if (s.bgWarmPromise) await s.bgWarmPromise; return !s.bgWarming; })()`, 900000));
  await p.evaluate(`__nb.stage = 'settle'`); await wait(6000);
  if (process.env.FPW_CONTROL) {   // no switches: the frames for 40 s from here
    await p.evaluate(`__nb.stage = 'control'; __nb.t0 = performance.now(); __nb.frames.length = 0`);
    await wait(40000);
    const r = await p.evaluate(`(() => { let t = 0; return __nb.frames.map((x) => { t += x.dt; return { at: +(t / 1000).toFixed(1), dt: x.dt }; }).filter((x) => x.dt > 300); })()`);
    console.log('control frames over 300 ms: ' + JSON.stringify(r));
    console.log('control builds: ' + await p.evaluate(`JSON.stringify(__nb.miss.filter((m) => m.stage === 'control').map((m) => m.ms + ' ' + m.name))`));
  }
  const steps = [];
  for (const [i, first] of [[1, true], [1, false], [2, true], [2, false]]) {
    const stage = (first ? 'fp' : 'tp') + i;
    const before = await p.evaluate(`__rig()`);
    await p.evaluate(`(() => { __nb.stage = '${stage}'; TT.setViewFirstDbg(${first}); })()`);
    const WAIT = Number(process.env.FPW_WAIT) || 2500; await wait(WAIT);
    const after = await p.evaluate(`__rig()`);
    const r = await p.evaluate(`(() => { const m = __nb.miss.filter((x) => x.stage === '${stage}'), f = __nb.frames.filter((x) => x.stage === '${stage}');
      return { builds: m.length, buildMs: +m.reduce((a, x) => a + x.ms, 0).toFixed(1), worstFrame: Math.max(0, ...f.map((x) => x.dt)), over50: +f.filter((x) => x.dt > 50).reduce((a, x) => a + x.dt, 0).toFixed(1), frames: f.length }; })()`);
    steps.push({ stage, before, after, ...r });
    log(`${stage}: rig ${JSON.stringify(before)} -> ${JSON.stringify(after)}; ${r.builds} builds ${r.buildMs} ms; worst frame ${r.worstFrame} ms; over-50 ${r.over50} ms in ${r.frames} frames`);
  }
  const res = await p.evaluate(`__nb.miss.filter((m) => /^(fp|tp)/.test(m.stage))`);
  for (const m of res) console.log('  ' + m.stage, m.ms + 'ms', m.type, 'bones', m.bones, m.mat, m.shadow ? 'shadow' : '', m.name);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), steps, builds: res, errors: p.errors.slice(0, 5) }, null, 1));
} finally { await b.close(); await server.close(); }
