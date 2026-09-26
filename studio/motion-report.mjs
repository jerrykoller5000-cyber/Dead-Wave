// studio/motion-report.mjs — the battery as tables, for agents who tune reactions blind (D-42). Claude's.
//
//   node --import ./studio/node-three.mjs studio/motion-report.mjs zombie/shambler
//     every battery hit from the front, the back and the side: what it did, and the numbers
//   ... zombie/shambler --vs zombie/feral                 two presets side by side, differences marked
//   ... zombie/shambler --try hits.pellet.knockdown=6     the preset against a copy with that changed
//   ... zombie/shambler --sweep [--kinds pellet,blast]    for each kind, the power where the outcome changes
//   ... all                                               every preset on disk
//   ... path/to/draft.json                                a preset file anywhere
//   --from front,back,side   --hits rifle,grenade   --lod 0|1|2   --max 24 (the sweep's top, m/s)
//   --json out.json (everything, as data)   --check (exit 1 when an expectation fails)
//
// The same numbers every run: the bodies are deterministic (docs/studio.md §10). It runs without the
// --import too; it registers the same three.js hook itself.
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

register(new URL('./node-three-hook.mjs', import.meta.url));
const { runBattery, sweep, marginAt, BATTERY, BATTERY_NAMES, SIDES, presetRef } = await import('./motion-battery.js');
const { checkExpect } = await import('./motion-expect.js');
const { loadMotion, HIT_KINDS } = await import('./motion.js');

const STUDIO = path.dirname(fileURLToPath(import.meta.url));
const USAGE = `usage: node --import ./studio/node-three.mjs studio/motion-report.mjs <rig/name | file.json | all>
  [--vs <rig/name | file.json>] [--try key=value ...] [--sweep] [--kinds pellet,blast]
  [--from front,back,side] [--hits rifle,grenade] [--lod 0|1|2] [--max 24] [--json out.json] [--check]`;

class UsageError extends Error {}
function parseArgs(argv) {
  const a = { refs: [], tries: [], sweep: false, check: false };
  const list = (v, ok, what) => {
    const xs = String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const x of xs) if (!ok.includes(x)) throw new UsageError(`${what} "${x}" is not one of ${ok.join(', ')}`);
    if (!xs.length) throw new UsageError(`${what}: give a list, e.g. ${ok.slice(0, 2).join(',')}`);
    return xs;
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => { if (i + 1 >= argv.length) throw new UsageError(`${k} needs a value`); return argv[++i]; };
    if (k === '--vs') a.vs = v();
    else if (k === '--try') a.tries.push(v());
    else if (k === '--json') a.json = v();
    else if (k === '--sweep') a.sweep = true;
    else if (k === '--check') a.check = true;
    else if (k === '--kinds') a.kinds = list(v(), HIT_KINDS, 'kind');
    else if (k === '--from') a.from = list(v(), SIDES, 'side');
    else if (k === '--hits') a.hits = list(v(), BATTERY_NAMES, 'hit');
    else if (k === '--lod') { a.lod = Number(v()); if (![0, 1, 2].includes(a.lod)) throw new UsageError('--lod is 0, 1 or 2'); }
    else if (k === '--max') { a.max = Number(v()); if (!(a.max > 0)) throw new UsageError('--max is a power in m/s, more than 0'); }
    else if (k === '--help' || k === '-h') { a.help = true; }
    else if (k.startsWith('--')) throw new UsageError(`unknown option ${k}`);
    else a.refs.push(k);
  }
  if (!a.help && a.refs.length !== 1) throw new UsageError(a.refs.length ? `one preset at a time (got ${a.refs.join(', ')}); use --vs for a second` : 'which preset? e.g. zombie/shambler, or all');
  if (a.vs && a.tries.length) throw new UsageError('--vs and --try both give the second column: use one');
  return a;
}

