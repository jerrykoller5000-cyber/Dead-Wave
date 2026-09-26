// studio/notes-endpoint.mjs — the studio's one way to write through the server (D-42; contract 5 of the
// second round). Claude's. tools/serve.mjs hands it every POST under /__studio/. It writes in two places
// and nowhere else: a review folder, review/<asset>/ (docs/studio.md §5), and studio/scenes/lab-<name>.json.
//
//   POST /__studio/note   { asset, text, context?, snapshot?, meta? }
//        A note from Jerry, "## <date> · Jerry · <version> · lab", at the top of review/<asset>/notes.md.
//        A folder that has no meta.json yet needs meta ({ kind: 'motion' | 'model', owner?, version?, ... }):
//        it is made with meta.json from meta, latest.txt "v<meta.version or 1>" and the notes.md stub.
//        snapshot: 'data:image/png;base64,...' (up to 3 MB), saved as review/<asset>/<latest>/lab-<utc time>.png
//        and named in the note. → { ok, asset, file, owner, version, picture? }
//   POST /__studio/note   { preset: "zombie/shambler", text, context? }
//        The lab's first form: the asset is motion-<rig>-<name>, its meta read from the preset file.
//   POST /__studio/scene  { name, json }
//        → studio/scenes/lab-<name>.json, a scene an agent renders with node tools/studio.mjs scene.
//   POST /__studio/ping   → { ok, routes, limits }: a page asks whether it can save before it tries.
//
// Everything a page sends is checked here, because the server is on Jerry's PC: names are a short
// alphabet (no dots, no slashes, no Windows device names), bodies are capped before they're read, and
// every path is checked to land inside its folder after links are followed. Bad input gets a 4xx
// with a sentence saying what is wrong.
import fs from 'node:fs';
import path from 'node:path';
import { notesStub } from '../crew/notes.mjs';

export const ASSET = /^[a-z0-9][a-z0-9-]{1,63}$/;
export const SCENE_NAME = /^[a-z0-9-]{1,40}$/;
export const SCENE_FORMAT = 'dw-scene/1';
export const KINDS = ['motion', 'model'];
export const AGENTS = ['claude', 'cursor', 'chatgpt', 'grokbot', 'antigravity'];
const PRESET = /^[a-z0-9]+\/[a-z0-9-]+$/;
const VERSION = /^v([1-9]\d{0,3})$/;
// Windows won't make a folder with these names (or these names with an extension, but a name here
// has no dot).
const WINDOWS_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)$/;
const PNG = 'data:image/png;base64,';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MB = 1024 * 1024;
export const LIMITS = {
  snapshot: 3 * MB,            // characters of the data URL
  text: 8000,                  // characters of a note
  context: 2000,               // characters of what the page says was going on
  meta: 16 * 1024,             // characters of meta as JSON
  note: 3 * MB + 64 * 1024,    // the whole request
  scene: 1 * MB,
  ping: 4 * 1024
};

class Refusal extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refuse = (code, message) => { throw new Refusal(code, message); };

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store' });
  res.end(data);
}

// Reads a request body up to `cap` bytes. A body that says it is bigger is refused before it's read; one
// that grows past the cap is drained without being kept (so the reply still reaches the page), and cut
// off if it keeps going long after.
function readBody(req, cap) {
  return new Promise((resolve) => {
    const said = Number(req.headers['content-length']);
    let size = 0, over = Number.isFinite(said) && said > cap;
    const parts = [];
    req.on('data', (d) => {
      size += d.length;
      if (size > cap) over = true;
      if (!over) parts.push(d);
      else if (size > cap * 4) req.destroy();
    });
    req.on('end', () => resolve(over ? null : Buffer.concat(parts).toString('utf8')));
    req.on('error', () => resolve(null));
    req.on('close', () => resolve(null));
  });
}

