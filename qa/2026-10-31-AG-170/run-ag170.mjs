// qa/2026-10-31-AG-170/run-ag170.mjs
// Batched GPU/CPU benchmark & Day-1 draw-call census for AG-170 (CL-288)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
fs.mkdirSync(HERE, { recursive: true });

const runs = [
  ['night20-r1', ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--census', '--save-cpu', path.join(HERE, 'cpu-night20-r1.json')]],
  ['night20-r2', ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--census']],
  ['night20-r3', ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--census']],
  ['day5-r1',    ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu', '--census', '--save-cpu', path.join(HERE, 'cpu-day5-r1.json')]],
  ['day5-r2',    ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu', '--census']],
  ['day5-r3',    ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu', '--census']],
  ['night20-res05', ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--census', '--res', '0.5']],
  ['day5-res05',    ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu', '--census', '--res', '0.5']]
];

const results = {};

for (const [name, args] of runs) {
  console.log(`\n=== Running ${name}: node ${args.join(' ')} ===`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DW_SLOT_HELD: '1' },
    maxBuffer: 64 * 1024 * 1024
  });
  const out = (r.stdout || '') + '\n' + (r.stderr || '');
  fs.writeFileSync(path.join(HERE, `${name}.log`), out);
  const lines = (r.stdout || '').trim().split(/\r?\n/);
  let parsed = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.startsWith('{') && l.endsWith('}')) {
      try { parsed = JSON.parse(l); break; } catch (_) {}
    }
  }
  if (parsed) {
    fs.writeFileSync(path.join(HERE, `${name}.json`), JSON.stringify(parsed, null, 2));
    results[name] = {
      fps: parsed.fps,
      low: parsed.low,
      worst: parsed.worst,
      hitches: parsed.hitches,
      draws: parsed.draws,
      triangles: parsed.triangles,
      zombies: parsed.zombies,
      frameMs: parsed.prof?.frameMs,
      tickMs: parsed.prof?.tickMs,
      outsideMs: parsed.prof?.outsideMs,
      last10: parsed.prof?.last10,
      gpuMs: parsed.prof?.gpuMs,
      profTop: parsed.prof?.top,
      spikeCauses: parsed.prof?.spikeCauses,
      cpuSampledMs: parsed.cpu?.sampledMs,
      cpuIdleMs: parsed.cpu?.idleMs,
      cpuSelfTop15: parsed.cpu?.self?.slice(0, 15),
      cpuTotalTop15: parsed.cpu?.total?.slice(0, 15),
      censusSummary: parsed.census ? {
        nodes: parsed.census.nodes,
        auto: parsed.census.auto,
        meshes: parsed.census.meshes,
        shown: parsed.census.shown,
        casters: parsed.census.casters,
        bones: parsed.census.bones,
        top: parsed.census.top,
        culledTops: parsed.census.culledTops,
        zombieNodes: parsed.census.zombieNodes,
        drawsMain: parsed.census.draws?.main,
        drawsShadow: parsed.census.draws?.shadow,
        drawsByGroup: parsed.census.draws?.byGroup?.slice(0, 20),
        drawsByPart: parsed.census.draws?.byPart?.slice(0, 25)
      } : null
    };
    console.log(`  -> ${name}: fps=${parsed.fps}, low=${parsed.low}, tickMs=${parsed.prof?.tickMs} (last10=${parsed.prof?.last10?.tickMs}), frameMs=${parsed.prof?.frameMs}, outside=${parsed.prof?.last10?.outsideMs}, gpuMs=${parsed.prof?.gpuMs}, draws=${parsed.draws} (main=${parsed.census?.draws?.main}, shadow=${parsed.census?.draws?.shadow}), tris=${parsed.triangles}`);
  } else {
    console.error(`  -> Failed to parse JSON line from ${name} (exit=${r.status})`);
  }
}

// Extract self-time inside renderer.render from saved raw CPU profiles
function analyzeRenderSubtree(cpuFile, framesCount) {
  if (!fs.existsSync(cpuFile)) return null;
  const raw = JSON.parse(fs.readFileSync(cpuFile, 'utf8'));
  const profile = raw.profile;
  if (!profile || !profile.nodes) return null;
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const keyOf = (n) => {
    const cf = (n && n.callFrame) || {};
    const file = (cf.url || '').split('/').pop().split('?')[0] || '';
    return `${cf.functionName || '(anonymous)'} ${file}:${(cf.lineNumber ?? -1) + 1}`;
  };
  const isRenderRoot = (k) => /^render three\.webgpu\.js:/.test(k) || /^renderFrame index\.html:/.test(k);
  const renderSelf = new Map();
  const renderTotal = new Map();
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 500;
    // Check if this sample is inside render / renderFrame
    let inRender = false;
    for (let id = samples[i]; id != null; id = parent.get(id)) {
      if (isRenderRoot(keyOf(nodes.get(id)))) { inRender = true; break; }
    }
    if (!inRender) continue;
    const leafKey = keyOf(nodes.get(samples[i]));
    renderSelf.set(leafKey, (renderSelf.get(leafKey) || 0) + dt);
    const seen = new Set();
    for (let id = samples[i]; id != null; id = parent.get(id)) {
      const kk = keyOf(nodes.get(id));
      if (!seen.has(kk)) {
        seen.add(kk);
        renderTotal.set(kk, (renderTotal.get(kk) || 0) + dt);
      }
      if (isRenderRoot(kk)) break;
    }
  }
  const per = (us) => Math.round(us / 1000 / Math.max(1, framesCount) * 1000) / 1000;
  const rank = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => ({ k, ms: per(us) }));
  return {
    selfTop30: rank(renderSelf, 30),
    totalTop30: rank(renderTotal, 30)
  };
}

const n20Frames = results['night20-r1'] ? JSON.parse(fs.readFileSync(path.join(HERE, 'night20-r1.json'), 'utf8')).prof?.frames || 1800 : 1800;
const d5Frames = results['day5-r1'] ? JSON.parse(fs.readFileSync(path.join(HERE, 'day5-r1.json'), 'utf8')).prof?.frames || 1800 : 1800;

const renderTree = {
  night20: analyzeRenderSubtree(path.join(HERE, 'cpu-night20-r1.json'), n20Frames),
  day5: analyzeRenderSubtree(path.join(HERE, 'cpu-day5-r1.json'), d5Frames)
};

// Now run the Day-1 draws investigation probe to explain the 931-1193 draws in v2/v3 shots vs 265 at night 20
console.log('\n=== Running Day-1 931-1193 Draw-Call Diagnostic Probe ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
});

let day1DrawsProbe = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG170');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    if (T.setWorldTime) T.setWorldTime(0.42);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      await new Promise((r) => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 3000));
  })()`, 180000);

  const measureDrawsAt = async (setupJs) => page.evaluate(`(async () => {
    const T = TT;
    ${setupJs}
    await new Promise((r) => setTimeout(r, 1500));
    const r = T.renderer, sc = T.scene;
    const orig = r.renderObject;
    const names = new WeakMap();
    for (const [k, v] of Object.entries(T)) {
      if (v && typeof v === 'object' && v.isObject3D && v.parent === sc) names.set(v, k);
    }
    const nameIn = (c) => { let n = ''; c.traverse((o) => { if (!n && o !== c && o.name) n = o.name; }); return n; };
    const keyOf = (c) => {
      if (names.has(c)) return names.get(c);
      const ud = c.userData || {};
      let key = c.name || ud.kind || ud.type || '';
      if (!key) { const inner = nameIn(c); key = c.type + (inner ? '>' + inner : ''); }
      names.set(c, key);
      return key;
    };
    const mainGroups = new Map(), mainParts = new Map();
    const shadowGroups = new Map(), shadowParts = new Map();
    const cameras = new Map();
    let main = 0, shadow = 0, frames = 0;

    // Force sunShadow redraw on one frame and normal frame on the next, or measure 4 frames
    r.renderObject = function (object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId) {
      const camDesc = (camera ? (camera.type + (camera.name ? ':' + camera.name : '')) : 'no-cam') + (passId ? '@' + passId : '');
      cameras.set(camDesc, (cameras.get(camDesc) || 0) + 1);
      let t = object, part = null;
      while (t.parent && t.parent !== sc) { if (t.name && t !== object) part = t.name; t = t.parent; }
      const k = keyOf(t);
      const pk = k + ' / ' + (part || object.name || '(unnamed)');
      if (camera && camera.isPerspectiveCamera && passId !== 'shadow') {
        main++;
        mainGroups.set(k, (mainGroups.get(k) || 0) + 1);
        mainParts.set(pk, (mainParts.get(pk) || 0) + 1);
      } else {
        shadow++;
        shadowGroups.set(k, (shadowGroups.get(k) || 0) + 1);
        shadowParts.set(pk, (shadowParts.get(pk) || 0) + 1);
      }
      return orig.call(this, object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId);
    };
    await new Promise((resolve) => {
      const step = () => {
        frames++;
        if (frames >= 4) { r.renderObject = orig; resolve(); }
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(() => {
        main = 0; shadow = 0; frames = 0;
        mainGroups.clear(); mainParts.clear(); shadowGroups.clear(); shadowParts.clear(); cameras.clear();
        requestAnimationFrame(step);
      });
    });
    const info = r.info && r.info.render ? { drawCalls: r.info.render.drawCalls, triangles: r.info.render.triangles } : null;
    const f = Math.max(1, frames);
    return {
      frames: f,
      rendererInfoLastFrame: info,
      mainPerFrame: +(main / f).toFixed(1),
      shadowPerFrame: +(shadow / f).toFixed(1),
      totalPerFrame: +((main + shadow) / f).toFixed(1),
      byCameraPass: [...cameras.entries()].map(([k, n]) => ({ k, n: +(n / f).toFixed(1) })),
      mainByGroup: [...mainGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => ({ k, n: +(n / f).toFixed(1) })),
      mainByPart: [...mainParts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 35).map(([k, n]) => ({ k, n: +(n / f).toFixed(1) })),
      shadowByGroup: [...shadowGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => ({ k, n: +(n / f).toFixed(1) })),
      shadowByPart: [...shadowParts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => ({ k, n: +(n / f).toFixed(1) }))
    };
  })()`, 120000);

  // 1) vmsheet exact pose: 1P inside HQ at noon (where vm-hip.png showed 1112 draws)
  day1DrawsProbe.hqNoon1pHip = await measureDrawsAt(`T.setWorldTime(0.42); T.setViewFirstDbg(true); T.setZoomHeldDbg(false);`);
  // 2) 3P inside HQ at noon
  day1DrawsProbe.hqNoon3p = await measureDrawsAt(`T.setWorldTime(0.42); T.setViewFirstDbg(false);`);
  // 3) 1P outdoors at (0, y, 18) at noon (where vm-noon-outdoor-hip.png showed 732 draws)
  day1DrawsProbe.outdoorNoon1p = await measureDrawsAt(`T.setWorldTime(0.42); T.setViewFirstDbg(true); T.player.position.set(0, T.sampleHeight(0, 18), 18);`);
  // 4) 1P outdoors at (0, y, 18) at night (where vm-night20-hip.png showed 329 draws)
  day1DrawsProbe.outdoorNight1p = await measureDrawsAt(`T.setWorldTime(0.05); T.setViewFirstDbg(true); T.player.position.set(0, T.sampleHeight(0, 18), 18);`);
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}

const fullSummary = {
  results,
  renderTree,
  day1DrawsProbe
};
fs.writeFileSync(path.join(HERE, 'ag170-summary.json'), JSON.stringify(fullSummary, null, 2));
console.log('\nSaved ag170-summary.json');
process.exit(0);
