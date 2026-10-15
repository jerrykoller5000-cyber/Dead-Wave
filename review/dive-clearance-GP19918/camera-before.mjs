// tools/camera.mjs: take any picture of the game, fast, from the command line (Jerry, 2026-10-09: "a tool for all the
// agents so they can zoom around and get what they need quickly"). The full guide is tools/CAMERA.md.
//
// Loading the game is the slow part (the world is built once, ~10 s on a real GPU, a minute in software), so the camera
// runs as a small server that keeps one game loaded, and each picture is one quick call to it:
//
//   node tools/camera.mjs start                      load the game once and keep it (on Windows: a real-GPU window, off
//                                                    screen); --show to watch it, --soft for headless software rendering,
//                                                    --match / --training to be in a match or the Training Ground
//   node tools/camera.mjs shot weapon:m4 --view side --out review/x/m4.png
//   node tools/camera.mjs shot place:hq --view three --time dusk
//   node tools/camera.mjs shot zombie:brute --yaw 30 --pitch 10 --size 1000x1000
//   node tools/camera.mjs move --orbit 45 --zoom 1.5          from the last picture: round, closer, and shoot again
//   node tools/camera.mjs move --pan 1,0.5 --tilt -10 --fwd 2
//   node tools/camera.mjs turnaround survivor:pike --n 8 --out review/x/pike/
//   node tools/camera.mjs batch shots.json                   many at once (a JSON array of shot objects, or a job)
//   node tools/camera.mjs job '{"target":"turrets","out":"review/x/","sheet":true}'   a job inline: groups, a sheet
//   node tools/camera.mjs targets [zombie|place|weapon|...]  what can be pointed at
//   node tools/camera.mjs eval "T.setWorldTime(0.5); return T.getPhase()"   anything else (T is window.TT)
//   node tools/camera.mjs shot --live --ui                  what the player sees, HUD and all (in a --match camera)
//   node tools/camera.mjs reload                             after an edit to the game: load it again, same browser
//   node tools/camera.mjs release | status | stop
//
// The inbox: with the camera running, any agent can drop a job file in review/camera/jobs/ (no shell needed): it is
// taken within a quarter of a second and answered with <name>.result.json beside it. review/camera/jobs/_camera.json
// says whether the camera is up. Idle, the page is frozen (no GPU, no CPU) and wakes for the next job.
//
// Without a running server, shot / move / turnaround / batch / targets / eval load the game for that one call and close
// it again (slow, but it works anywhere). Every picture gets a .json beside it with its exact camera: pass it back with
// `shot --from that.json` to take the same picture again after a change.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SESSION = path.join(os.tmpdir(), 'dead-wave-camera.json');
const LOG = path.join(os.tmpdir(), 'dead-wave-camera.log');
const DEFAULT_OUT = 'review/camera';
const INBOX = path.join(ROOT, 'review', 'camera', 'jobs');
const HEART = path.join(INBOX, '_camera.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- arguments ------------------------------------------------------------------------------------------------------
// `cmd target --key value --flag`: numbers become numbers, "a,b" lists, --flag true.
function parseArgs(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const key = a.slice(2), nxt = argv[i + 1];
    if (nxt == null || nxt.startsWith('--')) { o[key] = true; continue; }
    o[key] = nxt; i++;
  }
  return { pos, o };
}
const num = (v) => (v == null || v === true ? undefined : Number(v));
function sizeOf(s, dflt) {
  if (!s || s === true) return dflt;
  const m = String(s).match(/^(\d+)[x*,](\d+)$/i);
  if (!m) throw new Error('--size wants WxH, e.g. 1600x900');
  return [+m[1], +m[2]];
}
// A shot request from command-line options (everything optional but something to point at).
function shotReq(target, o) {
  const r = { target: target || o.target };
  for (const k of ['view', 'time', 'caption']) if (o[k] != null && o[k] !== true) r[k] = String(o[k]);
  for (const k of ['yaw', 'pitch', 'dist', 'fov', 'margin', 'height', 'lookY', 'settle', 'wait']) if (o[k] != null) r[k] = num(o[k]);
  if (o.ui) r.ui = true;
  if (o.perf) r.perf = true;
  if (o.live) r.live = true;
  if (o.cam) {
    const c = String(o.cam).split(',').map(Number), l = String(o.look || '0,0,0').split(',').map(Number);
    r.cam = { x: c[0], y: c[1], z: c[2], tx: l[0], ty: l[1], tz: l[2], fov: num(o.fov) || 35 };
  }
  const mv = {};
  for (const k of ['orbit', 'tilt', 'zoom', 'fwd']) if (o[k] != null) mv[k] = num(o[k]);
  if (o.pan) mv.pan = String(o.pan).split(',').map(Number);
  if (Object.keys(mv).length) r.move = mv;
  if (o.from) {
    const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, String(o.from)), 'utf8'));
    r.cam = j.cam; if (!r.target && j.target) r.target = j.target; if (j.time != null && r.time == null) r.time = String(j.time); if (j.size && !o.size) r.size = j.size;
  }
  if (o.size) r.size = sizeOf(o.size);
  if (o.out) r.out = String(o.out);
  return r;
}
const slug = (s) => String(s || 'shot').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'shot';

