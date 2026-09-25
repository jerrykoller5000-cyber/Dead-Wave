// nightsim - GB-56: play nights headless with a scripted marine at the HQ and log how each one goes.
//
//   node tools/nightsim.mjs                    nights 1..20, 3 pages at a time
//   node tools/nightsim.mjs 5 10 18 --jobs 2   just those nights
//   node tools/nightsim.mjs --out qa/nightsim.json --dt 0.0333 --god
//
// Each night gets a fresh page of the test build (fake three.js, like npm test), a real match start
// (it waits out the insertion), then T.setDay(n-1) + startPrep + hqStartWave with the marine at the
// HQ window. The game's clock is pinned to a fixed step (--dt, default 1/30 s) and its loop runs as
// fast as the machine allows, so a night takes less than its own length in real time; every time
// in the report is game time. The marine: the loadout a player plausibly has by that night (guns,
// armour, the machete from night 8; no turrets or walls), aims at the nearest zombie he can see past
// the HQ (the nearest of all if none) and holds fire,
// knifes whatever is in his face while he reloads, walks back to his post when knocked off it, and
// has his reserve topped up (ammo is not what this measures). Godmode stays off: a hit that would
// kill him is logged as a death (cause, what was round him) and he is set back to full, so the night
// carries on. --god turns godmode on instead (no deaths or damage logged).
//
// Per night: length (first spawn to last kill), pushes and breathers, the biggest pile-up (zombies
// within 1.5 m of one zombie) and the crowd on the marine (within 2.5 m), stuck zombies (moved under
// 1 m in 15 s, more than 8 m from him, not rising), zombies inside his body, lost ones (still out when the night stalls; they
// are counted and removed so the night can end), deaths and damage taken by cause, planned vs spawned
// vs killed. A night that runs past --cap (default 900 s) is ended and flagged.
// Stuck and lost records carry the zombie's tactics, cave trait, line-of-sight flag and flow-field
// heading, and the marine's state (weapon, magazine, rounds fired since the last kill), so a stall
// can be read from the JSON without a rerun.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TESTS = path.join(HERE, 'tests');
const PAGE = '_nightsim.html';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const JOBS = Math.max(1, Number(opt('--jobs', 3)) || 3);
const DT = Number(opt('--dt', 1 / 30)) || 1 / 30;
const CAP = Number(opt('--cap', 900)) || 900;
const OUT = opt('--out', null);
const GOD = argv.includes('--god');
const skip = new Set(['--jobs', '--dt', '--cap', '--out'].map((k) => argv.indexOf(k) + 1).filter((i) => i > 0));
let nights = argv.filter((a, i) => !a.startsWith('--') && !skip.has(i)).map(Number).filter((n) => n >= 1);
if (!nights.length) nights = Array.from({ length: 20 }, (_, i) => i + 1);

