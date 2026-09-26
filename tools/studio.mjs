// tools/studio.mjs — CU-44. Render a clip or a rig into review/<asset>/vN/.
// Loads the studio and three.js only, never the game. Headless Chrome draws the pictures
// (CHROME_ARGS is passed through, same as the tests).
//
//   node tools/studio.mjs list
//   node tools/studio.mjs render studio/clips/guardian/drag.json [--asset name] [--vs ref]
//        [--frames 12] [--cam side|play|front|three] [--root-motion] [--design default|wet|chalk]
//   node tools/studio.mjs rig guardian [--design ...] [--frames 8]
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

register(new URL('../studio/node-three-hook.mjs', import.meta.url));
const THREE = await import('three');
const { rigs, loadClip, createPlayer, sampleClip, rigCost, loadReference } = await import('../studio/index.js');

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SNAP = 0.3;
const SLIDE = 0.05;

function args() {
  const rest = process.argv.slice(2);
  const cmd = rest[0];
  const pos = [];
  const opt = {};
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opt[key] = true;
    else { opt[key] = next; i++; }
  }
  return { cmd, pos, opt };
}

function clipsOnDisk() {
  const dir = path.join(ROOT, 'studio', 'clips');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const rig of fs.readdirSync(dir)) {
    const sub = path.join(dir, rig);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) if (f.endsWith('.json')) out.push(path.join('studio', 'clips', rig, f));
  }
  return out;
}

