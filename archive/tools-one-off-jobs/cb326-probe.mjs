// CB-326 (B), claude2: which node builds still happen on a gun's first draw or first shot after the Training warm.
// Real renderer (headless Chrome through tools/cdp.mjs), the real game: into the Training Ground from the title, wait
// for the blackout to lift, then for every gun in first person (eye) and third person (hip): draw it, then hold the
// trigger. Every NodeBuilder build (a miss in renderer._nodes' nodeBuilderCache) is listed with its stage, time,
// object (type, instanced and its count, name chain) and material. Rebuilt 14 Nov (the GP-20124 probe was not saved).
//   node tools/cb326-probe.mjs [out.json] [--guns pistol,revolver,...]
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const gi = process.argv.indexOf('--guns');
const GUNS = gi > 0 ? process.argv[gi + 1].split(',') : ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'shotgun', 'aa12', 'sniper', 'launcher', 'flamer', 'minigun', 'chainsaw'];
const server = await serve(process.cwd(), 0);
const b = await launch({ headless: true });
const p = await b.newPage({ width: 1280, height: 720 });
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's ' + m);
try {
  await p.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  log('loaded ' + await p.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 900000 }));
  await p.evaluate(`(() => {
    window.__nb = { stage: 'training-entry', miss: [] };
    const N = TT.renderer._nodes, orig = N.getForRender.bind(N);
    const chain = (o) => { const c = []; for (let n = o; n && c.length < 4; n = n.parent) c.push(n.name || ''); return c.join('<'); };
    N.getForRender = (ro, ...a) => {
      const n0 = N.nodeBuilderCache.size, t = performance.now();
      const r = orig(ro, ...a);
      if (N.nodeBuilderCache.size > n0) { const o = ro.object; __nb.miss.push({ stage: __nb.stage, ms: +(performance.now() - t).toFixed(1), type: o.type, inst: !!o.isInstancedMesh, count: o.isInstancedMesh ? o.count : undefined, mat: ro.material && ro.material.type, name: chain(o) }); }
      return r;
    };
  })()`);
  await p.evaluate(`(() => { DWOpening.dismissForTesting(); document.getElementById('playerName').value = 'CB326 probe'; document.getElementById('modeTraining').click(); document.activeElement && document.activeElement.blur(); })()`);
  log('training ' + await p.waitFor('TT.trainingDbg.state().active', { timeout: 900000 }));
  log('blackout off ' + await p.waitFor(`!document.getElementById('trainingBlackout') || !document.getElementById('trainingBlackout').classList.contains('on')`, { timeout: 900000 }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await p.evaluate(`__nb.stage = 'bgwarm'`);
  log('background warm done ' + await p.evaluate(`(async () => { const s = TT.trainingDbg.state(); if (s.bgWarmPromise) await s.bgWarmPromise; return !s.bgWarming; })()`, 900000));
  await p.evaluate(`__nb.stage = 'settle'`); await wait(4000);
  await p.evaluate(`(() => { const T = TT; T.addCash && T.addCash(1e6); for (const k of ${JSON.stringify(GUNS)}) { try { T.buyWeapon && T.buyWeapon(k); } catch (e) {} } })()`);
  await p.evaluate(`__nb.stage = 'buy'`); await wait(3000);
  for (const view of ['eye', 'hip']) {
    await p.evaluate(`TT.setViewFirstDbg(${view === 'eye'})`); await wait(1500);
    for (const k of GUNS) {
      const ok = await p.evaluate(`(() => { const T = TT, i = ${JSON.stringify(GUNS)}.indexOf('${k}'); __nb.stage = '${view}/${k}/draw'; const order = T.WEAPON_ORDER || null; T.setWeapon(order ? order.indexOf('${k}') : ['minigun','m4','ak','pistol','uzi','shotgun','aa12','revolver','sniper','launcher','flamer','chainsaw'].indexOf('${k}')); return T.getCurrentWeapon(); })()`);
      await wait(2500);
      await p.evaluate(`(() => { __nb.stage = '${view}/${k}/fire'; TT.setAmmoDbg && TT.setAmmoDbg('${k}', 30); TT.setMouseFireDbg(true); })()`);
      await wait(900);
      await p.evaluate(`TT.setMouseFireDbg(false)`); await wait(1800);
      const n = await p.evaluate(`__nb.miss.filter((m) => m.stage.startsWith('${view}/${k}/')).length`);
      log(`${view} ${k} (current ${ok}): ${n} builds`);
    }
  }
  const res = await p.evaluate(`__nb.miss`);
  const by = {};
  for (const m of res) { const s = (by[m.stage] ||= { builds: 0, ms: 0, inst: 0 }); s.builds++; s.ms = +(s.ms + m.ms).toFixed(1); if (m.inst) s.inst++; }
  const out = { at: new Date().toISOString(), guns: GUNS, stages: by, miss: res.filter((m) => m.stage !== 'training-entry' && m.stage !== 'bgwarm'), bgwarmBuilds: res.filter((m) => m.stage === 'bgwarm').length, entryBuilds: res.filter((m) => m.stage === 'training-entry').length, errors: p.errors.slice(0, 5) };
  for (const [s, v] of Object.entries(by)) if (s !== 'training-entry' && s !== 'bgwarm') console.log(s.padEnd(22), v.builds, 'builds', v.ms, 'ms', v.inst, 'instanced');
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
} finally { await b.close(); await server.close(); }
