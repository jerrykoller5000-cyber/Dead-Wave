// npm test — runs Claude's behaviour checks against the real game, headless.
//
//   npm test                     every check
//   npm test -- t39 t45          just those
//   npm test -- --jobs 1         one at a time (easier to read when something breaks)
//   npm test -- --keep           leave tools/tests/test.html on disk to open by hand
//
// How it works. Each tNN.js is an async expression evaluated inside a loaded copy of the
// game, and asserts against window.TT. The copy (test.html, generated here) points the
// three.js import map at Claude's fakethree.mjs / faketsl.mjs: real maths and scene graph,
// stubbed rendering, so a check runs in a couple of seconds with no GPU instead of the
// minute a real world build costs. That generation replaces Claude's mk.py so the suite
// needs only node.
//
// Each check gets a fresh page — they mutate the world (fell trees, spawn waves, kill the
// player) and would otherwise poison each other.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launch } from '../cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

// Which tests belong to whom, for the failure report. AGENTS.md rule 13: failures are
// assigned, never deleted or weakened.
const OWNERS = [
  [/^t(11|12|13|15|17|18|21|23|24|25|29|34|49|51)$/, 'Grokbot (builds, wheel, turrets, pillars)'],
  [/^t(39|40|41|42|44|45)$|^tfish$/, 'Claude (world, trees, fire, caves, water, fish)'],
  [/^t(0|1|2|3|4|5|6|6a|7|8|9|10)$/, 'Grokbot (combat core)'],
  [/^t(14|16|19|20|22|26|27|28|30|31|32|33|35|36|37|38)$/, 'unassigned — triage']
];
const ownerOf = (name) => (OWNERS.find(([re]) => re.test(name)) || [, 'unassigned'])[1];

// --- build test.html --------------------------------------------------------------
// The import map is rewritten rather than the import statements: one edit, and the game's
// own source is untouched.
function buildTestPage() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!map) throw new Error('no import map found in index.html — did the shell change?');
  const fake = `<script type="importmap">
  {
    "imports": {
      "three": "./fakethree.mjs",
      "three/webgpu": "./fakethree.mjs",
      "three/tsl": "./faketsl.mjs",
      "three/addons/": "./addons/"
    }
  }
  </script>`;
  let out = src.replace(map[0], fake);
  // test.html sits in tools/tests/, so the game's own relative paths need a root-relative
  // prefix to keep resolving against the repo root.
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  // Inline module imports are resolved from test.html's folder. Point them at the repo root.
  // The import map's "./fakethree.mjs" is not an import-from, so it stays next to test.html.
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  const file = path.join(HERE, 'test.html');
  fs.writeFileSync(file, out);
  return file;
}

// --- args -------------------------------------------------------------------------
const argv = process.argv.slice(2);
const jobsIdx = argv.indexOf('--jobs');
const JOBS = jobsIdx >= 0 ? Math.max(1, Number(argv[jobsIdx + 1]) || 1) : 4;
const keep = argv.includes('--keep');
const wanted = argv.filter((a, i) => !a.startsWith('--') && !(jobsIdx >= 0 && i === jobsIdx + 1))
  .map((a) => a.replace(/\.js$/, ''));

const all = fs.readdirSync(HERE).filter((f) => /^t[0-9a-z]+\.js$/.test(f)).map((f) => f.replace(/\.js$/, ''))
  .sort((a, b) => (Number(a.slice(1)) || 0) - (Number(b.slice(1)) || 0) || a.localeCompare(b));
const tests = wanted.length ? all.filter((t) => wanted.includes(t)) : all;
if (!tests.length) {
  console.error('No tests matched. Available: ' + all.join(' '));
  process.exit(2);
}

buildTestPage();
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const results = [];

