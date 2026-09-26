// studio/render-sheet.mjs — a model's contact sheet, into its review folder for Jerry to note and for
// agents to look at (docs/studio.md §12). Claude's (studio/*).
//
//   node studio/render-sheet.mjs creature/spider                  the next version: review/model-spider/vN/
//   node studio/render-sheet.mjs creature/spider --asset spider-6  into review/spider-6/ instead
//   node studio/render-sheet.mjs --all                            every model; unchanged ones are skipped
//   node studio/render-sheet.mjs studio/models/prop/new.json --out look.png
//                                                                 just the picture, no review folder (a draft
//                                                                 with no --out goes to Claude outputs/models/)
//   node studio/render-sheet.mjs --look "model=creature/spider&light=nvg&cam=0.7,0.35,6" --out look.png
//                                                                 one picture of the model lab set up by that
//                                                                 address: the "look:" in a note's context
//   --clip rig/clip   the strip under the sheet plays this clip (default: the model's first)
//   --redraw          draw the latest version's sheet again (after the sheet itself changed), only while
//                     Jerry has no note on that version
//   --force           a new version even though nothing changed, or though the file didn't bump "version"
//
// A version is the model file's "version": change the file, bump it, render, and the folder gets vN with
// sheet.png, stats.json (draws, triangles, budget, bounds, and more) and model.json (the file as it
// was), and the folder's meta.json, latest.txt, notes.md (a stub) and index.html (the latest sheet beside
// the one before, and what changed). An unchanged file makes no new version. Headless Chrome draws the
// sheet (studio/model-lab.html?sheet=1, tools/cdp.mjs; CHROME and CHROME_ARGS as for the tests), from
// the repo served by tools/serve.mjs. It loads the studio and three.js only, never the game.
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';
import { notesStub, parseNotes } from '../crew/notes.mjs';

register(new URL('./node-three-hook.mjs', import.meta.url));
const { validateModel } = await import('./model.js');
const { models } = await import('./models/index.js');
const { modelDiff, ASSET_NAME, sizeText } = await import('./model-look.js');
export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

// "kind/name" or a .json file: { ref, json, file (repo-relative, forward slashes), listed, bytes }.
export function resolveModel(arg, root = ROOT) {
  if (arg.endsWith('.json')) {
    const abs = path.resolve(arg);
    const bytes = fs.readFileSync(abs);
    const json = JSON.parse(bytes.toString('utf8'));
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (rel.startsWith('..')) throw new Error(`${arg}: the model file must be inside the game folder, so the lab page can load it`);
    const ref = `${json.kind}/${json.name}`;
    const listed = models.json(ref) !== null && path.resolve(root, 'studio/models', ref + '.json') === abs;
    return { ref, json, file: rel, listed, bytes };
  }
  const json = models.json(arg);
  if (!json) throw new Error(`no model "${arg}" in studio/models/index.js (${models.names().join(', ')}); give a path to a .json file for a draft`);
  const file = `studio/models/${arg}.json`;
  return { ref: arg, json, file, listed: true, bytes: fs.readFileSync(path.join(root, file)) };
}

const vnum = (v) => (v && /^v\d+$/.test(v) ? +v.slice(1) : 0);
export function versionsIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => /^v\d+$/.test(n) && fs.statSync(path.join(dir, n)).isDirectory()).sort((a, b) => vnum(a) - vnum(b));
}
const readLatest = (dir) => {
  const f = path.join(dir, 'latest.txt');
  const t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '';
  return /^v\d+$/.test(t) ? t : null;
};
// Whether Jerry has written a note on a version (then its sheet stays as he saw it).
export function notesOn(dir, version) {
  const f = path.join(dir, 'notes.md');
  return fs.existsSync(f) && parseNotes(fs.readFileSync(f, 'utf8')).some((n) => n.version === version);
}