// A preset from disk: "rig/name" is studio/motion/<rig>/<name>.json; anything ending .json is a file.
function readPreset(ref) {
  const file = ref.endsWith('.json') ? path.resolve(ref) : path.join(STUDIO, 'motion', ref + '.json');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { throw new UsageError(`no preset at ${path.relative(process.cwd(), file) || file} ("${ref}")`); }
  try { return JSON.parse(text); } catch (e) { throw new UsageError(`${ref} is not JSON: ${e.message}`); }
}
export function presetsOnDisk() {
  const dir = path.join(STUDIO, 'motion');
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).sort((x, y) => x.name.localeCompare(y.name))
    .flatMap((d) => fs.readdirSync(path.join(dir, d.name)).filter((f) => f.endsWith('.json')).sort().map((f) => `${d.name}/${f.slice(0, -5)}`));
}
// Clips from disk: the stand clips, and the get-up clips a preset names (when they exist).
const clipOf = (ref) => {
  const f = path.join(STUDIO, 'clips', ref + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};

// --try hits.pellet.knockdown=6: the value is JSON when it parses (numbers, objects), text otherwise.
function tryOn(json, sets) {
  const out = structuredClone(json);
  for (const s of sets) {
    const eq = s.indexOf('=');
    if (eq < 1) throw new UsageError(`--try "${s}": write key=value, e.g. hits.pellet.knockdown=6`);
    const keys = s.slice(0, eq).split('.'), raw = s.slice(eq + 1);
    let val;
    try { val = JSON.parse(raw); } catch { val = raw; }
    let o = out;
    for (const k of keys.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    o[keys[keys.length - 1]] = val;
  }
  return out;
}

// --- Formatting --------------------------------------------------------------------------------
// A snap: its size and joint, and "roll" when the limb turned about its length rather than swinging;
// SNAP past the t79 rule's 0.3 rad.
const snapText = (s) => (!s ? '-' : `${f2(s.rad)} ${s.joint}${s.swing !== null && s.rad > 0.1 && s.swing < s.rad / 3 ? ' roll' : ''}${s.rad > 0.3 ? ' SNAP' : ''}`);
// Two decimals, and no "-0.00" for a hair under zero.
const f2 = (v) => (v === null || v === undefined ? '-' : (Math.abs(v) < 0.005 ? 0 : Number(v)).toFixed(2));
function grid(rows) {
  const w = [];
  for (const r of rows) r.forEach((c, i) => { w[i] = Math.max(w[i] || 0, String(c).length); });
  return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? String(c) : String(c).padEnd(w[i]))).join('  ').trimEnd()).join('\n');
}
const title = (b, label) => `${label || b.preset} v${b.version}  (rig ${b.rig}${b.build && b.build.type ? `: ${b.build.type}, scale ${b.build.scale}` : ''}; standing on ${b.stand || 'its rest pose'}; hit 0.5 s in; 60 fps${b.lod ? `; lod ${b.lod}` : ''})`;
const LEGEND = (p) => `outcome: none, flinch (no step), stagger (stepped, kept its feet), down (fell), dead. steps: stagger steps.
time: s from the hit until it was itself again (settled, if dead). chest: most the chest moved (m). drop: most it sank (m).
moved: how far its hips ended from where it stood (m); along: that, along the push (less than 0: back against it).
fell: once down, its chest from its hips along the push (m): more than 0, it went down the way it was hit.
lowest: its lowest point but the feet (m above the floor).
off-bal: most it was off balance (m); it steps at balance.step ${p.balance.step} and falls at balance.fall ${p.balance.fall}.
snap: the biggest one-frame joint turn (rad) as it came back to its animation; over 0.3 is a snap. "roll": the
limb barely moved and turned about its own length (the animation's twist jumped under it).`;

function single(b) {
  const rows = [['hit', 'from', 'outcome', 'steps', 'time', 'chest', 'drop', 'moved', 'along', 'fell', 'lowest', 'off-bal', 'snap']];
  for (const r of b.runs) rows.push([r.hit, r.from, r.outcome + (r.bad ? ' (NaN!)' : ''), r.steps, f2(r.time), f2(r.chest), f2(r.drop), f2(r.moved), f2(r.along), f2(r.fell), `${r.lowest.point} ${f2(r.lowest.y)}`, f2(r.offBalance), snapText(r.snap)]);
  return grid(rows);
}