// --- the engine: one browser, one game, a queue of requests ---------------------------------------------------------
class Engine {
  constructor(opt = {}) {
    this.opt = opt;
    this.size = sizeOf(opt.size, [1600, 900]);
    this.queue = Promise.resolve();
    this.shots = 0;
  }
  async open() {
    const o = this.opt;
    this.server = await serve(ROOT, 0);
    // A real GPU needs a real window: --show puts it on screen, the default (on Windows and macOS) parks it off screen.
    // --soft (and Linux without a display) is headless software rendering: works anywhere, much slower.
    let headless = !!o.soft || (!o.show && process.platform === 'linux' && !process.env.DISPLAY);
    const args = headless ? [] : ['--disable-features=CalculateNativeWinOcclusion', '--window-size=' + this.size.join(',')];
    this.browser = await launch({ headless, args });
    this.page = await this.browser.newPage({ width: this.size[0], height: this.size[1] });
    if (!headless && !o.show) {
      try {
        const { windowId } = await this.page.send('Browser.getWindowForTarget', {});
        await this.page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
      } catch { /* a window manager that won't: it stays where it is */ }
    }
    this.headless = headless;
    await this.load();
    return this;
  }
  // (Re)load the game in the page: after an edit to the game, `reload` picks it up without a new browser.
  async load() {
    const t0 = Date.now(), o = this.opt, headless = this.headless;
    this.cur = null;
    const renderer = o.renderer || (headless ? 'webgl' : '');
    const url = `${this.server.origin}/review/dive-clearance-GP19918/index-before.html?debug=1&raf=timer${renderer ? '&renderer=' + renderer : ''}`;
    await this.page.goto(url, { timeout: 240000 });
    await this.page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await this.page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } return true; })()`);
      await sleep(300);
    }
    if (!(await this.page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('the game never finished loading: ' + (this.page.errors[0] || '(no page error)'));
    await this.page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await sleep(700);
    if (o.match) await this.ev(MATCH, 300000);
    if (o.training) await this.ev(TRAINING, 300000);
    await this.page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);
    this.renderer = await this.page.evaluate('CamRig.renderer()');
    this.mode = o.match ? 'match' : o.training ? 'training' : 'title';
    this.loadSec = (Date.now() - t0) / 1000;
    await this.warm();
  }
  // The first picture from the shelf in the sky paid ~14 s (2026-10-09: the world drawn from up there for the first
  // time, shaders compiled, the turret built). One throw-away picture at load pays it there instead. --warm a,b picks
  // the targets; --warm none skips it.
  async warm() {
    const w = this.opt.warm;
    const list = w === 'none' || w === false ? [] : String(w && w !== true ? w : 'build:light,build:light:2').split(',').filter(Boolean);
    const t0 = Date.now(), tmp = path.join(os.tmpdir(), 'dead-wave-camera-warm.png');
    for (const t of list) { try { await this.shoot({ target: t, out: tmp, noMeta: true }); } catch { /* a warm-up is best effort */ } }
    this.warmSec = (Date.now() - t0) / 1000;
  }
  ev(code, ms = 120000) { return this.page.evaluate(`(async () => { const T = window.TT, R = window.CamRig; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms); }
  run(req) {
    const p = this.queue.then(async () => { this.busy = true; try { if (req.cmd !== 'status') await this.wake(); return await this._run(req); } finally { this.busy = false; if (req.cmd !== 'status') this.lastRun = Date.now(); } });
    this.queue = p.catch(() => {});
    return p;
  }
  // Idle, the page is frozen (Page.setWebLifecycleState): no timers, no frames, so the GPU and CPU rest. A frozen page
  // runs no script, so every request but status wakes it first.
  // Queued like any request, so it can never land in the middle of one.
  freeze(idleMs = 20000) {
    const p = this.queue.then(async () => {
      if (this.frozen || this.opt.nofreeze || this.noFreeze || Date.now() - (this.lastRun || 0) < idleMs) return;
      try { await this.page.send('Page.setWebLifecycleState', { state: 'frozen' }, 5000); this.frozen = true; }
      catch (e) { this.noFreeze = String(e && e.message || e); }
    });
    this.queue = p.catch(() => {});
    return p;
  }
  async wake() {
    if (!this.frozen) return;
    try { await this.page.send('Page.setWebLifecycleState', { state: 'active' }, 5000); } catch { /* it was never frozen */ }
    this.frozen = false;
    await sleep(120);
  }
  async _run(req) {
    const t0 = Date.now();
    switch (req.cmd) {
      case 'status': return { ok: true, mode: this.mode, renderer: this.renderer, size: this.size, shots: this.shots, loadSec: this.loadSec, warmSec: this.warmSec, frozen: !!this.frozen, root: ROOT };
      case 'targets': return { ok: true, targets: await this.page.evaluate(`CamRig.targets(${JSON.stringify(req.filter || '')})`) };
      case 'eval': return { ok: true, value: await this.ev(req.code, req.timeout || 120000) };
      case 'release': await this.page.evaluate('CamRig.release()'); return { ok: true };
      case 'reload': await this.load(); return { ok: true, status: `camera: reloaded in ${this.loadSec.toFixed(1)} s (${this.mode})` };
      case 'shot': case 'move': return { ok: true, shots: [await this.shoot(req)], ms: Date.now() - t0 };
      case 'turnaround': {
        const n = Math.max(2, req.n || 8), out = [], y0 = req.yaw != null ? req.yaw : 0;
        for (let i = 0; i < n; i++) {
          const yaw = y0 + (360 / n) * i;
          out.push(await this.shoot({ ...req, yaw, pitch: req.pitch != null ? req.pitch : 12, out: path.join(req.out || path.join(DEFAULT_OUT, slug(req.target)), `${String(i).padStart(2, '0')}-yaw${Math.round(yaw)}.png`) }));
        }
        return { ok: true, shots: out, ms: Date.now() - t0 };
      }
      case 'batch': {
        const shots = await this.expand(req), out = [], thumbs = req.sheet ? [] : null;
        for (const s of shots) {
          const t1 = Date.now();
          const r = await this.shoot({ ...s, outDir: req.outDir, thumb: !!thumbs }).catch((e) => ({ error: String(e.message || e).split('\n')[0].replace(/^evaluate failed: (Error: )?/, ''), target: s.target }));
          r.ms = Date.now() - t1; r.caption = s.caption; r.row = s.row;
          if (thumbs) { thumbs.push({ data: r.thumb || null, label: s.caption || s.target, error: r.error || null, row: s.row }); delete r.thumb; }
          out.push(r);
        }
        let sheet = null;
        if (thumbs && thumbs.length) sheet = await this.sheet(thumbs, req, out).catch((e) => ({ error: String(e.message || e) }));
        return { ok: out.every((s) => !s.error), shots: out, sheet, ms: Date.now() - t0 };
      }
      default: throw new Error('unknown command ' + req.cmd);
    }
  }
  // Groups (turrets, build:light:*, zombie:*) become their targets, captioned with the game's own names.
  async expand(req) {
    const list = [];
    for (const s of req.shots) {
      if (!s.target || !(/\*/.test(s.target) || /^[a-z]+$/i.test(s.target) && s.target !== 'marine' && s.target !== 'player')) { list.push(s); continue; }
      const many = await this.page.evaluate(`CamRig.expand(${JSON.stringify(s.target)})`);
      for (const m of many) list.push({ ...s, target: m.target, caption: s.caption != null ? s.caption : (req.captions === false ? undefined : m.caption), row: m.row, out: s.out && many.length > 1 ? s.out.replace(/[^/\\]*$/, '') : s.out });
    }
    return list;
  }
  // One JPEG of every picture in the job, a tile each, labelled: the thing to look at first (one small file to fetch
  // instead of every PNG). Rows follow the groups (a turret's tiers side by side) unless the job sets cols.
  async sheet(thumbs, req, out) {
    const rows = [];
    if (req.cols) for (let i = 0; i < thumbs.length; i += +req.cols) rows.push(thumbs.slice(i, i + +req.cols));
    else for (const t of thumbs) { const last = rows[rows.length - 1]; if (last && last[0].row === t.row && t.row != null && last.length < 6) last.push(t); else rows.push([t]); }
    if (!req.cols && rows.every((r) => r.length === 1)) { const n = Math.ceil(Math.sqrt(thumbs.length)); rows.length = 0; for (let i = 0; i < thumbs.length; i += n) rows.push(thumbs.slice(i, i + n)); }
    const file = req.sheetFile || path.join(req.outDir || (out.find((s) => s.file) ? path.dirname(out.find((s) => s.file).file) : DEFAULT_OUT), 'sheet.jpg');
    const abs = path.isAbsolute(file) ? file : path.resolve(ROOT, file);
    const data = await this.page.evaluate(`(async (rows, tw) => {
      const load = (d) => new Promise((r) => { if (!d) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'data:image/jpeg;base64,' + d; });
      const imgs = await Promise.all(rows.flat().map((t) => load(t.data)));
      const first = imgs.find(Boolean), th = first ? Math.round(tw * first.height / first.width) : Math.round(tw * 9 / 16);
      const cols = Math.max(...rows.map((r) => r.length)), c = document.createElement('canvas');
      c.width = cols * tw; c.height = rows.length * th;
      const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      let k = 0;
      rows.forEach((row, y) => row.forEach((t, x) => {
        const im = imgs[k++], px = x * tw, py = y * th;
        if (im) g.drawImage(im, px, py, tw, th);
        g.fillStyle = '#000b'; g.fillRect(px, py + th - 26, tw, 26);
        g.fillStyle = t.error ? '#ff6b5b' : '#f4ecd0'; g.font = '600 15px Arial, sans-serif';
        g.fillText((t.error ? 'FAILED ' : '') + t.label + (t.error ? ': ' + t.error : ''), px + 8, py + th - 8, tw - 16);
        g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(px, py, tw, th);
      }));
      return c.toDataURL('image/jpeg', 0.86).split(',')[1];
    })(${JSON.stringify(rows)}, ${+req.tile || 480})`, 60000);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, Buffer.from(data, 'base64'));
    return path.relative(ROOT, abs).split(path.sep).join('/');
  }
  async shoot(req) {
    const size = req.size ? (Array.isArray(req.size) ? req.size : sizeOf(req.size)) : this.size;
    if (size[0] !== this.cur?.[0] || size[1] !== this.cur?.[1]) { await this.page.setViewport(size[0], size[1]); this.cur = size; await sleep(250); }
    if (req.wait) await sleep(req.wait);
    const aimReq = { ...req, aspect: size[0] / size[1] };
    if (req.cmd === 'move' && !req.move) throw new Error('move: say how (--orbit, --tilt, --zoom, --pan, --fwd)');
    const r = await this.page.evaluate(`CamRig.aim(${JSON.stringify(aimReq)})`, 120000);
    let file = req.out || path.join(req.outDir || DEFAULT_OUT, slug((req.target || (req.live ? 'live' : 'shot')) + (req.view ? '-' + req.view : '') + (req.cmd === 'move' ? '-' + (++this.shots) : '')) + '.png');
    if (file.endsWith('/') || file.endsWith('\\') || (fs.existsSync(path.resolve(ROOT, file)) && fs.statSync(path.resolve(ROOT, file)).isDirectory())) file = path.join(file, slug((req.target || 'shot') + '-' + (req.view || 'shot')) + '.png');
    if (!file.toLowerCase().endsWith('.png')) file += '.png';
    const abs = path.isAbsolute(file) ? file : path.resolve(ROOT, file);
    await this.page.screenshot(abs);
    let thumb = null;
    if (req.thumb) {   // a small JPEG of the same frame, for the sheet
      const res = await this.page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, captureBeyondViewport: false, clip: { x: 0, y: 0, width: size[0], height: size[1], scale: 480 / size[0] } });
      thumb = res.data;
    }
    if (req.noMeta) return { file: abs };
    const meta = { target: req.target || null, label: r.target, view: req.view || null, cam: r.cam, time: r.time, size, center: r.center, boxSize: r.size, mode: this.mode, renderer: this.renderer, at: new Date().toISOString() };
    fs.writeFileSync(abs.replace(/\.png$/i, '.json'), JSON.stringify(meta, null, 1));
    this.shots++;
    return { file: path.relative(ROOT, abs).split(path.sep).join('/'), cam: r.cam, label: r.target, thumb };
  }
  async close() { try { await this.browser.close(); } catch { /* gone */ } try { await this.server.close(); } catch { /* gone */ } }
}
// A match, as the tests start one (tools/tests/lib.js), and the Training Ground, as tools/zombiesheet.mjs enters it.
const MATCH = `const n = document.getElementById('playerName'); if (n) n.value = 'Camera';
  document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(400); return T.getPhase && T.getPhase();`;
