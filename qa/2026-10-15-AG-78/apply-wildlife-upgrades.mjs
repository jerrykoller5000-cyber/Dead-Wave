import fs from 'node:fs';
import crypto from 'node:crypto';

const file = 'index.html';
const raw0 = fs.readFileSync(file, 'utf8');
const hash0 = crypto.createHash('sha256').update(raw0, 'utf8').digest('hex');
const eol = raw0.includes('\r\n') ? '\r\n' : '\n';
const norm = (s) => s.replace(/\r?\n/g, eol);

let text = raw0;

function replaceExact(label, oldStr, newStr) {
  const target = norm(oldStr);
  const replacement = norm(newStr);
  const idx = text.indexOf(target);
  if (idx === -1) {
    throw new Error(`Target block not found for: ${label}`);
  }
  if (text.indexOf(target, idx + 1) !== -1) {
    throw new Error(`Target block matched multiple times for: ${label}`);
  }
  text = text.slice(0, idx) + replacement + text.slice(idx + target.length);
  console.log(`Replaced ${label} OK`);
}

// 1. Bug materials + makeBeeMesh + makeButterflyMesh + clearBugs + killBug
replaceExact(
  'makeBeeMesh & makeButterflyMesh & clearBugs',
  `    const beeYellowMat = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.72 });
    const beeBlackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.85 });
    const beeWingMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
    });
    const butteBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.8 });
    const BUTTE_WING_COLORS = [0xff8c2a, 0x3a7cff, 0xffe066, 0xb44dff, 0xff5577, 0x44ddaa];

    function listFlowerPads() {
      const pads = [];
      for (const f of foliage) {
        if (f.kind !== 'flower') continue;
        const y = sampleHeight(f.x, f.z) + 0.42 + Math.random() * 0.12;
        pads.push({ x: f.x, y, z: f.z });
      }
      if (pads.length < 6) {
        for (const f of foliage) {
          if (f.kind !== 'bush') continue;
          const y = sampleHeight(f.x, f.z) + 0.48 + Math.random() * 0.1;
          pads.push({ x: f.x, y, z: f.z });
          if (pads.length >= 18) break;
        }
      }
      return pads;
    }

    function refreshBugPads() {
      _bugPads = listFlowerPads();
    }

    function makeBeeMesh() {
      const g = new THREE.Group();
      const s = 0.14 + Math.random() * 0.04;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.08), beeYellowMat);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.035), beeBlackMat);
      b2.position.z = 0.035;
      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.038, 0.03), beeYellowMat);
      b3.position.z = 0.065;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.024, 5, 4), beeBlackMat);
      head.position.z = -0.05;
      const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), beeWingMat);
      const wingR = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), beeWingMat);
      wingL.position.set(-0.035, 0.025, 0);
      wingR.position.set(0.035, 0.025, 0);
      g.add(b1, b2, b3, head, wingL, wingR);
      g.scale.setScalar(s / 0.15);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.kind = 'bee';
      return g;
    }

    function makeButterflyMesh() {
      const g = new THREE.Group();
      const s = 0.22 + Math.random() * 0.08;
      const col = BUTTE_WING_COLORS[(Math.random() * BUTTE_WING_COLORS.length) | 0];
      const wingMat = new THREE.MeshStandardMaterial({
        color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 0.55, depthWrite: false
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.12, 5), butteBodyMat);
      body.rotation.x = Math.PI / 2;
      const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wingMat);
      const wingR = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wingMat);
      wingL.geometry.translate(-0.07, 0, 0);
      wingR.geometry.translate(0.07, 0, 0);
      wingL.position.set(0, 0.008, 0);
      wingR.position.set(0, 0.008, 0);
      g.add(body, wingL, wingR);
      g.scale.setScalar(s / 0.25);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.wingMat = wingMat;
      g.userData.kind = 'butterfly';
      return g;
    }

    function clearBugs() {
      for (const b of bugs) {
        if (!b.mesh) continue;
        scene.remove(b.mesh);
        b.mesh.traverse(ch => {
          if (!ch.isMesh) return;
          if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
          if (ch.material && ch.material !== beeYellowMat && ch.material !== beeBlackMat &&
              ch.material !== beeWingMat && ch.material !== butteBodyMat) {
            try { ch.material.dispose(); } catch (_) {}
          }
        });
      }
      bugs.length = 0;
    }`,
  `    const beeYellowMat = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.68 });
    const beeAmberMat = new THREE.MeshStandardMaterial({ color: 0xd4921a, roughness: 0.78 });
    const beeBlackMat = new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.82 });
    const beeEyeMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.25, metalness: 0.2 });
    const beeWingMat = new THREE.MeshStandardMaterial({
      color: 0xe6f2ff, transparent: true, opacity: 0.48, side: THREE.DoubleSide, roughness: 0.3, depthWrite: false
    });
    const butteBodyMat = new THREE.MeshStandardMaterial({ color: 0x241e16, roughness: 0.78 });
    const butteSpotMat = new THREE.MeshStandardMaterial({ color: 0xfff8e6, roughness: 0.5, side: THREE.DoubleSide });
    const BUTTE_WING_COLORS = [0xff8c2a, 0x3a7cff, 0xffe066, 0xb44dff, 0xff5577, 0x44ddaa];

    function listFlowerPads() {
      const pads = [];
      for (const f of foliage) {
        if (f.kind !== 'flower') continue;
        const y = sampleHeight(f.x, f.z) + 0.42 + Math.random() * 0.12;
        pads.push({ x: f.x, y, z: f.z });
      }
      if (pads.length < 6) {
        for (const f of foliage) {
          if (f.kind !== 'bush') continue;
          const y = sampleHeight(f.x, f.z) + 0.48 + Math.random() * 0.1;
          pads.push({ x: f.x, y, z: f.z });
          if (pads.length >= 18) break;
        }
      }
      return pads;
    }

    function refreshBugPads() {
      _bugPads = listFlowerPads();
    }

    function makeBeeMesh() {
      const g = new THREE.Group();
      const s = 0.14 + Math.random() * 0.04;
      // Head with compound eyes, frons, and elbowed antennae
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), beeBlackMat);
      head.scale.set(1.05, 0.95, 0.88);
      head.position.set(0, 0.002, -0.056);
      const frons = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), beeAmberMat);
      frons.position.set(0, 0.006, -0.052);
      g.add(head, frons);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), beeEyeMat);
        eye.scale.set(0.65, 1.15, 0.9);
        eye.position.set(side * 0.021, 0.005, -0.059);
        const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0025, 0.022, 5), beeBlackMat);
        antBase.position.set(side * 0.01, 0.018, -0.068);
        antBase.rotation.set(-0.55, 0, -side * 0.35);
        const antTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0022, 0.022, 5), beeBlackMat);
        antTip.position.set(side * 0.018, 0.023, -0.082);
        antTip.rotation.set(-1.1, 0, -side * 0.55);
        g.add(eye, antBase, antTip);
      }

      // Fuzzy golden thorax with dark dorsal saddle
      const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), beeYellowMat);
      thorax.scale.set(1.02, 0.92, 1.12);
      thorax.position.set(0, 0.006, -0.016);
      const thoraxBand = new THREE.Mesh(new THREE.SphereGeometry(0.031, 10, 8), beeBlackMat);
      thoraxBand.scale.set(1.04, 0.88, 0.62);
      thoraxBand.position.set(0, 0.008, -0.016);
      const waist = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), beeBlackMat);
      waist.position.set(0, 0.002, 0.014);
      g.add(thorax, thoraxBand, waist);

      // Rounded segmented abdomen with alternating golden/black bands + rear stinger
      const abSegs = [
        { z: 0.028, r: 0.031, sy: 0.88, sz: 0.55, mat: beeYellowMat },
        { z: 0.042, r: 0.035, sy: 0.9,  sz: 0.52, mat: beeBlackMat },
        { z: 0.056, r: 0.034, sy: 0.88, sz: 0.52, mat: beeYellowMat },
        { z: 0.069, r: 0.030, sy: 0.85, sz: 0.5,  mat: beeBlackMat },
        { z: 0.080, r: 0.023, sy: 0.82, sz: 0.55, mat: beeYellowMat },
        { z: 0.090, r: 0.015, sy: 0.78, sz: 0.65, mat: beeBlackMat }
      ];
      for (const seg of abSegs) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(seg.r, 12, 8), seg.mat);
        m.scale.set(1.0, seg.sy, seg.sz);
        m.position.set(0, 0.001, seg.z);
        g.add(m);
      }
      const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.0055, 0.022, 6), beeBlackMat);
      stinger.rotation.x = Math.PI / 2;
      stinger.position.set(0, -0.001, 0.104);
      g.add(stinger);

      // Six articulated tucked legs + golden pollen baskets on hind legs
      const legZ = [-0.032, -0.014, 0.006];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0025, 0.026, 5), beeBlackMat);
          femur.position.set(side * 0.024, -0.018, legZ[i]);
          femur.rotation.set(0.2 * (i - 1), 0, side * 0.55);
          const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0018, 0.024, 5), beeBlackMat);
          tibia.position.set(side * 0.032, -0.034, legZ[i] + 0.006);
          tibia.rotation.set(0.35, 0, -side * 0.2);
          g.add(femur, tibia);
          if (i === 2) {
            const pollen = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 7, 6), beeYellowMat);
            pollen.scale.set(0.75, 1.1, 1.25);
            pollen.position.set(side * 0.034, -0.028, legZ[i] + 0.004);
            g.add(pollen);
          }
        }
      }

      // Teardrop forewings & hindwings pivoted at the thorax shoulders
      const makeBeeWing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.018, 0.028, -0.018);
        const fore = new THREE.Mesh(new THREE.CircleGeometry(0.038, 12), beeWingMat);
        fore.rotation.x = -Math.PI / 2;
        fore.scale.set(1.35, 0.68, 1);
        fore.position.set(side * 0.042, 0.002, 0.012);
        fore.rotation.z = side * -0.28;
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.0025, 0.004), beeAmberMat);
        vein.position.set(side * 0.036, 0.003, -0.002);
        vein.rotation.y = side * -0.28;
        const hind = new THREE.Mesh(new THREE.CircleGeometry(0.026, 10), beeWingMat);
        hind.rotation.x = -Math.PI / 2;
        hind.scale.set(1.2, 0.62, 1);
        hind.position.set(side * 0.028, -0.001, 0.032);
        hind.rotation.z = side * -0.52;
        pivot.add(fore, vein, hind);
        return pivot;
      };
      const wingL = makeBeeWing(-1), wingR = makeBeeWing(1);
      g.add(wingL, wingR);
      g.scale.setScalar(s / 0.15);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.kind = 'bee';
      return g;
    }

    function makeButterflyMesh() {
      const g = new THREE.Group();
      const s = 0.22 + Math.random() * 0.08;
      const col = BUTTE_WING_COLORS[(Math.random() * BUTTE_WING_COLORS.length) | 0];
      const wingMat = new THREE.MeshStandardMaterial({
        color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, roughness: 0.48, depthWrite: false
      });

      // Segmented butterfly body: head, compound eyes, clubbed antennae, thorax, abdomen
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), butteBodyMat);
      head.position.set(0, 0.006, 0.062);
      const thorax = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.032, 5, 8), butteBodyMat);
      thorax.rotation.x = Math.PI / 2;
      thorax.position.set(0, 0.004, 0.028);
      const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.068, 5, 8), butteBodyMat);
      abdomen.rotation.x = Math.PI / 2;
      abdomen.position.set(0, 0.0, -0.032);
      g.add(head, thorax, abdomen);

      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 6, 5), beeEyeMat);
        eye.position.set(side * 0.011, 0.008, 0.068);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0016, 0.055, 5), butteBodyMat);
        ant.position.set(side * 0.016, 0.022, 0.085);
        ant.rotation.set(0.85, 0, -side * 0.42);
        const club = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 6, 5), butteBodyMat);
        club.scale.set(0.8, 1.4, 0.8);
        club.position.set(side * 0.027, 0.038, 0.104);
        g.add(eye, ant, club);
      }

      // Sculpted swallowtail forewing + hindwing with dark border margin and ivory wing spots
      const buildButterflyWing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.008, 0.01);

        const makeForeShape = (scale) => {
          const sh = new THREE.Shape();
          sh.moveTo(0, 0.005 * scale);
          sh.bezierCurveTo(side * 0.045 * scale, 0.062 * scale, side * 0.115 * scale, 0.075 * scale, side * 0.145 * scale, 0.042 * scale);
          sh.bezierCurveTo(side * 0.155 * scale, 0.015 * scale, side * 0.125 * scale, -0.018 * scale, side * 0.085 * scale, -0.022 * scale);
          sh.bezierCurveTo(side * 0.045 * scale, -0.024 * scale, side * 0.015 * scale, -0.012 * scale, 0, -0.008 * scale);
          sh.closePath();
          return sh;
        };
        const makeHindShape = (scale) => {
          const sh = new THREE.Shape();
          sh.moveTo(0, -0.005 * scale);
          sh.bezierCurveTo(side * 0.045 * scale, -0.01 * scale, side * 0.105 * scale, -0.015 * scale, side * 0.112 * scale, -0.045 * scale);
          sh.bezierCurveTo(side * 0.115 * scale, -0.072 * scale, side * 0.082 * scale, -0.088 * scale, side * 0.062 * scale, -0.082 * scale);
          sh.lineTo(side * 0.052 * scale, -0.108 * scale);
          sh.lineTo(side * 0.042 * scale, -0.082 * scale);
          sh.bezierCurveTo(side * 0.022 * scale, -0.078 * scale, side * 0.006 * scale, -0.052 * scale, 0, -0.035 * scale);
          sh.closePath();
          return sh;
        };

        const foreBorder = new THREE.Mesh(new THREE.ShapeGeometry(makeForeShape(1.0)), butteBodyMat);
        foreBorder.rotation.x = -Math.PI / 2;
        const foreColor = new THREE.Mesh(new THREE.ShapeGeometry(makeForeShape(0.88)), wingMat);
        foreColor.rotation.x = -Math.PI / 2;
        foreColor.position.y = 0.0012;
        const foreColorBot = foreColor.clone();
        foreColorBot.position.y = -0.0012;

        const hindBorder = new THREE.Mesh(new THREE.ShapeGeometry(makeHindShape(1.0)), butteBodyMat);
        hindBorder.rotation.x = -Math.PI / 2;
        hindBorder.position.y = -0.0005;
        const hindColor = new THREE.Mesh(new THREE.ShapeGeometry(makeHindShape(0.87)), wingMat);
        hindColor.rotation.x = -Math.PI / 2;
        hindColor.position.y = 0.0008;
        const hindColorBot = hindColor.clone();
        hindColorBot.position.y = -0.0018;

        const spots = [
          [side * 0.112, -0.032, 0.012],
          [side * 0.095, -0.012, 0.009],
          [side * 0.072, 0.035, 0.011],
          [side * 0.048, 0.058, 0.008]
        ];
        for (const [sx, sz, sr] of spots) {
          const sp = new THREE.Mesh(new THREE.CircleGeometry(sr, 8), butteSpotMat);
          sp.rotation.x = -Math.PI / 2;
          sp.position.set(sx, 0.002, sz);
          const spBot = sp.clone();
          spBot.position.y = -0.0024;
          pivot.add(sp, spBot);
        }

        pivot.add(foreBorder, foreColor, foreColorBot, hindBorder, hindColor, hindColorBot);
        return pivot;
      };

      const wingL = buildButterflyWing(-1), wingR = buildButterflyWing(1);
      g.add(wingL, wingR);
      g.scale.setScalar(s / 0.25);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.wingMat = wingMat;
      g.userData.kind = 'butterfly';
      return g;
    }

    function clearBugs() {
      for (const b of bugs) {
        if (!b.mesh) continue;
        scene.remove(b.mesh);
        b.mesh.traverse(ch => {
          if (!ch.isMesh) return;
          if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
          if (ch.material && ch.material !== beeYellowMat && ch.material !== beeAmberMat &&
              ch.material !== beeBlackMat && ch.material !== beeEyeMat &&
              ch.material !== beeWingMat && ch.material !== butteBodyMat && ch.material !== butteSpotMat) {
            try { ch.material.dispose(); } catch (_) {}
          }
        });
      }
      bugs.length = 0;
    }`
);