// How far apart two numbers must be before the table marks them: 1/20 s, 2 cm.
const TOL = { time: 0.05, chest: 0.02, drop: 0.02, moved: 0.02, along: 0.02, fell: 0.02, offBalance: 0.02, snap: 0.05 };
function differs(k, x, y) {
  if (x === null || y === null) return x !== y;
  return Math.abs(x - y) > TOL[k] + 1e-9;
}
function paired(a, b) {
  const rows = [['hit', 'from', 'outcome', '', '', 'steps', '', '', 'time', '', '', 'chest', '', '', 'drop', '', '', 'moved', '', '', 'along', '', '', 'fell', '', '', 'off-bal', '', '', 'snap', '', '']];
  const changed = [];
  let marks = 0;
  const bi = new Map(b.runs.map((r) => [`${r.hit}/${r.from}`, r]));
  for (const x of a.runs) {
    const y = bi.get(`${x.hit}/${x.from}`);
    if (!y) continue;
    const row = [x.hit, x.from, x.outcome, y.outcome, x.outcome !== y.outcome ? '!' : ''];
    if (x.outcome !== y.outcome) changed.push(`${x.hit} from the ${x.from} (${x.outcome} to ${y.outcome})`);
    row.push(x.steps, y.steps, x.steps !== y.steps ? '*' : '');
    marks += x.steps !== y.steps ? 1 : 0;
    for (const k of ['time', 'chest', 'drop', 'moved', 'along', 'fell', 'offBalance', 'snap']) {
      const xv = k === 'snap' ? (x.snap ? x.snap.rad : null) : x[k], yv = k === 'snap' ? (y.snap ? y.snap.rad : null) : y[k];
      const d = differs(k, xv, yv);
      row.push(f2(xv), f2(yv), d ? '*' : '');
      marks += d ? 1 : 0;
    }
    rows.push(row);
  }
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const sum = changed.length ? `${count(changed.length, 'outcome differs', 'outcomes differ')} (!): ${changed.join('; ')}.` : 'Every outcome is the same.';
  return `${grid(rows)}\n${sum} ${count(marks, 'number differs', 'numbers differ')} by more than 1/20 s or 2 cm (*).`;
}

const bandsText = (sw) => sw.bands.map((x, i) => (i === 0 ? x.outcome : `${x.outcome} from ${f2(x.from)}${Math.abs(x.from - sw.knockdown) < 1e-6 ? ' (its knockdown)' : ''}`)).join(', ')
  + (sw.monotone ? '' : '  <- goes back down the scale: the preset sits on an edge there');
function sweepText(sa, sb) {
  const out = [];
  const froms = [...new Set(sa.sweeps.map((s) => s.from))];
  for (const from of froms) {
    out.push(`Sweep from the ${from}: the power (m/s at the point hit) where the outcome changes${sb ? `; A is ${sa.preset}, B ${sb.label}` : ''}.`);
    const rows = [];
    for (const s of sa.sweeps.filter((x) => x.from === from)) {
      const t = sb && sb.sweeps.find((x) => x.kind === s.kind && x.from === from);
      const top = `searched to ${f2(s.max)}`;
      if (!t) { rows.push([s.kind, `at ${s.at}`, bandsText(s), `(${top})`]); continue; }
      const same = bandsText(s) === bandsText(t);
      rows.push([s.kind, `at ${s.at}`, 'A', bandsText(s)]);
      rows.push(['', '', 'B', bandsText(t) + (same ? '' : '  *')]);
    }
    out.push(grid(rows));
    // The battery's own hits against the sweep: how far each is from changing.
    const hits = BATTERY.filter((h) => !h.kill);
    const mrows = [];
    for (const [lab, sw] of sb ? [['A', sa], ['B', sb]] : [['', sa]]) {
      for (const h of hits) {
        const s = sw.sweeps.find((x) => x.kind === h.kind && x.from === from);
        if (!s) continue;
        const m = marginAt(s, h.power);
        const edges = [m.lower && `${f2(m.lower.by)} over ${m.lower.outcome}->${m.outcome} at ${f2(m.lower.at)}`, m.upper && `${f2(m.upper.by)} under ${m.outcome}->${m.upper.outcome} at ${f2(m.upper.at)}`].filter(Boolean).join('; ');
        mrows.push([lab, h.name, f2(h.power), m.outcome, edges || (h.power > s.max ? `past the search (${f2(s.max)})` : 'no change within the search')]);
      }
    }
    if (mrows.length) out.push(`The battery from the ${from}, against it (m/s):\n` + grid(mrows.map((r) => (sb ? r : r.slice(1)))));
  }
  return out.join('\n');
}