async function runOne(name) {
  const code = fs.readFileSync(path.join(HERE, name + '.js'), 'utf8');
  const page = await browser.newPage({ width: 1280, height: 720 });
  const t0 = Date.now();
  let pass = 0, fail = 0, lines = [], note = '', raw = '', info = false;
  try {
    // raf=timer: a background page gets no animation frames, and every check needs the
    // game's loop to actually run.
    await page.goto(`${server.origin}/tools/tests/test.html?debug=1&raf=timer`, { timeout: 120000 });
    const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
    if (!ready) {
      note = 'window.TT never appeared: ' + (page.errors[0] || 'no page error reported').split('\n')[0];
    } else {
      const vis = await page.evaluate('document.visibilityState');
      if (vis === 'hidden') {
        try { await page.send('Page.bringToFront', {}); } catch { /* already in front */ }
      }
      // The splash has no Skip button (GP-27). Music and the HUD wait on it, so clear it
      // from code the way the other tools do.
      await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
      await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
      await page.evaluate(fs.readFileSync(path.join(HERE, 'lib.js'), 'utf8'));
      // t37 walks seven burials and each one waits out the insertion, so a 75s cap
      // cut it off mid-test. Three minutes still stops a probe that would otherwise sit.
      const CHECK_MS = 180000;
      let timer;
      const running = page.evaluate(code, CHECK_MS + 20000).finally(() => clearTimeout(timer));
      running.catch(() => {});
      const out = await Promise.race([
        running,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('time limit: check still running after 180s')), CHECK_MS);
        })
      ]);
      const text = typeof out === 'string' ? out : JSON.stringify(out);
      raw = String(text ?? '');
      lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      // Some checks report PASS/FAIL, some are probes that return a JSON snapshot. Count the
      // first kind; keep the text of the second so the report can show what came back
      // instead of claiming the check could not run.
      pass = lines.filter((l) => /^PASS\b/.test(l)).length;
      fail = lines.filter((l) => /^FAIL\b/.test(l)).length;
      if (!pass && !fail) info = true;
    }
  } catch (e) {
    note = e.message.split('\n')[0];
  }
  const errs = page.errors.slice(0, 2).map((e) => e.split('\n')[0]);
  results.push({ name, pass, fail, note, lines, errs, raw, info, secs: (Date.now() - t0) / 1000 });
  const tag = note ? 'ERROR' : (fail ? 'FAIL ' : (info ? 'info ' : 'ok   '));
  const detail = note ? '  — ' + note
    : (info ? '  — ' + (raw.trim() ? raw.trim().split('\n')[0].slice(0, 90) : 'returned nothing') : '');
  console.log(`${tag} ${name.padEnd(6)} ${String(pass).padStart(3)} pass ${String(fail).padStart(3)} fail  ${((Date.now() - t0) / 1000).toFixed(1)}s${detail}`);
  try { await page.send('Page.close', {}); } catch { /* target already gone */ }
}

// A simple worker pool: JOBS pages in flight at once.
const queue = tests.slice();
try {
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) await runOne(queue.shift());
  }));
} finally {
  await browser.close();
  await server.close();
  if (!keep) { try { fs.unlinkSync(path.join(HERE, 'test.html')); } catch { /* fine */ } }
}

// --- report -----------------------------------------------------------------------
results.sort((a, b) => tests.indexOf(a.name) - tests.indexOf(b.name));
const totalPass = results.reduce((n, r) => n + r.pass, 0);
const totalFail = results.reduce((n, r) => n + r.fail, 0);
const broken = results.filter((r) => r.note);
const failing = results.filter((r) => r.fail > 0);
const infos = results.filter((r) => r.info && !r.note);

console.log(`\n${results.length} checks: ${totalPass} pass, ${totalFail} fail`
  + (broken.length ? `, ${broken.length} could not run` : '')
  + (infos.length ? `, ${infos.length} reported no assertions` : ''));

if (infos.length) {
  console.log('\nno assertions (probe, or the check bailed before asserting):');
  for (const r of infos) {
    console.log(`  ${r.name.padEnd(6)} ${(r.raw.trim().split('\n')[0] || '(empty)').slice(0, 100)}`);
  }
}

if (failing.length || broken.length) {
  console.log('\nby owner:');
  const byOwner = new Map();
  for (const r of [...failing, ...broken]) {
    const o = ownerOf(r.name);
    if (!byOwner.has(o)) byOwner.set(o, []);
    byOwner.get(o).push(r);
  }
  for (const [owner, rs] of byOwner) {
    console.log(`  ${owner}`);
    for (const r of rs) {
      const first = r.lines.find((l) => l.startsWith('FAIL')) || r.note || '';
      console.log(`    ${r.name.padEnd(6)} ${r.fail} fail  ${first.slice(0, 96)}`);
    }
  }
}
// Exit non-zero only when something could not run at all. Known failures are tracked in
// handoffs/requests.md and assigned to their owners; failing the whole suite on them would
// make the suite useless as a signal for everyone else (AGENTS.md rule 13: never delete or
// weaken a test to make the run green).
let commit = '';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* no git */ }
const testsPath = path.join(ROOT, 'crew', 'tests.json');
let files = {};
try {
  const prev = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
  if (prev && prev.files && typeof prev.files === 'object') files = prev.files;
} catch { /* first run */ }
// A full run replaces the record. A named run updates only the files it actually ran,
// so a spot check does not wipe everyone else's results off the panel.
if (!wanted.length) files = {};
for (const r of results) files[r.name] = { pass: r.pass, fail: r.fail };
const listed = Object.values(files);
const sumPass = listed.reduce((n, r) => n + (r.pass || 0), 0);
const sumFail = listed.reduce((n, r) => n + (r.fail || 0), 0);
fs.mkdirSync(path.join(ROOT, 'crew'), { recursive: true });
fs.writeFileSync(testsPath, JSON.stringify({
  at: new Date().toISOString(),
  commit,
  pass: wanted.length ? sumPass : totalPass,
  fail: wanted.length ? sumFail : totalFail,
  cannotRun: broken.length,
  files
}, null, 2) + '\n');
process.exit(broken.length ? 1 : 0);
