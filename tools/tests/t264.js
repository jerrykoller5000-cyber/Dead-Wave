// t264 - GB-196 (D-82, docs/specs/day-missions.md section 3): the hikers' first-aid kit. The bag hangs on a rope over a
// bough by the river, about 5 m up; a round through the rope cuts it. A dry run lands it on the ground; a river run
// floats it downstream, E within 2 m takes it (the site's own claim: 1 medpen), and left ~40 s it snags in the pool
// where 3-5 drowned rise when he comes near. The site stays locked until the kit is his, and it runs once a run.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const tap = async () => { key('keydown'); await wait(60); key('keyup'); await wait(60); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const D = () => T.hikersDbg();
  const shoot = (piece, off) => {   // from his eyes at the middle of a rope piece, or off metres to the side of it, as he would
    const [a, b] = piece, P = T.player.position, e = { x: P.x, y: P.y + 1.6, z: P.z };
    let m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const hx = m.x - e.x, hz = m.z - e.z, hl = Math.hypot(hx, hz) || 1;
    m = { x: m.x - hz / hl * off, y: m.y, z: m.z + hx / hl * off };
    const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, L = Math.hypot(dx, dy, dz) || 1;
    const r = T.fireRoundDbg(e.x, e.y, e.z, dx / L, dy / L, dz / L, 20, 90, 0); const trail = [];
    for (let i = 0; i < 20; i++) { T.stepProjectilesDbg(0.016); if (r && i % 2 === 0) trail.push(r.pos.x.toFixed(1) + ',' + r.pos.y.toFixed(1) + ',' + r.pos.z.toFixed(1) + (r.hit ? 'H' : '')); }
    return 'rope mid ' + [m.x, m.y, m.z].map((v) => v.toFixed(1)).join(',') + ' from ' + [e.x, e.y, e.z].map((v) => v.toFixed(1)).join(',') + ' round ' + (r ? trail.join(' ') : 'none');
  };
  try {
    await startMatch(T, 'HikersKit');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    // Dry run: hanging, locked, a miss does nothing, a hit cuts it, it lands on the ground.
    T.runDevCommand('site hikers dry');
    await until(() => !!D().bag, 4000);
    let d = D();
    ok(!!d.tree && !!d.bag && d.kit.phase === 'hanging', 'the bag hangs from a tree by the river (' + (d.kit && d.kit.phase) + ')');
    const up = d.hang.y - T.sampleHeight(d.hang.x, d.hang.z);
    ok(up > 4 && up < 6.5, 'about 5 m up: ' + up.toFixed(2) + ' m');
    ok(d.reach && d.reach.blockedBy === 'locked', 'the site is locked while the kit hangs (' + (d.reach && d.reach.blockedBy) + ')');
    shoot(d.rope[1], 1.5); await wait(100);
    ok(D().kit.phase === 'hanging', 'a round 1.5 m off the rope leaves it (' + D().kit.phase + ')');
    shoot(d.rope[1], 0); await wait(100);
    ok(D().kit.phase !== 'hanging', 'a round through the rope cuts it (' + D().kit.phase + ')');
    await until(() => D().kit.phase !== 'falling', 5000);
    d = D();
    ok(d.kit.phase === 'ground' && !d.kit.toRiver, 'the dry run: it lands on the ground (' + d.kit.phase + ')');
    ok(Math.abs(d.bag.y - T.sampleHeight(d.bag.x, d.bag.z)) < 0.6, 'on the ground: ' + (d.bag.y - T.sampleHeight(d.bag.x, d.bag.z)).toFixed(2) + ' m over it');
    // River run: it floats, ages into the pool, the drowned rise once he comes near.
    T.runDevCommand('site hikers river');
    await until(() => !!D().bag && D().kit.phase === 'hanging', 4000);
    d = D();
    if (!d.river) { const P0 = T.getObjectiveProps().props['objective:hikers-cache'].centre; ok(false, 'the hikers tree has no river by it (camp ' + P0.x.toFixed(0) + ',' + P0.z.toFixed(0) + ', tree ' + d.tree.x.toFixed(0) + ',' + d.tree.z.toFixed(0) + ')'); throw new Error('no river'); }
    const sh = shoot(d.rope[1], 0);
    await until(() => D().kit.phase !== 'hanging' && D().kit.phase !== 'falling', 6000);
    if (D().kit.phase === 'hanging') out.push('INFO river shot missed: ' + sh + ' player ' + T.player.position.x.toFixed(1) + ',' + T.player.position.z.toFixed(1));
    ok(D().kit.phase === 'floating', 'the river run: it splashes down and floats (' + D().kit.phase + ')');
    const p0 = { ...D().bag }; await wait(1500); const p1 = D().bag;
    const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    ok(moved > 0.2, 'the current carries it: ' + moved.toFixed(2) + ' m in 1.5 s');
    const P = T.player.position;
    P.set(p1.x + 6, p1.y, p1.z); await wait(150);
    ok(!D().grabbable, 'not in reach from 6 m');
    T.hikersAgeDbg(45);
    d = D();
    ok(d.kit.phase === 'snagged' && !!d.pool, 'left 40 s, it snags in the pool (' + d.kit.phase + ')');
    T.clearZombies(); const before = T.zombies.filter((z) => z.alive).length;
    P.set(d.bag.x + 30, d.bag.y + 1, d.bag.z); await wait(300);
    ok(!D().kit.risen, 'nothing rises while he is far off');
    P.set(d.bag.x + 8, d.bag.y + 1, d.bag.z); await until(() => D().kit.risen, 3000);
    const drowned = T.zombies.filter((z) => z.alive && z.typeKey === 'drowned').length;
    ok(D().kit.risen && drowned >= 3 && drowned <= 5, (drowned) + ' drowned rise at the pool (3-5; ' + (T.zombies.filter((z) => z.alive).length - before) + ' new; risen ' + D().kit.risen + ', he is ' + Math.hypot(P.x - D().bag.x, P.z - D().bag.z).toFixed(1) + ' m off, zombies ' + T.zombies.length + ')');
    // He takes it: E within 2 m, the site's claim, 1 medpen.
    T.clearZombies();
    const med0 = T.getMedkits() | 0;
    P.set(d.bag.x + 1.2, d.bag.y + 0.2, d.bag.z); await wait(200);
    ok(D().grabbable, 'within 2 m it can be taken');
    ok(D().reach && D().reach.blockedBy === 'locked', 'the site itself stays locked until the kit is his; only the bag is in reach (' + (D().reach && D().reach.blockedBy) + ')');
    for (let i = 0; i < 4 && D().kit.phase !== 'caught'; i++) { P.set(d.bag.x + 1.2, d.bag.y + 0.2, d.bag.z); await tap(); await wait(250); }
    d = D();
    ok(d.kit.phase === 'caught' && d.kit.done, 'E takes the kit (' + d.kit.phase + ')');
    ok(d.site === 'ready-to-claim' || d.site === 'claimed', 'through the site claim (' + d.site + ')');
    await wait(400);
    ok((T.getMedkits() | 0) === med0 + 1, 'the reward: one medpen (' + med0 + ' -> ' + T.getMedkits() + ')');
    // Once a run: the dev command cannot bring it back on the same run.
    T.runDevCommand('site hikers river'); await wait(300);
    ok(D().site === 'claimed' || D().site === 'ready-to-claim', 'once a run: the site stays taken (' + D().site + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();