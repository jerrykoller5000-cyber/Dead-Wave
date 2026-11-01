import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.resolve(ROOT, 'qa/2026-10-31-AG-173');
fs.mkdirSync(OUT, { recursive: true });

const EVAL_PATH = path.join(OUT, 'eval-shadowprune.js');

function median(nums) {
  const v = nums.filter((n) => typeof n === 'number' && Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : +((v[m - 1] + v[m]) / 2).toFixed(3);
}

function spread(nums) {
  const v = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  return +(Math.max(...v) - Math.min(...v)).toFixed(3);
}

function minMax(nums) {
  const v = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  return [+(Math.min(...v)).toFixed(2), +(Math.max(...v)).toFixed(2)];
}

// Parse full DevTools CPU profile saved by --save-cpu to extract exact total (self+children) and self ms/frame
// for ShadowNode.updateBefore, updateShadow, shadowPruneBegin, _projectObject, updateMatrixWorld, and render.
function extractCpuFunctions(cpuFilePath, framesFallback) {
  if (!fs.existsSync(cpuFilePath)) return null;
  const raw = JSON.parse(fs.readFileSync(cpuFilePath, 'utf8'));
  const profile = raw.profile || raw;
  const nodes = new Map((profile.nodes || []).map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes || []) {
    for (const c of n.children || []) parent.set(c, n.id);
  }
  const keyOf = (n) => {
    const cf = (n && n.callFrame) || {};
    const file = (cf.url || '').split('/').pop().split('?')[0] || '';
    return `${cf.functionName || '(anonymous)'} ${file}:${(cf.lineNumber ?? -1) + 1}`;
  };
  const self = new Map();
  const total = new Map();
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 500;
    const n = nodes.get(samples[i]);
    if (!n) continue;
    const k = keyOf(n);
    self.set(k, (self.get(k) || 0) + dt);
    const seen = new Set();
    for (let id = samples[i]; id != null; id = parent.get(id)) {
      const kk = keyOf(nodes.get(id));
      if (seen.has(kk)) continue;
      seen.add(kk);
      total.set(kk, (total.get(kk) || 0) + dt);
    }
  }
  const frames = framesFallback || 1;
  const per = (us) => Math.round((us / 1000 / frames) * 1000) / 1000;

  const findMatches = (re) => {
    const out = [];
    for (const [k, totUs] of total.entries()) {
      if (re.test(k)) {
        out.push({ k, totalMs: per(totUs), selfMs: per(self.get(k) || 0) });
      }
    }
    return out.sort((a, b) => b.totalMs - a.totalMs);
  };

  return {
    updateBefore: findMatches(/^updateBefore three\.webgpu\.js:/),
    updateShadow: findMatches(/updateShadow/),
    shadowPruneBegin: findMatches(/shadowPruneBegin/),
    holdsCaster: findMatches(/holdsCaster|casterFlag/),
    projectObject: findMatches(/^_projectObject three\.webgpu\.js:/),
    updateMatrixWorld: findMatches(/^updateMatrixWorld three\.core\.js:/),
    render: findMatches(/^render three\.webgpu\.js:/)
  };
}