// A path under `dir`, after links are followed: never outside it, however the name is spelled.
function inside(dir, target) {
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const rel = path.relative(real(dir), real(target));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const today = (d = new Date()) => d.toISOString().slice(0, 10);
const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);   // 20260926-142233
const str = (v) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));

function checkAsset(asset) {
  if (typeof asset !== 'string' || !ASSET.test(asset)) refuse(400, `"asset" is the review folder's name: 2 to 64 of a-z, 0-9 and "-", starting with a letter or digit (got ${JSON.stringify(asset)})`);
  if (WINDOWS_NAMES.test(asset)) refuse(400, `"asset" "${asset}" is a name Windows keeps for itself: pick another`);
}

function checkMeta(meta, asset) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) refuse(400, `review/${asset} is new, so the note needs "meta": { "kind": "motion" or "model", "owner": "<agent>", ... } to make it`);
  if (!KINDS.includes(meta.kind)) refuse(400, `meta.kind is "motion" or "model" (got ${JSON.stringify(meta.kind)})`);
  if (meta.owner !== undefined && !AGENTS.includes(meta.owner)) refuse(400, `meta.owner is the agent who answers the notes: ${AGENTS.join(', ')} (got ${JSON.stringify(meta.owner)})`);
  if (meta.version !== undefined && !(Number.isInteger(meta.version) && meta.version >= 1 && meta.version <= 9999)) refuse(400, `meta.version is a whole number from 1: the version Jerry is looking at (got ${JSON.stringify(meta.version)})`);
  if (JSON.stringify(meta).length > LIMITS.meta) refuse(413, `meta is over ${LIMITS.meta} characters`);
}

// Jerry's words, kept as he wrote them, but unable to start a heading or an answer, or to open a comment
// that would hide every note under it.
function cleanText(text) {
  return text.replace(/\r\n?/g, '\n').replace(/<!--|-->/g, '').replace(/^[ \t#>]+/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeSnapshot(snap) {
  if (typeof snap !== 'string' || !snap.startsWith(PNG)) refuse(400, `"snapshot" is a PNG as a data URL ("${PNG}...")`);
  if (snap.length > LIMITS.snapshot) refuse(413, `"snapshot" is over ${LIMITS.snapshot / MB} MB: send a smaller picture`);
  const b64 = snap.slice(PNG.length);
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 === 1) refuse(400, '"snapshot" is not base64');
  const png = Buffer.from(b64, 'base64');
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) refuse(400, '"snapshot" is not a PNG picture');
  return png;
}

// The lab's first form: { preset: "rig/name" } names the asset, and the preset file says the rest.
function fromPreset(j, base) {
  const ref = str(j.preset);
  if (!PRESET.test(ref)) refuse(400, '"preset" is "rig/name", e.g. "zombie/shambler"');
  let preset;
  try { preset = JSON.parse(fs.readFileSync(path.join(base, 'studio', 'motion', ...ref.split('/')) + '.json', 'utf8')); } catch { refuse(404, `no preset ${ref} (studio/motion/${ref}.json)`); }
  const version = Number.isInteger(preset.version) && preset.version >= 1 ? preset.version : 1;
  return {
    ...j,
    asset: 'motion-' + ref.replace('/', '-'),
    meta: {
      kind: 'motion', owner: AGENTS.includes(preset.owner) ? preset.owner : 'grokbot', rig: preset.rig, motion: ref,
      file: `studio/motion/${ref}.json`, task: 'D-42', look: 'studio/motion-lab.html?preset=' + ref, version
    }
  };
}

