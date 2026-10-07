// CL-123 (GP-135): nothing should compile on first use after the Training Ground's warm-up. Real renderer (headless
// Chrome or Edge through tools/cdp.mjs), the real game: into the Training Ground from the title, then every shader
// program and render pipeline built after the blackout lifts is listed, sitting still, with six impact marks, and
// walking round the room. Exit 0 when there are none.
//   node tools/training-warm-probe.mjs [out.json]        (about 3 minutes on a software renderer)
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = process.cwd(), OUT = process.argv[2] || null;
const server = await serve(ROOT, 0);
const b = await launch({ headless: true });
const p = await b.newPage({ width: 1280, height: 720 });
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's ' + m);
await p.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
log('loaded ' + await p.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 900000 }));
log('backend ' + await p.evaluate(`TT.renderer && TT.renderer.backend && TT.renderer.backend.constructor.name`));
await p.evaluate(`(() => { DWOpening.dismissForTesting(); document.getElementById('playerName').value = 'Shadow probe'; document.getElementById('modeTraining').click(); document.activeElement && document.activeElement.blur(); })()`);
log('training ' + await p.waitFor('TT.trainingDbg.state().active', { timeout: 900000 }));
log('blackout off ' + await p.waitFor(`!document.getElementById('trainingBlackout') || !document.getElementById('trainingBlackout').classList.contains('on')`, { timeout: 900000 }));
await p.evaluate(`(() => {
  window.__late = [];
  const b = TT.renderer.backend;
  const desc = (o) => { const ch = []; for (let n = o; n && ch.length < 6; n = n.parent) ch.push((n.name || '') + ':' + n.type); return ch.join(' < '); };
  const cp = b.createRenderPipeline.bind(b);
  b.createRenderPipeline = (ro, ...a) => { const o = ro.object; window.__late.push({ t: performance.now() | 0, kind: 'pipeline', material: ro.material && (ro.material.name || ro.material.type), obj: desc(o), skinned: !!o.isSkinnedMesh, instanced: !!o.isInstancedMesh, batched: !!o.isBatchedMesh, morph: !!(o.geometry && o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length), attrs: o.geometry ? Object.keys(o.geometry.attributes).join(',') : '', castShadow: o.castShadow, frustumCulled: o.frustumCulled, visible: o.visible, pos: o.getWorldPosition ? o.getWorldPosition(new TT.THREE.Vector3()).toArray().map((v) => +v.toFixed(1)) : null }); return cp(ro, ...a); };
  const pr = b.createProgram.bind(b);
  b.createProgram = (prog, ...a) => { window.__late.push({ t: performance.now() | 0, kind: 'program', name: prog.name, stage: prog.stage }); return pr(prog, ...a); };
})()`);
// Sit 2 s, then walk him round the room, then add the six marks, then fire a few rounds.
await new Promise((r) => setTimeout(r, 2500));
const phase = async (name) => { const n = await p.evaluate(`window.__late.length`); log(name + ' late so far ' + n); };
await phase('idle');
await p.evaluate(`(() => { const tg = TT.trainingDbg.tg(), im = TT.trainingDbg.state().impacts; for (const t of tg.targets) im.add({ solid: { target: t.id ?? tg.targets.indexOf(t) }, point: { x: tg.origin.x + t.x, y: tg.floorY + 1.22, z: tg.origin.z + t.z }, normal: { x: 0, y: 0, z: -1 } }); })()`);
await new Promise((r) => setTimeout(r, 2500));
await phase('marks');
await p.evaluate(`(() => { const tg = TT.trainingDbg.tg(); const P = TT.player.position; window.__walk = [[tg.spawn.x + 4, tg.spawn.z], [tg.spawn.x - 4, tg.spawn.z + 4], [tg.spawn.x, tg.spawn.z + 8], [tg.spawn.x, tg.spawn.z - 6]]; })()`);
for (let i = 0; i < 4; i++) { await p.evaluate(`(() => { const w = window.__walk[${i}]; TT.player.position.x = w[0]; TT.player.position.z = w[1]; })()`); await new Promise((r) => setTimeout(r, 2000)); }
await phase('walk');
const late = await p.evaluate(`window.__late`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(late, null, 1));
for (const l of late) console.log(JSON.stringify(l));
console.log(late.length ? 'FAIL ' + late.length + ' built after the warm-up' : 'PASS nothing built after the warm-up');
await b.close(); await server.close(); process.exit(late.length ? 1 : 0);
