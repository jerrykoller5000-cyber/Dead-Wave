// studio/check-model-lab.mjs — the model lab checked in a real browser, the way Jerry and the renderer use
// it (docs/drafts/modellab.md). Claude's (studio/*). Headless Chrome through tools/cdp.mjs (CHROME and
// CHROME_ARGS as for the tests).
//
//   node studio/check-model-lab.mjs                    every model in studio/models/index.js
//   node studio/check-model-lab.mjs creature/spider    the ones named
//   node studio/check-model-lab.mjs --shots <dir>      keep the lab's picture of each model there
//
// For every model: the lab loads with no page error; its cost, joints and parts match what Node builds;
// the turntable turns; wireframe, joints, names, grid, the three lights and the six views work; a part
// picked from the list lights up every copy of it, and a shift-click on the model picks the part under
// the pointer; a material lights up its parts; a limb comes off; the picture is a PNG under 3 MB; the
// address it says it's at shows the same thing again; and the sheet (?sheet=1) draws with the same
// numbers. Then the note, three ways:
//   - to a stand-in for the studio's write door, which checks the note is contract 5's shape;
//   - with no write door at all (a plain static server, as python -m http.server would be), where the
//     note is copied instead;
//   - to the real one, tools/serve.mjs with studio/notes-endpoint.mjs, serving a copy of the repo whose
//     review folder is empty, so nothing in the repo is written. On an endpoint that takes model notes
//     the folder is made with the note and its picture; on the first lab's endpoint (motion presets
//     only) the lab falls back to copying, and the check says which it got.
// Exit 1 on any failure.
import { register } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

register(new URL('./node-three-hook.mjs', import.meta.url));
const { buildModel, modelAsset } = await import('./model.js');
const { models } = await import('./models/index.js');
const { partRows, ASSET_NAME } = await import('./model-look.js');
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const argv = process.argv.slice(2);
const opt = { shots: null, refs: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--shots') opt.shots = path.resolve(argv[++i]);
  else opt.refs.push(argv[i]);
}
const refs = opt.refs.length ? opt.refs : models.names();
for (const r of refs) if (!models.json(r)) { console.error(`no model "${r}" (${models.names().join(', ')})`); process.exit(2); }

// --- Reporting -------------------------------------------------------------------------------------------
let passed = 0, failed = 0;
class Fail extends Error {}
const must = (ok, why) => { if (!ok) throw new Fail(why); };
const errorsOf = (page) => [...page.errors.map((e) => 'error: ' + e.split('\n')[0]), ...page.console.filter((c) => c.type === 'error').map((c) => 'console: ' + c.text)];
async function step(page, what, fn) {
  const t0 = Date.now();
  try {
    const said = await fn();
    passed++;
    console.log(`  ok    ${what}${said ? ': ' + said : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    return true;
  } catch (e) {
    failed++;
    const said = page ? errorsOf(page).slice(-3) : [];
    console.log(`  FAIL  ${what}: ${e instanceof Fail ? e.message : (e && e.stack) || e}${said.length ? '\n        the page said: ' + said.join(' | ') : ''}`);
    return false;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pngSize(dataUrl) {
  const b = Buffer.from(String(dataUrl).split(',')[1] || '', 'base64');
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
}

// --- Servers ---------------------------------------------------------------------------------------------
// The repo's files, and POST /__studio/* either answered by a stand-in for the write door ('stub'), which
// keeps what it was sent, or refused as a plain static server refuses it ('static').
function testServer(mode) {
  // overrides: repo path -> text served in its place (a model file "changed on disk" without touching it).
  const got = [], overrides = new Map();
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain', '.md': 'text/markdown' };
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    if (req.method === 'POST') {
      if (mode === 'static') { req.resume(); res.writeHead(501, { 'Content-Type': 'text/html' }).end('<h1>Unsupported method (POST)</h1>'); return; }
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        const j = (() => { try { return JSON.parse(body); } catch { return null; } })();
        const route = p.replace('/__studio/', '');
        got.push({ route, body: j });
        const send = (code, o) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(o));
        if (route === 'ping') return send(200, { ok: true, routes: ['note', 'ping'] });
        if (route !== 'note' || !j) return send(404, { ok: false, error: 'no route' });
        if (!ASSET_NAME.test(String(j.asset))) return send(400, { ok: false, error: 'bad asset' });
        const v = j.meta && Number.isInteger(j.meta.version) ? j.meta.version : 1;
        return send(200, { ok: true, asset: j.asset, file: `review/${j.asset}/notes.md`, owner: (j.meta && j.meta.owner) || 'claude', version: 'v' + v, ...(j.snapshot ? { picture: `review/${j.asset}/v${v}/lab-stub.png` } : {}) });
      });
      return;
    }
    if (overrides.has(p)) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(overrides.get(p)); return; }
    const file = path.resolve(ROOT, '.' + (p.endsWith('/') ? p + 'index.html' : p));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    origin: `http://127.0.0.1:${server.address().port}`, got, overrides,
    close: () => new Promise((d) => { server.closeAllConnections(); server.close(() => d()); })
  })));
}
// A copy of the repo for the real write door: its folders linked, its review folder empty and its own.
function scratchRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-model-lab-'));
  for (const d of ['studio', 'vendor', 'core', 'world', 'crew', 'assets', 'tools']) {
    if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(dir, d), 'dir');
  }
  fs.mkdirSync(path.join(dir, 'review'));
  return dir;
}