function list() {
  console.log('rigs:', rigs.names().join(', ') || '(none)');
  console.log('clips:');
  for (const rel of clipsOnDisk()) {
    const clip = loadClip(JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    console.log('  ' + rel + (clip.reference ? '   vs ' + clip.reference : ''));
  }
  const cat = path.join(ROOT, 'assets', 'anim', 'reference', 'catalogue.json');
  if (fs.existsSync(cat)) {
    const names = JSON.parse(fs.readFileSync(cat, 'utf8')).map((c) => c.name);
    console.log('references (' + names.length + '): ' + names.join(', '));
  }
  const review = path.join(ROOT, 'review');
  console.log('review:');
  if (!fs.existsSync(review)) { console.log('  (none)'); return; }
  for (const name of fs.readdirSync(review)) {
    const latest = path.join(review, name, 'latest.txt');
    if (fs.existsSync(latest)) console.log('  ' + name + '  ' + fs.readFileSync(latest, 'utf8').trim());
  }
}

function joints(inst) {
  return Object.values(inst.R).filter((o) => o && o.isObject3D);
}
function stageOf(json) {
  return json.stage || (rigs.def(json.rig).stage && rigs.def(json.rig).stage.targets) || {};
}
function worldStage(inst, stage) {
  inst.group.updateWorldMatrix(true, true);
  const out = {};
  for (const [k, v] of Object.entries(stage)) out[k] = new THREE.Vector3(v[0], v[1], v[2]).applyMatrix4(inst.group.matrixWorld);
  return out;
}

// Worst one-frame joint turn at 60 fps, and the most a planted end slid (metres).
function measure(clip, json, { rootMotion = false, design = null, stripFrames = 12 } = {}) {
  const inst = rigs.get(json.rig).create({ design: design || undefined });
  const cost = rigCost(inst.group);
  const targets = worldStage(inst, stageOf(json));
  const player = createPlayer(inst).play(clip, { rootMotion });
  const steps = Math.max(1, Math.ceil(clip.length * 60));
  const prev = new Map();
  const pin = {};
  const slide = {};
  const bad = new Set();
  let worst = 0, joint = '', at = 0;
  const endOf = (name) => inst.R[inst.def.chains[name].end];
  for (let i = 0; i <= steps; i++) {
    player.update(i === 0 ? 0 : clip.length / steps, { targets });
    const t = Math.min(clip.length, (i / steps) * clip.length);
    const pose = sampleClip(clip, t);
    let stepSnap = 0;
    for (const j of joints(inst)) {
      const q = prev.get(j.name || j.uuid);
      if (q && i > 0) {
        const dot = Math.min(1, Math.abs(q.dot(j.quaternion)));
        const a = 2 * Math.acos(dot);
        if (a > worst) { worst = a; joint = j.name || ''; at = t; }
        if (a > stepSnap) stepSnap = a;
      }
      prev.set(j.name || j.uuid, j.quaternion.clone());
    }
    let stepSlide = 0;
    for (const name of Object.keys(inst.def.chains)) {
      const planted = (pose.chains[name] && pose.chains[name].plant) || 0;
      const end = endOf(name);
      if (!end) continue;
      const p = new THREE.Vector3().setFromMatrixPosition(end.matrixWorld);
      if (planted >= 0.5) {
        if (!pin[name]) pin[name] = p.clone();
        else {
          const d = p.distanceTo(pin[name]);
          const before = slide[name] || 0;
          slide[name] = Math.max(before, d);
          stepSlide = Math.max(stepSlide, d - before);
        }
      } else pin[name] = null;
    }
    if (i > 0 && (stepSnap > SNAP || stepSlide > SLIDE)) {
      const u = clip.length > 0 ? t / clip.length : 0;
      const fi = clip.loop ? Math.min(stripFrames - 1, Math.floor(u * stripFrames))
        : Math.min(stripFrames - 1, Math.round(u * (stripFrames - 1)));
      bad.add(fi);
    }
  }
  const budget = rigs.def(json.rig).budget || null;
  const over = !!(budget && (cost.draws > budget.draws || cost.triangles > budget.triangles));
  return {
    length: clip.length,
    frames: steps,
    draws: cost.draws,
    triangles: cost.triangles,
    budget,
    over,
    maxTurn: { rad: +worst.toFixed(3), joint, at: +at.toFixed(2) },
    footSlide: Object.fromEntries(Object.keys(inst.def.chains).map((n) => [n, +((slide[n] || 0).toFixed(3))])),
    events: (clip.events || []).map((e) => [e.t, e.name]),
    bad: [...bad].sort((a, b) => a - b)
  };
}

function nextVersion(dir) {
  const file = path.join(dir, 'latest.txt');
  if (!fs.existsSync(file)) return 'v1';
  const n = parseInt(String(fs.readFileSync(file, 'utf8')).replace(/\D/g, ''), 10);
  return 'v' + ((Number.isFinite(n) ? n : 0) + 1);
}

function writeIndex(dir, asset, version) {
  const versions = fs.readdirSync(dir).filter((n) => /^v\d+$/.test(n)).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const show = versions.slice(-2).reverse();
  const blocks = show.map((v) => {
    const strip = fs.existsSync(path.join(dir, v, 'strip.png')) ? `<img src="${v}/strip.png" alt="${v} strip">` : '';
    const turn = fs.existsSync(path.join(dir, v, 'turntable.png')) ? `<img src="${v}/turntable.png" alt="${v} turntable">` : '';
    const vid = fs.existsSync(path.join(dir, v, 'video.webm')) ? `<video src="${v}/video.webm" controls loop></video>` : '';
    return `<section><h2>${v}</h2>${strip}${turn}${vid}</section>`;
  }).join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>${asset}</title>
<style>body{margin:24px;background:#14181f;color:#e6e6e0;font-family:Georgia,serif} img,video{max-width:100%;display:block;margin:8px 0} h1{font-weight:normal}</style>
<h1>${asset}</h1><p>Latest ${version}. The newest version is first; the one before it is under that.</p>
${blocks}\n`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'latest.txt'), version + '\n');
}

async function shoot(query, file, { video = false } = {}) {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/tools/studio.html?${query}`, { waitUntil: 'none' });
    const ok = await page.waitFor('window.__ready === true || !!window.__error', { timeout: 90000 });
    if (!ok) throw new Error('the studio page did not finish');
    const err = await page.evaluate('window.__error || ""');
    if (err) throw new Error(err);
    if (video) {
      const len = await page.evaluate('window.__b64 ? window.__b64.length : 0');
      if (!len) throw new Error('no video was recorded');
      let b64 = '';
      const STEP = 400000;
      for (let i = 0; i < len; i += STEP) b64 += await page.evaluate(`window.__b64.slice(${i}, ${i + STEP})`);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, Buffer.from(b64, 'base64'));
    } else {
      const size = await page.evaluate('window.__size || { w: 1280, h: 720 }');
      await page.setViewport(size.w, size.h);
      await page.evaluate('window.__draw && window.__draw()');
      await page.screenshot(file);
    }
    const errors = page.errors.filter((e) => !/favicon/i.test(e));
    if (errors.length) console.log('page:', errors[0].split('\n')[0]);
  } finally {
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2500))]);
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await Promise.race([server.close(), new Promise((r) => setTimeout(r, 800))]);
  }
}

