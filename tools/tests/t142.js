// t142 - CU-52 (P-44): Space beside a sandbag, wire, barricade or unbarred window
// hops him over in about 0.5 s. A plain wall does not. A ring of barricades can be left.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (n) => (n == null || !Number.isFinite(n)) ? 'n/a' : Number(n).toFixed(2);
  function standBeside(b) {
    const box = T.thinBoxFor(b);
    const thinX = box.hx < box.hz;
    const half = thinX ? box.hx : box.hz;
    const x = thinX ? box.cx - (half + 0.85) : box.cx;
    const z = thinX ? box.cz : box.cz - (half + 0.85);
    T.player.position.set(x, T.sampleHeight(x, z), z);
    return box;
  }
  function pastFace(box, x, z) {
    const thinX = box.hx < box.hz;
    return thinX ? Math.abs(x - box.cx) - box.hx : Math.abs(z - box.cz) - box.hz;
  }
  function overlapping(box, x, z) {
    return Math.abs(x - box.cx) < box.hx + 0.42 && Math.abs(z - box.cz) < box.hz + 0.42;
  }
  async function settle() {
    for (let i = 0; i < 15; i++) await wait(40);
  }
  async function hop(box) {
    const before = T.speedMult();
    const started = T.tryVault();
    const during = T.speedMult();
    let frames = 0;
    for (let i = 0; i < 40 && T.isVaulting(); i++) { await wait(50); frames++; }
    const p = T.player.position;
    const past = pastFace(box, p.x, p.z);
    const gy = T.sampleHeight(p.x, p.z);
    const slid = T.resolveHardBuildCollisions(p.x, p.z, 0.42, true, p.y);
    const shove = Math.hypot(slid.x - p.x, slid.z - p.z);
    return { started, before, during, past, grounded: Math.abs(p.y - gy) < 0.35, shove, vaulting: T.isVaulting(), frames };
  }
  try {
    await startMatch(T, 'Vault');
    T.unlockAllBuilds();
    const p = T.player.position;
    const gx = T.gridIndex(40), gz = T.gridIndex(40);
    const yPad = T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz));
    if (T.levelGroundRect) T.levelGroundRect(T.gridCentre(gx - 4), T.gridCentre(gz - 4), T.gridCentre(gx + 4), T.gridCentre(gz + 4), yPad, 6);
    for (const t of T.trees) {
      if (Math.hypot(t.x - 40, t.z - 40) < 18) { t.alive = false; t.stump = false; }
    }
    p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
    await settle();

    const bag = T.placeBuildAt('sandbag', gx, gz, 0);
    standBeside(bag);
    await settle();
    const bagHop = await hop(T.thinBoxFor(bag));
    ok(bagHop.started, 'a sandbag starts a vault');
    ok(bagHop.past >= 0.5, 'he is ' + f2(bagHop.past) + ' m past the sandbag (want >= 0.5)');
    ok(bagHop.grounded && !bagHop.vaulting, 'he is down and the hop is over (' + bagHop.frames + ' waits)');
    ok(bagHop.shove < 0.08, 'he is not still inside it (push ' + f2(bagHop.shove) + ')');
    ok(bagHop.during <= bagHop.before * 0.71 && bagHop.during >= bagHop.before * 0.69, 'during the hop he keeps 70% of his speed (' + f2(bagHop.during) + ' of ' + f2(bagHop.before) + ')');

    const wire = T.placeBuildAt('wire', gx + 2, gz, 0);
    standBeside(wire);
    await settle();
    const wireHop = await hop(T.thinBoxFor(wire));
    ok(wireHop.started && wireHop.past >= 0.5 && wireHop.grounded, 'wire: ' + f2(wireHop.past) + ' m past, grounded ' + wireHop.grounded);

    const bar = T.placeBuildAt('barricade', gx + 2, gz + 2, 0);
    standBeside(bar);
    await settle();
    const barHop = await hop(T.thinBoxFor(bar));
    ok(barHop.started && barHop.past >= 0.5 && barHop.shove < 0.08, 'barricade: ' + f2(barHop.past) + ' m past, push ' + f2(barHop.shove));

    const wall = T.placeBuildAt('wall', gx - 2, gz, 0);
    standBeside(wall);
    await settle();
    ok(T.tryVault() === false, 'a plain wall does not vault');

    const win = T.placeBuildAt('wall', gx - 2, gz + 2, 0);
    win.opening = 'window';
    win.barred = false;
    standBeside(win);
    await settle();
    const winHop = await hop(T.thinBoxFor(win));
    ok(winHop.started && winHop.past >= 0.5, 'an unbarred window vaults (' + f2(winHop.past) + ' m past)');

    const ringX = gx, ringZ = gz + 4;
    const ring = [];
    for (let q = 0; q < 4; q++) ring.push(T.placeBuildAt('barricade', ringX, ringZ, q));
    const cx = T.gridCentre(ringX), cz = T.gridCentre(ringZ);
    p.set(cx, T.sampleHeight(cx, cz), cz);
    await settle();
    const left = T.tryVault();
    for (let i = 0; i < 40 && T.isVaulting(); i++) await wait(50);
    const stuck = ring.some((b) => b && overlapping(T.thinBoxFor(b), p.x, p.z));
    const escaped = Math.hypot(p.x - cx, p.z - cz) > 0.9;
    ok(left && escaped && !stuck && !T.isVaulting(), 'a ring of barricades can be left (moved ' + f2(Math.hypot(p.x - cx, p.z - cz)) + ' m, stuck ' + stuck + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