// --- The checks ------------------------------------------------------------------------------------------
const browser = await launch({ headless: true });
const W = 1600, H = 900;
async function openLab(origin, query) {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${origin}/studio/model-lab.html?${query}`, { waitUntil: 'none' });
  const ok = await page.waitFor('window.lab && window.lab.ready && window.lab.frames > 2', { timeout: 120000 });
  return { page, ok };
}
async function shiftClick(page, x, y) {
  const SHIFT = 8;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers: SHIFT });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, modifiers: SHIFT });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, modifiers: SHIFT });
}

async function checkModel(ref, stub) {
  const json = models.json(ref), built = buildModel(json), rows = partRows(json);
  console.log(`\n${ref}`);
  const { page, ok } = await openLab(stub.origin, `model=${ref}`);
  const S = () => page.evaluate('lab.state()');
  let st;
  const up = await step(page, 'the lab loads with no page error', async () => {
    must(ok, 'window.lab never became ready');
    st = await S();
    must(st.ref === ref, 'it shows ' + st.ref);
    const errs = errorsOf(page);
    must(!errs.length, errs.join('; '));
    return `${st.parts} parts, ${st.joints.length} joints, ${st.cost.draws} draws, ${st.cost.triangles} triangles`;
  });
  if (!up) { await page.send('Page.close').catch(() => {}); return; }
  await step(page, 'its cost, joints and parts are what Node builds', async () => {
    must(st.cost.draws === built.cost.draws && st.cost.triangles === built.cost.triangles, `the lab counts ${JSON.stringify(st.cost)}, Node ${JSON.stringify(built.cost)}`);
    must(st.joints.length === Object.keys(built.joints).length, `${st.joints.length} joints, Node ${Object.keys(built.joints).length}`);
    must(st.parts === json.parts.length, `${st.parts} rows, the file has ${json.parts.length} parts`);
    must(st.over === built.over, 'over budget disagrees');
    return `${st.bounds.size.join(' × ')} m`;
  });
  await step(page, 'the turntable turns, and wireframe, joints, names and grid switch', async () => {
    const y0 = (await S()).yaw;
    // Frames, not seconds: in software GL a big model draws at a frame or two a second.
    const f0 = await page.evaluate('lab.frames');
    await page.evaluate('lab.toggle("spin", true)');
    must(await page.waitFor(`lab.frames >= ${f0 + 4}`, { timeout: 60000, every: 100 }), 'the lab stopped drawing');
    const y1 = (await S()).yaw;
    must(y1 > y0 + 0.02, `the yaw went from ${y0.toFixed(3)} to ${y1.toFixed(3)} in 4 frames`);
    await page.evaluate('lab.toggle("spin", false)');
    await page.evaluate('lab.toggle("wire", true); lab.toggle("joints", true); lab.toggle("names", true); lab.toggle("grid", false)');
    await page.evaluate('lab.nextFrame()');
    st = await S();
    must(st.wireOn === true, 'the meshes are not in wireframe');
    must(st.dots === st.joints.length, `${st.dots} joint dots shown for ${st.joints.length} joints`);
    must(st.look.includes('wire=1') && st.look.includes('joints=1') && st.look.includes('names=1') && st.look.includes('grid=0'), 'the address does not carry the toggles: ' + st.look);
    await page.evaluate('lab.toggle("wire", false); lab.toggle("names", false); lab.toggle("grid", true)');
    must((await S()).wireOn === false, 'wireframe did not switch off');
    return `yaw ${y0.toFixed(2)} → ${y1.toFixed(2)} in 4 frames`;
  });
  await step(page, 'day, night and night vision (the game\'s green filter)', async () => {
    await page.evaluate('lab.setLight("nvg")');
    st = await S();
    must(st.light === 'nvg' && /hue-rotate/.test(st.filter), 'night vision has no filter: ' + st.filter);
    await page.evaluate('lab.setLight("night")');
    st = await S();
    must(st.light === 'night' && !st.filter, 'night: ' + st.filter);
    await page.evaluate('lab.setLight("day")');
    return 'filter ' + (await page.evaluate('getComputedStyle(document.querySelector("#view canvas")).filter')).slice(0, 12);
  });
  await step(page, 'the six views: four straight with a ruler, two in perspective', async () => {
    const got = [];
    for (const v of ['front', 'side', 'back', 'top', 'three-front', 'three-back']) {
      const straight = await page.evaluate(`lab.view("${v}")`);
      await page.evaluate('lab.nextFrame()');
      st = await S();
      const want = ['front', 'side', 'back', 'top'].includes(v) ? v : null;
      must(straight === want, `${v}: straight is ${straight}`);
      must(st.view === v, `${v}: the lab says ${st.view}`);
      got.push(v);
    }
    return got.join(', ');
  });
  let picked = null;
  await step(page, 'a part picked from the list lights up every copy of it', async () => {
    const i = rows.reduce((b, r) => (r.copies > rows[b].copies ? r.i : b), 0);
    const h = await page.evaluate(`lab.pick(${i})`);
    st = await S();
    must(h && h.src === i, 'nothing picked');
    must(st.highlight.meshes === rows[i].copies, `${st.highlight.meshes} highlight meshes for ${rows[i].copies} copies of ${rows[i].name}`);
    must(st.part === i && st.look.includes(`part=${i}`), 'the address does not carry the part: ' + st.look);
    const row = await page.evaluate(`document.querySelector('#parts .part.on') && document.querySelector('#parts .part.on').dataset.i`);
    must(+row === i, 'the list shows row ' + row + ' picked');
    return `${rows[i].name} ×${rows[i].copies}`;
  });
  await step(page, 'a shift-click on the model picks the part under the pointer', async () => {
    await page.evaluate('lab.pick(null); lab.view("three-front")');
    await page.evaluate('lab.nextFrame()');
    // Try parts until one's middle is on the canvas, clear of the panels.
    for (const r of [...rows].sort((a, b) => b.triangles - a.triangles)) {
      const at = await page.evaluate(`lab.screenOfPart(${r.i})`);
      const onCanvas = await page.evaluate(`(() => { const e = document.elementFromPoint(${at.x}, ${at.y}); return !!e && e.tagName === 'CANVAS' && !e.id; })()`);
      if (!onCanvas) continue;
      const under = await page.evaluate(`lab.partAtScreen(${at.x}, ${at.y})`);
      if (under === null) continue;
      await shiftClick(page, at.x, at.y);
      st = await S();
      must(st.part === under, `the click at ${at.x.toFixed(0)}, ${at.y.toFixed(0)} picked ${st.part}, the part there is ${under}`);
      picked = under;
      return `${rows[under].name} at ${at.x.toFixed(0)}, ${at.y.toFixed(0)}`;
    }
    throw new Fail('no part of it was clear of the panels to click');
  });
  await step(page, 'parts in colour: every copy of every part in its own colour, the model\'s own meshes hidden', async () => {
    await page.evaluate('lab.toggle("colors", true)');
    await page.evaluate('lab.nextFrame()');
    st = await S();
    must(st.colors === true && st.look.includes('colors=1'), 'the address does not carry it: ' + st.look);
    must(st.colored === built.parts.length, `${st.colored} coloured for ${built.parts.length} drawn parts`);
    must(st.modelMeshesShown === 0, `${st.modelMeshesShown} of the model's own meshes still show`);
    await page.evaluate('lab.toggle("colors", false)');
    st = await S();
    must(st.colored === 0 && st.modelMeshesShown === built.meshes.length, `after: ${st.colored} coloured, ${st.modelMeshesShown} of ${built.meshes.length} shown`);
    return `${built.parts.length} parts`;
  });
  await step(page, 'a material lights up every part made of it', async () => {
    const m = json.parts[picked ?? 0].material;
    const n = await page.evaluate(`lab.pickMaterial(${JSON.stringify(m)})`);
    const want = rows.filter((r) => r.material === m).reduce((s, r) => s + r.copies, 0);
    must(n === want, `${n} lit for ${want} copies of parts in ${m}`);
    await page.evaluate('lab.pick(null)');
    return `${m}: ${n}`;
  });
  if (Object.keys(built.limbs).length) {
    await step(page, 'a limb comes off and goes back', async () => {
      const limb = Object.keys(built.limbs)[0];
      const off = await page.evaluate(`lab.lose(${JSON.stringify(limb)})`);
      must(off.includes(limb), 'hidden: ' + off.join());
      const back = await page.evaluate(`lab.lose(${JSON.stringify(limb)}, false)`);
      must(!back.includes(limb), 'still hidden: ' + back.join());
      return `${limb} (${built.limbs[limb].length} mesh${built.limbs[limb].length > 1 ? 'es' : ''})`;
    });
  }
  if (json.body) {
    await step(page, 'a click on a creature with a body hits it, and it reacts', async () => {
      await page.evaluate('lab.pick(null); lab.view("three-front")');
      await page.evaluate('lab.nextFrame()');
      st = await S();
      must(st.body && st.body.state === 'animated', 'before the hit it is ' + JSON.stringify(st.body));
      // The biggest part clear of the panels, clicked plainly (no shift): a hit, not a pick.
      for (const r of [...rows].sort((a, b) => b.triangles - a.triangles)) {
        const at = await page.evaluate(`lab.screenOfPart(${r.i})`);
        const onCanvas = await page.evaluate(`(() => { const e = document.elementFromPoint(${at.x}, ${at.y}); return !!e && e.tagName === 'CANVAS' && !e.id; })()`);
        if (!onCanvas || (await page.evaluate(`lab.partAtScreen(${at.x}, ${at.y})`)) === null) continue;
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', buttons: 0, clickCount: 1 });
        const f0 = await page.evaluate('lab.frames');
        must(await page.waitFor(`lab.frames >= ${f0 + 3}`, { timeout: 60000, every: 100 }), 'the lab stopped drawing');
        st = await S();
        must(st.part === null, 'a plain click on a body picked a part instead of hitting it');
        must(st.body.state !== 'animated', `it didn't react: ${st.body.state}`);
        must(/last hit Shotgun, close/.test(st.context), 'the note context has no hit: ' + st.context);
        await page.evaluate('document.getElementById("standup").click()');
        return `${st.body.preset}: ${st.body.state} after a close shell on ${r.name}`;
      }
      throw new Fail('no part of it was clear of the panels to click');
    });
  }
  let look = null;
  await step(page, 'the picture is a PNG with its caption, under 3 MB', async () => {
    await page.evaluate(`lab.setLight("nvg"); lab.pick(${picked ?? 0}); lab.view("side")`);
    const url = await page.evaluate('lab.snapshot()');
    const s = pngSize(url);
    must(s && s.w <= 1280 && s.w >= 640, 'odd picture size ' + JSON.stringify(s));
    must(url.length <= 3 * 1024 * 1024, `${url.length} characters is over 3 MB`);
    must(s.bytes > 10000, `only ${s.bytes} bytes: is it blank?`);
    if (opt.shots) { fs.mkdirSync(opt.shots, { recursive: true }); fs.writeFileSync(path.join(opt.shots, `${json.name}-lab.png`), Buffer.from(url.split(',')[1], 'base64')); }
    look = (await S()).look;
    return `${s.w}×${s.h}, ${(s.bytes / 1024).toFixed(0)} KB`;
  });
  await step(page, 'the note goes to the write door as contract 5 has it, with the picture', async () => {
    const before = stub.got.length;
    const r = await page.evaluate('lab.note("The lamp should be brighter. (check-model-lab)")');
    must(r && r.how === 'saved', 'not saved: ' + JSON.stringify(r && (r.error || r.how)));
    const sent = stub.got.slice(before).find((g) => g.route === 'note');
    must(sent, 'the stand-in got no note');
    const b = sent.body, m = b.meta || {};
    must(b.asset === modelAsset(json), 'asset ' + b.asset);
    must(m.kind === 'model' && m.ref === ref && m.owner === (json.owner || 'claude') && m.version === (json.version || 1), 'meta ' + JSON.stringify(m));
    must(m.file === `studio/models/${ref}.json` && m.look === `studio/model-lab.html?model=${ref}`, 'meta file/look ' + JSON.stringify(m));
    must(typeof b.snapshot === 'string' && b.snapshot.startsWith('data:image/png;base64,') && b.snapshot.length <= 3 * 1024 * 1024, 'no picture, or too big');
    must(/look: studio\/model-lab\.html\?model=/.test(b.context) && /night vision/.test(b.context), 'the context: ' + b.context);
    return b.context.slice(0, 110) + '...';
  });
  await step(page, 'a change saved to the file shows in the lab, keeping the camera; a bad one shows its problems', async () => {
    const at = '/studio/models/' + ref + '.json';
    const before = await S();
    // A bigger budget and one more part: the kind of change an agent saves while Jerry watches.
    const changed = JSON.parse(JSON.stringify(json));
    changed.version = (json.version || 1) + 1;
    changed.budget = { draws: json.budget.draws + 1, triangles: json.budget.triangles + 12 };
    changed.materials.checkMark = { color: '#ff00ff' };
    changed.parts.push({ name: 'checkBox', shape: 'box', size: [0.1, 0.1, 0.1], at: [0, 3, 0], material: 'checkMark', merge: false });
    stub.overrides.set(at, JSON.stringify(changed, null, 2));
    try {
      must(await page.evaluate('lab.watch()') === true, 'the lab did not take the changed file');
      st = await S();
      must(st.parts === json.parts.length + 1 && st.cost.draws === built.cost.draws + 1 && st.fileVersion === changed.version, `after the change: ${st.parts} parts, ${st.cost.draws} draws, v${st.fileVersion}`);
      must(st.view === before.view && Math.abs(st.yaw - before.yaw) < 1e-9 && st.part === before.part, 'the camera or the pick moved: ' + JSON.stringify([before.view, st.view, before.part, st.part]));
      must(await page.waitFor('lab.state().review.changed === true', { timeout: 20000 }), 'the lab does not say the file changed since the review version');
      const g = await page.evaluate('lab.ghost(true)');
      must(g === (await S()).review.latest, 'no ghost of the review version: ' + g);
      must((await S()).context.includes(`${g} as a ghost`), 'the note context does not say a ghost is showing');
      await page.evaluate('lab.ghost(false)');
      stub.overrides.set(at, JSON.stringify({ ...changed, parts: [...changed.parts, { name: 'oops', shape: 'blob' }] }));
      must(await page.evaluate('lab.watch()') === false, 'a bad file was taken');
      st = await S();
      must(st.problems.length && /oops|blob|shape/.test(st.problems.join(' ')), 'no problems shown: ' + JSON.stringify(st.problems));
      must(st.parts === json.parts.length + 1, 'the last good file is not the one showing');
      return `v${changed.version}: ${st.parts} parts; the bad one: "${st.problems[0]}"`;
    } finally {
      stub.overrides.delete(at);
      await page.evaluate('lab.watch()');
    }
  });
  await page.send('Page.close').catch(() => {});
  await step(null, 'the address in the note shows the same view again', async () => {
    const q = look.replace(/^studio\/model-lab\.html\?/, '');
    const { page: p2, ok: ok2 } = await openLab(stub.origin, q);
    try {
      must(ok2, 'the lab never became ready at ' + look);
      const s2 = await p2.evaluate('lab.state()');
      must(s2.light === 'nvg' && s2.view === 'side' && s2.part === (picked ?? 0), `it shows light ${s2.light}, view ${s2.view}, part ${s2.part}`);
      must(s2.look === look, `the address came back as ${s2.look}`);
      return q;
    } finally { await p2.send('Page.close').catch(() => {}); }
  });
  await step(null, 'the sheet (?sheet=1) draws, with the numbers Node has', async () => {
    const p3 = await browser.newPage({ width: 1600, height: 1000 });
    try {
      await p3.goto(`${stub.origin}/studio/model-lab.html?sheet=1&model=${ref}`, { waitUntil: 'none' });
      must(await p3.waitFor('window.__ready === true', { timeout: 120000 }), 'the sheet never finished: ' + errorsOf(p3).join('; '));
      const s = await p3.evaluate('window.__stats'), size = await p3.evaluate('window.__size');
      must(!errorsOf(p3).length, errorsOf(p3).join('; '));
      must(s.draws === built.cost.draws && s.triangles === built.cost.triangles, 'the sheet counts ' + JSON.stringify(s));
      must(s.views.join() === 'front,side,back,top,three-front,three-back', 'views ' + s.views);
      must(s.bounds && s.bounds.size.length === 3, 'no bounds');
      const png = pngSize(await p3.evaluate('window.__png()'));
      must(png && png.w === size.w && png.h === size.h, `the picture is ${JSON.stringify(png)}, the page says ${JSON.stringify(size)}`);
      return `${size.w}×${size.h}, elevations ${s.scale.elevationsPxPerMetre} px a metre`;
    } finally { await p3.send('Page.close').catch(() => {}); }
  });
}