replaceExact(
  'killBug material keep-list',
  `        if (ch.material && ch.material !== beeYellowMat && ch.material !== beeBlackMat &&
            ch.material !== beeWingMat && ch.material !== butteBodyMat) {`,
  `        if (ch.material && ch.material !== beeYellowMat && ch.material !== beeAmberMat &&
            ch.material !== beeBlackMat && ch.material !== beeEyeMat &&
            ch.material !== beeWingMat && ch.material !== butteBodyMat && ch.material !== butteSpotMat) {`
);

// 2. Wildlife materials + makeBirdMesh .. disposeNestMesh
replaceExact(
  'wildlife builders (makeBirdMesh..disposeNestMesh)',
  `    const turtleShellMat = new THREE.MeshStandardMaterial({ color: 0x3f5c34, roughness: 0.8 });
    const turtleShellRimMat = new THREE.MeshStandardMaterial({ color: 0x6b7a3a, roughness: 0.75 });
    const turtleSkinMat = new THREE.MeshStandardMaterial({ color: 0x5a7a48, roughness: 0.75 });
    const FISH_BODY_COLORS = [0x6a7a8a, 0x8a6a3a, 0xc47a3a, 0x556b5a];
    const fishFinMat = new THREE.MeshStandardMaterial({
      color: 0xaebac2, roughness: 0.5, transparent: true, opacity: 0.75, side: THREE.DoubleSide
    });

    // The bird was a sphere, a smaller sphere, a cone and two flat boxes for wings.
    // Now it has a tapered body, a pale breast, a head with eyes either side of a
    // short beak, a fanned tail and two-piece wings: an inner wing out of the shoulder
    // and swept primaries beyond it. The wings stay Groups pivoted at the shoulder so
    // the existing flap (wingL.rotation.z) hinges where a wing actually hinges, and
    // the outer panel is angled so the flap folds and spreads the tips as it beats.
    function makeBirdMesh() {
      const g = new THREE.Group();
      const bodyMat = birdBodyMats[(Math.random() * birdBodyMats.length) | 0];
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), bodyMat);
      body.scale.set(1, 0.82, 1.45);
      // Rump tapering back into the tail rather than ending on the sphere.
      const rump = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 6), bodyMat);
      rump.rotation.x = -Math.PI / 2;
      rump.position.set(0, 0.004, -0.15);
      const breast = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), birdBreastMat);
      breast.scale.set(0.92, 0.72, 1.15);
      breast.position.set(0, -0.026, 0.035);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), bodyMat);
      head.position.set(0, 0.032, 0.105);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.042, 4), birdBeakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.026, 0.148);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 4, 3), birdEyeMat);
      eyeL.position.set(-0.03, 0.045, 0.122);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.03;
      // Tail: a flat fan of three feathers, splayed and tipped up a little.
      const tail = new THREE.Group();
      tail.position.set(0, 0.008, -0.175);
      tail.rotation.x = -0.14;
      for (let i = -1; i <= 1; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.006, 0.105), birdWingMat);
        f.position.set(i * 0.023, 0, -0.048);
        f.rotation.y = i * 0.26;
        tail.add(f);
      }

      // Sized off the body: the torso is ~0.085 across, so the inner panel has to start
      // outside that or it just disappears into the sphere and leaves the narrow outer
      // panel sticking out on its own — which reads as a plank bolted to a ball, not a
      // wing. Half-span works out near twice the body length, and the chord tapers from
      // the shoulder to the swept primaries.
      const wing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.02, 0.026, 0.006);
        const innerW = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.013, 0.1), birdWingMat);
        innerW.position.set(side * 0.055, 0, -0.008);
        innerW.rotation.y = side * -0.1;
        const outerW = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.009, 0.068), birdWingTipMat);
        outerW.position.set(side * 0.165, -0.004, -0.034);
        outerW.rotation.y = side * -0.32;  // primaries swept back off the elbow
        outerW.rotation.z = side * -0.12;
        pivot.add(innerW, outerW);
        return pivot;
      };
      const wingL = wing(-1), wingR = wing(1);

      g.add(body, rump, breast, head, beak, eyeL, eyeR, tail, wingL, wingR);
      const s = 0.85 + Math.random() * 0.35;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.tail = tail;
      g.userData.noCull = true;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'bird-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    // CU-130: a rabbit with a neck and four two-bone legs, so it can graze, groom,
    // drink and hop instead of sliding a single crouched blob around. +Z is the
    // nose. Negative rotation.x on a leg swings that leg forward.
    function makeRabbitMesh() {
      const g = new THREE.Group();
      const coat = RABBIT_COATS[(Math.random() * RABBIT_COATS.length) | 0];
      const fur = coat.fur, belly = coat.belly, earMat = coat.ear;
      const limb = (r, len, mat) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 5), mat);
        m.position.y = -(len * 0.5 + r);
        return m;
      };
      const leg = (side, hind) => {
        const hip = new THREE.Group();
        hip.position.set(side * (hind ? 0.05 : 0.034), hind ? 0.02 : 0.0, hind ? -0.04 : 0.07);
        const thigh = limb(hind ? 0.02 : 0.014, hind ? 0.05 : 0.04, fur);
        const knee = new THREE.Group();
        knee.position.y = thigh.position.y - (hind ? 0.03 : 0.024);
        const shin = limb(hind ? 0.014 : 0.011, hind ? 0.045 : 0.035, fur);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(hind ? 0.02 : 0.014, 5, 4), hind ? fur : belly);
        foot.scale.set(0.7, 0.45, hind ? 1.7 : 1.45);
        foot.position.y = shin.position.y - (hind ? 0.03 : 0.022);
        foot.position.z = hind ? 0.012 : 0.008;
        knee.add(shin, foot);
        hip.add(thigh, knee);
        hip.userData.knee = knee;
        return hip;
      };

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), fur);
      body.scale.set(0.95, 0.78, 1.35);
      body.position.set(0, 0.02, 0);
      const haunchL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), fur);
      haunchL.scale.set(0.85, 1.05, 1.1);
      haunchL.position.set(-0.05, 0.03, -0.04);
      const haunchR = haunchL.clone();
      haunchR.position.x = 0.05;
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), belly);
      chest.scale.set(0.85, 0.7, 1);
      chest.position.set(0, -0.01, 0.04);

      const headP = new THREE.Group();
      headP.position.set(0, 0.06, 0.1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.058, 7, 6), fur);
      head.scale.set(1, 0.95, 1.05);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.032, 5, 4), fur);
      muzzle.scale.set(0.8, 0.75, 1.2);
      muzzle.position.set(0, -0.012, 0.05);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), rabbitNoseMat);
      nose.position.set(0, -0.002, 0.078);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.01, 5, 4), rabbitEyeMat);
      eyeL.position.set(-0.04, 0.012, 0.03);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.04;
      const ear = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.022, 0.04, -0.01);
        pivot.rotation.z = side * 0.18;
        pivot.rotation.x = -0.15;
        const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.09, 3, 5), earMat);
        outer.scale.set(0.65, 1, 1.05);
        outer.position.y = 0.06;
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.07, 2, 4), rabbitInnerEarMat);
        inner.position.set(0, 0.058, 0.01);
        pivot.add(outer, inner);
        return pivot;
      };
      const earL = ear(-1), earR = ear(1);
      headP.add(head, muzzle, nose, eyeL, eyeR, earL, earR);

      const foreL = leg(-1, false), foreR = leg(1, false);
      const hindL = leg(-1, true), hindR = leg(1, true);
      // Loaf: hind legs folded under, front legs down.
      hindL.rotation.x = hindR.rotation.x = -0.55;
      hindL.userData.knee.rotation.x = hindR.userData.knee.rotation.x = 1.15;
      foreL.rotation.x = foreR.rotation.x = 0.2;
      foreL.userData.knee.rotation.x = foreR.userData.knee.rotation.x = -0.45;

      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), rabbitTailMat);
      tail.position.set(0, 0.045, -0.12);

      g.add(body, haunchL, haunchR, chest, headP, foreL, foreR, hindL, hindR, tail);
      const s = (Math.random() < 0.12 ? 1.45 + Math.random() * 0.2 : 1.15 + Math.random() * 0.28);
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.earL = earL;
      g.userData.earR = earR;
      g.userData.tail = tail;
      g.userData.baseScale = s;
      g.userData.joints = {
        head: headP, earL, earR, tail,
        foreL, foreR, hindL, hindR,
        kneeFL: foreL.userData.knee, kneeFR: foreR.userData.knee,
        kneeHL: hindL.userData.knee, kneeHR: hindR.userData.knee
      };
      g.userData.noCull = true;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'rabbit-skin' });
      return g;
    }

    // A scrape in the ground: an oval mouth, loose dirt fanned downhill (+z), grass at the lip.
    // No dome and no stick across the mouth. Those read as a hive.
    function makeBurrowMesh() {
      const g = new THREE.Group();
      const kind = (Math.random() * 3) | 0;
      const holeR = 0.14 + Math.random() * 0.05 + kind * 0.015;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(holeR, 12), burrowHoleMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.y = 0.03;
      hole.scale.set(1.05 + Math.random() * 0.25, 0.68 + Math.random() * 0.12, 1);
      const throat = new THREE.Mesh(new THREE.CylinderGeometry(holeR * 0.9, holeR * 0.35, 0.28, 10), burrowHoleMat);
      throat.position.y = -0.08;
      throat.scale.set(hole.scale.x, 1, hole.scale.y);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.48, 16), burrowDirtMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.012;
      pad.scale.set(1.15, 1, 0.9);
      g.add(throat, hole, pad);
      for (let i = 0; i < 4; i++) {
        const blot = new THREE.Mesh(new THREE.CircleGeometry(0.16 + Math.random() * 0.14, 8), burrowDirtMat);
        blot.rotation.x = Math.PI / 2;
        const a = Math.random() * Math.PI * 2;
        blot.position.set(Math.sin(a) * (0.18 + Math.random() * 0.22), 0.014, Math.cos(a) * (0.12 + Math.random() * 0.28));
        blot.scale.set(1.3, 0.7 + Math.random() * 0.5, 1);
        g.add(blot);
      }
      if (kind === 2) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const small = new THREE.Mesh(new THREE.CircleGeometry(holeR * 0.45, 8), burrowHoleMat);
        small.rotation.x = Math.PI / 2;
        small.position.set(side * (0.22 + Math.random() * 0.06), 0.032, -0.06);
        g.add(small);
      }
      const clods = 6 + kind * 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < clods; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.045, 5, 4), i % 3 === 0 ? burrowMoundMat : burrowDirtMat);
        const spread = (Math.random() - 0.5) * (0.35 + i * 0.04);
        c.position.set(spread, 0.018, 0.12 + Math.random() * 0.5);
        c.scale.set(1.35, 0.16 + Math.random() * 0.1, 1.05);
        g.add(c);
      }
      const stones = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < stones; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 5, 4), burrowMoundMat);
        s.position.set((Math.random() - 0.5) * 0.55, 0.02, 0.16 + Math.random() * 0.35);
        s.scale.y = 0.45;
        g.add(s);
      }
      const blades = 4 + ((Math.random() * 4) | 0);
      for (let i = 0; i < blades; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.07 + Math.random() * 0.05, 3), burrowGrassMat);
        const a = Math.PI + (Math.random() - 0.5) * 2.2;
        const rad = holeR + 0.04 + Math.random() * 0.08;
        blade.position.set(Math.sin(a) * rad * hole.scale.x, 0.04, Math.cos(a) * rad * hole.scale.y);
        blade.rotation.z = (Math.random() - 0.5) * 0.5;
        blade.rotation.x = 0.3 + Math.random() * 0.4;
        g.add(blade);
      }
      g.scale.setScalar(0.95 + Math.random() * 0.2);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = true; } });
      g.userData.mouthZ = 0;
      g.userData.kind = kind;
      return g;
    }

    function makeNestMesh() {
      const g = new THREE.Group();
      const twigCount = 9;
      for (let i = 0; i < twigCount; i++) {
        const a = (i / twigCount) * Math.PI * 2;
        const r = 0.15 + Math.random() * 0.03;
        const twig = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011, 0.013, 0.2 + Math.random() * 0.08, 4),
          nestTwigMat
        );
        twig.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.02, Math.sin(a) * r);
        twig.rotation.set((Math.random() - 0.5) * 0.5, a, Math.PI / 2 + (Math.random() - 0.5) * 0.4);
        g.add(twig);
      }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.06, 8), nestTwigMat);
      base.position.y = -0.02;
      g.add(base);
      if (Math.random() < 0.6) {
        const eggCount = 1 + ((Math.random() * 3) | 0);
        for (let i = 0; i < eggCount; i++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), nestEggMat);
          egg.scale.set(1, 1.25, 1);
          const a = Math.random() * Math.PI * 2, r = Math.random() * 0.06;
          egg.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
          g.add(egg);
        }
      }
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      return g;
    }

    function makeFrogMesh() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), frogBodyMat);
      body.scale.set(1.15, 0.7, 1.25);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), frogEyeMat);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), frogEyeMat);
      eyeL.position.set(-0.035, 0.045, 0.045);
      eyeR.position.set(0.035, 0.045, 0.045);
      // Throat sac — scaled up during a croak burst, otherwise sits nearly flat.
      const throat = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), frogThroatMat);
      throat.position.set(0, -0.025, 0.055);
      throat.scale.set(1, 0.6, 0.85);
      g.add(body, eyeL, eyeR, throat);
      const s = 0.7 + Math.random() * 0.35;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.eyeL = eyeL;
      g.userData.eyeR = eyeR;
      g.userData.throat = throat;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'frog-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    function makeLilyPadMesh() {
      const g = new THREE.Group();
      const r = 0.34 + Math.random() * 0.16;
      // A plain disc reads as a coin floating on the water — the notch is what
      // actually sells "lily pad" at a glance.
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 14, 0.35, Math.PI * 2 - 0.5), lilyPadMat);
      pad.rotation.x = -Math.PI / 2;
      g.add(pad);
      if (Math.random() < 0.4) {
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.05, 6), lilyFlowerMat);
        flower.position.set(r * 0.15, 0.03, r * 0.1);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), lilyFlowerCoreMat);
        core.position.set(r * 0.15, 0.06, r * 0.1);
        g.add(flower, core);
      }
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      return g;
    }

    function makeSquirrelMesh() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), squirrelBodyMat);
      body.scale.set(1, 0.9, 1.3);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), squirrelBodyMat);
      head.position.set(0, 0.05, 0.13);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), squirrelBellyMat);
      belly.scale.set(0.85, 0.65, 1);
      belly.position.set(0, -0.02, 0.03);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.035, 5), squirrelBodyMat);
      const earR = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.035, 5), squirrelBodyMat);
      earL.position.set(-0.03, 0.11, 0.15);
      earR.position.set(0.03, 0.11, 0.15);
      // Tail: three shrinking blobs arcing up and back over the body — cheap, but
      // reads instantly as "bushy tail" at this scale.
      const tail = new THREE.Group();
      const tSizes = [0.055, 0.045, 0.032];
      const tPos = [[0, 0.02, -0.13], [0, 0.09, -0.16], [0, 0.15, -0.12]];
      for (let i = 0; i < tSizes.length; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(tSizes[i], 5, 4), squirrelTailMat);
        seg.position.set(tPos[i][0], tPos[i][1], tPos[i][2]);
        tail.add(seg);
      }
      g.add(body, belly, head, earL, earR, tail);
      const s = 0.8 + Math.random() * 0.3;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.tail = tail;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'squirrel-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    function makeTurtleMesh() {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        turtleShellMat
      );
      shell.scale.set(1.15, 0.62, 1.4);
      shell.position.y = 0.05;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 5, 12), turtleShellRimMat);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.15, 1.4, 1);
      rim.position.y = 0.05;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), turtleSkinMat);
      head.position.set(0, 0.03, 0.16);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.07, 5), turtleSkinMat);
      neck.rotation.x = Math.PI * 0.42;
      neck.position.set(0, 0.03, 0.11);
      const legPos = [[-0.1, 0.09], [0.1, 0.09], [-0.1, -0.09], [0.1, -0.09]];
      const legs = [];
      for (const lp of legPos) {
        const leg = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), turtleSkinMat);
        leg.scale.set(1, 0.7, 1.2);
        leg.position.set(lp[0], -0.01, lp[1]);
        // Retract/emerge scales relative to this, not to (1,1,1) — otherwise the
        // animation would wipe out the flattened, stubby-leg shape set above.
        leg.userData.baseScale = { x: 1, y: 0.7, z: 1.2 };
        legs.push(leg);
        g.add(leg);
      }
      g.add(shell, rim, head, neck);
      const s = 0.75 + Math.random() * 0.3;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = true; } });
      g.userData.head = head;
      g.userData.neck = neck;
      g.userData.legs = legs;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'turtle-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    // Four kinds of freshwater fish, each dark on the back and pale underneath — the
    // way real fish are coloured to disappear from above and below. Seen through the
    // water it is the dark back you pick out.
    const FISH_KINDS = [
      { back: 0x3f4a30, side: 0x7d8a5c, belly: 0xd6cfa6, fin: 0x5b5a3c, len: 1.0 },   // trout
      { back: 0x4a5424, side: 0x9a9a4a, belly: 0xe0cf8e, fin: 0xb0602a, len: 0.85 },  // perch
      { back: 0x5a4a2a, side: 0x9c8048, belly: 0xcdb27a, fin: 0x6a5230, len: 1.25 },  // carp
      { back: 0x4f5864, side: 0x9aa4ad, belly: 0xe2e6e8, fin: 0x8a5a4a, len: 0.8 }    // roach
    ];
    function makeFishMesh(kind) {
      const K = kind || FISH_KINDS[(Math.random() * FISH_KINDS.length) | 0];
      const g = new THREE.Group();
      const backMat = new THREE.MeshStandardMaterial({ color: K.back, roughness: 0.45, metalness: 0.1 });
      const sideMat = new THREE.MeshStandardMaterial({ color: K.side, roughness: 0.4, metalness: 0.15 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: K.belly, roughness: 0.5, metalness: 0.05 });
      const finMat = new THREE.MeshStandardMaterial({ color: K.fin, roughness: 0.6, side: THREE.DoubleSide });
      // A spindle: long, deep in the middle, tapering to the tail.
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 7), sideMat);
      body.scale.set(0.55, 0.7, 1.9);
      const back = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), backMat);
      back.scale.set(0.57, 0.72, 1.86);
      back.position.y = 0.004;
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 6, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), bellyMat);
      belly.scale.set(0.53, 0.7, 1.8);
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0, -0.12);
      const tailShape = new THREE.BufferGeometry();
      tailShape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.0, 0.01, 0, 0.055, -0.075, 0, 0.0, -0.05, 0, 0.0, 0.01, 0, 0.0, -0.05, 0, -0.05, -0.075], 3));
      tailShape.computeVertexNormals();
      const tail = new THREE.Mesh(tailShape, finMat);
      tailPivot.add(tail);
      const dorsalShape = new THREE.BufferGeometry();
      dorsalShape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.045, 0.035, 0, 0.085, -0.01, 0, 0.042, -0.05], 3));
      dorsalShape.computeVertexNormals();
      const dorsal = new THREE.Mesh(dorsalShape, finMat);
      g.add(body, back, belly, tailPivot, dorsal);
      const s = (0.85 + Math.random() * 0.6) * K.len;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.tail = tailPivot;
      g.userData.body = body;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'fish-skin' });   // CL-140
      return g;
    }

    function disposeWildMesh(mesh) {
      if (!mesh) return;
      scene.remove(mesh);
      mesh.traverse(ch => {
        if (!ch.isMesh) return;
        if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
        if (ch.material &&
            ch.material !== birdWingMat && ch.material !== rabbitBodyMat &&
            ch.material !== birdWingTipMat && ch.material !== birdBreastMat &&
            ch.material !== birdBeakMat && ch.material !== birdEyeMat &&
            ch.material !== rabbitInnerEarMat && ch.material !== rabbitEyeMat &&
            ch.material !== rabbitNoseMat && ch.material !== rabbitTailMat &&
            !RABBIT_COATS.some(c => c.fur === ch.material || c.belly === ch.material || c.ear === ch.material) &&
            ch.material !== rabbitEarMat && ch.material !== rabbitBellyMat &&
            ch.material !== frogBodyMat && ch.material !== frogEyeMat &&
            ch.material !== frogThroatMat &&
            ch.material !== burrowMoundMat && ch.material !== burrowHoleMat &&
            ch.material !== burrowDirtMat && ch.material !== burrowGrassMat && ch.material !== burrowRootMat &&
            ch.material !== lilyPadMat && ch.material !== lilyFlowerMat && ch.material !== lilyFlowerCoreMat &&
            ch.material !== squirrelBodyMat && ch.material !== squirrelBellyMat && ch.material !== squirrelTailMat &&
            ch.material !== turtleShellMat && ch.material !== turtleShellRimMat && ch.material !== turtleSkinMat &&
            ch.material !== fishFinMat &&
            birdBodyMats.indexOf(ch.material) < 0) {
          try { ch.material.dispose(); } catch (_) {}
        }
      });
    }

    // Nests live as children of a tree's canopy group (so they sway and fall with
    // the tree for free), never as direct scene children — so they get their own
    // disposer that detaches from whatever parent they're actually on.
    function disposeNestMesh(mesh) {
      if (!mesh) return;
      if (mesh.parent) mesh.parent.remove(mesh);
      mesh.traverse(ch => {
        if (!ch.isMesh) return;
        if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
        if (ch.material && ch.material !== nestTwigMat && ch.material !== nestEggMat) {
          try { ch.material.dispose(); } catch (_) {}
        }
      });
    }`,
  `    const turtleShellMat = new THREE.MeshStandardMaterial({ color: 0x3f5c34, roughness: 0.8 });
    const turtleShellRimMat = new THREE.MeshStandardMaterial({ color: 0x6b7a3a, roughness: 0.75 });
    const turtleSkinMat = new THREE.MeshStandardMaterial({ color: 0x5a7a48, roughness: 0.75 });
    const turtlePlastronMat = new THREE.MeshStandardMaterial({ color: 0xc8b272, roughness: 0.82 });
    const turtleScuteMat = new THREE.MeshStandardMaterial({ color: 0x2c4223, roughness: 0.85 });
    const turtleStripeMat = new THREE.MeshStandardMaterial({ color: 0xc84a28, roughness: 0.7 });
    const birdBibMat = new THREE.MeshStandardMaterial({ color: 0x8a5236, roughness: 0.86 });
    const critterEyeShineMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.25 });
    const frogRidgeMat = new THREE.MeshStandardMaterial({ color: 0x6ba852, roughness: 0.68 });
    const frogSpotMat = new THREE.MeshStandardMaterial({ color: 0x244e2a, roughness: 0.78 });
    const frogIrisMat = new THREE.MeshStandardMaterial({ color: 0xd4a838, roughness: 0.45 });
    const lilyRimMat = new THREE.MeshStandardMaterial({ color: 0x458644, roughness: 0.72 });
    const lilySepalMat = new THREE.MeshStandardMaterial({ color: 0x386e38, roughness: 0.75 });
    const nestBarkMat = new THREE.MeshStandardMaterial({ color: 0x443320, roughness: 0.95 });
    const nestLiningMat = new THREE.MeshStandardMaterial({ color: 0x9b8458, roughness: 0.94 });
    const FISH_BODY_COLORS = [0x6a7a8a, 0x8a6a3a, 0xc47a3a, 0x556b5a];
    const fishFinMat = new THREE.MeshStandardMaterial({
      color: 0xaebac2, roughness: 0.5, transparent: true, opacity: 0.75, side: THREE.DoubleSide
    });

    // High-fidelity songbird: sculpted aerodynamic torso, nape, pale breast with warm bib,
    // crown & supercilium brow stripes, two-piece beak, tucked perching talons, fanned
    // 5-feather tail, and layered wings with coverts + 5 swept primary flight feathers.
    function makeBirdMesh() {
      const g = new THREE.Group();
      const bodyMat = birdBodyMats[(Math.random() * birdBodyMats.length) | 0];
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), bodyMat);
      body.scale.set(1, 0.82, 1.48);
      const nape = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), bodyMat);
      nape.scale.set(0.92, 0.85, 1.15);
      nape.position.set(0, 0.022, 0.065);
      const rump = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.125, 10), bodyMat);
      rump.rotation.x = -Math.PI / 2;
      rump.position.set(0, 0.005, -0.15);
      const breast = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), birdBreastMat);
      breast.scale.set(0.94, 0.78, 1.22);
      breast.position.set(0, -0.024, 0.032);
      const bib = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), birdBibMat);
      bib.scale.set(0.88, 0.72, 0.95);
      bib.position.set(0, -0.006, 0.088);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), bodyMat);
      head.scale.set(0.96, 0.94, 1.08);
      head.position.set(0, 0.035, 0.106);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), birdWingTipMat);
      crown.scale.set(0.82, 0.55, 1.15);
      crown.position.set(0, 0.064, 0.102);

      // Upper and lower beak
      const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.046, 8), birdBeakMat);
      upperBeak.rotation.x = Math.PI / 2 + 0.06;
      upperBeak.scale.set(0.95, 1, 0.75);
      upperBeak.position.set(0, 0.03, 0.156);
      const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.036, 8), birdBeakMat);
      lowerBeak.rotation.x = Math.PI / 2 - 0.08;
      lowerBeak.scale.set(0.85, 1, 0.65);
      lowerBeak.position.set(0, 0.021, 0.15);

      for (const side of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.028, 4, 6), birdBreastMat);
        brow.rotation.set(Math.PI / 2, 0, side * -0.15);
        brow.position.set(side * 0.03, 0.052, 0.112);
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), birdBreastMat);
        cheek.scale.set(0.65, 0.75, 0.95);
        cheek.position.set(side * 0.028, 0.024, 0.114);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), birdEyeMat);
        eye.position.set(side * 0.034, 0.042, 0.122);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 5, 4), critterEyeShineMat);
        shine.position.set(side * 0.039, 0.045, 0.126);
        // Tucked legs & talons
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.026, 4, 6), birdBeakMat);
        leg.rotation.x = 0.55;
        leg.position.set(side * 0.026, -0.068, -0.018);
        const claw = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), birdBeakMat);
        claw.scale.set(0.8, 0.55, 1.4);
        claw.position.set(side * 0.026, -0.078, -0.006);
        g.add(brow, cheek, eye, shine, leg, claw);
      }

      // Fanned 5-feather tail with upper tail coverts
      const tail = new THREE.Group();
      tail.position.set(0, 0.008, -0.175);
      tail.rotation.x = -0.12;
      const tailCovert = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), bodyMat);
      tailCovert.scale.set(1.1, 0.45, 1.2);
      tailCovert.position.set(0, 0.006, -0.015);
      tail.add(tailCovert);
      for (let i = -2; i <= 2; i++) {
        const isOuter = Math.abs(i) === 2;
        const f = new THREE.Mesh(
          new THREE.BoxGeometry(0.024, 0.005, 0.115 - Math.abs(i) * 0.006),
          isOuter ? birdWingTipMat : birdWingMat
        );
        f.position.set(i * 0.015, -Math.abs(i) * 0.001, -0.052);
        f.rotation.y = i * 0.16;
        tail.add(f);
      }

      // Continuous feathered wing: shoulder coverts, greater covert bar, and 5 swept primaries
      const wing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.022, 0.024, 0.008);
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), bodyMat);
        shoulder.scale.set(1.35, 0.32, 1.15);
        shoulder.position.set(side * 0.038, 0.004, 0.004);
        const innerW = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.014, 0.102), birdWingMat);
        innerW.position.set(side * 0.062, 0, -0.006);
        innerW.rotation.y = side * -0.1;
        const covertBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.022), birdBreastMat);
        covertBar.position.set(side * 0.064, 0.001, -0.022);
        covertBar.rotation.y = side * -0.12;
        pivot.add(shoulder, innerW, covertBar);
        // 5 overlapping primary & secondary flight feathers fanning smoothly to the wingtip
        for (let p = 0; p < 5; p++) {
          const t = p / 4;
          const len = 0.115 + (1 - Math.abs(t - 0.35)) * 0.035;
          const chord = 0.026 - t * 0.006;
          const feather = new THREE.Mesh(new THREE.BoxGeometry(len, 0.008, chord), birdWingTipMat);
          feather.position.set(
            side * (0.145 + t * 0.045),
            -0.002 - t * 0.003,
            -0.016 - t * 0.038
          );
          feather.rotation.y = side * (-0.18 - t * 0.24);
          feather.rotation.z = side * (-0.06 - t * 0.06);
          pivot.add(feather);
        }
        return pivot;
      };
      const wingL = wing(-1), wingR = wing(1);

      g.add(body, nape, rump, breast, bib, head, crown, upperBeak, lowerBeak, tail, wingL, wingR);
      const s = 0.85 + Math.random() * 0.35;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.wingL = wingL;
      g.userData.wingR = wingR;
      g.userData.tail = tail;
      g.userData.noCull = true;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'bird-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    // CU-130 + AG-78: a sculpted rabbit with neck, shoulder blades, cheek puffs, split lip,
    // nostrils, eye catchlights, whiskers, spoon-shaped dark-tipped ears, multi-tuft cottontail,
    // and four two-bone legs with 3-toed paws. +Z is the nose.
    function makeRabbitMesh() {
      const g = new THREE.Group();
      const coat = RABBIT_COATS[(Math.random() * RABBIT_COATS.length) | 0];
      const fur = coat.fur, belly = coat.belly, earMat = coat.ear;
      const limb = (r, len, mat) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 8), mat);
        m.position.y = -(len * 0.5 + r);
        return m;
      };
      const leg = (side, hind) => {
        const hip = new THREE.Group();
        hip.position.set(side * (hind ? 0.05 : 0.034), hind ? 0.02 : 0.0, hind ? -0.04 : 0.07);
        const thigh = limb(hind ? 0.022 : 0.015, hind ? 0.05 : 0.04, fur);
        const knee = new THREE.Group();
        knee.position.y = thigh.position.y - (hind ? 0.03 : 0.024);
        const shin = limb(hind ? 0.015 : 0.012, hind ? 0.045 : 0.035, fur);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(hind ? 0.021 : 0.015, 8, 6), hind ? fur : belly);
        foot.scale.set(0.75, 0.45, hind ? 1.75 : 1.48);
        foot.position.y = shin.position.y - (hind ? 0.03 : 0.022);
        foot.position.z = hind ? 0.012 : 0.008;
        // 3 sculpted toes + tiny claws on each paw
        for (let t = -1; t <= 1; t++) {
          const toe = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), belly);
          toe.scale.set(0.45, 0.85, 0.65);
          toe.position.set(t * 0.008, -0.004, 0.016);
          foot.add(toe);
        }
        knee.add(shin, foot);
        hip.add(thigh, knee);
        hip.userData.knee = knee;
        return hip;
      };

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.102, 14, 12), fur);
      body.scale.set(0.95, 0.8, 1.36);
      body.position.set(0, 0.02, 0);
      const neck = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), fur);
      neck.scale.set(0.92, 0.88, 1.05);
      neck.position.set(0, 0.042, 0.072);
      const underbelly = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), belly);
      underbelly.scale.set(0.84, 0.58, 1.22);
      underbelly.position.set(0, -0.014, -0.005);
      const haunchL = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), fur);
      haunchL.scale.set(0.86, 1.08, 1.14);
      haunchL.position.set(-0.05, 0.03, -0.042);
      const haunchR = haunchL.clone();
      haunchR.position.x = 0.05;
      const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), fur);
      shoulderL.scale.set(0.78, 0.92, 0.95);
      shoulderL.position.set(-0.038, 0.024, 0.055);
      const shoulderR = shoulderL.clone();
      shoulderR.position.x = 0.038;
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), belly);
      chest.scale.set(0.86, 0.74, 1.02);
      chest.position.set(0, -0.008, 0.045);

      const headP = new THREE.Group();
      headP.position.set(0, 0.06, 0.1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), fur);
      head.scale.set(1.0, 0.96, 1.08);
      const snoutBridge = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), fur);
      snoutBridge.scale.set(0.78, 0.72, 1.15);
      snoutBridge.position.set(0, 0.002, 0.042);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 8), fur);
      muzzle.scale.set(0.84, 0.76, 1.18);
      muzzle.position.set(0, -0.012, 0.05);
      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), belly);
      chin.scale.set(0.82, 0.55, 1.05);
      chin.position.set(0, -0.026, 0.044);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 6), rabbitNoseMat);
      nose.scale.set(1.15, 0.85, 0.9);
      nose.position.set(0, -0.002, 0.08);

      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), belly);
        cheek.scale.set(0.75, 0.72, 0.95);
        cheek.position.set(side * 0.028, -0.012, 0.026);
        const lip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), belly);
        lip.scale.set(0.85, 0.68, 0.95);
        lip.position.set(side * 0.011, -0.016, 0.066);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 8, 6), rabbitEyeMat);
        eye.position.set(side * 0.041, 0.013, 0.028);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 5, 4), critterEyeShineMat);
        shine.position.set(side * 0.048, 0.017, 0.033);
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.018, 4, 6), fur);
        brow.rotation.set(Math.PI / 2 - 0.15, 0, side * -0.2);
        brow.position.set(side * 0.038, 0.024, 0.028);
        headP.add(cheek, lip, eye, shine, brow);
        for (let w = -1; w <= 1; w++) {
          const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0004, 0.038, 4), belly);
          wh.position.set(side * 0.034, -0.013 + w * 0.004, 0.062);
          wh.rotation.set(w * 0.15, -side * 0.2, side * (Math.PI * 0.48 + w * 0.1));
          headP.add(wh);
        }
      }

      const ear = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.022, 0.04, -0.01);
        pivot.rotation.z = side * 0.18;
        pivot.rotation.x = -0.15;
        const base = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), earMat);
        base.scale.set(0.85, 1.1, 0.9);
        base.position.set(0, 0.012, 0);
        const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.088, 5, 8), earMat);
        outer.scale.set(0.68, 1, 1.05);
        outer.position.y = 0.06;
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), rabbitEyeMat);
        tip.scale.set(0.62, 1.15, 0.85);
        tip.position.set(0, 0.108, -0.001);
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.07, 4, 6), rabbitInnerEarMat);
        inner.scale.set(0.75, 1, 0.65);
        inner.position.set(0, 0.058, 0.011);
        pivot.add(base, outer, tip, inner);
        return pivot;
      };
      const earL = ear(-1), earR = ear(1);
      headP.add(head, snoutBridge, muzzle, chin, nose, earL, earR);

      const foreL = leg(-1, false), foreR = leg(1, false);
      const hindL = leg(-1, true), hindR = leg(1, true);
      // Loaf: hind legs folded under, front legs down.
      hindL.rotation.x = hindR.rotation.x = -0.55;
      hindL.userData.knee.rotation.x = hindR.userData.knee.rotation.x = 1.15;
      foreL.rotation.x = foreR.rotation.x = 0.2;
      foreL.userData.knee.rotation.x = foreR.userData.knee.rotation.x = -0.45;

      const tail = new THREE.Group();
      tail.position.set(0, 0.045, -0.12);
      const tailPlume = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), rabbitTailMat);
      tailPlume.scale.set(0.95, 1.05, 1.15);
      const tailTop = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), rabbitTailMat);
      tailTop.position.set(0, 0.014, -0.012);
      tail.add(tailPlume, tailTop);

      g.add(body, neck, underbelly, haunchL, haunchR, shoulderL, shoulderR, chest, headP, foreL, foreR, hindL, hindR, tail);
      const s = (Math.random() < 0.12 ? 1.45 + Math.random() * 0.2 : 1.15 + Math.random() * 0.28);
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.earL = earL;
      g.userData.earR = earR;
      g.userData.tail = tail;
      g.userData.baseScale = s;
      g.userData.joints = {
        head: headP, earL, earR, tail,
        foreL, foreR, hindL, hindR,
        kneeFL: foreL.userData.knee, kneeFR: foreR.userData.knee,
        kneeHL: hindL.userData.knee, kneeHR: hindR.userData.knee
      };
      g.userData.noCull = true;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'rabbit-skin' });
      return g;
    }

    // An excavated warren entrance: raised 3D earthen bank/hood around the back & flanks,
    // deep dark throat, gnarled tree roots arching over the lip, cascading spoil fan of
    // soil clods & stones downhill (+Z), and lush grass tufts around the bank.
    function makeBurrowMesh() {
      const g = new THREE.Group();
      const kind = (Math.random() * 3) | 0;
      const holeR = 0.15 + Math.random() * 0.04 + kind * 0.015;
      const sx = 1.12 + Math.random() * 0.2, sy = 0.72 + Math.random() * 0.1;

      const hole = new THREE.Mesh(new THREE.CircleGeometry(holeR, 16), burrowHoleMat);
      hole.rotation.x = Math.PI / 2 - 0.12;
      hole.position.set(0, 0.036, -0.01);
      hole.scale.set(sx, sy, 1);

      const throat = new THREE.Mesh(new THREE.CylinderGeometry(holeR * 0.92, holeR * 0.38, 0.32, 14), burrowHoleMat);
      throat.position.set(0, -0.09, -0.03);
      throat.rotation.x = 0.18;
      throat.scale.set(sx, 1, sy);

      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.52, 20), burrowDirtMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0, 0.012, 0.06);
      pad.scale.set(1.18, 1.05, 1);
      g.add(throat, hole, pad);

      // 3D raised earthen hood / rim mound curving around the back (-Z) and flanks of the hole
      const rimArcCount = 11;
      for (let i = 0; i < rimArcCount; i++) {
        const u = i / (rimArcCount - 1);
        const a = Math.PI * 0.55 + u * Math.PI * 0.9; // back and side arc
        const arch = Math.sin(u * Math.PI);
        const rx = Math.sin(a) * holeR * sx * 1.08;
        const rz = Math.cos(a) * holeR * sy * 1.05;
        const mound = new THREE.Mesh(
          new THREE.SphereGeometry(0.055 + arch * 0.035, 8, 6),
          i % 2 === 0 ? burrowMoundMat : burrowDirtMat
        );
        mound.scale.set(1.35, 0.55 + arch * 0.35, 1.15);
        mound.position.set(rx, 0.028 + arch * 0.025, rz);
        g.add(mound);
      }

      // Gnarled exposed tree roots arching over the upper brow and gripping the lip
      for (let r = 0; r < 4; r++) {
        const ra = Math.PI * 0.72 + (r / 3) * Math.PI * 0.56;
        const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.14, 4, 6), burrowRootMat);
        root.position.set(Math.sin(ra) * holeR * sx * 0.95, 0.052, Math.cos(ra) * holeR * sy * 0.92);
        root.rotation.set(0.35, ra, Math.PI * 0.42 + (r - 1.5) * 0.25);
        g.add(root);
      }

      // Layered spoil fan spilling downhill (+Z)
      for (let i = 0; i < 5; i++) {
        const blot = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.08, 10, 6), i % 2 ? burrowDirtMat : burrowMoundMat);
        const a = (i - 2) * 0.38;
        const d = 0.18 + (i % 3) * 0.08;
        blot.position.set(Math.sin(a) * d * 1.2, 0.014, 0.08 + Math.cos(a) * d);
        blot.scale.set(1.25, 0.12, 1.05);
        g.add(blot);
      }

      if (kind === 2) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const small = new THREE.Mesh(new THREE.CircleGeometry(holeR * 0.46, 12), burrowHoleMat);
        small.rotation.x = Math.PI / 2;
        small.position.set(side * 0.24, 0.034, -0.06);
        g.add(small);
      }

      const clods = 12 + kind * 2;
      for (let i = 0; i < clods; i++) {
        const c = new THREE.Mesh(
          new THREE.SphereGeometry(0.032 + (i % 4) * 0.011, 7, 6),
          i % 3 === 0 ? burrowMoundMat : burrowDirtMat
        );
        const t = i / clods;
        const spread = (Math.sin(i * 2.3) * 0.5) * (0.28 + t * 0.42);
        c.position.set(spread, 0.022, 0.1 + t * 0.44);
        c.scale.set(1.25, 0.35 + (i % 3) * 0.12, 1.05);
        c.rotation.y = i * 0.7;
        g.add(c);
      }

      const stones = 4;
      for (let i = 0; i < stones; i++) {
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.028 + (i % 2) * 0.014, 0), burrowRootMat);
        st.position.set((i - 1.5) * 0.14, 0.024, 0.16 + (i % 2) * 0.18);
        st.scale.set(1.15, 0.65, 0.95);
        st.rotation.set(i * 0.5, i * 1.1, 0.2);
        g.add(st);
      }

      // Lush multi-blade grass tufts framing the back and flanks
      const tuftCount = 9;
      for (let i = 0; i < tuftCount; i++) {
        const a = Math.PI * 0.52 + (i / (tuftCount - 1)) * Math.PI * 0.96;
        const rad = holeR * 1.18 + (i % 2) * 0.05;
        const tx = Math.sin(a) * rad * sx, tz = Math.cos(a) * rad * sy;
        for (let b = -1; b <= 1; b++) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.085 + (i % 3) * 0.022, 5), burrowGrassMat);
          blade.position.set(tx + b * 0.014, 0.052, tz);
          blade.rotation.z = b * 0.28 + Math.sin(a) * 0.2;
          blade.rotation.x = -0.15 + Math.cos(a) * 0.25;
          g.add(blade);
        }
      }

      g.scale.setScalar(0.95 + Math.random() * 0.2);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = true; } });
      g.userData.mouthZ = 0;
      g.userData.kind = kind;
      return g;
    }

    function makeNestMesh() {
      const g = new THREE.Group();
      // Sculpted woven cup bowl: tapered base, stacked woven torus walls, and soft mossy inner cup lining
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.11, 0.055, 14), nestBarkMat);
      base.position.y = -0.018;
      const wallLow = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.032, 8, 16), nestTwigMat);
      wallLow.rotation.x = Math.PI / 2;
      wallLow.scale.set(1, 1, 0.85);
      wallLow.position.y = 0.008;
      const wallHigh = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.028, 8, 16), nestBarkMat);
      wallHigh.rotation.x = Math.PI / 2;
      wallHigh.scale.set(1, 1, 0.8);
      wallHigh.position.y = 0.032;
      const lining = new THREE.Mesh(new THREE.SphereGeometry(0.122, 14, 10), nestLiningMat);
      lining.scale.set(1, 0.28, 1);
      lining.position.y = 0.006;
      g.add(base, wallLow, wallHigh, lining);

      // Dense interwoven perimeter twigs across two tiers
      const twigCount = 22;
      for (let i = 0; i < twigCount; i++) {
        const tier = i % 2;
        const a = (i / twigCount) * Math.PI * 2 + tier * 0.14;
        const r = 0.142 + tier * 0.012 + (i % 3) * 0.006;
        const len = 0.16 + (i % 4) * 0.025;
        const twig = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0085, 0.0115, len, 6),
          i % 3 === 0 ? nestBarkMat : nestTwigMat
        );
        twig.position.set(Math.cos(a) * r, 0.012 + tier * 0.022 + (i % 3) * 0.005, Math.sin(a) * r);
        twig.rotation.set(Math.sin(i * 1.7) * 0.22, a, Math.PI / 2 + Math.cos(i * 2.1) * 0.18);
        g.add(twig);
      }

      // Soft moss tufts woven into the rim
      for (let m = 0; m < 5; m++) {
        const ma = (m / 5) * Math.PI * 2 + 0.4;
        const moss = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 5), burrowGrassMat);
        moss.scale.set(1.3, 0.55, 0.9);
        moss.position.set(Math.cos(ma) * 0.145, 0.036, Math.sin(ma) * 0.145);
        moss.rotation.y = ma;
        g.add(moss);
      }

      // Clutch of 3 nestled speckled eggs resting snugly in the cup lining
      const eggAngles = [0.2, 2.3, 4.4];
      for (let i = 0; i < 3; i++) {
        const a = eggAngles[i];
        const er = 0.038;
        const eggG = new THREE.Group();
        eggG.position.set(Math.cos(a) * er, 0.028, Math.sin(a) * er);
        eggG.rotation.set(Math.cos(a) * 0.32, a, -Math.sin(a) * 0.32);
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.033, 12, 10), nestEggMat);
        egg.scale.set(0.92, 1.28, 0.92);
        eggG.add(egg);
        for (let sp = 0; sp < 3; sp++) {
          const sa = sp * 2.1 + i;
          const speck = new THREE.Mesh(new THREE.SphereGeometry(0.006, 5, 4), nestBarkMat);
          speck.scale.set(1, 0.4, 1);
          speck.position.set(Math.cos(sa) * 0.026, 0.012 + (sp - 1) * 0.01, Math.sin(sa) * 0.026);
          eggG.add(speck);
        }
        g.add(eggG);
      }
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      return g;
    }

    function makeFrogMesh() {
      const g = new THREE.Group();
      // Sculpted amphibious torso pitched upward at the front (+Z), pale belly, snout & mouth seam
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), frogBodyMat);
      body.scale.set(1.12, 0.72, 1.32);
      body.rotation.x = -0.18;
      body.position.set(0, 0.012, -0.005);

      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), frogBodyMat);
      snout.scale.set(1.08, 0.62, 1.15);
      snout.position.set(0, 0.018, 0.052);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), frogThroatMat);
      belly.scale.set(1.02, 0.55, 1.18);
      belly.position.set(0, -0.014, 0.002);

      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0035, 5, 12, Math.PI), frogSpotMat);
      mouth.rotation.x = Math.PI / 2 + 0.08;
      mouth.scale.set(1.08, 0.95, 1);
      mouth.position.set(0, 0.012, 0.064);

      // Vocal throat sac — scaled up during a croak burst, otherwise sits smoothly under the chin
      const throat = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), frogThroatMat);
      throat.position.set(0, -0.014, 0.056);
      throat.scale.set(1, 0.6, 0.85);

      // Raised periscope eye domes & eyes with golden iris rings and catchlights (children of eyeL/eyeR so they blink together)
      const makeFrogEye = (side) => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), frogEyeMat);
        e.position.set(side * 0.036, 0.052, 0.048);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 8, 6), frogIrisMat);
        iris.scale.set(1.12, 0.92, 0.92);
        iris.position.set(side * 0.002, 0, 0.002);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 5, 4), critterEyeShineMat);
        shine.position.set(side * 0.008, 0.006, 0.011);
        e.add(iris, shine);
        return e;
      };
      const eyeL = makeFrogEye(-1), eyeR = makeFrogEye(1);

      for (const side of [-1, 1]) {
        // Eye socket dome + nostril + dorsolateral ridge + dorsal spots
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), frogBodyMat);
        dome.scale.set(0.95, 0.85, 1.05);
        dome.position.set(side * 0.034, 0.044, 0.044);
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 5, 4), frogSpotMat);
        nostril.position.set(side * 0.018, 0.028, 0.098);
        const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.11, 4, 8), frogRidgeMat);
        ridge.rotation.set(Math.PI / 2 - 0.22, side * -0.08, 0);
        ridge.position.set(side * 0.044, 0.036, -0.012);
        const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 7, 5), frogSpotMat);
        spot1.scale.set(1.1, 0.35, 1.3);
        spot1.position.set(side * 0.022, 0.052, -0.008);
        const spot2 = spot1.clone();
        spot2.position.set(side * 0.028, 0.038, -0.052);

        // Folded muscular Z-hindleg: thigh, calf, and 3-toed webbed hind foot
        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.055, 5, 8), frogBodyMat);
        thigh.position.set(side * 0.068, 0.002, -0.025);
        thigh.rotation.set(Math.PI / 2 - 0.25, side * -0.55, 0);
        const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.058, 5, 8), frogBodyMat);
        calf.position.set(side * 0.076, -0.018, -0.042);
        calf.rotation.set(Math.PI / 2 + 0.12, side * 0.35, 0);
        const hindFoot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), frogRidgeMat);
        hindFoot.scale.set(1.15, 0.28, 1.65);
        hindFoot.position.set(side * 0.072, -0.032, -0.005);
        for (let t = -1; t <= 1; t++) {
          const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.028, 4, 5), frogRidgeMat);
          toe.rotation.set(Math.PI / 2, t * 0.28 + side * 0.1, 0);
          toe.position.set(side * 0.074 + t * 0.012, -0.034, 0.026);
          g.add(toe);
        }

        // Braced front arm, forearm, and 4-toed hand
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.034, 4, 6), frogBodyMat);
        arm.position.set(side * 0.056, -0.006, 0.042);
        arm.rotation.set(0.25, 0, side * -0.45);
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.032, 4, 6), frogBodyMat);
        forearm.position.set(side * 0.058, -0.024, 0.056);
        forearm.rotation.set(-0.35, 0, side * 0.22);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.015, 7, 5), frogRidgeMat);
        hand.scale.set(1.15, 0.32, 1.35);
        hand.position.set(side * 0.052, -0.034, 0.072);

        g.add(dome, nostril, ridge, spot1, spot2, thigh, calf, hindFoot, arm, forearm, hand);
      }

      g.add(body, snout, belly, mouth, eyeL, eyeR, throat);
      const s = 0.7 + Math.random() * 0.35;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.eyeL = eyeL;
      g.userData.eyeR = eyeR;
      g.userData.throat = throat;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'frog-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    function makeLilyPadMesh() {
      const g = new THREE.Group();
      const r = 0.34 + Math.random() * 0.16;
      // 3D water-lily pad with notched thickness, upturned rim, radiating veins, companion pad, and multi-petaled lotus blossom
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 0.97, 0.016, 24, 1, false, 0.28, Math.PI * 2 - 0.56),
        lilyPadMat
      );
      pad.position.y = 0.008;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.985, 0.011, 6, 24, Math.PI * 2 - 0.6),
        lilyRimMat
      );
      rim.rotation.x = Math.PI / 2;
      rim.rotation.z = -Math.PI / 2 + 0.3;
      rim.position.y = 0.014;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), lilyRimMat);
      hub.scale.set(1, 0.45, 1);
      hub.position.y = 0.016;
      g.add(pad, rim, hub);

      // Radiating leaf veins across the pad surface
      const veinCount = 7;
      for (let i = 0; i < veinCount; i++) {
        const a = 0.65 + (i / (veinCount - 1)) * (Math.PI * 2 - 1.3);
        const vLen = r * 0.82;
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, vLen, 5), lilyRimMat);
        vein.position.set(Math.sin(a) * vLen * 0.5, 0.016, Math.cos(a) * vLen * 0.5);
        vein.rotation.order = 'YXZ';
        vein.rotation.y = a;
        vein.rotation.x = Math.PI / 2;
        g.add(vein);
      }

      // Companion small secondary lily pad for natural pond silhouette
      const subR = r * 0.38;
      const subPad = new THREE.Mesh(
        new THREE.CylinderGeometry(subR, subR * 0.96, 0.012, 16, 1, false, 0.35, Math.PI * 2 - 0.7),
        lilyRimMat
      );
      subPad.position.set(-r * 0.72, 0.006, -r * 0.45);
      subPad.rotation.y = 2.2;
      g.add(subPad);

      // Multi-layered water-lily / lotus blossom
      const flowerG = new THREE.Group();
      flowerG.position.set(r * 0.16, 0.016, -r * 0.12);
      // 4 green outer sepals
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        const sep = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.068, 6), lilySepalMat);
        sep.scale.set(0.85, 1, 0.42);
        sep.position.set(Math.cos(a) * 0.036, 0.014, Math.sin(a) * 0.036);
        sep.rotation.order = 'YXZ';
        sep.rotation.y = -a + Math.PI / 2;
        sep.rotation.x = 1.08;
        flowerG.add(sep);
      }
      // Outer ring of 8 cupped petals
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const pet = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), lilyFlowerMat);
        pet.scale.set(0.62, 1.55, 0.32);
        pet.position.set(Math.cos(a) * 0.034, 0.026, Math.sin(a) * 0.034);
        pet.rotation.order = 'YXZ';
        pet.rotation.y = -a + Math.PI / 2;
        pet.rotation.x = 0.78;
        flowerG.add(pet);
      }
      // Inner ring of 6 upright petals
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.26;
        const pet = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 6), lilyFlowerMat);
        pet.scale.set(0.58, 1.45, 0.3);
        pet.position.set(Math.cos(a) * 0.02, 0.036, Math.sin(a) * 0.02);
        pet.rotation.order = 'YXZ';
        pet.rotation.y = -a + Math.PI / 2;
        pet.rotation.x = 0.42;
        flowerG.add(pet);
      }
      // Golden stamen crown
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), lilyFlowerCoreMat);
      core.scale.set(1, 0.75, 1);
      core.position.y = 0.032;
      flowerG.add(core);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.002, 0.024, 4), lilyFlowerCoreMat);
        st.position.set(Math.cos(a) * 0.014, 0.044, Math.sin(a) * 0.014);
        st.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
        flowerG.add(st);
      }
      g.add(flowerG);

      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      return g;
    }

    function makeSquirrelMesh() {
      const g = new THREE.Group();
      // Agile arched torso, warm cream belly, haunches, 4 articulated limbs/paws, expressive head, and S-curved plume tail
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 10), squirrelBodyMat);
      body.scale.set(0.92, 0.88, 1.36);
      body.rotation.x = 0.14;
      body.position.set(0, 0.018, 0.005);

      const neck = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), squirrelBodyMat);
      neck.scale.set(0.88, 0.92, 1.05);
      neck.position.set(0, 0.046, 0.092);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 8), squirrelBellyMat);
      belly.scale.set(0.82, 0.72, 1.24);
      belly.position.set(0, -0.014, 0.025);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), squirrelBodyMat);
      head.scale.set(0.96, 0.92, 1.12);
      head.position.set(0, 0.068, 0.132);

      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), squirrelBodyMat);
      muzzle.scale.set(0.82, 0.72, 1.22);
      muzzle.position.set(0, 0.056, 0.178);

      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), squirrelBellyMat);
      chin.scale.set(0.78, 0.55, 1.05);
      chin.position.set(0, 0.042, 0.168);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 7, 5), rabbitEyeMat);
      nose.position.set(0, 0.062, 0.214);

      for (const side of [-1, 1]) {
        // Cheeks, buff eye-ring, dark glossy eye + catchlight, and tufted ears
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), squirrelBellyMat);
        cheek.scale.set(0.75, 0.72, 0.95);
        cheek.position.set(side * 0.032, 0.052, 0.156);
        const eyeRing = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), squirrelBellyMat);
        eyeRing.scale.set(0.65, 1.05, 1.05);
        eyeRing.position.set(side * 0.042, 0.076, 0.154);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 8, 6), rabbitEyeMat);
        eye.position.set(side * 0.045, 0.076, 0.156);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 5, 4), critterEyeShineMat);
        shine.position.set(side * 0.051, 0.08, 0.16);

        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.026, 4, 6), squirrelBodyMat);
        ear.scale.set(0.65, 1, 0.95);
        ear.position.set(side * 0.034, 0.118, 0.118);
        ear.rotation.set(-0.18, 0, side * -0.22);
        const earInner = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.018, 3, 5), squirrelBellyMat);
        earInner.scale.set(0.55, 1, 0.7);
        earInner.position.set(side * 0.035, 0.116, 0.125);
        earInner.rotation.set(-0.18, 0, side * -0.22);
        const earTuft = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.024, 5), squirrelTailMat);
        earTuft.position.set(side * 0.039, 0.142, 0.114);
        earTuft.rotation.set(-0.22, 0, side * -0.25);

        // Muscular hind haunch, shin, and long clawed hind foot
        const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), squirrelBodyMat);
        haunch.scale.set(0.82, 1.08, 1.15);
        haunch.position.set(side * 0.052, 0.012, -0.045);
        const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.042, 4, 6), squirrelBodyMat);
        shin.position.set(side * 0.055, -0.032, -0.038);
        shin.rotation.x = -0.35;
        const hindFoot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), squirrelBodyMat);
        hindFoot.scale.set(0.75, 0.42, 1.85);
        hindFoot.position.set(side * 0.056, -0.058, -0.012);

        // Foreleg & nimble front paw
        const foreArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.048, 4, 6), squirrelBodyMat);
        foreArm.position.set(side * 0.042, -0.018, 0.078);
        foreArm.rotation.x = 0.22;
        const forePaw = new THREE.Mesh(new THREE.SphereGeometry(0.016, 7, 5), squirrelBellyMat);
        forePaw.scale.set(0.82, 0.48, 1.35);
        forePaw.position.set(side * 0.042, -0.052, 0.095);

        g.add(cheek, eyeRing, eye, shine, ear, earInner, earTuft, haunch, shin, hindFoot, foreArm, forePaw);
      }

      // Voluminous S-curved bushy plume tail arching up and forward over the back
      const tail = new THREE.Group();
      const tailSpec = [
        { pos: [0, 0.008, -0.105], r: 0.042, sx: 0.95, sy: 0.95, sz: 1.15, rx: 0.4, mat: squirrelBodyMat },
        { pos: [0, 0.042, -0.148], r: 0.054, sx: 1.05, sy: 1.05, sz: 1.15, rx: 0.15, mat: squirrelTailMat },
        { pos: [0, 0.092, -0.168], r: 0.064, sx: 1.12, sy: 1.1,  sz: 1.08, rx: -0.15, mat: squirrelTailMat },
        { pos: [0, 0.148, -0.155], r: 0.068, sx: 1.16, sy: 1.08, sz: 1.05, rx: -0.45, mat: squirrelTailMat },
        { pos: [0, 0.198, -0.118], r: 0.062, sx: 1.14, sy: 1.0,  sz: 1.05, rx: -0.75, mat: squirrelBodyMat },
        { pos: [0, 0.228, -0.068], r: 0.048, sx: 1.05, sy: 0.88, sz: 1.12, rx: -1.05, mat: squirrelTailMat },
        { pos: [0, 0.236, -0.022], r: 0.032, sx: 0.92, sy: 0.72, sz: 1.18, rx: -1.25, mat: squirrelBellyMat }
      ];
      for (const ts of tailSpec) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(ts.r, 10, 8), ts.mat);
        seg.scale.set(ts.sx, ts.sy, ts.sz);
        seg.position.set(ts.pos[0], ts.pos[1], ts.pos[2]);
        seg.rotation.x = ts.rx;
        tail.add(seg);
      }

      g.add(body, neck, belly, head, muzzle, chin, nose, tail);
      const s = 0.8 + Math.random() * 0.3;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.tail = tail;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'squirrel-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    function makeTurtleMesh() {
      const g = new THREE.Group();
      // Domed carapace, flared marginal rim, ventral plastron, and raised polygonal scute mosaic
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.112, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        turtleShellMat
      );
      shell.scale.set(1.16, 0.64, 1.42);
      shell.position.y = 0.048;

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.021, 8, 20), turtleShellRimMat);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.16, 1.42, 0.75);
      rim.position.y = 0.048;

      const plastron = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.092, 0.022, 16), turtlePlastronMat);
      plastron.scale.set(1.12, 1, 1.36);
      plastron.position.y = 0.036;

      // Central vertebral scutes + lateral costal scutes along the carapace dome
      const vZ = [-0.085, -0.042, 0.0, 0.042, 0.085];
      const vY = [0.094, 0.112, 0.118, 0.112, 0.094];
      for (let i = 0; i < vZ.length; i++) {
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.012, 6), turtleScuteMat);
        sc.scale.set(1.15, 1, 0.95);
        sc.position.set(0, vY[i], vZ[i]);
        sc.rotation.x = -vZ[i] * 2.2;
        g.add(sc);
      }
      for (const side of [-1, 1]) {
        const cZ = [-0.062, -0.02, 0.022, 0.062];
        for (let i = 0; i < cZ.length; i++) {
          const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.029, 0.01, 6), turtleScuteMat);
          cs.scale.set(1.2, 1, 0.92);
          cs.position.set(side * 0.056, 0.092 - Math.abs(cZ[i]) * 0.18, cZ[i]);
          cs.rotation.set(-cZ[i] * 1.8, 0, -side * 0.48);
          g.add(cs);
        }
      }

      // Reptilian head with hooked beak, eyes, iris rims, and red-ear slider stripes (children of head so they retract with head.scale)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), turtleSkinMat);
      head.scale.set(0.92, 0.85, 1.25);
      head.position.set(0, 0.042, 0.175);
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.032, 8), turtleSkinMat);
      snout.rotation.x = Math.PI / 2 + 0.12;
      snout.scale.set(0.95, 1, 0.78);
      snout.position.set(0, -0.002, 0.028);
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), turtlePlastronMat);
      jaw.scale.set(0.82, 0.48, 1.1);
      jaw.position.set(0, -0.014, 0.012);
      head.add(snout, jaw);
      for (const side of [-1, 1]) {
        const eyeRim = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), turtlePlastronMat);
        eyeRim.position.set(side * 0.024, 0.012, 0.016);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), rabbitEyeMat);
        eye.position.set(side * 0.027, 0.012, 0.018);
        const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.018, 4, 6), turtleStripeMat);
        stripe.rotation.set(Math.PI / 2, 0, side * -0.15);
        stripe.position.set(side * 0.028, 0.004, -0.006);
        head.add(eyeRim, eye, stripe);
      }

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.075, 10), turtleSkinMat);
      neck.rotation.x = Math.PI * 0.44;
      neck.position.set(0, 0.038, 0.128);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.055, 8), turtleSkinMat);
      tail.rotation.x = -Math.PI * 0.46;
      tail.position.set(0, 0.03, -0.162);

      const legPos = [[-0.095, 0.088, 0.42], [0.095, 0.088, 0.42], [-0.095, -0.088, -0.42], [0.095, -0.088, -0.42]];
      const legs = [];
      for (const lp of legPos) {
        const side = lp[0] < 0 ? -1 : 1;
        const isFront = lp[1] > 0;
        const leg = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), turtleSkinMat);
        leg.scale.set(1.05, 0.65, 1.35);
        leg.position.set(lp[0], 0.016, lp[1]);
        leg.rotation.set(0.18, side * lp[2], side * -0.25);
        // 3 pale claws parented to each leg so they retract cleanly with leg.scale
        for (let c = -1; c <= 1; c++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.018, 5), turtlePlastronMat);
          claw.rotation.x = Math.PI * 0.56;
          claw.position.set(c * 0.011, -0.008, isFront ? 0.032 : -0.032);
          if (!isFront) claw.rotation.x = -Math.PI * 0.56;
          leg.add(claw);
        }
        leg.userData.baseScale = { x: 1.05, y: 0.65, z: 1.35 };
        legs.push(leg);
        g.add(leg);
      }

      g.add(shell, rim, plastron, head, neck, tail);
      const s = 0.75 + Math.random() * 0.3;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = true; } });
      g.userData.head = head;
      g.userData.neck = neck;
      g.userData.legs = legs;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'turtle-skin' });   // CL-140: one draw, not twenty
      return g;
    }

    // Four kinds of freshwater fish, each dark on the back and pale underneath — the
    // way real fish are coloured to disappear from above and below. Seen through the
    // water it is the dark back you pick out.
    const FISH_KINDS = [
      { back: 0x3f4a30, side: 0x7d8a5c, belly: 0xd6cfa6, fin: 0x5b5a3c, len: 1.0 },   // trout
      { back: 0x4a5424, side: 0x9a9a4a, belly: 0xe0cf8e, fin: 0xb0602a, len: 0.85 },  // perch
      { back: 0x5a4a2a, side: 0x9c8048, belly: 0xcdb27a, fin: 0x6a5230, len: 1.25 },  // carp
      { back: 0x4f5864, side: 0x9aa4ad, belly: 0xe2e6e8, fin: 0x8a5a4a, len: 0.8 }    // roach
    ];
    function makeFishMesh(kind) {
      const K = kind || FISH_KINDS[(Math.random() * FISH_KINDS.length) | 0];
      const g = new THREE.Group();
      const backMat = new THREE.MeshStandardMaterial({ color: K.back, roughness: 0.42, metalness: 0.12 });
      const sideMat = new THREE.MeshStandardMaterial({ color: K.side, roughness: 0.38, metalness: 0.18 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: K.belly, roughness: 0.48, metalness: 0.06 });
      const finMat = new THREE.MeshStandardMaterial({ color: K.fin, roughness: 0.55, side: THREE.DoubleSide });

      // Streamlined fusiform body with non-z-fighting dorsal crest, countershaded belly, and tapered caudal peduncle
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), sideMat);
      body.scale.set(0.54, 0.74, 1.92);

      const back = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 10), backMat);
      back.scale.set(0.5, 0.52, 1.82);
      back.position.set(0, 0.018, 0.004);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), bellyMat);
      belly.scale.set(0.48, 0.48, 1.72);
      belly.position.set(0, -0.018, 0.008);

      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.055, 10), backMat);
      snout.rotation.x = Math.PI / 2 + 0.08;
      snout.scale.set(0.72, 1, 0.82);
      snout.position.set(0, -0.002, 0.122);

      const lowerJaw = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.045, 8), bellyMat);
      lowerJaw.rotation.x = Math.PI / 2 - 0.12;
      lowerJaw.scale.set(0.68, 1, 0.65);
      lowerJaw.position.set(0, -0.011, 0.118);

      // Eyes, golden iris rings, gill covers (opercula), lateral bars, and paired pectoral & pelvic fins
      for (const side of [-1, 1]) {
        const gill = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), backMat);
        gill.scale.set(0.32, 0.95, 0.72);
        gill.position.set(side * 0.032, 0.0, 0.068);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 8, 6), bellyMat);
        iris.scale.set(0.45, 1, 1);
        iris.position.set(side * 0.03, 0.01, 0.098);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 5), rabbitEyeMat);
        pupil.scale.set(0.5, 1, 1);
        pupil.position.set(side * 0.033, 0.01, 0.099);

        // Subtle dorsal-flank bars / parr marks
        for (let b = 0; b < 4; b++) {
          const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.026, 3, 5), backMat);
          bar.scale.set(0.45, 1, 0.85);
          bar.position.set(side * (0.033 - b * 0.003), 0.012, 0.035 - b * 0.032);
          bar.rotation.z = side * 0.08;
          g.add(bar);
        }

        // Pectoral fin splayed from behind the gill cover
        const pec = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.052, 6), finMat);
        pec.scale.set(0.22, 1, 0.85);
        pec.position.set(side * 0.038, -0.016, 0.042);
        pec.rotation.set(-0.95, side * -0.45, side * 0.55);

        // Pelvic fin underneath
        const pelv = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.038, 5), finMat);
        pelv.scale.set(0.22, 1, 0.78);
        pelv.position.set(side * 0.016, -0.044, -0.012);
        pelv.rotation.set(-1.15, 0, side * 0.35);

        g.add(gill, iris, pupil, pec, pelv);
      }

      // Primary multi-rayed dorsal fin + secondary adipose fin + ventral anal fin
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.068, 6), finMat);
      dorsal.scale.set(0.16, 1, 1.35);
      dorsal.position.set(0, 0.058, -0.005);
      dorsal.rotation.x = -0.52;

      const adipose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.032, 5), finMat);
      adipose.scale.set(0.18, 1, 1.1);
      adipose.position.set(0, 0.038, -0.072);
      adipose.rotation.x = -0.65;

      const analFin = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.044, 5), finMat);
      analFin.scale.set(0.16, 1, 1.15);
      analFin.position.set(0, -0.042, -0.065);
      analFin.rotation.x = -2.45;

      // Sculpted forked 3D caudal (tail) fin on tailPivot
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0, -0.12);
      const upperLobe = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.078, 6), finMat);
      upperLobe.scale.set(0.18, 1, 1.1);
      upperLobe.position.set(0, 0.024, -0.036);
      upperLobe.rotation.x = -0.98;
      const lowerLobe = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.072, 6), finMat);
      lowerLobe.scale.set(0.18, 1, 1.05);
      lowerLobe.position.set(0, -0.022, -0.034);
      lowerLobe.rotation.x = -2.18;
      const tailWeb = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.036, 0.042), finMat);
      tailWeb.position.set(0, 0.001, -0.022);
      tailPivot.add(upperLobe, lowerLobe, tailWeb);

      g.add(body, back, belly, snout, lowerJaw, dorsal, adipose, analFin, tailPivot);
      const s = (0.85 + Math.random() * 0.6) * K.len;
      g.scale.setScalar(s);
      g.traverse(ch => { if (ch.isMesh) { ch.castShadow = false; ch.receiveShadow = false; } });
      g.userData.tail = tailPivot;
      g.userData.body = body;
      g.userData.baseScale = s;
      skinMergeGroup(THREE, g, { bones: 'self', name: 'fish-skin' });   // CL-140
      return g;
    }

    function disposeWildMesh(mesh) {
      if (!mesh) return;
      scene.remove(mesh);
      mesh.traverse(ch => {
        if (!ch.isMesh) return;
        if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
        if (ch.material &&
            ch.material !== birdWingMat && ch.material !== rabbitBodyMat &&
            ch.material !== birdWingTipMat && ch.material !== birdBreastMat &&
            ch.material !== birdBibMat && ch.material !== critterEyeShineMat &&
            ch.material !== birdBeakMat && ch.material !== birdEyeMat &&
            ch.material !== rabbitInnerEarMat && ch.material !== rabbitEyeMat &&
            ch.material !== rabbitNoseMat && ch.material !== rabbitTailMat &&
            !RABBIT_COATS.some(c => c.fur === ch.material || c.belly === ch.material || c.ear === ch.material) &&
            ch.material !== rabbitEarMat && ch.material !== rabbitBellyMat &&
            ch.material !== frogBodyMat && ch.material !== frogEyeMat &&
            ch.material !== frogThroatMat && ch.material !== frogRidgeMat &&
            ch.material !== frogSpotMat && ch.material !== frogIrisMat &&
            ch.material !== burrowMoundMat && ch.material !== burrowHoleMat &&
            ch.material !== burrowDirtMat && ch.material !== burrowGrassMat && ch.material !== burrowRootMat &&
            ch.material !== lilyPadMat && ch.material !== lilyRimMat && ch.material !== lilySepalMat &&
            ch.material !== lilyFlowerMat && ch.material !== lilyFlowerCoreMat &&
            ch.material !== squirrelBodyMat && ch.material !== squirrelBellyMat && ch.material !== squirrelTailMat &&
            ch.material !== turtleShellMat && ch.material !== turtleShellRimMat && ch.material !== turtleSkinMat &&
            ch.material !== turtlePlastronMat && ch.material !== turtleScuteMat && ch.material !== turtleStripeMat &&
            ch.material !== fishFinMat &&
            birdBodyMats.indexOf(ch.material) < 0) {
          try { ch.material.dispose(); } catch (_) {}
        }
      });
    }

    // Nests live as children of a tree's canopy group (so they sway and fall with
    // the tree for free), never as direct scene children — so they get their own
    // disposer that detaches from whatever parent they're actually on.
    function disposeNestMesh(mesh) {
      if (!mesh) return;
      if (mesh.parent) mesh.parent.remove(mesh);
      mesh.traverse(ch => {
        if (!ch.isMesh) return;
        if (ch.geometry) { try { ch.geometry.dispose(); } catch (_) {} }
        if (ch.material && ch.material !== nestTwigMat && ch.material !== nestEggMat &&
            ch.material !== nestBarkMat && ch.material !== nestLiningMat && ch.material !== burrowGrassMat) {
          try { ch.material.dispose(); } catch (_) {}
        }
      });
    }`
);

// Verify index.html did not change underneath us before writing (AGENTS.md Rule 4)
const rawNow = fs.readFileSync(file, 'utf8');
const hashNow = crypto.createHash('sha256').update(rawNow, 'utf8').digest('hex');
if (hashNow !== hash0) {
  throw new Error('index.html changed on disk during patch preparation! Aborting to avoid overwriting concurrent work.');
}
fs.writeFileSync(file, text, { encoding: 'utf8' });
console.log('Successfully updated index.html (UTF-8 no BOM).');