function summarizeRun(tag, rawLine, cpuExtra) {
  const p = rawLine.prof || {};
  const l10 = p.last10 || {};
  const findSec = (arr, k) => {
    const r = (arr || []).find((x) => x.k === k);
    return r ? r.avg : null;
  };
  // ShadowNode.updateBefore is updateBefore three.webgpu.js:33834
  const ubFromLine = ((rawLine.cpu && rawLine.cpu.total) || []).find((x) => x.k.startsWith('updateBefore three.webgpu.js:'));
  const ubFromRaw = cpuExtra && cpuExtra.updateBefore && cpuExtra.updateBefore[0];
  const updateBeforeTotalMs = ubFromRaw ? ubFromRaw.totalMs : (ubFromLine ? ubFromLine.ms : 0);
  const updateBeforeSelfMs = ubFromRaw ? ubFromRaw.selfMs : null;

  return {
    tag,
    scenario: rawLine.scenario,
    night: rawLine.night ?? null,
    fps: rawLine.fps,
    low: rawLine.low,
    worst: rawLine.worst,
    hitches: rawLine.hitches,
    draws: rawLine.draws,
    triangles: rawLine.triangles,
    tickMs: p.tickMs ?? null,
    frameMs: p.frameMs ?? null,
    outsideMs: p.outsideMs ?? null,
    gpuMs: p.gpuMs ?? null,
    rRenderMs: findSec(p.top, 'r:render'),
    rMatricesMs: findSec(p.top, 'r:matrices'),
    last10: {
      tickMs: l10.tickMs ?? null,
      frameMs: l10.frameMs ?? null,
      outsideMs: l10.outsideMs ?? null,
      rRenderMs: findSec(l10.top, 'r:render'),
      rMatricesMs: findSec(l10.top, 'r:matrices')
    },
    shadowNodeUpdateBeforeMs: updateBeforeTotalMs,
    shadowNodeUpdateBeforeSelfMs: updateBeforeSelfMs,
    cpuBreakdown: cpuExtra,
    shadowPruneDbg: rawLine.eval || null,
    spikeCauses: p.spikeCauses || null
  };
}

function runBench(tag, args) {
  const cpuPath = path.join(OUT, `cpu-${tag}.json`);
  const fullArgs = ['tools/bench.mjs', ...args, '--eval', EVAL_PATH, '--save-cpu', cpuPath];
  console.log(`\n=== [AG-173] Running ${tag}: node ${fullArgs.join(' ')} ===`);
  const t0 = Date.now();
  const res = spawnSync(process.execPath, fullArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 420000
  });
  const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  fs.writeFileSync(path.join(OUT, `bench-${tag}.log`), stdout + (stderr ? '\n--- STDERR ---\n' + stderr : ''));
  if (res.status !== 0) {
    throw new Error(`bench ${tag} failed (exit ${res.status}): ${stderr || stdout.slice(-500)}`);
  }
  const lines = stdout.trim().split(/\r?\n/);
  let jsonLine = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i].trim();
    if (L.startsWith('{') && L.endsWith('}')) {
      try {
        const parsed = JSON.parse(L);
        if (parsed && parsed.scenario) { jsonLine = parsed; break; }
      } catch {}
    }
  }
  if (!jsonLine) throw new Error(`Could not find JSON output line in bench ${tag}`);
  const frames = (jsonLine.prof && jsonLine.prof.frames) || (jsonLine.cpu && jsonLine.cpu.frames) || 1800;
  const cpuExtra = extractCpuFunctions(cpuPath, frames);
  try { fs.unlinkSync(cpuPath); } catch {}
  const summary = summarizeRun(tag, jsonLine, cpuExtra);
  console.log(`[AG-173] ${tag} (${elapsedS}s): fps=${summary.fps}, low=${summary.low}, tickMs=${summary.tickMs} (last10=${summary.last10.tickMs}), r:render=${summary.rRenderMs} (last10=${summary.last10.rRenderMs}), ShadowNode.updateBefore=${summary.shadowNodeUpdateBeforeMs}ms, shadowPruneDbg=${JSON.stringify(summary.shadowPruneDbg)}`);
  return { summary, raw: jsonLine };
}

function summarizeAB(runsA, runsB) {
  const metric = (list, fn) => {
    const vals = list.map(fn);
    return {
      runs: vals,
      median: median(vals),
      spread: spread(vals),
      range: minMax(vals)
    };
  };
  const diffs = (fn) => {
    const d = [];
    for (let i = 0; i < Math.min(runsA.length, runsB.length); i++) {
      const a = fn(runsA[i]), b = fn(runsB[i]);
      if (typeof a === 'number' && typeof b === 'number') d.push(+(b - a).toFixed(3));
    }
    return { pairs: d, medianDiff: median(d), spreadDiff: spread(d) };
  };
  const keys = {
    fps: (r) => r.fps,
    low: (r) => r.low,
    worst: (r) => r.worst,
    tickMs: (r) => r.tickMs,
    last10TickMs: (r) => r.last10.tickMs,
    frameMs: (r) => r.frameMs,
    rRenderMs: (r) => r.rRenderMs,
    last10RRenderMs: (r) => r.last10.rRenderMs,
    rMatricesMs: (r) => r.rMatricesMs,
    shadowNodeUpdateBeforeMs: (r) => r.shadowNodeUpdateBeforeMs,
    gpuMs: (r) => typeof r.gpuMs === 'number' ? r.gpuMs : null,
    draws: (r) => r.draws
  };
  const out = {};
  for (const [k, fn] of Object.entries(keys)) {
    out[k] = {
      A_unpruned: metric(runsA, fn),
      B_pruned: metric(runsB, fn),
      B_minus_A: diffs(fn)
    };
  }
  return out;
}

