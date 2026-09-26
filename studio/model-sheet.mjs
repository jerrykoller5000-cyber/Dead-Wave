// studio/model-sheet.mjs — look at a model: check it, or draw its contact sheet (docs/drafts/model.md). Claude's.
//
//   node studio/model-sheet.mjs --check prop/evac-boat my/new-model.json   no browser: its problems as sentences,
//                                                                          its cost against its budget, its
//                                                                          joints and limbs (a second or two)
//   node studio/model-sheet.mjs prop/evac-boat                     the next version in review/model-evac-boat/vN/
//   node studio/model-sheet.mjs creature/spider --clip spider/crawl  with a strip of the clip under it
//   node studio/model-sheet.mjs --all                                every model in studio/models/index.js
//   node studio/model-sheet.mjs <model> --force                      a new version even if the file hasn't changed
//   node studio/model-sheet.mjs <model or file.json> --out look.png  just the picture, no review version: a look
//                                                                    while working, before bumping "version"
//
// A model is "kind/name" (listed in studio/models/index.js) or a path to a .json file (a draft that
// isn't listed yet; its picture goes to Claude outputs/models/<name>.png unless --out says where).
// Each review version gets sheet.png (six views, the joints named, the cost against the budget, the
// materials), stats.json and model.json (the file as it was, so any two versions can be compared). The
// folder gets meta.json (kind "model", its owner), latest.txt, notes.md for Jerry, and index.html.
// Headless Chrome draws it (tools/cdp.mjs; on the cloud box set CHROME and CHROME_ARGS=--no-sandbox,
// as for the tests). It loads the studio and three.js only, never the game.
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';
import { notesStub } from '../crew/notes.mjs';

register(new URL('./node-three-hook.mjs', import.meta.url));
const { buildModel, validateModel, rigFromModel, modelAsset } = await import('./model.js');
const { models } = await import('./models/index.js');
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function args() {
  const pos = [], opt = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) { pos.push(a[i]); continue; }
    const next = a[i + 1];
    if (next === undefined || next.startsWith('--') || a[i] === '--check' || a[i] === '--all' || a[i] === '--force') opt[a[i].slice(2)] = true;
    else { opt[a[i].slice(2)] = next; i++; }
  }
  return { pos, opt };
}

// "kind/name" or a file: { ref, json, file (repo-relative, forward slashes), listed }.
function resolve(arg) {
  if (arg.endsWith('.json')) {
    const abs = path.resolve(arg);
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (rel.startsWith('..')) throw new Error(`${arg}: the model file must be inside the game folder, so the lab page can load it`);
    const ref = `${json.kind}/${json.name}`;
    return { ref, json, file: rel, listed: models.json(ref) !== null && path.resolve(ROOT, 'studio/models', ref + '.json') === abs };
  }
  const json = models.json(arg);
  if (!json) throw new Error(`no model "${arg}" in studio/models/index.js (${models.names().join(', ')}); give a path to a .json file for a draft`);
  return { ref: arg, json, file: `studio/models/${arg}.json`, listed: true };
}

function check(arg) {
  const { ref, json, file } = resolve(arg);
  const errs = validateModel(json);
  if (errs.length) {
    console.log(`${file}: ${errs.length} problem${errs.length > 1 ? 's' : ''}`);
    for (const e of errs) console.log('  - ' + e);
    return false;
  }
  const m = buildModel(json);
  console.log(`${file}  ${ref} v${json.version || 1}  draws ${m.cost.draws}/${json.budget.draws}  triangles ${m.cost.triangles}/${json.budget.triangles}${m.over ? '  OVER BUDGET' : '  within budget'}`);
  console.log(`  ${json.parts.length} parts, ${m.parts.length} drawn as ${m.meshes.length} meshes (merge ${JSON.stringify(json.merge ?? false)})`);
  if (Object.keys(m.joints).length) console.log(`  joints: ${Object.keys(m.joints).join(', ')}`);
  if (json.joints) {
    const def = rigFromModel(json);
    for (const [n, c] of Object.entries(def.chains)) console.log(`  limb ${n}: ${c.root} > ${c.mid} > ${c.end}, lengths ${c.lengths.map((v) => v.toFixed(3)).join(' + ')}, pole [${c.pole.join(', ')}]${c.exact ? ', exact' : ''}`);
    if (json.rig) console.log(`  registers as rig "${json.rig}"${def.body ? ', with a body that reacts' : ''}${json.clips ? '; plays ' + json.clips.join(', ') : ''}`);
  }
  if (Object.keys(m.limbs).length) console.log(`  limbs that can be lost: ${Object.entries(m.limbs).map(([k, v]) => `${k} (${v.length} mesh${v.length > 1 ? 'es' : ''})`).join(', ')}`);
  return !m.over;
}

async function shoot(query, file) {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage({ width: 1600, height: 1000 });
    await page.goto(`${server.origin}/studio/model-lab.html?${query}`, { waitUntil: 'none' });
    const ok = await page.waitFor('window.__ready === true', { timeout: 90000 });
    if (!ok) throw new Error('the model lab did not finish: ' + (page.errors[0] || 'no error given').split('\n')[0]);
    const size = await page.evaluate('window.__size');
    await page.setViewport(size.w, size.h);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await page.screenshot(file);
    const errors = page.errors.filter((e) => !/favicon/i.test(e));
    if (errors.length) console.log('  page:', errors[0].split('\n')[0]);
    return await page.evaluate('window.__stats');
  } finally {
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2500))]);
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await Promise.race([server.close(), new Promise((r) => setTimeout(r, 800))]);
  }
}