// What a render does to a review folder, given the model file as it is now:
//   { action: 'new', version }      a new version folder (the first, or the file changed and says a higher version)
//   { action: 'fill', version }     the latest version's folder has no sheet yet (a note from the lab made it)
//   { action: 'redraw', version }   --redraw: the same file, the latest sheet drawn again
//   { action: 'skip', version, why }    nothing changed
//   { action: 'refuse', version, why }  the file changed but still says the version it was: bump it
export function planVersion(dir, bytes, json, { force = false, redraw = false } = {}) {
  const fileV = Number.isInteger(json.version) && json.version >= 1 ? json.version : 1;
  const latest = readLatest(dir), n = vnum(latest);
  if (!latest) return { action: 'new', version: 'v' + fileV };
  const had = path.join(dir, latest, 'model.json'), sheet = path.join(dir, latest, 'sheet.png');
  if (!fs.existsSync(had) || !fs.existsSync(sheet)) {
    return fileV > n ? { action: 'new', version: 'v' + fileV } : { action: 'fill', version: latest };
  }
  const same = fs.readFileSync(had).equals(bytes);
  if (same && redraw) {
    if (notesOn(dir, latest) && !force) return { action: 'refuse', version: latest, why: `Jerry has a note on ${latest}, so its sheet stays as he saw it (--force to redraw it anyway)` };
    return { action: 'redraw', version: latest };
  }
  if (same) return force ? { action: 'new', version: 'v' + (n + 1) } : { action: 'skip', version: latest, why: `unchanged since ${latest}` };
  if (redraw && !force) return { action: 'refuse', version: latest, why: `the file changed since ${latest}: that's a new version, not a redraw` };
  if (fileV > n) return { action: 'new', version: 'v' + fileV };
  if (force) return { action: 'new', version: 'v' + (n + 1) };
  return { action: 'refuse', version: latest, why: `the file changed since ${latest} but still says "version": ${fileV}. Bump it to ${n + 1}, so the lab, the sheet and Jerry's note all say the same version (or --force)` };
}

// --- Drawing it -------------------------------------------------------------------------------------------------
// Opens the lab page in headless Chrome and saves what it draws. `query` is the lab's address after "?".
export async function shoot(query, file, { root = ROOT, timeout = 180000 } = {}) {
  const server = await serve(root, 0);
  const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage({ width: 1600, height: 1000 });
    await page.goto(`${server.origin}/studio/model-lab.html?${query}`, { waitUntil: 'none' });
    // Ready, or an error on the page: a sheet that throws says why at once instead of at the timeout.
    const t0 = Date.now();
    let ok = false;
    while (!ok && Date.now() - t0 < timeout) {
      try { ok = await page.evaluate('window.__ready === true'); } catch { /* the page is still loading */ }
      if (!ok && page.errors.some((e) => !/favicon/i.test(e))) break;
      if (!ok) await new Promise((r) => setTimeout(r, 200));
    }
    const errors = page.errors.filter((e) => !/favicon/i.test(e));
    if (!ok) throw new Error('the model lab did not finish: ' + (errors[0] || `nothing after ${timeout / 1000} s`).split('\n')[0]);
    const url = await page.evaluate('window.__png()', timeout);
    if (typeof url !== 'string' || !url.startsWith('data:image/png;base64,')) throw new Error('the model lab gave no picture');
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, Buffer.from(url.slice(22), 'base64'));
    const stats = await page.evaluate('window.__stats');
    return { stats, errors };
  } finally {
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2500))]);
    await Promise.race([server.close(), new Promise((r) => setTimeout(r, 800))]);
  }
}