const results = {
  night20: { runs: [], raw: [] },
  day5: { runs: [], raw: [] },
  realtest: null,
  shots: []
};

// 1. Night 20 alternating A B A B A B
for (let pair = 1; pair <= 3; pair++) {
  const a = runBench(`n20-A${pair}`, ['--night', '20', '--gfx', 'high', '--prof', '--cpu', '--query', 'shadowprune=0']);
  results.night20.runs.push(a.summary);
  results.night20.raw.push(a.raw);
  fs.writeFileSync(path.join(OUT, 'ag173-partial.json'), JSON.stringify(results, null, 2));

  const b = runBench(`n20-B${pair}`, ['--night', '20', '--gfx', 'high', '--prof', '--cpu']);
  results.night20.runs.push(b.summary);
  results.night20.raw.push(b.raw);
  fs.writeFileSync(path.join(OUT, 'ag173-partial.json'), JSON.stringify(results, null, 2));
}
results.night20.comparison = summarizeAB(
  results.night20.runs.filter((r) => r.tag.includes('-A')),
  results.night20.runs.filter((r) => r.tag.includes('-B'))
);

// 2. Day 5 alternating A B A B A B
for (let pair = 1; pair <= 3; pair++) {
  const a = runBench(`day5-A${pair}`, ['--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu', '--query', 'shadowprune=0']);
  results.day5.runs.push(a.summary);
  results.day5.raw.push(a.raw);
  fs.writeFileSync(path.join(OUT, 'ag173-partial.json'), JSON.stringify(results, null, 2));

  const b = runBench(`day5-B${pair}`, ['--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu']);
  results.day5.runs.push(b.summary);
  results.day5.raw.push(b.raw);
  fs.writeFileSync(path.join(OUT, 'ag173-partial.json'), JSON.stringify(results, null, 2));
}
results.day5.comparison = summarizeAB(
  results.day5.runs.filter((r) => r.tag.includes('-A')),
  results.day5.runs.filter((r) => r.tag.includes('-B'))
);

// 3. Run realtest tcl288a --all
console.log('\n=== [AG-173] Running node tools/realtest.mjs tcl288a --all ===');
{
  const rt = spawnSync(process.execPath, ['tools/realtest.mjs', 'tcl288a', '--all'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000
  });
  const txt = (rt.stdout || '') + (rt.stderr || '');
  fs.writeFileSync(path.join(OUT, 'realtest-tcl288a.txt'), txt);
  console.log(txt.trim());
  results.realtest = { exitCode: rt.status, output: txt.trim() };
}

// 4. Visual verification: Noon and Dusk at the HQ and out in the trees, both ways (A: shadowprune=0, B: default), side by side.
console.log('\n=== [AG-173] Capturing Noon & Dusk Shadow Screenshots (HQ & Trees, A vs B) ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1600,900']
});