function note(j, base) {
  if (j.asset === undefined && j.preset !== undefined) j = fromPreset(j, base);
  checkAsset(j.asset);
  const asset = j.asset;
  if (typeof j.text !== 'string' || !j.text.trim()) refuse(400, '"text" is the note, and it is empty');
  if (j.text.length > LIMITS.text) refuse(413, `the note is over ${LIMITS.text} characters`);
  const text = cleanText(j.text);
  if (!text) refuse(400, '"text" has nothing left once headings and comment marks are taken out');
  if (j.context !== undefined && typeof j.context !== 'string') refuse(400, '"context" is a line of text: what the page was showing');
  if (str(j.context).length > LIMITS.context) refuse(413, `"context" is over ${LIMITS.context} characters`);
  const context = cleanText(str(j.context)).replace(/\s*\n\s*/g, ' ');
  const png = j.snapshot === undefined || j.snapshot === null || j.snapshot === '' ? null : decodeSnapshot(j.snapshot);
  if (j.meta !== undefined && j.meta !== null) checkMeta(j.meta, asset);

  const review = path.join(base, 'review');
  const dir = path.join(review, asset);
  fs.mkdirSync(review, { recursive: true });
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) refuse(409, `review/${asset} is a file, not a folder`);
  if (fs.existsSync(dir) && !inside(review, dir)) refuse(403, `review/${asset} leads outside review/`);
  const metaFile = path.join(dir, 'meta.json');
  let meta, created = false;
  if (fs.existsSync(metaFile)) {
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { refuse(500, `review/${asset}/meta.json is not JSON: fix it by hand`); }
  } else {
    checkMeta(j.meta, asset);
    // The folder's name is the asset's, whatever meta says; a motion preset's owner is grokbot unless
    // it names one (as in the presets), anything else the studio's (claude).
    meta = { asset, ...j.meta };
    meta.asset = asset;
    meta.owner ||= j.meta.kind === 'motion' ? 'grokbot' : 'claude';
    created = true;
  }
  // The version: latest.txt's. A note on a newer version than latest.txt says (the owner bumped the
  // preset and not the folder) moves latest.txt up to it, so the heading and the picture agree.
  const latestFile = path.join(dir, 'latest.txt');
  let latest = null;
  if (fs.existsSync(latestFile)) {
    const said = fs.readFileSync(latestFile, 'utf8').trim();
    if (!VERSION.test(said)) refuse(409, `review/${asset}/latest.txt says ${JSON.stringify(said.slice(0, 40))}, not a version like v2: fix it by hand`);
    latest = said;
  }
  const seen = j.meta && Number.isInteger(j.meta.version) ? j.meta.version : null;
  const num = (v) => +VERSION.exec(v)[1];
  let version = latest || 'v' + (seen || (Number.isInteger(meta.version) && meta.version >= 1 && meta.version <= 9999 ? meta.version : 1));
  if (seen && num(version) < seen) version = 'v' + seen;

  fs.mkdirSync(dir, { recursive: true });
  if (!inside(review, dir)) refuse(403, `review/${asset} leads outside review/`);
  if (created) fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  if (version !== latest) fs.writeFileSync(latestFile, version + '\n');
  let picture = null;
  if (png) {
    const vdir = path.join(dir, version);
    fs.mkdirSync(vdir, { recursive: true });
    if (!inside(review, vdir)) refuse(403, `review/${asset}/${version} leads outside review/`);
    const at = stamp();
    let name = `lab-${at}.png`;
    for (let k = 2; fs.existsSync(path.join(vdir, name)); k++) name = `lab-${at}-${k}.png`;
    fs.writeFileSync(path.join(vdir, name), png);
    picture = `${version}/${name}`;
  }
  const notesFile = path.join(dir, 'notes.md');
  if (!fs.existsSync(notesFile)) fs.writeFileSync(notesFile, notesStub(asset, version, today()));
  const entry = `## ${today()} · Jerry · ${version} · lab\n${text}\n` +
    (context ? `(In the lab: ${context})\n` : '') +
    (picture ? `![What the lab showed](${picture})\n` : '');
  // Newest at the top: before the first note already there, or after the stub's comment if there's
  // none yet. The stub's own example heading is inside its comment, so comments are blanked out
  // (keeping their line breaks) before looking for the first real heading.
  const cur = fs.readFileSync(notesFile, 'utf8');
  const masked = cur.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const head = masked.search(/^## /m), close = cur.lastIndexOf('-->');
  let at;
  if (head >= 0) at = head;
  else if (close >= 0) at = close + 3;
  else at = cur.indexOf('\n') >= 0 ? cur.indexOf('\n') + 1 : cur.length;
  const before = cur.slice(0, at).replace(/\s*$/, ''), after = cur.slice(at).replace(/^\s*/, '');
  fs.writeFileSync(notesFile, before + '\n\n' + entry + (after ? '\n' + after : ''));
  const out = { ok: true, asset, file: `review/${asset}/notes.md`, owner: meta.owner || 'claude', version, created };
  if (picture) out.picture = `review/${asset}/${picture}`;
  return out;
}