async function renderClip(rel, opt) {
  const t0 = Date.now();
  const abs = path.resolve(ROOT, rel);
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const clip = loadClip(json);
  const frames = Math.max(2, parseInt(opt.frames || '12', 10) || 12);
  const vs = opt.vs === 'none' ? '' : (opt.vs && opt.vs !== true ? opt.vs : (json.reference || ''));
  if (vs) {
    const ref = loadReference(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'anim', 'reference', 'ual.json'), 'utf8')));
    ref.clip(vs);
  }
  const designName = opt.design && opt.design !== true ? opt.design : 'default';
  const measured = measure(clip, json, { rootMotion: !!opt['root-motion'], stripFrames: frames });
  const asset = opt.asset && opt.asset !== true ? opt.asset : `${json.rig}-${json.name}`;
  const dir = path.join(ROOT, 'review', asset);
  fs.mkdirSync(dir, { recursive: true });
  const version = nextVersion(dir);
  const ver = path.join(dir, version);
  fs.mkdirSync(ver, { recursive: true });
  if (!fs.existsSync(path.join(dir, 'meta.json'))) {
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
      asset, owner: 'claude', rig: json.rig, clip: json.name, reference: vs || null,
      task: 'CU-44', design: designName
    }, null, 2) + '\n');
  }
  fs.copyFileSync(abs, path.join(ver, 'clip.json'));
  const q = new URLSearchParams({
    mode: 'strip', clip: rel.split(path.sep).join('/'), frames: String(frames),
    vs, cam: opt.cam && opt.cam !== true ? opt.cam : 'side',
    root: opt['root-motion'] ? '1' : '0', design: designName,
    bad: measured.bad.join(','), over: measured.over ? '1' : '0'
  });
  await shoot(q.toString(), path.join(ver, 'strip.png'));
  const qv = new URLSearchParams(q); qv.set('mode', 'video');
  await shoot(qv.toString(), path.join(ver, 'video.webm'), { video: true });
  const stats = {
    version, clip: rel.split(path.sep).join('/'), rig: json.rig,
    length: clip.length, frames: measured.frames,
    draws: measured.draws, triangles: measured.triangles, budget: measured.budget,
    maxTurn: measured.maxTurn, footSlide: measured.footSlide, events: measured.events,
    stripFrames: frames, marked: measured.bad,
    renderSeconds: +((Date.now() - t0) / 1000).toFixed(1)
  };
  fs.writeFileSync(path.join(ver, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  writeIndex(dir, asset, version);
  const slide = Object.entries(measured.footSlide).filter(([, v]) => v > 0).map(([k, v]) => k + ' ' + v).join(', ') || 'none';
  console.log(`${asset} ${version}  ${clip.length.toFixed(2)}s  draws ${measured.draws}${measured.budget ? '/' + measured.budget.draws : ''}  tris ${measured.triangles}${measured.budget ? '/' + measured.budget.triangles : ''}  maxTurn ${measured.maxTurn.rad} rad ${measured.maxTurn.joint} at ${measured.maxTurn.at}s  slide ${slide}  ${stats.renderSeconds}s`);
  if (measured.bad.length) console.log('  marked red:', measured.bad.join(', '));
  console.log('  ' + path.join('review', asset, version));
}

async function renderRig(name, opt) {
  const t0 = Date.now();
  if (!rigs.def(name)) throw new Error('no rig ' + name);
  const inst = rigs.get(name).create({});
  const cost = rigCost(inst.group);
  const budget = rigs.def(name).budget;
  const asset = opt.asset && opt.asset !== true ? opt.asset : name;
  const dir = path.join(ROOT, 'review', asset);
  fs.mkdirSync(dir, { recursive: true });
  const version = nextVersion(dir);
  const ver = path.join(dir, version);
  fs.mkdirSync(ver, { recursive: true });
  const frames = Math.max(4, parseInt(opt.frames || '8', 10) || 8);
  const designName = opt.design && opt.design !== true ? opt.design : 'default';
  if (!fs.existsSync(path.join(dir, 'meta.json'))) {
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
      asset, owner: 'claude', rig: name, clip: null, reference: null, task: 'CU-44', design: designName
    }, null, 2) + '\n');
  }
  const over = budget && (cost.draws > budget.draws || cost.triangles > budget.triangles);
  const q = new URLSearchParams({ mode: 'turntable', rig: name, frames: String(frames), design: designName, over: over ? '1' : '0' });
  await shoot(q.toString(), path.join(ver, 'turntable.png'));
  const stats = {
    version, rig: name, draws: cost.draws, triangles: cost.triangles, budget,
    renderSeconds: +((Date.now() - t0) / 1000).toFixed(1)
  };
  fs.writeFileSync(path.join(ver, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  writeIndex(dir, asset, version);
  console.log(`${asset} ${version}  turntable  draws ${cost.draws}${budget ? '/' + budget.draws : ''}  tris ${cost.triangles}${budget ? '/' + budget.triangles : ''}  ${stats.renderSeconds}s`);
  console.log('  ' + path.join('review', asset, version));
}

const { cmd, pos, opt } = args();
try {
  if (cmd === 'list') list();
  else if (cmd === 'render' && pos[0]) await renderClip(pos[0], opt);
  else if (cmd === 'rig' && pos[0]) await renderRig(pos[0], opt);
  else {
    console.log('node tools/studio.mjs list');
    console.log('node tools/studio.mjs render <clip.json> [--vs ref] [--frames 12] [--cam side] [--root-motion] [--design default]');
    console.log('node tools/studio.mjs rig <rig> [--frames 8]');
    process.exitCode = 2;
  }
} catch (e) {
  console.error(e && e.stack || e);
  process.exitCode = 1;
}
process.exit(process.exitCode || 0);