try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
  } catch {}

  async function captureMode(modeKey, queryStr) {
    const url = `${server.origin}/index.html?debug=1${queryStr ? '&' + queryStr : ''}`;
    console.log(`[AG-173] Loading ${modeKey}: ${url}`);
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    // Start match and wait for insertion to finish
    await page.evaluate(`(() => {
      const name = document.getElementById('playerName');
      if (name) name.value = 'ShadowQA';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });

    // Install CamRig and configure High preset, grant all weapons (for carried guns), and place all 3 roof survivors
    await page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);
    const setupInfo = await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      T.applyGraphicsPreset('high');
      T.runDevCommand('godmode');
      T.grantAllWeapons();
      const m4Idx = (T.WEAPON_ORDER || []).indexOf('m4');
      if (m4Idx >= 0) T.setWeapon(m4Idx);
      if (T.isUnarmed && T.isUnarmed() && T.toggleHolster) T.toggleHolster();

      // Grant all 3 survivors so they are on the HQ roof (Okafor, Brandt + M240B, Pike)
      if (T.survivorHelpDbg) {
        T.survivorHelpDbg.grant('trapper');
        T.survivorHelpDbg.grant('ranger');
        T.survivorHelpDbg.grant('hikers');
      }
      // Make roof survivors stand up at their posts so their figures and rifles/M240 cast crisp shadows on the roof
      if (T.roofDbg && T.roofDbg.roots) {
        for (const root of T.roofDbg.roots()) {
          if (!root) continue;
          root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
          const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
          if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
        }
      }
      // Clear any stray zombies first
      T.clearZombies();
      // Wait 2.4s so marineShadowProxy and shadowPruneRefresh settle with all carried weapons visible
      await wait(2400);
      return {
        gfx: T.getGfx(),
        shadowPrune: T.shadowPruneDbg ? T.shadowPruneDbg() : null,
        roofCrew: T.roofDbg ? T.roofDbg.crew() : []
      };
    })()`, 30000);
    console.log(`[AG-173] ${modeKey} setup:`, JSON.stringify(setupInfo));

    // Define the 6 deterministic shots:
    // 1. hq-noon: HQ yard & roof at noon (0.50) — shows HQ shadow, roof survivors (Brandt, Okafor, Pike), player + carried guns, zombies, and trees
    // 2. hq-close-noon: Close-up at noon of player + carried guns, zombies, and HQ roof survivors
    // 3. hq-dusk: HQ yard & roof at dusk (0.70) — long dusk shadows across the yard and roof
    // 4. hq-close-dusk: Close-up at dusk of player + carried guns, zombies, and HQ roof survivors
    // 5. trees-noon: Out in the trees at noon (0.50) — dense tree cluster + player + carried guns + zombies
    // 6. trees-dusk: Out in the trees at dusk (0.70) — long tree trunk/canopy shadows + player + carried guns + zombies
    const shotSpecs = [
      {
        id: 'hq-noon',
        time: 0.50,
        sceneKind: 'hq',
        cam: { dx: -13.5, dy: 11.5, dz: 15.5, tx: 0.5, ty: 2.8, tz: 1.5, fov: 42 }
      },
      {
        id: 'hq-close-noon',
        time: 0.50,
        sceneKind: 'hq',
        cam: { dx: -5.5, dy: 5.2, dz: 12.2, tx: 1.2, ty: 2.2, tz: 5.0, fov: 40 }
      },
      {
        id: 'hq-dusk',
        time: 0.70,
        sceneKind: 'hq',
        cam: { dx: -13.5, dy: 11.5, dz: 15.5, tx: 0.5, ty: 2.8, tz: 1.5, fov: 42 }
      },
      {
        id: 'hq-close-dusk',
        time: 0.70,
        sceneKind: 'hq',
        cam: { dx: -5.5, dy: 5.2, dz: 12.2, tx: 1.2, ty: 2.2, tz: 5.0, fov: 40 }
      },
      {
        id: 'trees-noon',
        time: 0.50,
        sceneKind: 'trees',
        cam: { dx: -11.0, dy: 7.5, dz: 11.0, tx: 0, ty: 1.2, tz: 0, fov: 45 }
      },
      {
        id: 'trees-dusk',
        time: 0.70,
        sceneKind: 'trees',
        cam: { dx: -11.0, dy: 7.5, dz: 11.0, tx: 0, ty: 1.2, tz: 0, fov: 45 }
      }
    ];

    const modeMeta = {};
    for (const s of shotSpecs) {
      const meta = await page.evaluate(`(async () => {
        const T = window.TT;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const spec = ${JSON.stringify(s)};
        T.clearZombies();
        const hqPos = T.house && T.house.group ? T.house.group.position : { x: 0, y: 0, z: 0 };

        let ax = hqPos.x, az = hqPos.z;
        if (spec.sceneKind === 'hq') {
          // Place player in the sunny front-right yard of the HQ so his shadow, his carried guns' shadows,
          // the zombies' shadows, the HQ's shadow, and the roof survivors' shadows are all in view.
          const px = hqPos.x + 1.5, pz = hqPos.z + 7.2;
          const py = T.sampleHeight(px, pz);
          T.player.position.set(px, py, pz);
          T.player.rotation.y = 0.45;

          const zSpecs = [
            { x: hqPos.x - 1.2, z: hqPos.z + 7.6, kind: 'shambler', yaw: 0.3 },
            { x: hqPos.x + 4.0, z: hqPos.z + 6.8, kind: 'brute', yaw: -0.4 },
            { x: hqPos.x + 0.2, z: hqPos.z + 9.2, kind: 'runner', yaw: 0.1 }
          ];
          for (const zs of zSpecs) {
            const z = T.spawnZombie(zs.x, zs.z, zs.kind, true, true);
            if (z) {
              z.speed = 0; z.baseSpeed = 0;
              if (z.mesh) {
                z.mesh.position.set(zs.x, T.sampleHeight(zs.x, zs.z), zs.z);
                z.mesh.rotation.y = zs.yaw;
              }
            }
          }
          // Ensure roof survivors stay standing upright at their posts so their shadows on the roof deck are crisp
          if (T.roofDbg && T.roofDbg.roots) {
            for (const root of T.roofDbg.roots()) {
              if (!root) continue;
              const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
              if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
            }
          }
        } else {
          // Find a dense cluster of trees away from the HQ
          const trees = T.trees || [];
          let best = { x: 48, z: 42 };
          for (const tr of trees) {
            const dHq = Math.hypot(tr.x - hqPos.x, tr.z - hqPos.z);
            if (dHq > 38 && dHq < 75) {
              const near = trees.filter((o) => Math.hypot(o.x - tr.x, o.z - tr.z) < 14).length;
              if (near >= 5) { best = { x: tr.x + 2.2, z: tr.z + 2.0 }; break; }
            }
          }
          ax = best.x; az = best.z;
          const py = T.sampleHeight(ax, az);
          T.player.position.set(ax, py, az);
          T.player.rotation.y = 0.5;

          const zSpecs = [
            { x: ax - 2.4, z: az + 1.5, kind: 'shambler', yaw: 0.6 },
            { x: ax + 2.6, z: az - 1.2, kind: 'brute', yaw: -0.5 },
            { x: ax + 0.4, z: az + 3.0, kind: 'military', yaw: 0.2 }
          ];
          for (const zs of zSpecs) {
            const z = T.spawnZombie(zs.x, zs.z, zs.kind, true, true);
            if (z) {
              z.speed = 0; z.baseSpeed = 0;
              if (z.mesh) {
                z.mesh.position.set(zs.x, T.sampleHeight(zs.x, zs.z), zs.z);
                z.mesh.rotation.y = zs.yaw;
              }
            }
          }
        }

        const ay = T.sampleHeight(ax, az);
        const cam = {
          x: ax + spec.cam.dx,
          y: ay + spec.cam.dy,
          z: az + spec.cam.dz,
          tx: ax + spec.cam.tx,
          ty: ay + spec.cam.ty,
          tz: az + spec.cam.tz,
          fov: spec.cam.fov
        };
        window.CamRig.ui(false);
        T.setWorldTime(spec.time);
        T.setShotView(cam);
        // Wait enough frames for shadowPruneRefresh and sun shadow map to render at the new position
        for (let i = 0; i < 12; i++) {
          T.setWorldTime(spec.time);
          if (spec.sceneKind === 'hq' && T.roofDbg && T.roofDbg.roots) {
            for (const root of T.roofDbg.roots()) {
              if (!root) continue;
              const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
              if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
            }
          }
          await wait(50);
        }
        const sp = T.shadowPruneDbg ? T.shadowPruneDbg() : null;
        return { cam, anchor: { x: ax, y: ay, z: az }, time: T.getWorldTime(), shadowPruneDbg: sp };
      })()`, 30000);

      const fileOut = path.join(OUT, `${s.id}-${modeKey}.png`);
      await page.screenshot(fileOut);
      modeMeta[s.id] = { file: path.basename(fileOut), ...meta };
      console.log(`[AG-173] Saved ${path.basename(fileOut)} (shadowPruneDbg=${JSON.stringify(meta.shadowPruneDbg)})`);
    }
    return modeMeta;
  }

  const metaA = await captureMode('A-unpruned', 'shadowprune=0');
  const metaB = await captureMode('B-pruned', '');

  // Stitch side-by-side comparison images and compute pixel differences using an in-page 2D canvas
  for (const shotId of Object.keys(metaA)) {
    const pathA = path.join(OUT, `${shotId}-A-unpruned.png`);
    const pathB = path.join(OUT, `${shotId}-B-pruned.png`);
    const b64A = fs.readFileSync(pathA).toString('base64');
    const b64B = fs.readFileSync(pathB).toString('base64');

    const stitched = await page.evaluate(`(async () => {
      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });
      const imgA = await loadImg('data:image/png;base64,${b64A}');
      const imgB = await loadImg('data:image/png;base64,${b64B}');
      const w = imgA.width, h = imgA.height;

      // Compute pixel diff stats
      const cA = document.createElement('canvas'); cA.width = w; cA.height = h;
      const ctxA = cA.getContext('2d'); ctxA.drawImage(imgA, 0, 0);
      const dA = ctxA.getImageData(0, 0, w, h).data;

      const cB = document.createElement('canvas'); cB.width = w; cB.height = h;
      const ctxB = cB.getContext('2d'); ctxB.drawImage(imgB, 0, 0);
      const dB = ctxB.getImageData(0, 0, w, h).data;

      let sumAbs = 0;
      const nPx = w * h;
      for (let i = 0; i < dA.length; i += 4) {
        sumAbs += (Math.abs(dA[i] - dB[i]) + Math.abs(dA[i + 1] - dB[i + 1]) + Math.abs(dA[i + 2] - dB[i + 2])) / 3;
      }
      const meanAbsDiff = +(sumAbs / nPx).toFixed(3);

      // Build side-by-side canvas (1600x484)
      const outW = 1600, headerH = 34, panelW = 796, panelH = Math.round(796 * h / w), gap = 8;
      const outH = headerH + panelH;
      const outC = document.createElement('canvas');
      outC.width = outW; outC.height = outH;
      const ctx = outC.getContext('2d');
      ctx.fillStyle = '#0e120f';
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(imgA, 0, headerH, panelW, panelH);
      ctx.drawImage(imgB, panelW + gap, headerH, panelW, panelH);

      ctx.fillStyle = '#f2c418';
      ctx.font = 'bold 16px Consolas, monospace';
      ctx.fillText('${shotId} — A: ?shadowprune=0 (old full walk)', 12, 23);
      ctx.fillStyle = '#7ef29a';
      ctx.fillText('${shotId} — B: default (CL-288 step 2 pruned shadow walk)', panelW + gap + 12, 23);

      return {
        meanAbsDiff,
        b64: outC.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '')
      };
    })()`, 60000);

    const sideFile = path.join(OUT, `${shotId}-sidebyside.png`);
    fs.writeFileSync(sideFile, Buffer.from(stitched.b64, 'base64'));
    results.shots.push({
      id: shotId,
      fileA: metaA[shotId].file,
      fileB: metaB[shotId].file,
      sideBySide: path.basename(sideFile),
      meanAbsDiff: stitched.meanAbsDiff,
      shadowPruneA: metaA[shotId].shadowPruneDbg,
      shadowPruneB: metaB[shotId].shadowPruneDbg
    });
    console.log(`[AG-173] Stitched ${path.basename(sideFile)} (meanAbsDiff=${stitched.meanAbsDiff})`);
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(OUT, 'ag173-summary.json'), JSON.stringify(results, null, 2));
try { fs.unlinkSync(path.join(OUT, 'ag173-partial.json')); } catch {}
console.log('\n=== [AG-173] All benchmarks, realtest tcl288a, and side-by-side shadow captures complete! ===');