// Same page build as tools/tests/run-all.mjs, under its own name so a parallel npm test
// (which deletes test.html when it finishes) does not pull it out from under us.
function buildPage() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!map) throw new Error('no import map found in index.html');
  const fake = '<script type="importmap">{ "imports": { "three": "./fakethree.mjs", "three/webgpu": "./fakethree.mjs", "three/tsl": "./faketsl.mjs", "three/addons/": "./addons/" } }</script>';
  let out = src.replace(map[0], fake);
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  out = out.replace(/import (['"])\.\//g, 'import $1/');
  fs.writeFileSync(path.join(TESTS, PAGE), out);
}

// ---- runs inside the page ------------------------------------------------------------
async function playNight(o) {
  const T = window.TT, R = { night: o.night };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await startMatch(T, 'NightSim');
  let w0 = Date.now();
  while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 120000) await wait(100);
  const THREE = await import('three');
  // Pin the clock and let the loop run flat out (fakethree schedules each frame with setTimeout(step, 16.7)).
  const realST = window.setTimeout.bind(window), mc = new MessageChannel(), q = [];
  mc.port1.onmessage = () => { const f = q.shift(); if (f) f(); };
  window.setTimeout = function (f, d, ...a) {
    if (typeof f === 'function' && f.name === 'step' && d > 16 && d < 17) { q.push(() => f(...a)); mc.port2.postMessage(0); return 0; }
    return realST(f, d, ...a);
  };
  const calls = new Map();
  let simT = 0, mainClock = null, botFn = null;
  const origDelta = THREE.Clock.prototype.getDelta;
  THREE.Clock.prototype.getDelta = function () {
    origDelta.call(this);
    if (!mainClock) { const n = (calls.get(this) || 0) + 1; calls.set(this, n); if (n > 30) mainClock = this; }
    if (this === mainClock) { simT += o.dt; if (botFn) { try { botFn(o.dt); } catch (e) { R.botError = String(e && e.message); } } }
    return o.dt;
  };
  while (!mainClock) await wait(20);

  // Loadout by night.
  const has = (w) => T.getWeaponOwned && T.getWeaponOwned()[w];
  const buy = (w) => { T.addCash(5000); T.buyWeapon(w); };
  const gear = (k) => { const g = T.GEAR.find((x) => x.key === k); if (g) { T.addCash(1000); T.buyGear(g); } };
  const n = o.night;
  if (n >= 3) { buy('shotgun'); gear('helmet'); }
  if (n >= 5) { buy('m4'); gear('vest'); }
  if (n >= 8) { buy('ak'); gear('pads'); T.setMacheteOwned && T.setMacheteOwned(true); }
  if (n >= 11) buy('aa12');
  if (n >= 16) buy('minigun');
  const primary = ['minigun', 'ak', 'm4', 'pistol'].find((w) => w === 'pistol' || has(w));
  const close = ['aa12', 'shotgun'].find((w) => has(w)) || null;
  R.loadout = [primary, close, n >= 8 ? 'machete' : 'knife', 'armor ' + (T.getArmor ? T.getArmor() : 0)].filter(Boolean).join(', ');
  const equip = (w) => { if (T.getCurrentWeapon() === w) return; for (let i = 0; i < 14 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i); };
  equip(primary);
  if (o.god) T.runDevCommand('godmode');

  // The night.
  T.clearZombies && T.clearZombies();
  const post = { x: -5.9, z: -2.2 };
  T.player.position.set(post.x, T.sampleHeight(post.x, post.z), post.z);
  T.setDay(n - 1); T.startPrep();
  await wait(50);
  const pv = T.getWavePreview();
  R.planned = pv ? pv.total : null;
  R.trick = pv && pv.night ? pv.night.label || pv.night.trick || '' : '';
  const maxHp = T.getMaxHp();
  const deaths = [], dmgBy = {};
  let t0 = simT;
  let dmg = 0, dmgHp = 0, hits = 0;
  window.addEventListener('dw-game', (e) => {
    const d = e.detail || {};
    if (d.type !== 'player-damaged') return;
    hits++; dmg += d.amount || 0; dmgHp += d.toHp || 0;
    const c = d.cause || 'unknown'; dmgBy[c] = (dmgBy[c] || 0) + (d.amount || 0);
    if (d.fatal) {
      const p = T.player.position, near = {};
      for (const z of T.zombies) if (z.alive && Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) < 4) near[z.typeKey] = (near[z.typeKey] || 0) + 1;
      deaths.push({ t: +(simT - t0).toFixed(1), cause: c, near });
      T.setHp(maxHp);   // he gets up again; the damagePlayer that called us now sees hp > 0
    }
  });
  // Per-night records.
  let firstSpawn = null, lastSpawn = null, lastKill = null, lastKillCount = 0, killGap = 0;
  const pushes = [], lulls = []; let lastPush = -1, lullStart = null;
  let pile = { n: 0, t: 0, type: '' }, crowd = { n: 0, t: 0 }, maxAlive = 0;
  const trail = new WeakMap(), stuckSeen = new Set(), stuck = [];
  let sampleT = 0, knifeSwings = 0, meleeKills = 0, reloadKnife = 0, sw = 0, spawnedPrev = 0;
  let logT = 0, clickT = false; const samples = []; let inside = { n: 0, t: 0, depth: 0 };
  let fired = 0, firedAtKill = 0, lastW = null, lastMag = 0;
  const kills0 = () => T.getWaveDirectorState();
  botFn = (dt) => {
    const ws = T.getWaveDirectorState();
    if (ws.phase !== 'wave') return;
    const t = simT - t0;
    if (ws.waveSpawned > spawnedPrev) { if (firstSpawn === null) firstSpawn = t; lastSpawn = t; spawnedPrev = ws.waveSpawned; }
    const alive = T.zombies.filter((z) => z.alive && !z.dying);
    const killed = ws.waveSpawned - T.zombies.filter((z) => z.alive).length;
    if (killed > lastKillCount) { lastKillCount = killed; lastKill = t; killGap = 0; firedAtKill = fired; } else killGap += dt;
    if (ws.pace) {
      if (ws.pace.push !== lastPush) { lastPush = ws.pace.push; pushes.push(+t.toFixed(1)); }
      if (ws.pace.inLull && lullStart === null) lullStart = t;
      if (!ws.pace.inLull && lullStart !== null) { lulls.push(+(t - lullStart).toFixed(1)); lullStart = null; }
    }
    maxAlive = Math.max(maxAlive, alive.length);
    const p = T.player.position;
    // Back to the post if knocked off it.
    const bx = post.x - p.x, bz = post.z - p.z, bd = Math.hypot(bx, bz);
    let crowdNear = false;
    for (const z of alive) if (Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) < 3) { crowdNear = true; break; }
    if (bd > 3 && !crowdNear) { const s = Math.min(bd, 3.5 * dt); p.x += bx / bd * s; p.z += bz / bd * s; p.y = Math.max(p.y, T.sampleHeight(p.x, p.z)); }
    // Target: the nearest.
    let best = null, bdst = 1e9;
    // Target: the nearest he can see past the HQ (a player does not empty a magazine into the
    // wall at one he cannot see while another stands in the open); the nearest of all otherwise.
    const H = T.house, hcx = H && H.present ? H.group.position.x : 0, hcz = H && H.present ? H.group.position.z : 0, hh = H && H.present ? H.half : -1;
    const behindHouse = (x, z) => { if (hh < 0) return false; for (let i = 1; i < 24; i++) { const u = i / 24, qx = p.x + (x - p.x) * u, qz = p.z + (z - p.z) * u; if (Math.abs(qx - hcx) < hh && Math.abs(qz - hcz) < hh) return true; } return false; };
    let hid = null, hdst = 1e9;
    for (const z of alive) {
      if (z.riseT > 0) continue;
      const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z);
      if (behindHouse(z.mesh.position.x, z.mesh.position.z)) { if (d < hdst) { hdst = d; hid = z; } }
      else if (d < bdst) { bdst = d; best = z; }
    }
    if (!best) { best = hid; bdst = hdst; }
    T.__nsTarget = best;
    if (best) {
      // No pointer on a headless canvas, so the mouse aim never runs: set the aim point (chest
      // height) and the facing the way updateMouseAim would.
      T.setAimTargetDbg(best.mesh.position.x, best.mesh.position.z);
      T.aimTarget.y = best.mesh.position.y + (best.hitH || 1.45) * 0.7;
      T.setAimYawDbg(Math.atan2(best.mesh.position.x - p.x, best.mesh.position.z - p.z));
      // Close gun in their faces (under 5 m, kept to 6.5 m), the rifle further out; not mid-reload,
      // not more than every 3 s. (Keeping the shotgun out to 9 m left spiders strafing at 7 m alive
      // for a minute: half the pellets miss a small mover and the rest hit the wall beside it.)
      const cur = T.getCurrentWeapon();
      const want = close && (bdst < 5 || (cur === close && bdst < 6.5)) ? close : primary;
      sw -= dt;
      if (want !== cur && sw <= 0 && !T.isReloading()) { equip(want); sw = 3.0; }
      if ((T.getAmmo()[T.getCurrentWeapon()] | 0) === 0 && !T.isReloading()) T.startReload();
      // Semi-auto guns need a fresh press for every shot: click at the tick rate.
      const st = T.WEAPON_STATS[T.getCurrentWeapon()] || {};
      clickT = !clickT;
      T.setMouseFireDbg(bdst < 60 && (st.auto || st.spin || st.melee || st.flamer || clickT));
      { const w = T.getCurrentWeapon(), m = T.getAmmo()[w] | 0; if (w === lastW && m < lastMag) fired += lastMag - m; lastW = w; lastMag = m; }
      if (bdst < 2.2 && T.getKnifeCd() <= 0 && (T.isReloading() || (T.getAmmo()[T.getCurrentWeapon()] | 0) === 0)) {
        const before = T.zombies.filter((z) => z.alive).length; T.knifeAttack(); knifeSwings++;
        if (T.zombies.filter((z) => z.alive).length < before) meleeKills++;
      }
    } else T.setMouseFireDbg(false);
    // Ammo is not what this measures.
    sampleT += dt; logT += dt;
    if (logT >= 30) {
      logT = 0;
      samples.push({ t: Math.round(t), alive: alive.length, killed, w: T.getCurrentWeapon(), mag: T.getAmmo()[T.getCurrentWeapon()] | 0, rel: T.isReloading(), hp: Math.round(T.getHp()), near: +bdst.toFixed(1) });
    }
    if (sampleT >= 0.5) {
      sampleT = 0;
      // The knife may have killed one this tick (its mesh is gone): sample the live ones.
      const liveS = alive.filter((z) => z.alive && z.mesh);
      for (const c of ['.45', '12ga', '5.56mm', '7.62mm', '7.62 belt']) { T.addCash(200); T.buyAmmo(c, true); }
      let cr = 0;
      for (const z of liveS) if (Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) < 2.5) cr++;
      if (cr > crowd.n) crowd = { n: cr, t: +t.toFixed(1) };
      // Inside him: centre closer than his body (0.42) plus its own radius, less a margin.
      let ins = 0, dep = 0;
      for (const z of liveS) {
        if (z.riseT > 0) continue;
        const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z), lim = (z.radius || 0.4) + 0.42 - 0.1;
        if (d < lim) { ins++; dep = Math.max(dep, lim - d); }
      }
      if (ins > inside.n) inside = { n: ins, t: +t.toFixed(1), depth: +dep.toFixed(2) };
      for (const a of liveS) {
        let c = 0;
        for (const b of liveS) if (Math.hypot(a.mesh.position.x - b.mesh.position.x, a.mesh.position.z - b.mesh.position.z) < 1.5) c++;
        if (c > pile.n) pile = { n: c, t: +t.toFixed(1), type: a.typeKey, d: +Math.hypot(a.mesh.position.x - p.x, a.mesh.position.z - p.z).toFixed(0) };
      }
      for (const z of liveS) {
        let tr = trail.get(z); if (!tr) { tr = []; trail.set(z, tr); }
        tr.push([t, z.mesh.position.x, z.mesh.position.z]);
        while (tr.length && t - tr[0][0] > 15) tr.shift();
        if (tr.length > 25 && t - tr[0][0] >= 14.5 && z.riseT <= 0) {
          const mv = Math.hypot(z.mesh.position.x - tr[0][1], z.mesh.position.z - tr[0][2]);
          const dp = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z);
          if (mv < 1 && dp > 8 && !stuckSeen.has(z)) { stuckSeen.add(z); { const fd = T.flowDir ? T.flowDir(z.mesh.position.x, z.mesh.position.z) : null; stuck.push({ t: +t.toFixed(0), type: z.typeKey, x: +z.mesh.position.x.toFixed(1), z: +z.mesh.position.z.toFixed(1), d: +dp.toFixed(0), tactics: z.tactics || 'direct', trait: z.caveTrait || '', climber: !!z.climber, px: +p.x.toFixed(1), pz: +p.z.toFixed(1), flow: fd ? [+fd.x.toFixed(2), +fd.z.toFixed(2)] : null, unstick: +(z.unstickT || 0).toFixed(2), knock: +(z.knockT || 0).toFixed(2) }); } }
        }
      }
    }
  };
  T.hqStartWave();
  // The alarm sequence (flares, the sky shot) runs before beginWave.
  w0 = Date.now();
  while (T.getWaveDirectorState().phase !== 'wave' && Date.now() - w0 < 180000) await wait(50);
  if (T.getWaveDirectorState().phase !== 'wave') { R.error = 'the wave never began'; return JSON.stringify(R); }
  t0 = simT;
  // Run it out.
  const wall0 = Date.now();
  let lost = [], capped = false;
  for (;;) {
    await wait(250);
    const ws = T.getWaveDirectorState();
    const t = simT - t0;
    const aliveN = T.zombies.filter((z) => z.alive).length;
    if (ws.phase !== 'wave' || (ws.waveSpawned >= ws.waveTotal && aliveN === 0)) break;
    // Stalled: all out, nothing killed for 60 s.
    if (ws.waveSpawned >= ws.waveTotal && killGap > 60) {
      const p = T.player.position;
      lost = T.zombies.filter((z) => z.alive).map((z) => ({ type: z.typeKey, d: +Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z).toFixed(0), stuck: stuckSeen.has(z), x: +z.mesh.position.x.toFixed(1), z: +z.mesh.position.z.toFixed(1), px: +p.x.toFixed(1), pz: +p.z.toFixed(1), hp: Math.round(z.hp), line: z.lineClear, target: T.__nsTarget === z, tactics: z.tactics || 'direct', dying: !!z.dying, knock: +(z.knockT || 0).toFixed(1), riseT: z.riseT, marine: { y: +p.y.toFixed(2), gy: +T.sampleHeight(p.x, p.z).toFixed(2), w: T.getCurrentWeapon(), mag: T.getAmmo()[T.getCurrentWeapon()] | 0, rel: T.isReloading(), hp: Math.round(T.getHp()), firedSinceKill: fired - firedAtKill } }));
      for (const z of T.zombies.slice()) if (z.alive) T.killZombie(z);
      break;
    }
    if (t > o.cap) { capped = true; for (const z of T.zombies.slice()) if (z.alive) T.killZombie(z); break; }
    if (Date.now() - wall0 > o.wallCap) { capped = true; R.wallCapped = true; break; }
  }
  botFn = null;
  T.setMouseFireDbg(false);
  const ws = T.getWaveDirectorState();
  if (lullStart !== null) lulls.push(+((simT - t0) - lullStart).toFixed(1));
  Object.assign(R, {
    waveTotal: ws.waveTotal, spawned: ws.waveSpawned, killed: lastKillCount,
    firstSpawn: firstSpawn && +firstSpawn.toFixed(1), lastSpawn: lastSpawn && +lastSpawn.toFixed(1), lastKill: lastKill && +lastKill.toFixed(1),
    length: lastKill !== null && firstSpawn !== null ? +(lastKill - firstSpawn).toFixed(1) : null,
    pushes, lulls, maxAlive, pile, crowd, inside, stuck, lost, capped,
    deaths, damage: Math.round(dmg), damageHp: Math.round(dmgHp), hits, damageBy: Object.fromEntries(Object.entries(dmgBy).map(([k, v]) => [k, Math.round(v)])),
    knifeSwings, meleeKills, samples, knees: T.getHitStumble ? T.getHitStumble().knees : null,
    wallSecs: Math.round((Date.now() - wall0) / 1000), errors: []
  });
  return JSON.stringify(R);
}

