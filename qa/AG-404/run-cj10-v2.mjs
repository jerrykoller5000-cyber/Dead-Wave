import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const OUT_ROOT = 'qa/AG-404/cj10-v2';
const LIVE = 'index.html';
const COPY = 'review/CJ-10/index.casings-v2.html';

const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const liveMd5 = md5(LIVE);
const copyMd5 = md5(COPY);
assert.equal(liveMd5.slice(0, 8), '22afb368', `Expected live index.html 22afb368, got ${liveMd5}`);
assert.equal(copyMd5.slice(0, 8), '8f49f5df', `Expected casings-v2 8f49f5df, got ${copyMd5}`);

const liveSha = sha256(LIVE);
const copySha = sha256(COPY);

mkdirSync(OUT_ROOT, { recursive: true });

// Reuse exact GP-20283 third-person camera right vectors so pairs match GP-20283.
const paired = Object.fromEntries(
  ['third-a', 'third-b'].flatMap((group) =>
    Object.entries(JSON.parse(readFileSync(`review/GP-20283/${group}-r1/before/receipt.json`, 'utf8')).shots)
  )
);

const ALL_7 = ['minigun', 'pistol', 'uzi', 'm4', 'ak', 'sniper', 'shotgun'];
const FIRST_3 = ['pistol', 'ak', 'minigun'];