// --- The review folder's page -----------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
// review/<asset>/index.html: the latest sheet beside the one before, what changed between them, and
// Jerry's notes so far with their pictures. Plain HTML, no script, so it opens from the disk.
export function writeReviewPage(dir, asset) {
  const versions = versionsIn(dir).filter((v) => fs.existsSync(path.join(dir, v, 'sheet.png')));
  const latest = readLatest(dir) || versions[versions.length - 1] || 'v1';
  const meta = readJson(path.join(dir, 'meta.json')) || {};
  const shown = versions.filter((v) => vnum(v) <= vnum(latest)).slice(-2).reverse();
  const col = (v, i) => {
    const s = readJson(path.join(dir, v, 'stats.json')) || {};
    const cost = s.budget ? `${s.draws} of ${s.budget.draws} draws · ${s.triangles} of ${s.budget.triangles} triangles${s.over ? ' · <b class="bad">over budget</b>' : ''}` : '';
    return `<section><h2>${esc(v)} <span class="sub">${i === 0 ? 'latest' : 'the one before'}</span></h2>
<p class="sub">${cost}${s.bounds ? ' · ' + esc(sizeText(s.bounds)) : ''}</p>
<a href="${esc(v)}/sheet.png"><img src="${esc(v)}/sheet.png" alt="${esc(asset)} ${esc(v)}"></a></section>`;
  };
  let changes = '';
  if (shown.length === 2) {
    const a = readJson(path.join(dir, shown[1], 'model.json')), b = readJson(path.join(dir, shown[0], 'model.json'));
    const d = a && b ? modelDiff(a, b) : [];
    changes = `<h2>What changed from ${esc(shown[1])} to ${esc(shown[0])}</h2>${d.length ? '<ul>' + d.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p class="sub">Nothing in the model file: the sheet was drawn again.</p>'}`;
  }
  const notesFile = path.join(dir, 'notes.md');
  const md = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '') : '';
  const states = parseNotes(md);
  const sections = [];
  let cur = null;
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (/^## /.test(t)) { cur = /\bv\d+\b/i.test(t) ? { head: t.slice(3), lines: [] } : null; if (cur) sections.push(cur); continue; }
    if (cur && t) cur.lines.push(t);
  }
  const notes = sections.map((s, i) => `<div class="note"><h3>${esc(s.head)} <span class="sub">${esc(states[i] ? states[i].state : '')}</span></h3>${s.lines.map((l) => {
    const img = /^!\[([^\]]*)\]\((v\d+\/[\w.-]+\.png)\)$/.exec(l);
    if (img) return `<img class="lab" src="${esc(img[2])}" alt="${esc(img[1])}">`;
    if (l.startsWith('>')) return `<blockquote>${esc(l.replace(/^>\s*/, ''))}</blockquote>`;
    return `<p>${esc(l)}</p>`;
  }).join('')}</div>`).join('\n');
  const lab = meta.look || `studio/model-lab.html?model=${meta.ref || ''}`;
  const html = `<!doctype html><meta charset="utf-8"><title>${esc(asset)} ${esc(latest)}</title>
<!-- written by studio/render-sheet.mjs, again with each version -->
<style>body{margin:20px;background:#14181f;color:#e6e6e0;font-family:Georgia,serif} h1{font-size:56px;margin:0}
.sub{color:#9aa3b2;font-size:14px;font-weight:normal} .bad{color:#ff7a6a} a{color:#e0b85a}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(520px,1fr));gap:18px;align-items:start}
.pair img{width:100%;display:block;border:1px solid #333b4a} h2{font-weight:normal;margin:18px 0 4px}
.note{border-top:1px solid #333b4a;padding:6px 0} .note h3{font-weight:normal;font-size:17px;margin:6px 0}
img.lab{max-width:640px;width:100%;display:block;margin:6px 0;border:1px solid #333b4a}
blockquote{margin:6px 0;padding:4px 12px;border-left:3px solid #7cdea0} code{font-size:13px}</style>
<h1>${esc(latest)}</h1>
<p class="sub">${esc(asset)} · ${esc(meta.ref || '')} · owner ${esc(meta.owner || 'claude')}${meta.file ? ' · ' + esc(meta.file) : ''}</p>
<p>The model from six sides, in day, night and night vision, and as big as it is in the game, beside a 1.75 m figure. Green is within its budget, red is over. Click a sheet for it full size.
To turn round it yourself, double-click <b>Open Model Lab.bat</b> in the game folder, then <a href="http://127.0.0.1:8973/${esc(lab)}">open it in the lab</a>; write your note there and it comes here with a picture. Or write it in <code>notes.md</code> in this folder.</p>
<div class="pair">${shown.map(col).join('\n')}</div>
${changes}
<h2>Notes <span class="sub">(as they were when ${esc(latest)} was drawn; notes.md has the newest)</span></h2>
${notes || '<p class="sub">No notes yet.</p>'}
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return path.join(dir, 'index.html');
}

// --- One model ---------------------------------------------------------------------------------------------------
export async function renderSheet(arg, opt = {}) {
  const t0 = Date.now();
  const m = resolveModel(arg, opt.root || ROOT);
  const errs = validateModel(m.json);
  if (errs.length) throw new Error(`${m.file} is not valid:\n  - ${errs.join('\n  - ')}`);
  const clip = typeof opt.clip === 'string' ? opt.clip : ((m.json.clips || [])[0] || '');
  const base = { sheet: '1', ...(m.listed ? { model: m.ref } : { file: m.file }), ...(clip ? { clip } : {}) };
  if (opt.out || !m.listed) {
    const out = opt.out ? path.resolve(opt.out) : path.join(opt.root || ROOT, 'Claude outputs', 'models', m.json.name + '.png');
    const { stats, errors } = await shoot(new URLSearchParams(base).toString(), out, opt);
    return { action: 'picture', file: out, stats, errors, seconds: (Date.now() - t0) / 1000 };
  }
  const asset = opt.asset || 'model-' + m.json.name;
  if (!ASSET_NAME.test(asset)) throw new Error(`--asset "${asset}": a review folder's name is 2 to 64 of a-z, 0-9 and "-"`);
  const dir = path.join(opt.root || ROOT, 'review', asset);
  const plan = planVersion(dir, m.bytes, m.json, opt);
  if (plan.action === 'skip' || plan.action === 'refuse') return { ...plan, asset, dir };
  const ver = path.join(dir, plan.version), made = !fs.existsSync(ver);
  fs.mkdirSync(ver, { recursive: true });
  let shot;
  try {
    shot = await shoot(new URLSearchParams({ ...base, rv: plan.version, ...(opt.asset ? { asset } : {}) }).toString(), path.join(ver, 'sheet.png'), opt);
    if (!shot.stats || shot.stats.errors) throw new Error(`the sheet for ${m.ref} failed: ${JSON.stringify(shot.stats && shot.stats.errors)}`);
  } catch (e) {
    // A version folder this run made and couldn't fill goes again, so it isn't mistaken for one a note made.
    if (made) fs.rmSync(ver, { recursive: true, force: true });
    throw e;
  }
  const { stats, errors } = shot;
  const out = {
    version: plan.version, model: m.ref, file: m.file, modelVersion: m.json.version || 1,
    draws: stats.draws, triangles: stats.triangles, budget: stats.budget, over: stats.over, bounds: stats.bounds,
    joints: stats.joints, parts: stats.parts, drawn: stats.drawn, meshes: stats.meshes, merge: stats.merge,
    views: stats.views, scale: stats.scale, ...(stats.clip ? { clip: stats.clip } : {}), ...(stats.checks ? { checks: stats.checks } : {}),
    ...(stats.namesHidden && stats.namesHidden.length ? { namesHidden: stats.namesHidden } : {}),
    renderSeconds: +((Date.now() - t0) / 1000).toFixed(1)
  };
  fs.writeFileSync(path.join(ver, 'stats.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(ver, 'model.json'), m.bytes);
  const metaFile = path.join(dir, 'meta.json');
  const had = readJson(metaFile) || {};
  const look = `studio/model-lab.html?model=${m.ref}${opt.asset ? '&asset=' + asset : ''}`;
  fs.writeFileSync(metaFile, JSON.stringify({
    ...had, asset, kind: 'model', ref: m.ref, model: m.ref, owner: m.json.owner || 'claude', version: m.json.version || 1,
    file: m.file, look, task: had.task || ''
  }, null, 2) + '\n');
  if (vnum(plan.version) >= vnum(readLatest(dir))) fs.writeFileSync(path.join(dir, 'latest.txt'), plan.version + '\n');
  const notes = path.join(dir, 'notes.md');
  if (!fs.existsSync(notes)) fs.writeFileSync(notes, notesStub(asset, plan.version, new Date().toISOString().slice(0, 10)));
  writeReviewPage(dir, asset);
  return { ...plan, asset, dir, stats: out, errors, seconds: (Date.now() - t0) / 1000 };
}

// --- The command -------------------------------------------------------------------------------------------------
export function parseArgs(argv) {
  const pos = [], opt = {};
  const flags = new Set(['all', 'force', 'redraw', 'help']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2);
    if (flags.has(k)) opt[k] = true;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) opt[k] = argv[++i];
    else throw new Error(`--${k} needs a value`);
  }
  return { pos, opt };
}