function scene(j, base) {
  if (typeof j.name !== 'string' || !SCENE_NAME.test(j.name)) refuse(400, `"name" is 1 to 40 of a-z, 0-9 and "-"; the file is studio/scenes/lab-<name>.json (got ${JSON.stringify(j.name)})`);
  const json = j.json;
  if (!json || typeof json !== 'object' || Array.isArray(json)) refuse(400, '"json" is the scene itself, an object');
  if (json.format !== SCENE_FORMAT) refuse(400, `json.format must be "${SCENE_FORMAT}" (got ${JSON.stringify(json.format)})`);
  if (!json.actors || typeof json.actors !== 'object' || Array.isArray(json.actors) || !Object.keys(json.actors).length) refuse(400, 'json.actors names at least one body');
  const name = 'lab-' + j.name;
  // The scene's name is its file's, as for every scene: the renderer names its review folder after it.
  const out = { ...json, name };
  const dir = path.join(base, 'studio', 'scenes');
  fs.mkdirSync(dir, { recursive: true });
  if (!inside(base, dir)) refuse(403, 'studio/scenes leads outside the game folder');
  const file = path.join(dir, name + '.json');
  if (fs.existsSync(file) && !inside(dir, file)) refuse(403, `studio/scenes/${name}.json leads outside studio/scenes`);
  const replaced = fs.existsSync(file);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const rel = `studio/scenes/${name}.json`;
  return { ok: true, name, file: rel, replaced, render: `node tools/studio.mjs scene ${rel}` };
}

const ROUTES = new Map([
  ['note', { cap: LIMITS.note, run: note }],
  ['scene', { cap: LIMITS.scene, run: scene }],
  ['ping', { cap: LIMITS.ping, run: () => ({ ok: true, routes: [...ROUTES.keys()], limits: LIMITS }) }]
]);

// Every POST under /__studio/ (tools/serve.mjs). `pathname` is the decoded path; without it, the request's.
export function handleStudio(req, res, base, pathname) {
  let p = pathname;
  if (typeof p !== 'string') { try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { p = ''; } }
  const name = p.startsWith('/__studio/') ? p.slice('/__studio/'.length) : '';
  const route = ROUTES.get(name);
  if (!route) {
    req.resume();
    send(res, 404, { ok: false, error: `no studio route ${JSON.stringify(p)}: POST /__studio/${[...ROUTES.keys()].join(', /__studio/')}` });
    return;
  }
  readBody(req, route.cap).then((body) => {
    if (res.headersSent) return;
    if (body === null) return send(res, 413, { ok: false, error: `the request is over ${Math.round(route.cap / 1024)} KB` });
    let j;
    try { j = JSON.parse(body); } catch { return send(res, 400, { ok: false, error: 'the request is not JSON' }); }
    if (!j || typeof j !== 'object' || Array.isArray(j)) return send(res, 400, { ok: false, error: 'the request is a JSON object' });
    try {
      send(res, 200, route.run(j, path.resolve(base)));
    } catch (e) {
      if (e instanceof Refusal) send(res, e.code, { ok: false, error: e.message });
      else send(res, 500, { ok: false, error: 'the studio could not write it: ' + String(e && e.message || e) });
    }
  });
}

// tools/serve.mjs imports it by its first name.
export const handleStudioNote = handleStudio;