function installCases() {
  const T = TT, next = () => new Promise((r) => requestAnimationFrame(r));
  const V = T.THREE.Vector3, dt = 1 / 60, draw = T.renderer.backend;
  const list = () => T.m240VisDbg().casingsList;
  const viewport = () => [innerWidth, innerHeight];
  const submitted = new Set();
  const backendDraw = draw.draw;
  draw.draw = function (render, info) {
    const object = render.object;
    const isCase = object?.userData?.caseOf === current || object?.userData?.shell === true;
    if (!isCase) return backendDraw.call(this, render, info);
    const count = info.render.drawCalls;
    const result = backendDraw.call(this, render, info);
    if (info.render.drawCalls > count && render.camera.type === 'PerspectiveCamera') submitted.add(object);
    return result;
  };
  const step = () => { submitted.clear(); T.stepFrame(dt); };
  const present = async () => { await draw.device.queue.onSubmittedWorkDone(); await next(); await next(); };
  const visible = (object) => { for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
  let side, body, fireMark, current, cases, tracked, seen, randomState;
  const ref = new T.THREE.Raycaster(), reverse = new T.THREE.Raycaster();
  function scopeBody() {
    const root = T.getMarine(), meshes = [];
    const owned = new Set([...Object.values(T.weaponMeshes ?? {}), ...Object.values(T.offhandMeshes ?? {})]);
    root.traverse((node) => {
      if (!node.isMesh || !visible(node) || node.isInstancedMesh || node.name.includes('shadow')) return;
      for (let parent = node; parent && parent !== root; parent = parent.parent) if (owned.has(parent)) return;
      meshes.push(node);
    });
    return meshes;
  }
  function scanSegment(from, to) {
    if (!body.length || !from || to.distanceTo(T.player.position) > 2.05) return [];
    const length = from.distanceTo(to);
    if (length < 1e-7) return [];
    const direction = to.clone().sub(from).multiplyScalar(1 / length);
    ref.set(from, direction); ref.near = 0; ref.far = length;
    reverse.set(to, direction.clone().negate()); reverse.near = 0; reverse.far = length;
    const captureHit = (ray, name) => ray.intersectObjects(body.filter(visible), false).slice(0, 2).map((hit) => ({
      direction: name,
      mesh: hit.object.name || hit.object.parent?.name || hit.object.type,
      point: hit.point.toArray(),
      distance: hit.distance,
      skin: hit.object.isSkinnedMesh === true,
    }));
    return [...captureHit(ref, 'forward'), ...captureHit(reverse, 'backward')];
  }
  function capture(row, index) {
    const { mesh } = row;
    const point = mesh.getWorldPosition(new V());
    const projected = point.clone().project(T.camera);
    const viewPoint = point.clone().applyMatrix4(T.camera.matrixWorldInverse);
    const [w, h] = viewport();
    const ground = T.sampleHeight(point.x, point.z);
    const box = mesh.geometry;
    if (!box.boundingSphere) box.computeBoundingSphere();
    const radius = box.boundingSphere.radius * Math.max(...mesh.scale.toArray());
    const origin = T.player.position;
    const prev = tracked.get(row);
    const intersection = scanSegment(prev?.point, point);
    const data = {
      index,
      kind: mesh.userData.caseOf ?? (mesh.userData.shell ? 'shotgun' : null),
      hull: mesh.userData.hullType ?? null,
      sim: T.getSimTime(),
      sinceShot: T.getSimTime() - fireMark,
      age: row.age,
      life: row.life,
      p: point.toArray(),
      camera: T.camera.position.toArray(),
      near: T.camera.near,
      depth: -viewPoint.z,
      radius,
      velocity: [row.vx, row.vy, row.vz],
      spin: [row.ax, row.ay, row.az],
      lateral: point.clone().sub(origin).dot(side),
      clearance: point.y - ground,
      ground,
      px: [(projected.x + 1) * w / 2, (1 - projected.y) * h / 2, projected.z],
      intersection,
      opacity: mesh.material.opacity,
      bounced: row.bounced,
      settled: row.settled,
      visible: visible(mesh),
      submitted: submitted.has(mesh),
    };
    tracked.set(row, { point, data });
    return data;
  }
  function trackStep() {
    step();
    for (const c of list()) {
      const kind = c.mesh.userData.caseOf ?? (c.mesh.userData.shell ? 'shotgun' : null);
      if (!seen.has(c) && kind === current) { seen.add(c); cases.push(c); }
    }
    const rows = cases.filter((c) => list().includes(c)).map((c) => capture(c, cases.indexOf(c)));
    return { sim: T.getSimTime(), sinceShot: T.getSimTime() - fireMark, rows };
  }
  function seeded(action) {
    const original = Math.random;
    Math.random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 2 ** 32; };
    try { return action(); } finally { Math.random = original; }
  }
  window.casingProof = {
    async setup(gun, view, light, fixedRight, clearCamera, aimPitchOffset = 0) {
      current = gun; T.flightHold(false); T.setShotView(null);
      T.setViewFirstDbg(true); T.flightInput({ keys: [], fire: false, zoom: false });
      T.setVelDbg(0, 0); T.setOtsAimDbg(0, 0);
      const x = 47.65685424949238, z = -30.25685424949238, y = T.sampleHeight(x, z);
      if (T.waterDepthAt(x, z) > 0.05) throw Error('Wet capture mark');
      T.player.position.set(x, y, z);
      T.pinAimDbg(() => { T.aimTarget.set(x, y + 1.45 + aimPitchOffset, z + 30); T.setAimYawDbg(0); });
      T.setUnarmedDbg(false); T.setWeapon(T.WEAPON_ORDER.indexOf(gun));
      T.setAmmoDbg(gun, gun === 'minigun' ? 290 : Math.min(5, T.WEAPON_STATS[gun].maxAmmo));
      const deadline = performance.now() + 9000;
      while (performance.now() < deadline) {
        await next();
        const vm = T.viewmodelDbg()?.info;
        if (vm?.active && vm.key === gun && vm.raise > 0.97 && !T.isReloading()) break;
      }
      const vm = T.viewmodelDbg()?.info;
      if (!vm?.active || vm.key !== gun || vm.raise <= 0.97) throw Error('Weapon not ready ' + gun);
      const marine = T.getMarine();
      side = new V(1, 0, 0).applyQuaternion(marine.userData.torsoG.getWorldQuaternion(new T.THREE.Quaternion()));
      side.y = 0; side.normalize();
      T.setWorldTime(light);
      CamRig.ui(false);
      if (view === 'third') {
        T.setViewFirstDbg(false);
        const right = fixedRight ? new V(...fixedRight) : side;
        const p = T.player.position, from = p.clone().addScaledVector(right, 2.35).add(new V(0, 1.55, -3.2));
        const to = p.clone().addScaledVector(right, 0.65).add(new V(0, 1.07, 0.20));
        if (clearCamera) {
          from.set(p.x + 2.0, p.y + 1.82, p.z - 2.35);
          from.y = Math.max(from.y, T.sampleHeight(from.x, from.z) + 1.25);
          to.set(p.x + 0.62, p.y + 1.01, p.z + 0.16);
        }
        T.setShotView({ x: from.x, y: from.y, z: from.z, tx: to.x, ty: to.y, tz: to.z, fov: clearCamera ? 49 : 40 });
      }
      T.flightHold(true);
      for (let i = 0; i < 8; i++) step();
      body = view === 'third' ? scopeBody() : [];
      cases = []; tracked = new Map(); seen = new Set(list());
      randomState = 216085 + T.WEAPON_ORDER.indexOf(gun) * 97;
      return {
        gun, view, worldTime: T.getWorldTime(), visible: document.visibilityState, viewport: viewport(),
        right: side.toArray(), bodyMeshes: body.length, bodySkin: body.filter((o) => o.isSkinnedMesh).length,
        camera: T.camera.position.toArray(), mode: T.fpDbg().first, ammo: T.getAmmo()[gun],
      };
    },
    begin(previousAmmo) {
      return seeded(() => {
        fireMark = T.getSimTime();
        let tick;
        for (let i = 0; i < 90; i++) {
          tick = trackStep();
          if (T.getAmmo()[current] < previousAmmo) {
            fireMark = tick.sim;
            for (const row of tick.rows) row.sinceShot = 0;
            return { tick, ammo: T.getAmmo()[current], visible: document.visibilityState };
          }
        }
        throw Error('No actual fire for ' + current);
      });
    },
    async frame() {
      const data = seeded(trackStep);
      await present();
      return { ...data, visible: document.visibilityState };
    },
    fastStep() {
      return seeded(trackStep);
    },
    async advance(predicate, time, limit = 150) {
      const trail = [];
      for (let i = 0; i < limit; i++) {
        const s = seeded(trackStep);
        trail.push(s);
        const indexZero = s.rows.find((row) => row.index === 0);
        const arrived = predicate === 'shot' ? s.sinceShot >= time - 1e-6
          : predicate === 'settle' ? indexZero?.settled === true
          : indexZero && indexZero.age >= time - 1e-6;
        if (arrived) break;
        if (cases.length && predicate === 'settle' && !indexZero) break;
      }
      await present();
      return { trail, frame: trail.at(-1), visible: document.visibilityState };
    },
  };
}

