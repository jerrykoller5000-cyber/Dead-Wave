// GB-156 pass 4: the crew pass runs after the root has settled for the frame (the deck/build collision and updateMortar
// move it after the pose code, so the body and the feet were solved against a root that then moved); the Watchman's
// feet go there too, and stepping off the Watchman (its root is pushed back out of the gun's footprint the frame he lets
// go, 0.86 m in the probe) walks back instead of jumping; the mortar's walk-in takes longer the further he comes from.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html', WRITE = process.argv.includes('--write');
const read = () => fs.readFileSync(F, 'utf8');
const src = read(), h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n', fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [], rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });
rep('loop-out',
`        updateWatchmanExperiencePose(dt);   // GP-174: mounted/carry grip overrides run after the ordinary weapon hold
        updateMortarCrew(dt);   // GB-156: the mortar crouch, its loading drill and planted feet, over all of it`,
`        updateWatchmanExperiencePose(dt);   // GP-174: mounted/carry grip overrides run after the ordinary weapon hold`);
rep('loop-in',
`      PROF.mark('ground+clamp');
      updateMortar(dt);`,
`      PROF.mark('ground+clamp');
      updateMortar(dt);
      updateMortarCrew(dt);   // GB-156: crewed feet, the mortar crouch and its loading drill, once the root has settled`);
rep('wm-feet',
`        crewFeet(u, CREW_STANCE.m240, w, dt, _watchman.plant);`,
`        _watchman.feetW = w;   // the feet themselves: updateMortarCrew, after the root has settled`);
rep('wm-reset',
`      else _watchman.plant.feet = null;   // GB-156: off the gun, his feet are his own again`,
`      else _watchman.feetW = 0;   // GB-156: off the gun, his feet are his own again`);
rep('wm-leave',
`      if (mortarMounted.type === 'm240') { mouseFireHeld = false; fireHeld = false; }`,
`      if (mortarMounted.type === 'm240') { mouseFireHeld = false; fireHeld = false; _crew.leave = { x: player.position.x, z: player.position.z, t: 0, dx: null, dz: 0 }; }`);
rep('in-time',
`      C.w = live ? Math.min(1, C.w + dt / MORTAR_KNEEL.inS) : Math.max(0, C.w - dt / MORTAR_KNEEL.outS);`,
`      if (fr0 && fr0.age <= dt && live) C.inS = Math.max(0.65, Math.min(1.15, 0.4 + 0.3 * Math.hypot(fr0.x - player.position.x, fr0.z - player.position.z)));
      C.w = live ? Math.min(1, C.w + dt / (C.inS || MORTAR_KNEEL.inS)) : Math.max(0, C.w - dt / MORTAR_KNEEL.outS);`);
rep('in-time2',
`      if (C.from) C.from.age += dt;`,
`      if (C.from) C.from.age += dt;
      const fr0 = C.from;
      crewLateFeet(dt);`);
rep('ea',
`      const fr = C.from, ea = fr ? smooth01(fr.age / MORTAR_KNEEL.inS) : 1;`,
`      const fr = C.from, ea = fr ? smooth01(fr.age / (C.inS || MORTAR_KNEEL.inS)) : 1;`);
rep('kneel',
`    const MORTAR_KNEEL = { side: 0.52, fwd: 0.9, yaw: 0.6, inS: 0.55, outS: 0.42, lean: 0.36 };`,
`    const MORTAR_KNEEL = { side: 0.52, fwd: 0.9, yaw: 0.6, inS: 0.75, outS: 0.62, lean: 0.36, leaveS: 0.55 };
    // The Watchman's feet (weighted by updateWatchmanExperiencePose) and the walk back off it: the root is pushed out of
    // the gun's footprint the frame he lets go, so the body is drawn where it was and walks to the root over leaveS.
    function crewLateFeet(dt) {
      const u = marine.userData, L = _crew.leave;
      let w = _watchman.feetW || 0;
      if (L) {
        if (L.dx === null) { L.dx = L.x - player.position.x; L.dz = L.z - player.position.z; if (Math.hypot(L.dx, L.dz) > 2) L.t = 1e9; }
        L.t += dt;
        const e = smooth01(L.t / MORTAR_KNEEL.leaveS);
        player.updateMatrixWorld(true);
        const par = marine.parent, base = par.localToWorld(_crew.v.set(0, marine.position.y, 0));
        base.x += L.dx * (1 - e); base.z += L.dz * (1 - e);
        marine.position.copy(par.worldToLocal(base));
        w = Math.max(w, 1 - e);
        if (e >= 1) { _crew.leave = null; marine.position.x = 0; marine.position.z = 0; }
      }
      if (w > 0.001 && !mortarCarried && !playerSwimming) crewFeet(u, CREW_STANCE.m240, w, dt, _watchman.plant);
      else _watchman.plant.feet = null;
    }`);
let out = src, bad = 0;
for (const e of edits) { const n = out.split(e.a).length - 1; if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; } out = out.replace(e.a, () => e.b); }
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length);
if (WRITE) { if (crypto.createHash('sha1').update(read()).digest('hex') !== h0) { console.log('changed; not written'); process.exit(2); } fs.writeFileSync(F, out, 'utf8'); console.log('written'); }
