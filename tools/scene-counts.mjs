// tools/scene-counts.mjs — CU-20. Measure, don't change.
//
//   node tools/scene-counts.mjs --headless
//
// Counts scene objects, visible meshes, and the renderer's draw calls
// in a day-5 fight and in a 500-shambler megaswarm.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const COUNT = `(() => {
  const kinds = ['terrain', 'trees', 'props', 'buildings', 'zombies', 'particles', 'decals', 'ui', 'other'];
  const blank = () => Object.fromEntries(kinds.map((k) => [k, { objects: 0, meshes: 0 }]));
  const bag = blank();
  const mark = (root) => {
    const set = new Set();
    const add = (o) => { if (o) set.add(o); };
    for (const t of TT.trees || []) add(t.group || t.mesh);
    return set;
  };
  const treeRoots = mark();
  const propRoots = new Set();
  for (const r of TT.rocks || []) if (r.mesh || r.group) propRoots.add(r.mesh || r.group);
  for (const f of TT.foliage || []) if (f.mesh) propRoots.add(f.mesh);
  const buildRoots = new Set();
  for (const b of TT.builds || []) if (b.mesh || b.group) buildRoots.add(b.mesh || b.group);
  const zombieRoots = new Set();
  for (const z of TT.zombies || []) if (z.mesh || z.group) zombieRoots.add(z.mesh || z.group);
  const ground = TT.ground || null;
  const under = (obj, set) => { for (let o = obj; o; o = o.parent) if (set.has(o)) return true; return false; };
  const kindOf = (obj) => {
    const n = ((obj.name || '') + ' ' + (obj.type || '')).toLowerCase();
    if (under(obj, zombieRoots) || n.includes('zombie')) return 'zombies';
    if (under(obj, treeRoots) || n.includes('tree') || n.includes('canopy') || n.includes('trunk')) return 'trees';
    if (obj === ground || n.includes('terrain') || n.includes('ground') || n.includes('water')) return 'terrain';
    if (under(obj, propRoots) || n.includes('rock') || n.includes('foliage') || n.includes('bush') || n.includes('grass')) return 'props';
    if (under(obj, buildRoots) || n.includes('build') || n.includes('wall') || n.includes('cabin') || n.includes('landmark')) return 'buildings';
    if (n.includes('blood') || n.includes('decal')) return 'decals';
    if (obj.isSprite || n.includes('sprite') || n.includes('css2d') || n.includes('hud')) return 'ui';
    if (obj.isPoints || n.includes('particle') || n.includes('mote') || n.includes('spark') || n.includes('smoke')) return 'particles';
    return 'other';
  };
  let objects = 0, meshes = 0;
  TT.scene.traverse((obj) => {
    objects++;
    const k = kindOf(obj);
    bag[k].objects++;
    if (obj.isMesh && obj.visible) { meshes++; bag[k].meshes++; }
  });
  const info = (TT.renderer.info && TT.renderer.info.render) || {};
  const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
  return { objects, meshes, draws, triangles: info.triangles || 0, zombies: TT.zombies.length, bag };
})()`;

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1&raf=timer`;
console.log(`scene-counts: ${url}\n`);

function print(label, row) {
  console.log(`\n${label}  zombies ${row.zombies}  objects ${row.objects}  visible meshes ${row.meshes}  draws ${row.draws}  triangles ${row.triangles}`);
  console.log('kind         objects  visible meshes');
  for (const [k, v] of Object.entries(row.bag)) {
    console.log(`  ${k.padEnd(12)} ${String(v.objects).padStart(7)}  ${String(v.meshes).padStart(7)}`);
  }
}

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Count';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
  await page.evaluate(`(() => { TT.setDay(4); TT.startPrep(); TT.skipPrep(); })()`);
  let day5 = null;
  for (let i = 0; i < 12; i++) {
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    day5 = await page.evaluate(COUNT);
    const phase = await page.evaluate(`({ day: TT.getDay(), phase: TT.getPhase() })`);
    console.log(`day5 tick ${i + 1}  day ${phase.day}  phase ${phase.phase}  zombies ${day5.zombies}`);
  }
  print('day 5', day5);
  await page.evaluate('TT.clearZombies()');
  const made = await page.evaluate('TT.spawnMegaswarm(500)');
  console.log(`\nspawned ${made}`);
  await page.evaluate('new Promise(r => setTimeout(r, 4000))');
  print('megaswarm', await page.evaluate(COUNT));
} finally {
  await browser.close();
  await server.close();
}
