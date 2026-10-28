// tools/sweep/report.mjs — CL-255: turn a sweep (tools/sweep/sweep.js's JSON) into the reports and the shot lists.
//   node tools/sweep/report.mjs <sweep.json> [--docs docs/sweep] [--jobs review/sweep/jobs]
// Writes docs/sweep/README.md (every place, its suspects by kind), docs/sweep/numbers/<place>.md (its suspects and
// what stands there) and review/sweep/jobs/<place>.json: a camera job (tools/CAMERA.md) per place, the approach from
// four sides at his eye height, from above, at night, and a close look at each strong suspect. Run a job with
// `node tools/camera.mjs job review/sweep/jobs/<place>.json --agent <you> --task <id>` (one game, the slot).
// The numbers find suspects; the shots and docs/world-design.md decide. The findings themselves are written by hand
// in docs/sweep/<place>.md.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const src = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!src) { console.log('usage: node tools/sweep/report.mjs <sweep.json> [--docs docs/sweep] [--jobs review/sweep/jobs]'); process.exit(2); }
const D = JSON.parse(fs.readFileSync(src, 'utf8'));
const docs = opt('docs', 'docs/sweep'), jobs = opt('jobs', 'review/sweep/jobs');
fs.mkdirSync(path.join(docs, 'numbers'), { recursive: true }); fs.mkdirSync(jobs, { recursive: true });