function writeIndex(dir, asset, version) {
  const versions = fs.readdirSync(dir).filter((n) => /^v\d+$/.test(n)).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const blocks = versions.slice(-2).reverse().map((v) => `<section><h2>${v}</h2><img src="${v}/sheet.png" alt="${v} sheet"></section>`).join('\n');
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${asset}</title>
<style>body{margin:24px;background:#14181f;color:#e6e6e0;font-family:Georgia,serif} img{max-width:100%;display:block;margin:8px 0} h1{font-weight:normal}</style>
<h1>${asset}</h1><p>Latest ${version}. The newest version is first; the one before it is under that. To turn round it yourself and write a note with a picture, open studio/model-lab.html; or write in notes.md here.</p>
${blocks}\n`);
  fs.writeFileSync(path.join(dir, 'latest.txt'), version + '\n');
}

async function sheet(arg, opt) {
  const t0 = Date.now();
  const { ref, json, file, listed } = resolve(arg);
  const errs = validateModel(json);
  if (errs.length) throw new Error(`${file} is not valid:\n  - ${errs.join('\n  - ')}`);
  // A model that is a rig shows the first of its "clips" under its sheet, unless --clip names another.
  const clip = opt.clip && opt.clip !== true ? opt.clip : ((json.clips || [])[0] || '');
  const q = new URLSearchParams({ mode: 'sheet', ...(listed ? { model: ref } : { file }), ...(clip ? { clip } : {}) });
  if ((opt.out && opt.out !== true) || !listed) {
    const out = opt.out && opt.out !== true ? path.resolve(opt.out) : path.join(ROOT, 'Claude outputs', 'models', json.name + '.png');
    const shot = await shoot(q.toString(), out);
    console.log(`${ref}  draws ${shot.draws}/${json.budget.draws}  tris ${shot.triangles}/${json.budget.triangles}${shot.over ? '  OVER BUDGET' : ''}  -> ${path.relative(process.cwd(), out)}`);
    return;
  }
  const bytes = fs.readFileSync(path.join(ROOT, file));
  const asset = modelAsset(json);
  const dir = path.join(ROOT, 'review', asset);
  fs.mkdirSync(dir, { recursive: true });
  const latestFile = path.join(dir, 'latest.txt');
  const latest = fs.existsSync(latestFile) ? fs.readFileSync(latestFile, 'utf8').trim() : null;
  if (latest && !opt.force && fs.existsSync(path.join(dir, latest, 'model.json')) && fs.readFileSync(path.join(dir, latest, 'model.json')).equals(bytes)) {
    console.log(`${asset}: unchanged since ${latest} (--force for a new version anyway)`);
    return;
  }
  const n = latest ? parseInt(latest.replace(/\D/g, ''), 10) || 0 : 0;
  const version = 'v' + (n + 1);
  const ver = path.join(dir, version);
  fs.mkdirSync(ver, { recursive: true });
  const shot = await shoot(q.toString(), path.join(ver, 'sheet.png'));
  const built = buildModel(json);
  const stats = {
    version, model: file, modelVersion: json.version || 1,
    draws: built.cost.draws, triangles: built.cost.triangles, budget: json.budget, over: built.over,
    joints: Object.keys(built.joints), parts: json.parts.length, drawn: built.parts.length, merge: json.merge ?? false,
    ...(clip ? { clip } : {}), page: shot ? { draws: shot.draws, triangles: shot.triangles } : null,
    renderSeconds: +((Date.now() - t0) / 1000).toFixed(1)
  };
  fs.writeFileSync(path.join(ver, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  fs.writeFileSync(path.join(ver, 'model.json'), bytes);
  const metaFile = path.join(dir, 'meta.json');
  const cur = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  fs.writeFileSync(metaFile, JSON.stringify({
    ...cur, asset, kind: 'model', owner: json.owner || 'claude', model: ref, file,
    look: `studio/model-lab.html?model=${ref}${clip ? '&clip=' + clip : ''}`, task: cur.task || ''
  }, null, 2) + '\n');
  const notes = path.join(dir, 'notes.md');
  if (!fs.existsSync(notes)) fs.writeFileSync(notes, notesStub(asset, version, new Date().toISOString().slice(0, 10)));
  writeIndex(dir, asset, version);
  console.log(`${asset} ${version}  draws ${stats.draws}/${json.budget.draws}  tris ${stats.triangles}/${json.budget.triangles}${stats.over ? '  OVER BUDGET' : ''}  ${stats.renderSeconds}s`);
  console.log('  ' + path.join('review', asset, version));
}

const { pos, opt } = args();
const list = opt.all ? models.names() : pos;
if (!list.length) {
  console.log('node studio/model-sheet.mjs [--check] <kind/name | file.json> ... [--clip rig/clip] [--out file.png] [--force]    or --all');
  console.log('models: ' + models.names().join(', '));
  process.exit(1);
}
if (opt.check) {
  let ok = true;
  for (const a of list) { try { ok = check(a) && ok; } catch (e) { console.log(`${a}: ${e.message}`); ok = false; } }
  process.exit(ok ? 0 : 1);
}
for (const a of list) await sheet(a, opt);
