(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'WavePrev';
    document.getElementById('modeHunt').click();
    let started = false;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
    }
    ok(started, 'match reached prep after Play');
    ok(typeof T.getWavePreview === 'function', 'getWavePreview exported on TT');
    ok(typeof T.getWaveDirectorState === 'function', 'getWaveDirectorState exported');
    ok(typeof T.getActiveCaveIndices === 'function', 'getActiveCaveIndices exported');

    const prev = T.getWavePreview();
    ok(!!prev, 'getWavePreview() returns a plan during prep');
    if (!prev) return out.join('\n');

    ok(prev.day === T.getDay(), 'preview.day matches director day (' + prev.day + ')');
    ok(typeof prev.bloodMoon === 'boolean', 'bloodMoon boolean');
    ok(typeof prev.surround === 'boolean', 'surround boolean');
    ok(typeof prev.hasColossus === 'boolean', 'hasColossus boolean');
    ok(prev.total === prev.queue.length, 'total === queue.length (' + prev.total + ')');
    ok(prev.caveByIndex.length === prev.queue.length, 'caveByIndex parallel to queue');
    ok(Array.isArray(prev.caveIndices), 'caveIndices array');
    ok(Array.isArray(prev.bearings), 'bearings array');
    ok(Array.isArray(prev.byTypeAndCave), 'byTypeAndCave array');
    ok(!prev.queue.includes('caveguard'), 'caveguard never in preview queue');

    const caves = T.POI.caves;
    let drownedOk = true, caveOk = true, used = new Set();
    let groundOk = true, groundN = 0;   // GB-40 / D-29: day 1's ground risers (caveIndex -1)
    for (let i = 0; i < prev.queue.length; i++) {
      const tk = prev.queue[i];
      const ci = prev.caveByIndex[i];
      if (prev.groundByIndex && prev.groundByIndex[i]) {
        if (ci !== -1 || tk !== 'shambler') groundOk = false; else groundN++;
      } else if (tk === 'drowned') {
        if (ci !== -1) drownedOk = false;
      } else {
        if (!(ci >= 0 && ci < caves.length)) caveOk = false;
        else used.add(ci);
      }
    }
    ok(drownedOk, 'drowned rows use caveIndex -1');
    ok(groundOk && groundN === (prev.groundRisers || 0), 'ground rows (D-29) use caveIndex -1 and match groundRisers (' + groundN + ')');
    if (prev.day === 1) ok(prev.total === 15 && groundN >= 7 && groundN <= 8, 'day 1 is 15, 7-8 from the ground (' + prev.total + '/' + groundN + ')');
    ok(caveOk, 'non-drowned rows use valid POI.caves indices');
    ok(prev.caveIndices.every((i) => used.has(i)), 'caveIndices ⊆ used mouths');
    ok([...used].every((i) => prev.caveIndices.includes(i)), 'used mouths ⊆ caveIndices');

    let bucketSum = 0;
    const counts = new Map();
    for (let i = 0; i < prev.queue.length; i++) {
      const k = prev.queue[i] + '\0' + prev.caveByIndex[i];
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let bucketsMatch = true;
    for (const b of prev.byTypeAndCave) {
      bucketSum += b.count;
      const k = b.typeKey + '\0' + b.caveIndex;
      if (counts.get(k) !== b.count) bucketsMatch = false;
      if (b.caveIndex === -1) {
        if (b.caveTheme !== null || b.caveName !== null) bucketsMatch = false;
      } else {
        const c = caves[b.caveIndex];
        if (!c || b.caveTheme !== (c.theme || null) || b.caveName !== (c.name || null)) bucketsMatch = false;
      }
    }
    ok(bucketSum === prev.total, 'byTypeAndCave counts sum to total');
    ok(bucketsMatch, 'byTypeAndCave matches queue×caveByIndex');

    const active = T.getActiveCaveIndices();
    ok(JSON.stringify(active) === JSON.stringify(prev.caveIndices), 'getActiveCaveIndices === preview.caveIndices');

    const st = T.getWaveDirectorState();
    ok(st && st.phase === 'prep' && st.wavePreview === prev, 'director state exposes frozen preview');
    ok(Array.isArray(st.caveByIndex) && st.caveByIndex.length === prev.total, 'director caveByIndex length');

    ok(T.getWavePreview(prev.day) === prev, 'getWavePreview(same day) returns plan');
    ok(T.getWavePreview(prev.day + 99) == null, 'getWavePreview(other day) is null');

    // Consume plan: start wave and drive spawnWaveBatch directly
    if (T.skipGrace) T.skipGrace();
    if (T.skipPrep) T.skipPrep();
    await wait(50);
    ok(T.getPhase() === 'wave', 'skipPrep entered wave');

    const planC = prev.caveByIndex.slice();
    const st0 = T.getWaveDirectorState();
    const q0 = st0.waveQueue.length;
    const c0 = st0.caveByIndex.length;
    const spawned0 = st0.waveSpawned || 0;
    ok(q0 === prev.total && c0 === prev.total, 'working queues still full at wave start');

    // GB-15: count plan spawns via waveSpawned, not all alive zombies.
    // Screamers (tactics=scream) call up to 3 shambler/feral friends mid-wave;
    // those extras are not shifted off waveQueue and made the lockstep check flake.
    let made = 0;
    for (let i = 0; i < 80 && made < 4; i++) {
      if (T.spawnWaveBatch) T.spawnWaveBatch(0.25);
      await wait(16);
      made = ((T.getWaveDirectorState().waveSpawned || 0) - spawned0);
    }
    const st1 = T.getWaveDirectorState();
    made = (st1.waveSpawned || 0) - spawned0;
    const alive = T.zombies.filter(z => z.alive).length;
    ok(made >= 1, 'spawnWaveBatch produced plan spawns (' + made + '; alive ' + alive + ')');
    ok(st1.waveQueue.length === q0 - made || made === 0, 'queue drained in lockstep with plan spawns (q ' + q0 + '→' + st1.waveQueue.length + ', plan-made ' + made + ')');
    ok(st1.caveByIndex.length === st1.waveQueue.length, 'caveByIndex stays parallel while draining');

    // Non-drowned bodies should stand near a planned mouth
    let near = 0, checked = 0;
    for (const z of T.zombies) {
      if (!z.alive) continue;
      const tk = z.typeKey || z.type;
      if (tk === 'drowned' || z.groundRise) continue;
      checked++;
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      let best = Infinity, bestIdx = -1;
      for (let i = 0; i < caves.length; i++) {
        const d = Math.hypot(caves[i].x - zx, caves[i].z - zz);
        if (d < best) { best = d; bestIdx = i; }
      }
      if (best < 10 && planC.includes(bestIdx)) near++;
    }
    if (checked === 0) ok(true, 'spawn mouth check skipped (only drowned / none)');
    else ok(near >= 1, 'spawned bodies near planned caves (' + near + '/' + checked + ')');

    ok(prev.caveIndices.length >= 1 || prev.surround || planC.every(c => c < 0),
      'ambush A has a caveIndices set (or surround/all-drowned day)');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