// ---- node side -----------------------------------------------------------------------
buildPage();
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const lib = fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8');
const results = [];
async function runNight(night) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const t0 = Date.now();
  try {
    await page.goto(`${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer`, { timeout: 120000 });
    if (!await page.waitFor('!!window.TT', { timeout: 120000 })) throw new Error('window.TT never appeared: ' + (page.errors[0] || '').split('\n')[0]);
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(lib);
    const o = { night, dt: DT, cap: CAP, god: GOD, wallCap: 40 * 60000 };
    const raw = await page.evaluate(`(${playNight.toString()})(${JSON.stringify(o)})`, 45 * 60000);
    const r = JSON.parse(raw);
    r.errors = page.errors.slice(0, 3).map((e) => e.split('\n')[0]);
    results.push(r);
    if (r.error) { console.log(`night ${night}  ERROR ${r.error}`); } else console.log(`night ${String(night).padStart(2)}  ${r.length}s  spawned ${r.spawned}/${r.planned}  deaths ${r.deaths.length}  stuck ${r.stuck.length}  lost ${r.lost.length}  pile ${r.pile.n}  (${((Date.now() - t0) / 1000).toFixed(0)}s real)`);
  } catch (e) {
    results.push({ night, error: e.message.split('\n')[0] });
    console.log(`night ${night}  ERROR ${e.message.split('\n')[0]}`);
  }
  try { await page.send('Page.close', {}); } catch { /* gone */ }
}
const queue = nights.slice();
try {
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await runNight(queue.shift()); }));
} finally {
  await browser.close();
  await server.close();
  try { fs.unlinkSync(path.join(TESTS, PAGE)); } catch { /* fine */ }
}
results.sort((a, b) => a.night - b.night);
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true }); fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify({ dt: DT, god: GOD, results }, null, 1)); }
// Markdown table.
const cause = (r) => { const m = {}; for (const d of r.deaths || []) m[d.cause] = (m[d.cause] || 0) + 1; return Object.entries(m).map(([k, v]) => k + ' ' + v).join(', ') || '-'; };
console.log('\n| Night | Planned | Spawned | Killed | Length s | Last spawn s | Pushes (start s) | Breathers s | Max alive | Pile-up | Crowd on him | Inside him | Stuck | Lost | Deaths | Damage | Knees |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  if (r.error) { console.log(`| ${r.night} | ERROR ${r.error} |`); continue; }
  console.log(`| ${r.night} | ${r.planned} | ${r.spawned} | ${r.killed} | ${r.length}${r.capped ? ' (capped)' : ''} | ${r.lastSpawn} | ${r.pushes.length} (${r.pushes.join(', ')}) | ${r.lulls.join(', ') || '-'} | ${r.maxAlive} | ${r.pile.n} ${r.pile.type} @${r.pile.t}s ${r.pile.d}m | ${r.crowd.n} | ${r.inside.n} (${r.inside.depth} m) | ${r.stuck.length} | ${r.lost.length} | ${r.deaths.length} (${cause(r)}) | ${r.damage} | ${r.knees} |`);
}
process.exit(0);