const KIND = {
  floating: 'Floating (transition A)', hangs: 'Off the ground on a slope (transition A)', buried: 'Sunk into the ground (transition B)',
  overlap: 'Things through each other (placement 1, transition B)', branches: 'Branches through something (transition B)',
  'invisible-wall': 'A collider with nothing to see (rule 8)', 'hill-ring': 'A cave hill\'s foot ring on a gentle slope (rule 8, by eye)', 'no-collider': 'Solid-looking, walked through (rule 8)',
  'on-trail': 'On a trail (rules 8, 11)', water: 'Standing in water (rule 13)', reach: 'Hard to reach or stand at (rule 8)',
  'even-spacing': 'Evenly spaced trees (rules 3, 10)'
};
const ORDER = Object.keys(KIND);
const placeName = Object.fromEntries(D.places.map((p) => [p.id, p.name]));
const nameOf = (id) => placeName[id] || (id.startsWith('wild:') ? 'The wild round ' + id.slice(5) : id);
const slug = (id) => id.replace(/^wild:(-?\d+),(-?\d+)$/, (m, x, z) => 'wild-' + x.replace('-', 'm') + '_' + z.replace('-', 'm')).replace(/[^a-z0-9_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const byPlace = new Map();
for (const f of D.findings) { if (f.kind === 'even-spacing') continue; const k = f.place || 'unknown'; if (!byPlace.has(k)) byPlace.set(k, []); byPlace.get(k).push(f); }
const I = D.items;
const fmt = (v) => (Math.round(v * 100) / 100).toString();
const ground = (x, z, it) => (it ? it.gC : 0);

// ---- the shot lists --------------------------------------------------------------------------------------------
const EYE = 1.7, FOV = 60;
const jobFor = (id, p, list) => {
  const shots = [];
  const g = (() => { const near = (D.byPlace[id] || []).map((i) => I[i]).filter((it) => !it.canopy); if (!near.length) return 0; const gs = near.map((it) => it.gC).sort((a, b) => a - b); return gs[gs.length >> 1]; })();
  const r = Math.max(10, Math.min(p.r || 20, 30));
  const dirs = [['north', 0, 1], ['east', 1, 0], ['south', 0, -1], ['west', -1, 0]];
  // CL-256 batch 3: the sweep says where each camera stands (inside the land, at the water's surface); older sweeps
  // only gave the ground.
  const C = (D.cams || {})[id] || {};
  const G = p.camG || {}, gAt = (k) => (C[k] && Number.isFinite(C[k].g) ? C[k].g : Number.isFinite(G[k]) ? G[k] : g), gc = Number.isFinite(C.centre) ? C.centre : Number.isFinite(G.centre) ? G.centre : g;
  const cx = (k, dx) => (C[k] ? C[k].x : p.x + dx * r), cz = (k, dz) => (C[k] ? C[k].z : p.z + dz * r);
  for (const [n, dx, dz] of dirs) shots.push({ cam: { x: cx(n, dx), y: gAt(n) + EYE, z: cz(n, dz), tx: p.x, ty: Math.max(gc, g) + 1.2, tz: p.z, fov: FOV }, time: 'noon', caption: `${p.name}: from the ${n}, his eye height`, out: `review/sweep/${slug(id)}/${slug(id)}-from-${n}.png` });
  shots.push({ cam: { x: p.x + r * 0.6, y: g + r * 1.1, z: p.z + r * 0.6, tx: p.x, ty: g, tz: p.z, fov: FOV }, time: 'noon', caption: `${p.name}: from above`, out: `review/sweep/${slug(id)}/${slug(id)}-above.png` });
  shots.push({ cam: { x: cx('night', 0.7), y: Math.max(g, gAt('night')) + 6, z: cz('night', 0.7), tx: p.x, ty: g + 1, tz: p.z, fov: FOV }, time: 'night', caption: `${p.name}: at night`, out: `review/sweep/${slug(id)}/${slug(id)}-night.png` });
  let k = 0;
  for (const f of list.filter((f) => f.sev >= 2 && f.at && !(f.a != null && I[f.a] && I[f.a].area > 60)).slice(0, 14)) {
    const [x, y, z] = f.at;
    shots.push({ cam: { x: x + 3.2, y: y + 1.6, z: z + 3.2, tx: x, ty: y + 0.4, tz: z, fov: 50 }, time: 'noon', caption: `${f.kind}: ${f.msg}`.slice(0, 110), out: `review/sweep/${slug(id)}/${slug(id)}-suspect-${++k}.png` });
  }
  return { shots, out: `review/sweep/${slug(id)}/`, cols: 4, size: '1280x720' };
};

// ---- per place ---------------------------------------------------------------------------------------------------
const rows = [];
const allPlaces = [...new Set([...D.places.map((p) => p.id), ...byPlace.keys()])];
for (const id of allPlaces) {
  const p = D.places.find((q) => q.id === id) || (() => { const m = id.match(/^wild:(-?\d+),(-?\d+)$/); return m ? { id, name: nameOf(id), x: +m[1], z: +m[2], r: 25 } : null; })();
  const list = (byPlace.get(id) || []).sort((a, b) => b.sev - a.sev || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const things = (D.byPlace[id] || []).map((i) => I[i]).filter((it) => !it.canopy);
  rows.push({ id, name: nameOf(id), n: list.length, hi: list.filter((f) => f.sev >= 2).length, things: things.length, kinds: [...new Set(list.map((f) => f.kind))] });
  if (!p) continue;
  const job = jobFor(id, p, list);
  fs.writeFileSync(path.join(jobs, slug(id) + '.json'), JSON.stringify(job, null, 1));
  const L = [];
  L.push(`# ${nameOf(id)}: the numbers`, '');
  L.push(`Generated by \`tools/sweep/report.mjs\` from a sweep of ${D.when.slice(0, 16).replace('T', ' ')} UTC (CL-255). Centre (${fmt(p.x)}, ${fmt(p.z)}), radius ${p.r || 25} m. These are suspects for the eyes, not findings; the findings are written in \`docs/sweep/${slug(id)}.md\` against \`docs/world-design.md\`.`, '');
  L.push(`Shots: \`node tools/camera.mjs job ${jobs}/${slug(id)}.json --agent <you> --task <id>\` (${job.shots.length} pictures into \`${job.out}\`).`, '');
  L.push('## Suspects', '');
  if (!list.length) L.push('None from the numbers.', '');
  for (const k of ORDER) {
    const fs_ = list.filter((f) => f.kind === k); if (!fs_.length) continue;
    L.push(`### ${KIND[k]} (${fs_.length})`, '');
    for (const f of fs_.slice(0, 40)) L.push(`- ${f.sev >= 2 ? '**strong**' : 'weak'}: ${f.msg}${f.at ? ` at (${f.at.map(fmt).join(', ')})` : ''}`);
    if (fs_.length > 40) L.push(`- … and ${fs_.length - 40} more (the JSON has them all)`);
    L.push('');
  }
  L.push('## What stands here', '', 'Height is against the marine (1.8 m). "Built by" is the code that put it in the world.', '', '| Thing | Built by | Footprint m² | Height m | × marine | Base vs ground | Notes |', '| --- | --- | --- | --- | --- | --- | --- |');
  const shown = things.filter((it) => !it.tree && !it.rock).sort((a, b) => b.h * b.area - a.h * a.area).slice(0, 80);
  for (const it of shown) {
    const base = it.deck != null ? `deck ${fmt(it.y0 - it.deck)}` : `${fmt(it.y0 - it.gMin)} / ${fmt(it.y0 - it.gMax)}`;
    const notes = [it.restsOn != null ? 'rests on ' + I[it.restsOn].label : '', it.attachedTo != null ? 'fixed to ' + I[it.attachedTo].label : '', it.water != null ? 'water ' + it.water + ' m' : '', it.subs ? 'parts: ' + it.subs.slice(0, 8).map((s) => s.name).join(', ') : ''].filter(Boolean).join('; ');
    L.push(`| ${it.label.replace(/\|/g, '/')} | ${(it.site[0] || '').replace(/\|/g, '/')} | ${it.area} | ${it.h} | ${fmt(it.h / 1.8)} | ${base} | ${notes.replace(/\|/g, '/')} |`);
  }
  const tr = things.filter((it) => it.tree).length, rk = things.filter((it) => it.rock).length;
  L.push('', `Also ${tr} trees and ${rk} rocks.`, '');
  fs.writeFileSync(path.join(docs, 'numbers', slug(id) + '.md'), L.join('\n'));
}

// ---- the index ---------------------------------------------------------------------------------------------------
const named = rows.filter((r) => !r.id.startsWith('wild:')).sort((a, b) => b.hi - a.hi || b.n - a.n);
const wild = rows.filter((r) => r.id.startsWith('wild:')).sort((a, b) => b.hi - a.hi || b.n - a.n);
const totals = {}; for (const f of D.findings) totals[f.kind] = (totals[f.kind] || 0) + 1;
const R = [];
R.push('# The world sweep', '');
R.push('The placement and transition sweeps (Jerry, 2026-10-24, D-88): `docs/world-design.md`. Claude runs them location by location (CL-256); Antigravity shoots each place on Jerry\'s GPU (AG-122).', '');
R.push('**How it works.** `tools/sweep/sweep.js` (run by `tools/sweep/run.mjs`, real three.js) lists every placed thing in the world with its footprint, its height and the ground under it, and flags suspects: floating, hanging off a slope, sunk, things through each other, branches through roofs, colliders with nothing to see, solid things with no collider, things on trails or in water, prompts walled in, trees in a grid. `tools/sweep/report.mjs` writes the numbers per place (`docs/sweep/numbers/`) and a camera job per place (`review/sweep/jobs/`). The findings, judged by eye against the sweeps and the 15 rules, are written by hand in `docs/sweep/<place>.md`, with the fixes.', '');
R.push(`This sweep: ${D.when.slice(0, 16).replace('T', ' ')} UTC, ${D.stats.items} things (${D.stats.parts} pieces), ${D.stats.trees} trees, ${D.stats.rocks} rocks, ${D.stats.solids} colliders. Suspects: ${Object.entries(totals).map(([k, v]) => `${v} ${k}`).join(', ')}.`, '');
R.push('## Places', '', '| Place | Strong | All | Things | Kinds | Numbers |', '| --- | --- | --- | --- | --- | --- |');
for (const r of named) R.push(`| ${r.name} | ${r.hi} | ${r.n} | ${r.things} | ${r.kinds.join(', ')} | [numbers](numbers/${slug(r.id)}.md) |`);
R.push('', '## The wild (50 m squares)', '', '| Square | Strong | All | Kinds | Numbers |', '| --- | --- | --- | --- | --- |');
for (const r of wild.filter((r) => r.n)) R.push(`| ${r.name.replace('The wild round ', '')} | ${r.hi} | ${r.n} | ${r.kinds.join(', ')} | [numbers](numbers/${slug(r.id)}.md) |`);
R.push('', '## Tree spacing (Clark-Evans R per 80 m square: about 1 is natural, under 1 clustered, over 1.45 a grid)', '');
R.push(D.spacing.map((s) => `${s.cell.split(',').map((v) => v * 80).join(', ')}: ${s.R} (${s.n} trees)${s.R > 1.45 ? ' **grid-like**' : ''}`).join(' · '), '');
fs.writeFileSync(path.join(docs, 'README.md'), R.join('\n'));
console.log(`wrote ${docs}/README.md, ${rows.length} places in ${docs}/numbers/, jobs in ${jobs}/`);
