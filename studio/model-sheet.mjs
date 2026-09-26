// studio/model-sheet.mjs — look at a model: check it, or draw its contact sheet (docs/drafts/model.md). Claude's.
//
//   node studio/model-sheet.mjs --check prop/evac-boat my/new-model.json   no browser: its problems as sentences,
//                                                                          its cost against its budget, its
//                                                                          joints and limbs (a second or two)
//   node studio/model-sheet.mjs prop/evac-boat ...                  the sheet: the same as
//                                                                   node studio/render-sheet.mjs prop/evac-boat ...
//
// A model is "kind/name" (listed in studio/models/index.js) or a path to a .json file (a draft that
// isn't listed yet). Drawing the sheet and writing the review folder is studio/render-sheet.mjs's (the
// model lab's sheet mode in headless Chrome, docs/drafts/modellab.md), so there is one way a review
// folder is made; this command hands every argument but --check to it.
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

register(new URL('./node-three-hook.mjs', import.meta.url));
const { buildModel, validateModel, rigFromModel } = await import('./model.js');
const { modelChecks, checkSentences } = await import('./model-look.js');
const { models } = await import('./models/index.js');
const { validateClip } = await import('./clip.js');
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
  const said = checkSentences(modelChecks(json));
  console.log(said.length ? said.map((t) => '  check: ' + t).join('\n') : '  check: one piece, nothing under the ground');
  if (Object.keys(m.limbs).length) console.log(`  limbs that can be lost: ${Object.entries(m.limbs).map(([k, v]) => `${k} (${v.length} mesh${v.length > 1 ? 'es' : ''})`).join(', ')}`);
  // The clips it says it plays: there, valid, and for its rig.
  let clipsOk = true;
  for (const c of json.clips || []) {
    const f = path.join(ROOT, 'studio', 'clips', c + '.json');
    const cj = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    const problems = !cj ? [`there is no studio/clips/${c}.json`] : [...validateClip(cj), ...(cj.rig !== json.rig ? [`it is for rig "${cj.rig}", not "${json.rig}"`] : [])];
    if (problems.length) { clipsOk = false; console.log(`  clip ${c}: ${problems.join('; ')}`); }
  }
  return !m.over && clipsOk;
}

const { pos, opt } = args();
if (opt.check) {
  const list = opt.all ? models.names() : pos;
  if (!list.length) {
    console.log('node studio/model-sheet.mjs --check <kind/name | file.json> ...    or --check --all');
    console.log('models: ' + models.names().join(', '));
    process.exit(1);
  }
  let ok = true;
  for (const a of list) { try { ok = check(a) && ok; } catch (e) { console.log(`${a}: ${e.message}`); ok = false; } }
  process.exit(ok ? 0 : 1);
}
// Everything else draws a sheet: studio/render-sheet.mjs, with the same arguments.
const { main } = await import('./render-sheet.mjs');
main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e.message || e); process.exit(1); });
