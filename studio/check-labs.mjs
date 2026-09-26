// studio/check-labs.mjs — the studio's lab pages, checked in a real browser the way Jerry uses them.
// Claude's (studio/*). Serves the repo with tools/serve.mjs, opens each page in headless Chrome through
// tools/cdp.mjs (CHROME and CHROME_ARGS as for the tests), clicks and drags it like a person, drives
// the rest through the page's own window.lab, and checks what it wrote to disk. Then it opens the page
// again from a plain static server (as python -m http.server would serve it) and checks that notes
// and scenes fall back to being copied.
//
//   node studio/check-labs.mjs                every lab page
//   node studio/check-labs.mjs motion         the ones named (motion; the model lab joins PAGES later)
//   node studio/check-labs.mjs --shots <dir>  keep a screenshot of each step there
//   node studio/check-labs.mjs --keep         leave the note's review folder and the saved scene on disk
//   node studio/check-labs.mjs --root <dir>   serve another checkout (a branch merged somewhere else)
//
// The note goes to a review folder of its own (review/check-labs-<time>) and the scene to
// studio/scenes/lab-check-<time>.json; both are deleted at the end unless --keep. Exit 1 on any page
// error, any missing event and any failed check.
import { register } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

register(new URL('./node-three-hook.mjs', import.meta.url));
const HERE = path.dirname(fileURLToPath(import.meta.url));

// --- Arguments --------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { shots: null, keep: false, root: path.resolve(HERE, '..'), pages: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--shots') opt.shots = path.resolve(argv[++i]);
  else if (a === '--keep') opt.keep = true;
  else if (a === '--root') opt.root = path.resolve(argv[++i]);
  else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 18).join('\n')); process.exit(0); }
  else opt.pages.push(a);
}
const ROOT = opt.root;
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools', 'serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools', 'cdp.mjs')).href);
const { parseNotes } = await import(pathToFileURL(path.join(ROOT, 'crew', 'notes.mjs')).href);

// Every lab page: where it is and how it's checked. The model lab adds a line here.
const PAGES = {
  motion: { path: 'studio/motion-lab.html', title: 'The motion lab', run: checkMotionLab }
};
const names = opt.pages.length ? opt.pages : Object.keys(PAGES);
for (const n of names) if (!PAGES[n]) { console.error(`no lab page "${n}" (there are ${Object.keys(PAGES).join(', ')})`); process.exit(2); }

// What a check leaves in the repo while it runs (a review folder, a scene) goes, even on Ctrl-C, and
// so does its Chrome (cdp.mjs's close kills it before its first await).
const cleanups = new Set();
let browser = null;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const c of cleanups) { try { c(); } catch { /* going anyway */ } }
    if (browser) browser.close().catch(() => {});
    process.exit(130);
  });
}

// --- Reporting ---------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// What a call that draws pictures may take: a note's picture is seven renders, about a second each in
// headless Chrome's software GL, and much more on a box that's busy with other work.
const SLOW = 300000;
let passed = 0, failed = 0, shotN = 0;
class Fail extends Error {}
const must = (ok, why) => { if (!ok) throw new Fail(why); };
async function step(page, what, fn) {
  const t0 = Date.now();
  try {
    const said = await fn();
    passed++;
    console.log(`  ok    ${what}${said ? ': ' + said : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    return true;
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${what}: ${e instanceof Fail ? e.message : (e && e.stack) || e}`);
    return false;
  } finally {
    if (opt.shots && page) {
      fs.mkdirSync(opt.shots, { recursive: true });
      const f = path.join(opt.shots, `${String(++shotN).padStart(2, '0')}-${what.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`);
      try { await page.screenshot(f); } catch { /* the page is gone; the step says why */ }
    }
  }
}
// The page's own errors, and anything it logged as an error (a missing file shows up here too).
function pageErrors(page, from = 0) {
  return [...page.errors.map((e) => 'error: ' + e), ...page.console.filter((c) => c.type === 'error').map((c) => 'console: ' + c.text)].slice(from);
}