async function checkDraft(ref, stub) {
  console.log(`\na draft: ${ref}'s file opened with ?file= (a model not listed yet opens the same way)`);
  const file = `studio/models/${ref}.json`, json = models.json(ref);
  const { page, ok } = await openLab(stub.origin, `file=${file}`);
  await step(page, 'the draft loads as its own model, and its note names its file', async () => {
    must(ok, 'the lab never became ready');
    const st = await page.evaluate('lab.state()');
    must(st.file === file && st.ref === ref, `file ${st.file}, ref ${st.ref}`);
    must(st.look.startsWith(`studio/model-lab.html?file=${file}`) && !st.look.includes('model='), 'look ' + st.look);
    const errs = errorsOf(page);
    must(!errs.length, errs.join('; '));
    const before = stub.got.length;
    const r = await page.evaluate('lab.note("A draft note. (check-model-lab)", { picture: false })');
    must(r.how === 'saved', 'not saved: ' + JSON.stringify(r.error));
    const b = stub.got.slice(before).find((g) => g.route === 'note').body;
    must(b.meta.file === file && b.meta.look === `studio/model-lab.html?file=${file}` && b.asset === modelAsset(json), 'meta ' + JSON.stringify(b.meta));
    must(!('snapshot' in b), 'a picture was sent though the box was unticked');
    return `${st.ref} from ${file}${st.body ? `, reacting as ${st.body.preset}` : ''}`;
  });
  await page.send('Page.close').catch(() => {});
}