const TRAINING = `const D = T.trainingDbg; document.getElementById('playerName').value = 'Camera'; document.getElementById('modeTraining').click();
  const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
  await wait(3000); return D.state().active;`;

// A job (an inbox file, `job '<json>'`, or a batch file) as a request. A job is a batch by default:
//   { "target": "turrets", "out": "review/x/", "sheet": true }          one target or group
//   { "shots": [ {target, view, ...}, ... ], "out": "...", "sheet": true, "cols": 3, "captions": false }
//   { "cmd": "shot" | "turnaround" | "eval" | "reload" | ..., ... }       any other command, as its request
function jobReq(job) {
  if (Array.isArray(job)) job = { shots: job };
  if (job.cmd && job.cmd !== 'batch') return { ...job, size: job.size ? sizeOf(job.size) : undefined };
  const fix = (s) => ({ ...s, size: s.size ? sizeOf(s.size) : undefined });
  const shots = job.shots ? job.shots.map(fix) : [fix({ ...job, out: undefined, sheet: undefined, cmd: undefined })];
  return { cmd: 'batch', shots, outDir: job.out ? String(job.out) : undefined, sheet: job.sheet !== false, cols: job.cols, captions: job.captions, tile: job.tile, sheetFile: job.sheetFile };
}

// The inbox: <dir>/<name>.json, taken within a quarter second, answered in <name>.result.json.
function inboxWatcher(eng, { dir = INBOX, onUse = () => {}, onDone = () => {}, every = 250 } = {}) {
  const st = { taking: false };
  async function inbox() {
    if (st.taking) return; st.taking = true;
    try {
      let names = []; try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.json') && !n.endsWith('.result.json') && !n.startsWith('_')); } catch { /* no folder yet */ }
      for (const n of names) {
        const f = path.join(dir, n), name = n.replace(/\.json$/, ''), resFile = path.join(dir, name + '.result.json');
        let job;
        try { job = JSON.parse(fs.readFileSync(f, 'utf8')); }
        catch (e) { try { if (Date.now() - fs.statSync(f).mtimeMs < 4000) continue; } catch { continue; } job = { bad: String(e.message || e) }; }   // a half-written file gets a moment
        try { fs.unlinkSync(f); } catch { continue; }   // someone else took it
        onUse();
        const t0 = Date.now();
        let out;
        try { if (job.bad) throw new Error('not JSON: ' + job.bad); out = await eng.run(jobReq(job)); }
        catch (e) { out = { ok: false, error: String(e && e.message || e) }; }
        out = { job: name, ...out, totalMs: Date.now() - t0, at: new Date().toISOString(), renderer: eng.renderer };
        fs.writeFileSync(resFile, JSON.stringify(out, null, 1));
        console.log(`camera: job ${name}: ${out.ok ? 'ok' : 'FAILED ' + (out.error || ((out.shots || []).filter((x) => x.error).length + ' picture(s)'))} in ${(out.totalMs / 1000).toFixed(1)} s`);
        onUse(); onDone(name);
      }
    } finally { st.taking = false; }
  }
  st.timer = setInterval(inbox, every);
  inbox();
  return st;
}