// --- Driving a page like a person ------------------------------------------------------------------------
async function click(page, x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}
async function dragTo(page, from, to, steps = 4) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps, y = from.y + ((to.y - from.y) * i) / steps;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
  }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
}
// Names in order, each after the one before (other events may come between).
function inOrder(events, want) {
  let k = 0;
  for (const e of events) if (e === want[k]) k++;
  return k === want.length ? null : want[k];
}
// What a run of events came to, as the battery says it (studio/motion-battery.js classify).
function outcome(names) {
  const s = new Set(names);
  return s.has('dead') ? 'dead' : s.has('fall') || s.has('down') ? 'down' : s.has('stagger') || s.has('step') ? 'stagger' : s.has('wake') || s.has('hit') || s.has('recovered') ? 'flinch' : 'none';
}
function pngSize(dataUrlOrBuffer) {
  const b = Buffer.isBuffer(dataUrlOrBuffer) ? dataUrlOrBuffer : Buffer.from(String(dataUrlOrBuffer).split(',')[1] || '', 'base64');
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
}

// A plain static server: every file, and no write door (a POST gets 501, as python's does).
function staticServer(root) {
  const base = path.resolve(root);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { req.resume(); res.writeHead(501, { 'Content-Type': 'text/html' }).end('<h1>Unsupported method</h1>'); return; }
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    const file = path.resolve(base, '.' + p);
    if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((d) => { server.closeAllConnections(); server.close(() => d()); }) })));
}

// Plays a saved scene in Node, as tools/studio.mjs would before drawing it: what each actor's reaction came to.
async function replayScene(file) {
  const { loadScene, createScene } = await import(pathToFileURL(path.join(ROOT, 'studio', 'index.js')).href);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const clipOf = (ref) => JSON.parse(fs.readFileSync(path.join(ROOT, 'studio', 'clips', ...ref.split('/')) + '.json', 'utf8'));
  const scene = loadScene(json, clipOf);
  const sp = createScene(scene, {});
  const ev = {};
  for (let t = 0; t < scene.length - 1e-9; t += 1 / 60) {
    for (const e of sp.update(1 / 60).events) if (e.name.startsWith('motion:')) (ev[e.actor] ||= []).push(e.name.slice(7));
  }
  sp.dispose();
  return { json, events: ev };
}

