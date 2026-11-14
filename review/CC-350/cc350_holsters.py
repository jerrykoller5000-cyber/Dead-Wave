# CC-350 (claude3): handguns by station (index.html carry part). Usage: python3 cc350_holsters.py <index.html>
import sys
p = sys.argv[1]
b = open(p, 'rb').read(); crlf = b'\r\n' in b; s = b.decode('utf-8'); nl = '\r\n' if crlf else '\n'
def rep(old, new, count=1):
    global s
    old = old.replace('\n', nl); new = new.replace('\n', nl)
    n = s.count(old)
    if n != count: raise SystemExit(f'expected {count}, found {n}: {old[:90]!r}')
    s = s.replace(old, new)

# 1. the stations: a placer on the rig (after placeSecondary, before the harness)
rep("""      const harness = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.032, 0.014), leatherMat));
""", """      // CC-350 (J153 notes 20, 38: "Notice how the right arm clips through holster", "that weird sideways holster"): every handgun
      // rides vertical, muzzle down, where his arms never go. Measured over every weapon and unarmed, standing, walking, running
      // and crouched (review/CC-350): his hands sweep the outside and the front of both thighs from the belt down to y .56 and the
      // front of his chest; they never come behind z -0.10 at the hips or near the pack. So the stations, in the order they fill:
      // the belt at 4 o'clock on the gun hand's side, just behind the hip bone (the CLAUDE DIRECTOR, 20:22Z: where a soldier wears
      // it; not the small of the back), then 8 o'clock on the other, then the pack's two sides (flat on them, the grip back; an Uzi
      // goes there first), and for a fifth and sixth the drop-leg mounts on his thighs. The old upper row (a pistol lying on its side
      // on the pack) and the small-of-the-back row are gone.
      const PACK_SIDE = { x: 0.127, y: 1.075, z: -0.215, clear: 0.004 };   // the pack's side face (x .122-.13 at z -.2/-.24, y .95-1.2)
      rig.packSide = PACK_SIDE;
      // the hip at 4 o'clock (lowerBody frame): just behind the hip bone, where his side (x .21, z -.06) turns into his seat
      // (x .11, z -.11): the point on it, its outward normal [x, z] (+x side; mirrored), the gun's middle height, the air left
      // It rides high (the grip over the belt) with the muzzle splayed out 7 deg, so its lower end clears his thigh as it swings
      // back running (scanned, cloud, CC-350: lower or flat on him put the running thigh 2-20 mm into the shell; more splay left
      // its lowest third 5-9 cm off him). Here: legs 3.5 mm clear, the lowest third 3.7 cm and the nearest point 1.5 cm from him,
      // the unarmed swing 2 cm clear.
      const HIP_FIT = { x: 0.135, z: -0.1, n: [0.3, -0.954], y: 0.85, clear: 0.004, splay: 0.12 };
      rig.hipFit = HIP_FIT;
      const _sb = new THREE.Box3(), _sv = new THREE.Vector3(), _sm = new THREE.Matrix4(), _si = new THREE.Matrix4();
      rig.placeStation = (spot, name, kind) => {
        spot.station = name; spot.fitKind = kind;
        const side = name.endsWith('+') ? 1 : -1;
        if (name.startsWith('hip')) {   // the belt at 4 (or 8) o'clock: vertical, muzzle down, the flat on his hip, the slide forward, the grip back
          spot.onHips = true;
          if (spot.g.parent !== hipsG) hipsG.add(spot.g);
          const n = new THREE.Vector3(side * HIP_FIT.n[0], 0, HIP_FIT.n[1]), t = new THREE.Vector3(-HIP_FIT.n[1] * side, 0, HIP_FIT.n[0]).normalize();
          if (t.z < 0) t.negate();
          const u = new THREE.Vector3(0, -1, 0).addScaledVector(n, HIP_FIT.splay).normalize();
          t.addScaledVector(u, -t.dot(u)).normalize();
          const x = new THREE.Vector3().crossVectors(t, u);
          spot.g.quaternion.setFromRotationMatrix(_sm.makeBasis(x, t, u));
          spot.g.position.set(side * HIP_FIT.x, HIP_FIT.y, HIP_FIT.z).addScaledVector(n, 0.05);
          spot.g.scale.setScalar(0.8);
          spot.gunRoll = 0; if (spot.gun) spot.gun.rotation.z = 0;
          if (!spot.loop) { spot.loop = rmesh(.032, .02, .258, leatherMat, .006); spot.g.add(spot.loop); }
          spot.loop.visible = true;
          return;
        }
        if (spot.loop) spot.loop.visible = false;
        if (name.startsWith('thigh')) {   // the drop-leg mount (marine-body's thigh panel), muzzle down, grip back
          spot.onHips = false; const leg = side > 0 ? ud.legRG : ud.legLG;
          if (spot.g.parent !== leg) leg.add(spot.g);
          spot.g.position.set(side * 0.118, -0.05, 0.035); spot.g.quaternion.identity(); spot.g.rotation.set(Math.PI / 2, 0, -side * 0.1); spot.g.scale.setScalar(0.8);
          spot.gunRoll = 0; if (spot.gun) spot.gun.rotation.z = 0;
          return;
        }
        // the pack's side: the flat of the gun on it, muzzle down, the slide forward and the grip back, seated by its bounds
        spot.onHips = false;
        if (spot.g.parent !== torso) torso.add(spot.g);
        spot.g.quaternion.setFromRotationMatrix(_sm.makeBasis(_sv.set(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
        spot.g.scale.setScalar(0.8);
        spot.g.position.copy(T(side * (PACK_SIDE.x + 0.04), PACK_SIDE.y, PACK_SIDE.z));
        spot.gunRoll = 0; if (spot.gun) spot.gun.rotation.z = 0;
      };
      // after the gun is sized (fitCarriedGuns): slide a pack-side gun in until its inner face is PACK_SIDE.clear off the pack
      rig.seatStation = (spot) => {
        if (!spot.station || !/^(pack|hip)/.test(spot.station) || !spot.gun) return;
        const side = spot.station.endsWith('+') ? 1 : -1;
        if (spot.station.startsWith('hip')) {   // slide in along the hip's normal until the gun's nearest point is HIP_FIT.clear off it
          const n = new THREE.Vector3(side * HIP_FIT.n[0], 0, HIP_FIT.n[1]), P0 = new THREE.Vector3(side * HIP_FIT.x, 0, HIP_FIT.z);
          spot.g.updateMatrix(); spot.gun.updateMatrixWorld(true); hipsG.updateMatrixWorld(true); _si.copy(hipsG.matrixWorld).invert();
          let lo = Infinity;
          spot.gun.traverseVisible((o) => { const P = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!o.isMesh || !P) return;
            _sm.multiplyMatrices(_si, o.matrixWorld); for (let i = 0; i < P.count; i += 2) { _sv.fromBufferAttribute(P, i).applyMatrix4(_sm); lo = Math.min(lo, (_sv.x - P0.x) * n.x + (_sv.z - P0.z) * n.z); } });
          if (Number.isFinite(lo)) spot.g.position.addScaledVector(n, HIP_FIT.clear + 0.006 - lo);   // + the holster's wall
          spot.g.updateMatrix();
          return;
        }
        spot.g.updateMatrix(); spot.gun.updateMatrixWorld(true); torso.updateMatrixWorld(true);
        _si.copy(torso.matrixWorld).invert(); _sb.makeEmpty();
        spot.gun.traverseVisible((o) => { const P = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!o.isMesh || !P) return;
          _sm.multiplyMatrices(_si, o.matrixWorld); for (let i = 0; i < P.count; i += 2) _sb.expandByPoint(_sv.fromBufferAttribute(P, i).applyMatrix4(_sm)); });
        if (_sb.isEmpty()) return;
        const inner = side > 0 ? _sb.min.x : -_sb.max.x;
        spot.g.position.x += side * (PACK_SIDE.x + PACK_SIDE.clear - inner);
        spot.g.updateMatrix();
      };
      const harness = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.032, 0.014), leatherMat));
""")

