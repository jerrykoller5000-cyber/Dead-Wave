// tools/cpu-profile.mjs — CU-18. Measure, don't change.
//
//   node tools/cpu-profile.mjs
//   node tools/cpu-profile.mjs --seconds 6 --count 500 --headless
//
// Starts a match, spawns a megaswarm, and takes a DevTools CPU profile.
// Prints the top functions by self time, and how samples split between the
// zombie update, collision resolution, and drawing.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const num = (flag, d) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? Number(argv[i + 1]) || d : d;
};
const SECONDS = num('--seconds', 8);
const COUNT = num('--count', 500);

const PHYSICS = new Set([
  'resolveHardBuildCollisions', 'resolveSoftBarricades', 'resolveStaticProps',
  'resolveTreeCollisions', 'resolveDeckBody'
]);
const ZOMBIE = new Set([
  'updateZombies', 'updateFlowFields', 'updateZombieFires', 'updateZombieWindowClimb'
]);

function tag(name) {
  if (PHYSICS.has(name)) return 'physics';
  if (name === 'render' || name === 'renderFrame' || name === 'renderBufferDirect') return 'draw';
  if (ZOMBIE.has(name)) return 'zombie';
  return null;
}

function summarize(profile) {
  const nodes = new Map((profile.nodes || []).map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes || []) {
    for (const c of n.children || []) parent.set(c, n.id);
  }
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  const self = new Map();
  const buckets = { zombie: 0, physics: 0, draw: 0, other: 0 };
  let total = 0;
  const category = (id) => {
    const seen = new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      const name = nodes.get(id)?.callFrame?.functionName || '';
      const hit = tag(name);
      if (hit) return hit;
      id = parent.get(id);
    }
    return 'other';
  };
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 1000;
    total += dt;
    const id = samples[i];
    const n = nodes.get(id);
    const cf = n?.callFrame || {};
    const name = cf.functionName || '(anonymous)';
    const url = (cf.url || '').split('/').pop() || '';
    const key = `${name}  ${url}:${cf.lineNumber ?? ''}`;
    const row = self.get(key) || { us: 0 };
    row.us += dt;
    self.set(key, row);
    buckets[category(id)] += dt;
  }
  return { total, self, buckets, samples: samples.length };
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: argv.includes('--headless') || !argv.includes('--gpu') });
const url = `${server.origin}/index.html?debug=1&raf=timer`;
console.log(`cpu-profile: ${url}`);
console.log(`cpu-profile: ${COUNT} shamblers, ${SECONDS}s\n`);

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Profile';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
  const made = await page.evaluate(`TT.spawnMegaswarm(${COUNT | 0})`);
  const state = await page.evaluate(`({ phase: TT.getPhase(), zombies: TT.zombies.length, deploying: document.body.classList.contains('deploying') })`);
  console.log(`spawned ${made}   phase ${state.phase}   zombies ${state.zombies}   deploying ${state.deploying}`);
  await page.send('Profiler.enable');
  await page.send('Profiler.setSamplingInterval', { interval: 1000 });
  await page.send('Profiler.start');
  await page.evaluate(`new Promise(r => setTimeout(r, ${SECONDS * 1000}))`);
  const { profile } = await page.send('Profiler.stop', {}, 180000);
  const snap = await page.evaluate('TT.perfSnapshot()');
  const { total, self, buckets, samples } = summarize(profile);
  const ms = (us) => (us / 1000).toFixed(1);
  const pct = (us) => total ? (100 * us / total).toFixed(1) : '0.0';
  console.log(`\nsamples ${samples}   profiled ${ms(total)} ms`);
  console.log(`fps ${snap.fps.toFixed(1)}   low ${snap.low.toFixed(1)}   worst ${snap.worst.toFixed(1)} ms   hitch ${snap.hitches}`);
  console.log('\nframe split (sample time, nearest owning function):');
  for (const key of ['zombie', 'physics', 'draw', 'other']) {
    console.log(`  ${key.padEnd(8)} ${pct(buckets[key]).padStart(5)}%   ${ms(buckets[key])} ms`);
  }
  const ranked = [...self.entries()].sort((a, b) => b[1].us - a[1].us);
  console.log('\ntop functions by self time:');
  for (const [key, row] of ranked.slice(0, 20)) {
    console.log(`  ${pct(row.us).padStart(5)}%  ${ms(row.us).padStart(8)} ms  ${key}`);
  }
  const pageFns = ranked.filter(([key]) => key.includes('index.html'));
  console.log('\nindex.html functions by self time:');
  for (const [key, row] of pageFns.slice(0, 15)) {
    console.log(`  ${pct(row.us).padStart(5)}%  ${ms(row.us).padStart(8)} ms  ${key}`);
  }
  if (!pageFns.length) console.log('  (none sampled)');
} finally {
  await browser.close();
  await server.close();
}