// --- the server ------------------------------------------------------------------------------------------------------
async function daemon(o) {
  const eng = await new Engine(o).open();
  const idleMin = num(o.idle) || 240;   // frozen while idle, so staying up costs next to nothing
  let lastUse = Date.now();
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', async () => {
      lastUse = Date.now();
      let out;
      try {
        const r = body ? JSON.parse(body) : { cmd: 'status' };
        if (r.cmd === 'stop') { out = { ok: true, stopped: true }; setTimeout(shutdown, 50); }
        else out = await eng.run(r);
      } catch (e) { out = { ok: false, error: String(e && e.message || e) }; }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  fs.writeFileSync(SESSION, JSON.stringify({ port, pid: process.pid, root: ROOT, mode: eng.mode, renderer: eng.renderer, size: eng.size, loadSec: eng.loadSec, started: new Date().toISOString() }, null, 1));
  console.log(`camera: ready on ${port} (${eng.mode}, ${eng.renderer}, loaded in ${eng.loadSec.toFixed(1)} s, warmed in ${(eng.warmSec || 0).toFixed(1)} s)`);
  const started = new Date().toISOString();
  // The heartbeat: an agent without a shell reads this file to see whether the camera is up (alive within 15 s).
  const beat = (extra = {}) => { try { fs.mkdirSync(INBOX, { recursive: true }); fs.writeFileSync(HEART, JSON.stringify({ up: true, pid: process.pid, port, root: ROOT, mode: eng.mode, renderer: eng.renderer, size: eng.size, loadSec: eng.loadSec, warmSec: eng.warmSec, shots: eng.shots, frozen: !!eng.frozen, idleMin, started, alive: new Date().toISOString(), ...extra }, null, 1)); } catch { /* best effort */ } };
  beat();
  setInterval(() => beat(), 10000).unref();
  const box = inboxWatcher(eng, { onUse: () => { lastUse = Date.now(); }, onDone: (name) => beat({ lastJob: name }) });
  const taking = () => box.taking;
  // Freeze the page after 20 idle seconds.
  setInterval(() => { if (!eng.frozen && !eng.busy && !taking() && Date.now() - lastUse > 20000) eng.freeze().then(() => beat({ freezeError: eng.noFreeze || undefined })); }, 5000).unref();
  async function shutdown() {
    try { const s = JSON.parse(fs.readFileSync(SESSION, 'utf8')); if (s.pid === process.pid) fs.unlinkSync(SESSION); } catch { /* gone */ }
    try { fs.writeFileSync(HEART, JSON.stringify({ up: false, stopped: new Date().toISOString() }, null, 1)); } catch { /* gone */ }
    srv.close(); await eng.close(); process.exit(0);
  }
  setInterval(() => { if (Date.now() - lastUse > idleMin * 60000) { console.log('camera: idle, closing'); shutdown(); } }, 30000).unref();
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

// --- the client ------------------------------------------------------------------------------------------------------
async function session() {
  let s; try { s = JSON.parse(fs.readFileSync(SESSION, 'utf8')); } catch { return null; }
  if (path.resolve(s.root) !== ROOT) return null;   // another checkout's camera
  try { const r = await post(s.port, { cmd: 'status' }, 4000); return r && r.ok ? { ...s, ...r } : null; } catch { return null; }
}
function post(port, body, timeout = 600000) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/', headers: { 'content-type': 'application/json' }, timeout }, (res) => {
      let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(new Error('camera: no answer in ' + timeout / 1000 + ' s')); });
    req.end(JSON.stringify(body));
  });
}
function report(r) {
  if (!r.ok && r.error) { console.error('camera: ' + r.error); process.exitCode = 1; }
  if (r.shots) for (const s of r.shots) console.log(s.error ? `FAILED ${s.target}: ${s.error}` : `${s.file}   ${s.label || ''}   cam ${['x', 'y', 'z'].map((k) => s.cam[k].toFixed(2)).join(',')} -> ${['tx', 'ty', 'tz'].map((k) => s.cam[k].toFixed(2)).join(',')} fov ${s.cam.fov}`);
  if (r.sheet) console.log(typeof r.sheet === 'string' ? 'sheet: ' + r.sheet : 'sheet FAILED: ' + r.sheet.error);
  if (r.targets) console.log(r.targets.join('\n'));
  if ('value' in r) console.log(typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 1));
  if (r.ms != null) console.log(`(${(r.ms / 1000).toFixed(1)} s)`);
  if (r.status) console.log(r.status);
}