function expectText(e) {
  if (e.errors.length) return 'expect: the entries have problems:\n  ' + e.errors.join('\n  ');
  if (!e.results.length) return 'expect: none yet (add "expect" to the preset: studio/motion-expect.js).';
  const bad = e.results.filter((r) => !r.ok);
  if (!bad.length) return `expect: all ${e.results.length} hold.`;
  return `expect: ${bad.length} of ${e.results.length} FAIL:\n  ` + bad.map((r) => r.sentence).join('\n  ');
}

// --- Running --------------------------------------------------------------------------------
export function report(argv, print = console.log) {
  const a = parseArgs(argv);
  if (a.help) { print(USAGE); return { code: 0 }; }
  const opts = { clipOf, lod: a.lod ?? 0 };
  if (a.hits) opts.hits = a.hits;
  if (a.from) opts.from = a.from;
  const sweepOpts = (from) => ({ clipOf, lod: a.lod ?? 0, kinds: a.kinds, from, max: a.max });
  const refs = a.refs[0] === 'all' ? presetsOnDisk() : a.refs;
  const data = { presets: [] };
  let failed = 0;
  const one = (json, label) => {
    loadMotion(json);                     // a bad preset stops here, with its problems as sentences
    const battery = runBattery(json, opts);
    const expect = checkExpect(json, { clipOf, lod: a.lod ?? 0 });
    const sweeps = a.sweep ? (a.from || ['front']).flatMap((f) => sweep(json, sweepOpts(f)).sweeps) : null;
    return { label: label || presetRef(json), json, battery, expect, sweep: sweeps && { preset: presetRef(json), version: json.version || 1, sweeps: sweeps } };
  };
  for (const ref of refs) {
    const A = one(readPreset(ref), ref.endsWith('.json') ? ref : null);
    let B = null;
    if (a.vs) B = one(readPreset(a.vs), a.vs.endsWith('.json') ? a.vs : null);
    else if (a.tries.length) B = one(tryOn(A.json, a.tries), `${A.label} with ${a.tries.join(', ')}`);
    const p = loadMotion(A.json);
    if (!B) {
      print(title(A.battery, A.label));
      print(single(A.battery));
      print(LEGEND(p));
      print(expectText(A.expect));
      if (A.sweep) print(sweepText(A.sweep));
    } else {
      if (A.battery.rig !== B.battery.rig) print(`Note: ${A.label} is for rig ${A.battery.rig} and ${B.label} for ${B.battery.rig}; the same hits land on different bodies.`);
      print(`A: ${title(A.battery, A.label)}\nB: ${title(B.battery, B.label)}`);
      print(paired(A.battery, B.battery));
      print(LEGEND(p));
      print('A ' + expectText(A.expect));
      print('B ' + expectText(B.expect));
      if (A.sweep) print(sweepText(A.sweep, { ...B.sweep, label: B.label }));
    }
    print('');
    failed += A.expect.failures.length + (B ? B.expect.failures.length : 0);
    data.presets.push({ label: A.label, battery: A.battery, expect: strip(A.expect), sweep: A.sweep, vs: B && { label: B.label, battery: B.battery, expect: strip(B.expect), sweep: B.sweep } });
  }
  if (a.json) { fs.writeFileSync(a.json, JSON.stringify(data, null, 1) + '\n'); print(`Wrote ${a.json}.`); }
  return { code: a.check && failed ? 1 : 0, data };
}
// The expectation results without their runs (the battery section has the numbers).
const strip = (e) => ({ ...e, results: e.results.map(({ run, ...r }) => r) });

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = report(process.argv.slice(2)).code;
  } catch (e) {
    console.error(e instanceof UsageError ? `${e.message}\n${USAGE}` : String(e.message || e));
    process.exitCode = 2;
  }
}