# 2. applyCarryPlan: stations instead of the two rows
rep("""      const twoRows=p.secondaryKinds.every(k=>k&&k!=='uzi');
      // GB-276 (Claude, 4 Nov): by height, not slot: the taller handgun (the revolver) rides the lower row, the shorter above at +0.27.
      const up=twoRows?((p.secondaryKinds[0]==='revolver'&&p.secondaryKinds[1]!=='revolver')?1:0):-1;
      for (let i = 0; i < 2; i++) {
        const kind=p.secondaryKinds[i],side=p.secondaryKinds.indexOf(kind)===i?1:-1;
        rig.holsters[i].fitKind=kind;rig.pairs[i].fitKind=kind;
        // CC-347: the low row (one handgun type, or the taller of two) rides the belt (LOW_FIT); the upper row stays on the pack.
        const low=i!==up;
        rig.placeSecondary(rig.holsters[i],side,kind!=='uzi',low);
        rig.placeSecondary(rig.pairs[i],-side,kind!=='uzi',low);
        // Two handgun types occupy separate rows, including their akimbo copies.
        if(twoRows&&i===up){rig.holsters[i].g.position.y+=.27;rig.pairs[i].g.position.y+=.27;}
      }
      rig.harness.visible = p.holsterOn.some(Boolean);
      mountCarryGun(rig, rig.hip, 'hip', p.hip);
      mountCarryGun(rig, rig.hipPair, 'hipPair', p.hipPair); rig.hipPair.g.visible = p.hipPairOn;
""", """      mountCarryGun(rig, rig.hip, 'hip', p.hip);
      mountCarryGun(rig, rig.hipPair, 'hipPair', p.hipPair); rig.hipPair.g.visible = p.hipPairOn;
      // CC-350: each handgun he carries takes the next free station (rig.placeStation): the base pistol first, its akimbo pair,
      // then each secondary and its pair; an Uzi takes a pack side first. By what he carries, not what is in his hands, so the
      // empty holster of the gun in his hand stays where it was.
      {const want=[[rig.hip,'pistol']];if(p.hipPairOn)want.push([rig.hipPair,'pistol']);
       for(let i=0;i<2;i++){const k=p.secondaryKinds[i];if(!k)continue;if(p.holsterOn[i])want.push([rig.holsters[i],k]);if(p.pairOn[i])want.push([rig.pairs[i],k]);}
       const free=STATION_ORDER.slice();
       for(const [spot,kind] of want){
         const pref=kind==='uzi'?free.filter(n=>n.startsWith('pack')).concat(free.filter(n=>n.startsWith('thigh'))):free;
         const name=pref[0]||free[0];free.splice(free.indexOf(name),1);rig.placeStation(spot,name,kind);}
       rig.harness.visible=want.some(([spot])=>spot.station&&spot.station.startsWith('pack'));}
""")
rep("""    function applyCarryPlan(rig, p) {
""", """    const STATION_ORDER = ['hip+', 'hip-', 'pack+', 'pack-', 'thigh+', 'thigh-'];   // CC-350: rig.placeStation
    function applyCarryPlan(rig, p) {
""")
# 3. fitCarriedGuns: the empty-shell copy takes its station's roll; pack and thigh stations are not pushed off the pack's face
rep("""          if(cls==='holster')copy.rotation.z=(kind==='uzi'?1:-1)*(h.g.position.x>0?Math.PI/2:-Math.PI/2);
""", """          copy.rotation.z=h.gunRoll!==undefined?h.gunRoll:cls==='holster'?(kind==='uzi'?1:-1)*(h.g.position.x>0?Math.PI/2:-Math.PI/2):0;   // CC-350: its station's roll
""")
rep("""        fitCarriedGun(h,cls,band);
        if(cls==='holster'&&!h.onHips)clearCarryPack(THREE,h);
""", """        fitCarriedGun(h,cls,band);
        if(h.station&&/^(pack|hip)/.test(h.station)){h.gun.position.set(0,0,0);rig.seatStation(h);}   // CC-350
        else if(cls==='holster'&&!h.onHips&&!h.station)clearCarryPack(THREE,h);
""")
rep("""          if (!spot.shell.userData.fittedHolster) { spot.shell.scale.set(1, 1, 1); spot.shell.position.set(-side * 0.055, 0, 0.11); }
""", """          if (spot.shell && !spot.shell.userData.fittedHolster) { spot.shell.scale.set(1, 1, 1); spot.shell.position.set(-side * 0.055, 0, 0.11); }
""")
rep("carryDbg, carryPreview, updateCarriedGear, CARRY_SLOTS,", "carryDbg, carryPreview, updateCarriedGear, CARRY_SLOTS, carryGripWorld,   /* CC-350 */")
rep("""    function drawPose(m, f, d) {
""", open(__file__.replace('cc350_holsters.py','grip.js')).read() + """    function drawPose(m, f, d) {
""")
open(p, 'wb').write(s.encode('utf-8')); print('patched', p)