// Run as a command (not when a test imports Engine and jobReq).
export { Engine, jobReq, inboxWatcher };
const IS_MAIN = !!process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (IS_MAIN) {
const { pos, o } = parseArgs(process.argv.slice(2));
const cmd = pos[0] || 'help';
if (cmd === 'help' || o.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^\/\/ ?/gm, ''));
  process.exit(0);
}
if (cmd === 'daemon') { await daemon(o); }
else if (cmd === 'start') {
  const s = await session();
  // A camera started before the last edit to the camera's own code is stale: replace it.
  const newest = Math.max(...['camera.mjs', 'camera-rig.js', 'cdp.mjs'].map((f) => { try { return fs.statSync(path.join(ROOT, 'tools', f)).mtimeMs; } catch { return 0; } }));
  if (s && (o.fresh || newest > Date.parse(s.started || 0))) { await post(s.port, { cmd: 'stop' }).catch(() => {}); await sleep(1500); console.log('camera: restarting (its code changed, or --fresh)'); }
  else if (s) { console.log(`camera: already running on ${s.port} (${s.mode}, ${s.renderer}); 'stop' first to change mode`); process.exit(0); }
  const fd = fs.openSync(LOG, 'w');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'daemon', ...process.argv.slice(3)], { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd], windowsHide: true, env: process.env });
  child.unref();
  const t0 = Date.now();
  process.stdout.write('camera: loading the game');
  for (;;) {
    await sleep(1000); process.stdout.write('.');
    const s2 = await session();
    if (s2) { console.log(`\ncamera: ready in ${((Date.now() - t0) / 1000).toFixed(0)} s on port ${s2.port}: ${s2.mode}, ${s2.renderer}, ${s2.size.join('x')}`); if (/swiftshader|llvmpipe|software/i.test(s2.renderer)) console.log('camera: (software rendering: each picture takes seconds; a real GPU needs a window, so drop --soft on a desktop)'); break; }
    let log = ''; try { log = fs.readFileSync(LOG, 'utf8'); } catch { /* not yet */ }
    if (/Error|error:/.test(log) && !/camera: ready/.test(log)) { console.error('\ncamera: failed to start:\n' + log.slice(-1500)); process.exit(1); }
    if (Date.now() - t0 > 600000) { console.error('\ncamera: not ready after 10 minutes; see ' + LOG); process.exit(1); }
  }
}
else if (cmd === 'stop') { const s = await session(); if (!s) console.log('camera: not running'); else { await post(s.port, { cmd: 'stop' }); console.log('camera: stopped'); } }
else if (cmd === 'status') { const s = await session(); console.log(s ? `camera: running on ${s.port}, ${s.mode}, ${s.renderer}, ${s.size.join('x')}, ${s.shots} pictures, ${s.frozen ? 'frozen (idle)' : 'awake'}, up since ${s.started}` : 'camera: not running (node tools/camera.mjs start)'); }
else {
  let req;
  if (cmd === 'shot' || cmd === 'move') req = { cmd, ...shotReq(cmd === 'move' ? null : pos[1], o) };
  else if (cmd === 'turnaround') req = { cmd, ...shotReq(pos[1], o), n: num(o.n) || 8 };
  else if (cmd === 'batch' || cmd === 'job') {
    const src = cmd === 'job' && /^\s*[[{]/.test(pos[1] || '') ? pos[1] : fs.readFileSync(path.resolve(ROOT, pos[1]), 'utf8');
    const list = JSON.parse(src);
    req = jobReq(list);
    if (cmd === 'batch' && Array.isArray(list) && !o.sheet) req.sheet = false;   // a plain list keeps its old behaviour
    if (o.out) req.outDir = String(o.out);
    if (o.sheet) req.sheet = true;
  }
  else if (cmd === 'targets') req = { cmd, filter: pos[1] || '' };
  else if (cmd === 'eval') req = { cmd, code: /\breturn\b/.test(pos[1] || '') ? pos[1] : 'return (' + (pos[1] || 'null') + ')' };
  else if (cmd === 'release' || cmd === 'reload') req = { cmd };
  else { console.error('camera: unknown command ' + cmd + ' (node tools/camera.mjs help)'); process.exit(2); }
  const s = await session();
  if (s) report(await post(s.port, req));
  else {
    if (cmd === 'move' || cmd === 'release' || cmd === 'reload') { console.error('camera: not running; move and release need `node tools/camera.mjs start` first'); process.exit(1); }
    console.error('camera: no camera running, loading the game for this one call (`node tools/camera.mjs start` keeps it loaded)');
    const eng = await new Engine(o).open();
    try { report(await eng.run(req)); } catch (e) { console.error('camera: ' + (e.message || e)); process.exitCode = 1; }
    await eng.close();
    process.exit(process.exitCode || 0);
  }
}
}