// --- The motion lab -------------------------------------------------------------------------------------
async function checkMotionLab(browser, server, page0) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const asset = `check-labs-${stamp}`, sceneName = `check-${stamp}`;
  const reviewDir = path.join(ROOT, 'review', asset), sceneFile = path.join(ROOT, 'studio', 'scenes', `lab-${sceneName}.json`);
  const page = await browser.newPage({ width: 1280, height: 720 });
  const remove = () => { fs.rmSync(reviewDir, { recursive: true, force: true }); fs.rmSync(sceneFile, { force: true }); };
  if (!opt.keep) cleanups.add(remove);
  const cleanUp = () => {
    cleanups.delete(remove);
    if (opt.keep) { console.log(`  kept  review/${asset}/ and studio/scenes/lab-${sceneName}.json`); return; }
    remove();
  };
  const S = () => page.evaluate('lab.state()');
  let st, hitT = 0, downT = 0;
  try {
    const up = await step(page, 'loads, and the lab\'s server takes notes', async () => {
      await page.goto(`${server.origin}/${PAGES.motion.path}?preset=zombie/shambler&weapon=shotgun-close&asset=${asset}`, { waitUntil: 'none' });
      must(await page.waitFor('window.lab && window.lab.ready', { timeout: 90000 }), 'window.lab never became ready' + (pageErrors(page).length ? ': ' + pageErrors(page).join('; ') : ''));
      st = await S();
      must(st.canSave, 'the page could not reach POST /__studio/ping');
      must(st.bodies.length === 1 && st.bodies[0].ref === 'zombie/shambler', 'expected one zombie/shambler, got ' + st.bodies.map((b) => b.ref).join(', '));
      must(st.weapon === 'shotgun-close', 'the weapon from the URL was not picked');
      must(await page.waitFor('lab.state().history', { timeout: 20000 }), 'the notes so far never came (POST /__studio/notes)');
      const h = (await S()).history;
      must(h.asset === asset && !h.exists && h.count === 0, 'a new review folder should have no notes: ' + JSON.stringify(h));
      const e = st.engine;
      return `engine: get-up clips ${e.getup ? 'named' : 'none'}, lose ${e.lose ? 'yes' : 'no'}, hold ${e.hold ? 'yes' : 'no'}`;
    });
    if (!up) return;

    await step(page, 'a click on the chest hits it, with the arrow at the hit', async () => {
      // Two seconds of standing first, so the timeline has a before, and a frame drawn so the body is
      // where the screen shows it.
      await page.evaluate('lab.advance(2)');
      await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const at = await page.evaluate('lab.screenOf("A", "chest")');
      must(at && at.x > 0 && at.x < 1280 && at.y > 0 && at.y < 720, 'the chest is off screen: ' + JSON.stringify(at));
      await click(page, at.x, at.y);
      st = await S();
      must(st.rec.hits.length === 1, `expected one hit recorded, got ${st.rec.hits.length} (the click missed the body?)`);
      const b = st.bodies[0];
      must(b.arrow && b.arrow.visible, 'no arrow shown');
      const hit = st.rec.hits[0];
      hitT = hit[0];
      must(hit[2] === 'shotgun-close', 'the hit was ' + hit[2]);
      return `hit at t ${hitT.toFixed(2)} s, arrow at [${b.arrow.at.join(', ')}] pushing [${b.arrow.dir.join(', ')}]`;
    });

    await step(page, 'the reaction plays through: hit, fall, down, get up, recovered', async () => {
      // On, in whole frames, until it's itself again (8 s at most), then held still for the timeline checks.
      for (let t = 0; t < 8; t += 0.5) {
        await page.evaluate('lab.advance(0.5)');
        if ((await S()).bodies[0].events.includes('recovered')) break;
      }
      await page.evaluate('lab.advance(0.5); lab.pause()');
      st = await S();
      const ev = st.bodies[0].events;
      const missing = inOrder(ev, ['wake', 'hit', 'fall', 'down', 'getup', 'recovered']);
      must(!missing, `no "${missing}" in order: ${ev.join(' ')}`);
      must(st.bodies[0].judge && st.bodies[0].judge.got === 'down', 'the readout judged it ' + JSON.stringify(st.bodies[0].judge));
      downT = (st.rec.events.find((e) => e[1] === 'A' && e[2] === 'down') || [0])[0];
      // What the preset expects of this hit (contract 6), said but not judged here: the click is near
      // the battery's hit, not the same, and the battery is the report's to check.
      const j = st.bodies[0].judge;
      return ev.join(' ') + (j.want ? `; the preset expects ${j.want} from the ${st.rec.hits[0][3]}: ${j.ok ? 'as expected' : 'not as expected'}` : '');
    });

    await step(page, 'get-up clips (contract 1), when the preset names them', async () => {
      const b = st.bodies[0];
      if (!st.engine.getup) return 'none named on this engine: it blends back as before';
      must(b.lastGetup, 'the preset names get-up clips but no "getup" event said which side it lay on');
      must(b.lastGetup.played, `no clip played for side "${b.lastGetup.side}" (${b.lastGetup.clip}); warnings: ${b.warnings.join('; ')}`);
      return `got up from its ${b.lastGetup.side} on ${b.lastGetup.clip}, turned to ${b.lastGetup.heading.toFixed(2)} rad`;
    });

    await step(page, 'the timeline recorded the last six seconds with the events on it', async () => {
      const r = st.rec;
      must(r.frames >= 300, `only ${r.frames} frames recorded`);
      must(r.end - r.start > 5.5 && r.end - r.start < 6.1, `it holds ${(r.end - r.start).toFixed(2)} s, not about 6`);
      const names = r.events.filter((e) => e[1] === 'A').map((e) => e[2]);
      const missing = inOrder(names, ['hit', 'fall', 'down', 'getup', 'recovered']);
      must(!missing, `the scrub bar has no "${missing}": ${names.join(' ')}`);
      return `${r.frames} frames over ${(r.end - r.start).toFixed(2)} s, ${r.events.length} events`;
    });

    await step(page, 'dragging the scrub bar pauses and shows the pose from then', async () => {
      const a = await page.evaluate(`lab.scrubAt(${downT + 0.1})`), b = await page.evaluate(`lab.scrubAt(${downT + 0.3})`);
      await dragTo(page, a, b);
      st = await S();
      must(st.mode === 'paused', 'the lab is ' + st.mode);
      must(Math.abs(st.viewT - (downT + 0.3)) < 0.06, `the playhead is at ${st.viewT.toFixed(3)}, not ${(downT + 0.3).toFixed(3)}`);
      const low = await page.evaluate('lab.jointY("A", "head")');
      await page.evaluate(`lab.scrub(${hitT - 0.2})`);
      const high = await page.evaluate('lab.jointY("A", "head")');
      must(low < high - 0.4, `the head is at ${low} m while down and ${high} m before the hit: the replay isn't showing the recorded pose`);
      await page.evaluate('lab.stepFrames(1)');
      const one = (await S()).viewT;
      must(Math.abs(one - (hitT - 0.2 + 1 / 60)) < 1e-3, `a frame step went to ${one}`);
      return `head ${low} m while down, ${high} m before the hit`;
    });

    await step(page, 'replay runs forward at the speed set, and stops at the end', async () => {
      await page.evaluate('lab.replay(0.25)');
      const t0 = (await S()).viewT;
      await sleep(1500);
      st = await S();
      must(st.mode === 'replay' || st.mode === 'paused', 'the lab is ' + st.mode);
      must(st.viewT > t0, `the playhead didn't move (${t0} → ${st.viewT})`);
      must(Math.abs(st.speed - 0.25) < 1e-9, 'the speed is ' + st.speed);
      await page.evaluate('lab.setSpeed(2); lab.play()');
      must(await page.waitFor('lab.state().mode === "paused"', { timeout: 60000 }), 'the replay never stopped at the end');
      st = await S();
      must(st.viewT <= st.rec.end + 1e-9, 'it ran past the end');
      await page.evaluate('lab.setSpeed(1); lab.live()');
      must((await S()).mode === 'live', 'Live did not go back to live');
      return `from ${t0.toFixed(2)} s, stopped at the end (${st.viewT.toFixed(2)} s)`;
    });

    await step(page, 'the picture is the canvas, with the scrub bar and a caption, under 3 MB', async () => {
      const url = await page.evaluate('lab.snapshot()', SLOW);
      must(typeof url === 'string' && url.startsWith('data:image/png;base64,'), 'no PNG came back');
      const s = pngSize(url);
      must(s && s.w <= 1280 && s.w >= 640 && s.h > 400, 'odd picture size ' + JSON.stringify(s));
      must(url.length <= 3 * 1024 * 1024, `${url.length} characters is over 3 MB`);
      must(s.bytes > 20000, `only ${s.bytes} bytes: is it blank?`);
      return `${s.w}×${s.h}, ${(s.bytes / 1024).toFixed(0)} KB`;
    });

    await step(page, 'a shift-drag holds it by a foot (contract 2), on an engine that can hold', async () => {
      if (!st.engine.hold) return 'skipped: this engine has no body.hold';
      await page.evaluate('lab.standUp(); lab.advance(1)');
      await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const f = await page.evaluate('lab.screenOf("A", "footR")');
      const SHIFT = 8;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: f.x, y: f.y, modifiers: SHIFT });
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: f.x, y: f.y, button: 'left', buttons: 1, clickCount: 1, modifiers: SHIFT });
      for (let i = 1; i <= 6; i++) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: f.x + i * 25, y: f.y - i * 40, button: 'left', buttons: 1, modifiers: SHIFT });
        await page.evaluate('lab.advance(0.15)');
      }
      const held = await S();
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: f.x + 150, y: f.y - 240, button: 'left', buttons: 0, clickCount: 1, modifiers: SHIFT });
      await page.evaluate('lab.advance(2)');
      st = await S();
      must(held.bodies[0].state === 'held', 'while the mouse had it, it was ' + held.bodies[0].state);
      const missing = inOrder(st.bodies[0].events, ['held', 'released']);
      must(!missing, `no "${missing}": ${st.bodies[0].events.join(' ')}`);
      return st.bodies[0].events.join(' ');
    });

    await step(page, 'a part comes off (contract 3), on an engine that can take one', async () => {
      if (!st.engine.lose) return 'skipped: this engine has no body.lose';
      await page.evaluate('lab.standUp(); lab.advance(0.5); lab.lose("legL"); lab.advance(1.5)');
      st = await S();
      const b = st.bodies[0];
      must(b.lost.join() === 'legL', 'lost: ' + b.lost.join());
      const missing = inOrder(b.events, ['lost', 'fall']);
      must(!missing, `a body that loses a leg falls; no "${missing}": ${b.events.join(' ')}`);
      const sc = await page.evaluate('lab.sceneJson("lost")');
      must(sc && JSON.stringify(sc.actors.a.lose) === '[[0.5,"legL"]]', 'the scene does not take the leg off: ' + JSON.stringify(sc && sc.actors.a.lose));
      await page.evaluate('lab.standUp()');
      must((await S()).bodies[0].lost.length === 0, 'standing up did not put it back together');
      return b.events.join(' ');
    });

    await step(page, 'compare: a second body takes the same hit at the same moment', async () => {
      await page.evaluate('lab.compare("zombie/brute")');
      must(await page.waitFor('lab.ready'), 'the second body never came');
      st = await S();
      must(st.bodies.length === 2 && st.bodies[1].ref === 'zombie/brute', 'bodies: ' + st.bodies.map((b) => b.ref).join(', '));
      must(Math.abs(st.bodies[0].at[0] - st.bodies[1].at[0]) > 1.5, 'the two bodies stand on top of each other');
      await page.evaluate('lab.fire("front")');
      await page.evaluate('lab.advance(4)');
      st = await S();
      const hits = st.rec.hits.filter((h) => h[2] === 'shotgun-close');
      must(hits.length === 2 && hits[0][0] === hits[1][0] && hits[0][1] !== hits[1][1], 'the hits were ' + JSON.stringify(hits));
      for (const b of st.bodies) {
        must(b.events.includes('hit'), `${b.key} (${b.ref}) was never hit: ${b.events.join(' ')}`);
        must(b.arrow && b.arrow.visible, `${b.key} has no arrow`);
        must(b.judge && b.judge.got, `${b.key} has no outcome`);
      }
      must(st.context.includes('beside it zombie/brute'), 'the note context does not say what was beside it: ' + st.context);
      return st.bodies.map((b) => `${b.key} ${b.ref}: ${b.judge.got}`).join(', ');
    });

    await step(page, 'save as scene: studio/scenes/lab-<name>.json, and it replays the same in Node', async () => {
      const r = await page.evaluate(`lab.saveScene(${JSON.stringify(sceneName)})`, SLOW);
      must(r && r.how === 'saved' && r.ok, 'not saved: ' + JSON.stringify(r && (r.error || r.how)));
      must(r.file === `studio/scenes/lab-${sceneName}.json` && fs.existsSync(sceneFile), 'no file ' + r.file);
      must(r.render === `node tools/studio.mjs scene studio/scenes/lab-${sceneName}.json`, 'the render line is ' + r.render);
      const { json, events } = await replayScene(sceneFile);
      must(json.name === `lab-${sceneName}`, 'the scene is named ' + json.name);
      const said = [];
      for (const [key, actor] of [['A', 'a'], ['B', 'b']]) {
        const lab = st.bodies.find((b) => b.key === key).judge.got, got = outcome(events[actor] || []);
        must((events[actor] || []).includes('hit'), `actor ${actor} was never hit in the scene`);
        must(got === lab, `actor ${actor}: the lab saw "${lab}", the scene plays "${got}" (${(events[actor] || []).join(' ')})`);
        said.push(`${actor} ${got}`);
      }
      return `${json.length} s, ${said.join(', ')}, as in the lab`;
    });

    await step(page, 'compare the file\'s numbers against the sliders', async () => {
      await page.evaluate('lab.compare("file")');
      must(await page.waitFor('lab.ready'), 'the second body never came');
      await page.evaluate('lab.slider("legs", 0.2); lab.slider("strength", 0.5)');
      st = await S();
      const [A, B] = st.bodies;
      must(B.ref === A.ref, 'B is ' + B.ref);
      must(A.moved && !B.moved, 'A should carry the sliders, B the file');
      must(Math.abs(A.preset.tone.legs - 0.2) < 1e-9 && Math.abs(A.preset.strength - 0.5) < 1e-9, 'A: ' + JSON.stringify(A.preset));
      must(B.preset.tone.legs !== 0.2 && B.preset.strength !== 0.5, 'B: ' + JSON.stringify(B.preset));
      await page.evaluate('lab.setWeapon("rifle"); lab.fire("side")');
      await page.evaluate('lab.advance(2.5)');
      st = await S();
      must(st.context.includes('sliders: legs tone 0.20'), 'the note context does not name the slider: ' + st.context);
      return st.bodies.map((b) => `${b.key}${b.moved ? ' (sliders)' : ' (file)'}: ${b.judge && b.judge.got}`).join(', ');
    });

    await step(page, 'the approved reactions checked in the lab (contract 6), when the preset has them', async () => {
      if (!st.engine.expect) return 'skipped: this preset has no "expect"';
      const r = await page.evaluate('lab.checkExpect().then((x) => x && { file: { ok: x.file.ok, total: x.file.total }, sliders: x.sliders && { ok: x.sliders.ok, total: x.sliders.total }, ms: x.ms })', SLOW);
      must(r && r.file && r.file.total > 0, 'no result from the check: ' + JSON.stringify(r) + ' ' + pageErrors(page).join('; '));
      must(r.sliders && r.sliders.total === r.file.total, 'with the sliders moved it should check them too: ' + JSON.stringify(r));
      must((await S()).context.includes('approved reactions: the file'), 'the note context does not say how the check came out');
      return `the file ${r.file.ok} of ${r.file.total} as approved, with the sliders ${r.sliders.ok} of ${r.sliders.total} (${r.ms} ms)`;
    });

    await step(page, 'a note with a picture lands in its review folder', async () => {
      await page.evaluate(`document.getElementById('note').value = 'check-labs: the lab note check. It gets up too slowly.'; document.getElementById('save').click()`);
      must(await page.waitFor('lab.state().lastSave && lab.state().lastSave.how', { timeout: SLOW }), 'the note was never sent');
      const r = (await S()).lastSave;
      must(r.ok && r.how === 'saved', 'not saved: ' + JSON.stringify(r));
      must(r.file === `review/${asset}/notes.md`, 'saved to ' + r.file);
      const md = fs.readFileSync(path.join(ROOT, r.file), 'utf8');
      const notes = parseNotes(md);
      must(notes.length === 1 && notes[0].state === 'waiting', `notes.md holds ${notes.length} notes: ${md.slice(0, 300)}`);
      must(/It gets up too slowly\./.test(notes[0].text) && /\(In the lab: zombie\/shambler v\d+; last: Rifle round/.test(md), 'the note or its context is missing: ' + md.slice(-600));
      must(r.picture && fs.existsSync(path.join(ROOT, r.picture)), 'no picture at ' + r.picture);
      const s = pngSize(fs.readFileSync(path.join(ROOT, r.picture)));
      must(s && s.w >= 640, 'the picture is not a PNG');
      // The note's picture has the strip of the reaction under the view (six tiles, a sixth as wide).
      must(s.h >= s.w * 0.72, `the picture is ${s.w}×${s.h}: no strip of the reaction under it?`);
      must(md.includes(`](${r.picture.split('/').slice(2).join('/')})`), 'the note does not name the picture');
      const meta = JSON.parse(fs.readFileSync(path.join(reviewDir, 'meta.json'), 'utf8'));
      must(meta.kind === 'motion' && meta.motion === 'zombie/shambler' && meta.owner, 'meta.json: ' + JSON.stringify(meta));
      // The folder's page, and the lab's notes so far, both show it.
      must(r.page === `review/${asset}/index.html` && /It gets up too slowly\./.test(fs.readFileSync(path.join(ROOT, r.page), 'utf8')), 'the folder page: ' + r.page);
      const h = (await S()).history;
      must(h && h.exists && h.count === 1 && h.state === 'waiting', 'the lab\'s notes so far: ' + JSON.stringify(h));
      return `${r.file}, ${r.picture} (${s.w}×${s.h}) and ${r.page}`;
    });

    await step(page, 'no page errors', async () => {
      const errs = pageErrors(page);
      must(!errs.length, errs.join(' | '));
      const c = await page.evaluate('lab.cost');
      return `bodies ${c.bodies.toFixed(2)} ms a frame here, drawing ${c.draw.toFixed(1)} ms (headless: software GL)`;
    });
  } finally {
    await page.send('Page.close').catch(() => {});
    cleanUp();
  }

  // Served without the write door, it copies instead of saving, and writes nothing.
  const plain = await staticServer(ROOT);
  const p2 = await browser.newPage({ width: 1280, height: 720 });
  const before = [fs.readdirSync(path.join(ROOT, 'review')).join(','), fs.readdirSync(path.join(ROOT, 'studio', 'scenes')).join(',')];
  try {
    await step(p2, 'from a plain static server it still works, and copies the note and the scene', async () => {
      await p2.goto(`${plain.origin}/${PAGES.motion.path}?preset=marine/marine`, { waitUntil: 'none' });
      must(await p2.waitFor('window.lab && window.lab.ready', { timeout: 90000 }), 'window.lab never became ready: ' + pageErrors(p2).join('; '));
      let s = await p2.evaluate('lab.state()');
      must(!s.canSave, 'it thinks it can save on a server with no write door');
      await p2.evaluate('lab.setWeapon("grenade"); lab.fire("front"); lab.advance(3)');
      const n = await p2.evaluate(`lab.note('check-labs: copied, not saved', { picture: true })`, SLOW);
      must(n && !n.ok && (n.how === 'copied' || n.how === 'shown') && /· Jerry · v\d+ · lab\ncheck-labs: copied/.test(n.block), 'the note fallback: ' + JSON.stringify(n));
      const sc = await p2.evaluate(`lab.saveScene('check-copied')`, SLOW);
      must(sc && !sc.ok && (sc.how === 'copied' || sc.how === 'shown') && sc.json && sc.json.format === 'dw-scene/1', 'the scene fallback: ' + JSON.stringify(sc && sc.how));
      const after = [fs.readdirSync(path.join(ROOT, 'review')).join(','), fs.readdirSync(path.join(ROOT, 'studio', 'scenes')).join(',')];
      must(after[0] === before[0] && after[1] === before[1], 'something was written without the write door');
      // The page's one question to the missing write door (POST /__studio/ping) is answered 501, and
      // Chrome logs that; it's the point of this check, not a fault.
      const errs = pageErrors(p2).filter((e) => !/status of 501/.test(e));
      must(!errs.length, errs.join(' | '));
      s = await p2.evaluate('lab.state()');
      return `note ${n.how}, scene ${sc.how}; the marine: ${s.bodies[0].events.join(' ')}`;
    });
  } finally {
    await p2.send('Page.close').catch(() => {});
    await plain.close();
  }
}

// --- Run -------------------------------------------------------------------------------------------------
const server = await serve(ROOT, 0);
const t0 = Date.now();
try {
  browser = await launch({ headless: true });
  for (const n of names) {
    console.log(`${PAGES[n].title} (${PAGES[n].path}), served from ${ROOT}`);
    await PAGES[n].run(browser, server);
  }
} catch (e) {
  failed++;
  console.log('  FAIL  ' + ((e && e.stack) || e));
} finally {
  if (browser) await Promise.race([browser.close(), sleep(2500)]);
  await Promise.race([server.close(), sleep(800)]);
}
console.log(`${names.length} page${names.length === 1 ? '' : 's'}: ${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(failed ? 1 : 0);