export async function main(argv = process.argv.slice(2)) {
  const { pos, opt } = parseArgs(argv);
  const say = (s) => console.log(s);
  if (opt.look) {
    // One picture of the lab as an address sets it up; "studio/model-lab.html?" in front is fine.
    const query = String(opt.look).replace(/^.*model-lab\.html\?/, '');
    const qs = new URLSearchParams(query);
    qs.delete('sheet'); qs.delete('mode'); qs.set('shot', '1');
    const name = (qs.get('model') || qs.get('file') || 'look').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');
    const out = opt.out ? path.resolve(opt.out) : path.join(ROOT, 'Claude outputs', 'models', `look-${name}.png`);
    const { stats, errors } = await shoot(qs.toString().replace(/%2F/g, '/').replace(/%2C/g, ','), out);
    say(`${stats.context}\n  -> ${path.relative(process.cwd(), out)}`);
    if (errors.length) say('  page: ' + errors[0].split('\n')[0]);
    return 0;
  }
  const list = opt.all ? models.names() : pos;
  if (opt.help || !list.length) {
    const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    say(head.slice(3, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    say('models: ' + models.names().join(', '));
    return opt.help ? 0 : 1;
  }
  if (opt.asset && list.length > 1) throw new Error('--asset names one review folder: give one model with it');
  if (opt.out && list.length > 1) throw new Error('--out names one picture: give one model with it');
  let bad = 0;
  for (const a of list) {
    const r = await renderSheet(a, opt);
    if (r.action === 'picture') {
      say(`${a}  draws ${r.stats.draws}/${r.stats.budget.draws}  tris ${r.stats.triangles}/${r.stats.budget.triangles}${r.stats.over ? '  OVER BUDGET' : ''}  -> ${path.relative(process.cwd(), r.file)}  (${r.seconds.toFixed(1)} s)`);
    } else if (r.action === 'skip') say(`${r.asset}: ${r.why}`);
    else if (r.action === 'refuse') { say(`${r.asset}: not drawn: ${r.why}`); bad++; }
    else {
      const s = r.stats;
      say(`${r.asset} ${r.version}${r.action === 'new' ? '' : ' (' + r.action + ')'}  draws ${s.draws}/${s.budget.draws}  tris ${s.triangles}/${s.budget.triangles}${s.over ? '  OVER BUDGET' : ''}  ${sizeText(s.bounds)}  ${r.seconds.toFixed(1)} s`);
      say(`  review/${r.asset}/${r.version}/sheet.png`);
      for (const c of (s.checks && s.checks.said) || []) say('  check: ' + c);
    }
    for (const e of r.errors || []) say('  page: ' + e.split('\n')[0]);
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), (e) => { console.error(e.message || e); process.exit(1); });
}