async function checkFallback(ref) {
  console.log(`\nwith no write door (a plain static server)`);
  const plain = await testServer('static');
  const { page, ok } = await openLab(plain.origin, `model=${ref}`);
  await step(page, 'the note is copied instead, ready to paste into notes.md', async () => {
    must(ok, 'the lab never became ready');
    const r = await page.evaluate('lab.note("The drum should be dented. (check-model-lab)", { picture: false })');
    must(r && r.how === 'copied', 'expected copied, got ' + JSON.stringify(r && r.how));
    must(/^## \d{4}-\d{2}-\d{2} · Jerry · v\d+ · lab\n/.test(r.block), 'the block: ' + r.block.slice(0, 80));
    const shown = await page.evaluate('document.querySelector("#saved pre") && document.querySelector("#saved pre").textContent');
    must(shown && shown.startsWith('## '), 'the page does not show the block to copy');
    return r.block.split('\n')[0];
  });
  await page.send('Page.close').catch(() => {});
  await plain.close();
}

async function checkRealDoor(ref) {
  console.log(`\nthe real write door (tools/serve.mjs and studio/notes-endpoint.mjs) on a copy with an empty review folder`);
  const dir = scratchRoot();
  const server = await serve(dir, 0);
  const { page, ok } = await openLab(server.origin, `model=${ref}`);
  try {
    await step(page, 'the note is saved with its picture, or copied if this endpoint takes only motion notes', async () => {
      must(ok, 'the lab never became ready');
      const r = await page.evaluate('lab.note("The hull should sit lower. (check-model-lab)")');
      const asset = modelAsset(models.json(ref)), folder = path.join(dir, 'review', asset);
      if (r.how === 'saved') {
        must(fs.existsSync(path.join(folder, 'notes.md')), 'no notes.md in the new folder');
        const meta = JSON.parse(fs.readFileSync(path.join(folder, 'meta.json'), 'utf8'));
        must(meta.kind === 'model' && meta.ref === ref, 'meta.json ' + JSON.stringify(meta));
        const notes = fs.readFileSync(path.join(folder, 'notes.md'), 'utf8');
        must(/## \d{4}-\d{2}-\d{2} · Jerry · v1 · lab/.test(notes) && notes.includes('sit lower'), 'the note is not in notes.md');
        must(r.reply.picture && fs.existsSync(path.join(dir, r.reply.picture)), 'no picture at ' + r.reply.picture);
        return `saved: ${r.reply.file}, ${r.reply.picture}`;
      }
      // The first lab's endpoint wants { preset } and reads at most 20 KB, so it refuses the note or cuts
      // the connection on its picture; either way the lab copies it.
      must(r.how === 'copied' && /preset|fetch/i.test(r.error), 'neither saved nor copied for the known reason: ' + JSON.stringify(r));
      must(!fs.existsSync(folder), 'a folder was made although the note was refused');
      return `copied: this endpoint said "${r.error}" (it takes model notes once contract 5's endpoint is merged)`;
    });
  } finally {
    await page.send('Page.close').catch(() => {});
    await Promise.race([server.close(), sleep(800)]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const stub = await testServer('stub');
try {
  for (const r of refs) await checkModel(r, stub);
  // A draft that is a rig with a body registers its own rig beside the listed one; a prop is simpler.
  await checkDraft(refs.find((r) => models.json(r).body) || refs[0], stub);
  await checkFallback(refs[0]);
  await checkRealDoor(refs[0]);
} finally {
  await stub.close();
  await Promise.race([browser.close(), sleep(2500)]);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