async function runSide(side, source, expectedSha) {
  const sideDir = `${OUT_ROOT}/${side}`;
  mkdirSync(sideDir, { recursive: true });
  const camera = new IdleProofCamera({ onscreen: true, size: '1600x900', warm: 'none', files: { '/index.html': source } });
  const receipt = {
    side, source, md5: md5(source), sha256: expectedSha,
    thirdMatch: {}, thirdClear: {}, first: {}, minigunBurst1s: {}, minigunPitches: {},
  };
  try {
    await camera.open();
    const page = camera.page;
    const ev = (code, ms = 90000) => page.evaluate(code, ms);
    const served = await fetch(camera.server.origin + '/index.html');
    assert(served.ok);
    const servedSha = createHash('sha256').update(Buffer.from(await served.arrayBuffer())).digest('hex');
    assert.equal(servedSha, expectedSha, 'Served index.html hash mismatch');
    receipt.served = servedSha;
    assert.equal(await ev('TT.getRendererBackend()'), 'WebGPU');
    assert.equal(await ev('document.visibilityState'), 'visible');
    await ev(readFileSync('tools/tests/lib.js', 'utf8'));
    await ev("(async()=>{await startMatch(TT,'AG-404 CJ-10 casings v2');TT.clearZombies();TT.grantAllWeapons();})()", 150000);
    assert.equal(await ev('TT.getPhase()'), 'prep');
    await ev('(' + installCases.toString() + ')()');

    const pos = { x: 800, y: 440 };
    const mouse = (down) => page.send('Input.dispatchMouseEvent', {
      ...pos, type: down ? 'mousePressed' : 'mouseReleased', button: 'left', buttons: down ? 1 : 0, clickCount: 1,
    });
    await page.send('Input.dispatchMouseEvent', { ...pos, type: 'mouseMoved', buttons: 0 });

    async function captureSet(modeName, view, weapons, clearCamera, usePaired, outSub, doScreenshots = true) {
      const subDir = `${sideDir}/${outSub}`;
      mkdirSync(subDir, { recursive: true });
      const results = {};
      for (const gun of weapons) {
        const row = { gun, images: {}, frames: [] };
        const matched = usePaired ? paired[gun]?.ready : null;
        row.ready = await ev(`casingProof.setup(${JSON.stringify(gun)}, ${JSON.stringify(view)}, 0.5, ${JSON.stringify(matched?.right ?? null)}, ${JSON.stringify(clearCamera)}, 0)`);
        if (matched) {
          assert(Math.max(...row.ready.camera.map((v, i) => Math.abs(v - matched.camera[i]))) < 1e-6, `Camera mismatch for ${gun}`);
        }
        const delayed = ['shotgun', 'sniper'].includes(gun);
        const pending = view === 'first'
          ? [['age', 0.10, 'age-100']]
          : [
              ...[0.10, 0.25, 0.50].map((s, i) => ['shot', s, 'shot-' + [100, 250, 500][i]]),
              ...(delayed ? [0.10, 0.25, 0.50].map((s, i) => ['age', s, 'age-' + [100, 250, 500][i]]) : []),
            ];
        let held = false;
        try {
          await mouse(true); held = true;
          row.fired = await ev(`casingProof.begin(${row.ready.ammo})`);
          assert(row.fired.ammo < row.ready.ammo);
          if (gun !== 'minigun') { await mouse(false); held = false; }
          row.frames.push(row.fired.tick);
          for (let tick = 0; tick < 100 && pending.length; tick++) {
            const sample = await ev('casingProof.frame()');
            row.frames.push(sample);
            if (gun === 'minigun' && view === 'third') {
              const impacts = sample.rows.filter((c) => c.intersection.length);
              if (impacts.length) {
                const ms = Math.round(sample.sinceShot * 1000);
                const file = `${gun}-contact-${ms}.png`;
                if (doScreenshots) await page.screenshot(`${subDir}/${file}`);
                (row.contactImages ??= []).push({ file, ms, impacts });
              }
            }
            if (held && sample.sinceShot >= 0.115) { await mouse(false); held = false; }
            const first = sample.rows.find((c) => c.index === 0);
            let file = null;
            for (let n = pending.length - 1; n >= 0; n--) {
              const [basis, seconds, label] = pending[n];
              const measured = basis === 'shot' ? sample.sinceShot : first?.age;
              if (measured === undefined || measured < seconds - 1e-6) continue;
              if (!file && doScreenshots) {
                file = `${gun}-${label}.png`;
                await page.screenshot(`${subDir}/${file}`);
              }
              row.images[label] = { file, sinceShot: sample.sinceShot, case: first ?? null, visible: sample.visible };
              pending.splice(n, 1);
            }
          }
        } finally { if (held) await mouse(false); }
        assert.equal(pending.length, 0, `${modeName} ${gun} missing times`);
        if (view === 'third') {
          const late = await ev("casingProof.advance('settle', 0, 125)");
          row.frames.push(...late.trail);
          const first = late.frame.rows.find((c) => c.index === 0);
          if (first && doScreenshots) {
            const file = `${gun}-rest.png`;
            await page.screenshot(`${subDir}/${file}`);
            row.images.rest = { file, sinceShot: late.frame.sinceShot, case: first, visible: late.visible };
          }
        }
        // Compute compact summary (case 0 vs case 1 start port, contacts, velocities)
        const all = row.frames.flatMap((f) => f.rows);
        const birthOf = (idx) => {
          for (const f of row.frames) {
            const r = f.rows.find((c) => c.index === idx);
            if (r) return { sim: f.sim, sinceShot: +f.sinceShot.toFixed(4), age: +r.age.toFixed(4), p: r.p.map((v) => +v.toFixed(4)), velocity: r.velocity.map((v) => +v.toFixed(3)) };
          }
          return null;
        };
        const c0 = birthOf(0), c1 = birthOf(1), c2 = birthOf(2);
        const portDelta01 = (c0 && c1) ? +Math.hypot(c1.p[0] - c0.p[0], c1.p[1] - c0.p[1], c1.p[2] - c0.p[2]).toFixed(4) : null;
        const contacts = all.filter((c) => c.intersection.length);
        row.summary = {
          count: new Set(all.map((c) => c.index)).size,
          collisionSegments: contacts.length,
          contactMeshes: [...new Set(contacts.flatMap((c) => c.intersection.map((h) => h.mesh)))],
          case0Birth: c0,
          case1Birth: c1,
          case2Birth: c2,
          portDelta01,
        };
        console.log(JSON.stringify({ side, modeName, gun, ...row.summary }));
        // Drop huge raw per-frame arrays from receipt JSON after summarizing (keep images + ready + summary)
        delete row.frames;
        results[gun] = row;
      }
      return results;
    }

    // 1) third-match (7 guns, matched GP-20283 camera)
    receipt.thirdMatch = await captureSet('third-match', 'third', ALL_7, false, true, 'third-match', true);
    // 2) third-clear (7 guns, clear camera)
    receipt.thirdClear = await captureSet('third-clear', 'third', ALL_7, true, false, 'third-clear', true);
    // 3) first-person (pistol, ak, minigun)
    receipt.first = await captureSet('first', 'first', FIRST_3, false, false, 'first', true);

    // 4) Extra 1 s minigun burst (~60 cases) + aim pitch check (level, up, down) with full contact scan
    const pitches = [
      ['burst1s-level', 0, 62],
      ['aim-up', 12, 20],
      ['aim-down', -9, 20],
    ];
    for (const [label, pitchOff, holdTicks] of pitches) {
      const matched = paired.minigun?.ready;
      const ready = await ev(`casingProof.setup('minigun', 'third', 0.5, ${JSON.stringify(matched?.right ?? null)}, false, ${pitchOff})`);
      let held = false;
      const frames = [];
      let contactShots = [];
      try {
        await mouse(true); held = true;
        const fired = await ev(`casingProof.begin(${ready.ammo})`);
        frames.push(fired.tick);
        for (let t = 0; t < holdTicks + 45; t++) {
          if (held && t >= holdTicks) { await mouse(false); held = false; }
          const sample = await ev('casingProof.fastStep()');
          frames.push(sample);
          const impacts = sample.rows.filter((c) => c.intersection.length);
          if (impacts.length && contactShots.length < 3) {
            await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
            const f = `${sideDir}/minigun-${label}-contact-${t}.png`;
            await page.screenshot(f);
            contactShots.push({ file: f, tick: t, impacts: impacts.map((c) => ({ index: c.index, meshes: c.intersection.map((h) => h.mesh) })) });
          }
        }
      } finally { if (held) await mouse(false); }
      const all = frames.flatMap((f) => f.rows);
      const uniqueCases = new Set(all.map((c) => c.index)).size;
      const contacts = all.filter((c) => c.intersection.length);
      const sameFrameDeltas = [];
      // Compare cases born on the same frame
      const firstSeen = new Map();
      for (const f of frames) {
        const bornThisFrame = [];
        for (const r of f.rows) {
          if (!firstSeen.has(r.index)) {
            firstSeen.set(r.index, r);
            bornThisFrame.push(r);
          }
        }
        if (bornThisFrame.length >= 2) {
          const a = bornThisFrame[0].p, b = bornThisFrame[1].p;
          sameFrameDeltas.push(+Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]).toFixed(4));
        }
      }
      const stat = {
        label, pitchOff, holdTicks,
        uniqueCases,
        totalCaseSamples: all.length,
        collisionSegments: contacts.length,
        contactMeshes: [...new Set(contacts.flatMap((c) => c.intersection.map((h) => h.mesh)))],
        sameFrameBirthPairs: sameFrameDeltas.length,
        maxSameFramePortDelta: sameFrameDeltas.length ? Math.max(...sameFrameDeltas) : 0,
        contactShots,
      };
      console.log('EXTRA_MINIGUN', side, JSON.stringify(stat));
      if (label === 'burst1s-level') receipt.minigunBurst1s = stat;
      else receipt.minigunPitches[label] = stat;
    }

    assert.equal(await ev('document.visibilityState'), 'visible');
    assert.deepEqual(page.errors, []);
  } finally {
    await camera.close();
    writeFileSync(`${sideDir}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  }
  return receipt;
}

const beforeReceipt = await runSide('before', LIVE, liveSha);
const afterReceipt = await runSide('after', COPY, copySha);
writeFileSync(`${OUT_ROOT}/summary.json`, JSON.stringify({
  live: { file: LIVE, md5: liveMd5, sha256: liveSha },
  copy: { file: COPY, md5: copyMd5, sha256: copySha },
  before: {
    thirdMatch: Object.fromEntries(Object.entries(beforeReceipt.thirdMatch).map(([k, v]) => [k, v.summary])),
    thirdClear: Object.fromEntries(Object.entries(beforeReceipt.thirdClear).map(([k, v]) => [k, v.summary])),
    minigunBurst1s: beforeReceipt.minigunBurst1s,
    minigunPitches: beforeReceipt.minigunPitches,
  },
  after: {
    thirdMatch: Object.fromEntries(Object.entries(afterReceipt.thirdMatch).map(([k, v]) => [k, v.summary])),
    thirdClear: Object.fromEntries(Object.entries(afterReceipt.thirdClear).map(([k, v]) => [k, v.summary])),
    minigunBurst1s: afterReceipt.minigunBurst1s,
    minigunPitches: afterReceipt.minigunPitches,
  },
}, null, 2) + '\n');
console.log('CJ10_V2_DONE');
