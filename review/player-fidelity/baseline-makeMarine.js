function makeMarine({ legacyBody = false } = {}) {
      const g = new THREE.Group();
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x2b2e24, roughness: 0.9, metalness: 0.05 });
      const buckleMat = new THREE.MeshStandardMaterial({ color: 0x7a7c74, roughness: 0.45, metalness: 0.6 });
      const padMat = new THREE.MeshStandardMaterial({ color: 0x3a3f33, roughness: 0.85, metalness: 0.1 });
      const put = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; };
      const cyl = (rt, rb, h, mat, seg = 10) => addCast(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
      // CL-94 (D-64, D-66): every wearable item has its own material for its main surface, so the
      // dressing room (CU-70) can colour or camo one item without touching the rest. wear('<item>')
      // (base) hands out that item's own copy of a base material, made once; buckles, straps and
      // hardware stay shared. After the merge, g.userData.wardrobe[item] = { mats, meshes }.
      const itemMats = new Map(), matItem = new Map();
      const wear = (item) => (base) => {
        let m = itemMats.get(item); if (!m) { m = new Map(); itemMats.set(item, m); }
        let c = m.get(base);
        if (!c) { c = base.clone(); c.name = 'wear:' + item; m.set(base, c); matItem.set(c, item); }
        return c;
      };
      const uniformW = wear('shirt')(uniformMat), trouserW = wear('trousers')(trouserMat);
      const bootW = wear('boots')(bootMat), soleW = wear('boots')(soleMat), gloveW = wear('gloves')(gloveMat);
      const beltW = wear('belt')(strapMat), holsterW = wear('holster')(pouchMat), maskW = wear('mask')(maskDark);
      const capW = wear('cap')(coverMat), capBandW = wear('cap')(camoOD), shellW = wear('helmet')(coverMat);
      const carrierW = wear('carrier')(carrierMat), carrierPouchW = wear('carrier')(pouchMat);
      const packW = wear('pack')(camoGreen), packTrimW = wear('pack')(camoOD), padW = wear('pads')(padMat), plateW = wear('pads')(plateMat);
      for (const mat of [uniformW, trouserW, gloveW, beltW, holsterW, maskW, capW, shellW, carrierW, carrierPouchW, packW, packTrimW, padW]) mat.userData.dress = 'camo';
      bootW.userData.dress = 'colour';
      // CL-97: his own skin, hair and iris, so each marine can differ (the dressing room's Him tab).
      const skinW = skinMat.clone(), hairW = hairMat.clone(), irisW = hairMat.clone();
      const dress = { hats: {}, eyes: {}, sleeveDown: [], sleeveRolled: [], legLong: [], legShort: [], gloveOn: [], handBare: [], mats: { skin: skinW, hair: hairW, iris: irisW } };
      const part = (parent, list) => { const grp = new THREE.Group(); parent.add(grp); if (list) list.push(grp); return grp; };

      // ---------------------------------------------------------------------
      // Lower body. Its own group so the legs can face the direction of travel
      // while the torso (and the gun) stay on the aim line — strafing now reads
      // as a real sidestep instead of a moonwalk.
      // ---------------------------------------------------------------------
      const TORSO_PIVOT_Y = 0.7;
      let lowerBody, hip, hipGrip, gearParts, legLG, legRG, torsoG, armLG, armRG, elbowLG, elbowRG, gripL, gripR, weaponMount, patches = [];
      // GP-106: retain the previous body for side-by-side review. Normal callers
      // get the rebuilt surfaces on the exact same rig and wardrobe contract.
      if (!legacyBody) {
        ({lowerBody, hip, hipGrip, gearParts, legLG, legRG, torsoG, armLG, armRG, elbowLG, elbowRG, gripL, gripR, weaponMount, patches} = buildMarineBody(THREE, {
          root: g, put, rmesh, cyl, part, dress, pgbPatch: makePgbPatch,   // GB-123: the PGB patch, left shoulder
          mats: {uniformW, trouserW, bootW, soleW, gloveW, beltW, holsterW,
            carrierW, carrierPouchW, packW, packTrimW, padW, plateW, skinW,
            strapMat, buckleMat, padMat, camoOD, pouchMat, leatherMat, patchMat,
            patchInk, webMat, nvgMat, laceMat, sockMat: eyewearMats.sock}
        }));
      } else {
      lowerBody = new THREE.Group();
      g.add(lowerBody);

      hip = rmesh(0.37, 0.17, 0.24, trouserW, 0.05);
      hip.position.set(0, 0.62, 0);
      lowerBody.add(hip);
      put(lowerBody, rmesh(0.21, 0.1, 0.19, trouserW, 0.04), 0, 0.54, 0.0);                    // seat / crotch
      // Riggers belt: webbing, a cobra buckle, and a dump pouch at the back.
      put(lowerBody, rmesh(0.4, 0.05, 0.26, beltW, 0.015), 0, 0.69, 0);
      put(lowerBody, rmesh(0.07, 0.045, 0.02, buckleMat, 0.008), 0, 0.69, 0.138);
      put(lowerBody, rmesh(0.13, 0.1, 0.065, beltW, 0.025), 0, 0.625, -0.155);                  // dump pouch
      // Holster on a drop leg rig, on the left.
      put(lowerBody, rmesh(0.05, 0.03, 0.18, strapMat, 0.01), -0.2, 0.62, 0.0);
      put(lowerBody, rmesh(0.06, 0.17, 0.095, holsterW, 0.02), -0.225, 0.505, 0.03, 0, 0, 0.1);
      hipGrip = put(lowerBody, rmesh(0.035, 0.05, 0.045, leatherMat, 0.012), -0.23, 0.6, 0.055);   // pistol grip showing (CL-90 hides it: the real pistol sits there)

      // Armour is bought, not issued: every piece is registered here so
      // applyGearVisibility() can show it the moment the kiosk sale goes through.
      // bareHead / bareTorso are the inverse sets: what he wears INSTEAD until the
      // helmet / carrier are bought (field cap, H-harness).
      gearParts = { helmet: [], vest: [], pads: [], nvg: [], bareHead: [], bareTorso: [] };
      function buildLeg(side) {
        const legG = new THREE.Group();
        legG.position.set(side * 0.13, 0.62, 0);
        // Thigh: full at the top, easing in to the knee.
        put(legG, rmesh(0.18, 0.16, 0.2, trouserW, 0.06), 0, -0.07, 0.01);
        put(legG, rmesh(0.16, 0.15, 0.185, trouserW, 0.055), 0, -0.19, 0.012);
        // Cargo pocket on the outside of the thigh, with its flap.
        put(legG, rmesh(0.03, 0.12, 0.12, trouserW, 0.012), side * 0.09, -0.17, 0.015);
        put(legG, rmesh(0.036, 0.03, 0.13, trouserW, 0.01), side * 0.092, -0.105, 0.015);
        const knee = new THREE.Group();
        knee.position.set(0, -0.27, 0);
        legG.add(knee);
        // Shin, bloused into the boot; in shorts (CL-97) a bare shin, a sock, and a turned-up hem on the thigh.
        const shinLong = part(knee, dress.legLong), shinBare = part(knee, dress.legShort), hem = part(legG, dress.legShort);
        put(shinLong, rmesh(0.15, 0.13, 0.17, trouserW, 0.05), 0, -0.06, 0.012);
        put(shinLong, rmesh(0.145, 0.16, 0.165, trouserW, 0.055), 0, -0.165, 0.012);
        put(shinBare, rmesh(0.118, 0.12, 0.13, skinW, 0.05), 0, -0.065, 0.012);
        put(shinBare, rmesh(0.108, 0.1, 0.122, skinW, 0.045), 0, -0.15, 0.008);
        put(shinBare, rmesh(0.125, 0.05, 0.14, eyewearMats.sock, 0.02), 0, -0.19, 0.0);
        put(hem, rmesh(0.172, 0.035, 0.205, trouserW, 0.014), 0, -0.25, 0.012);
        // Knee pad: a moulded cap on a strap.
        const kneePad = put(knee, rmesh(0.15, 0.13, 0.06, plateW, 0.028), 0, -0.02, 0.095);
        const kneeStrap = put(knee, rmesh(0.16, 0.03, 0.185, strapMat, 0.01), 0, -0.07, 0.015);
        const kneeCap = put(knee, rmesh(0.09, 0.055, 0.025, padW, 0.012), 0, -0.01, 0.126);
        gearParts.pads.push(kneePad, kneeStrap, kneeCap);
        // Ankle pivot: the boot stays flat on the ground through the stride instead
        // of the toe stabbing into the dirt whenever the leg trails behind.
        const ankle = new THREE.Group();
        ankle.position.set(0, -0.25, 0.01);
        knee.add(ankle);
        put(ankle, rmesh(0.16, 0.12, 0.185, bootW, 0.04), 0, 0.02, -0.005);                   // shaft
        put(ankle, rmesh(0.17, 0.07, 0.29, bootW, 0.035), 0, -0.05, 0.03);                     // foot
        put(ankle, rmesh(0.155, 0.065, 0.095, bootW, 0.032), 0, -0.055, 0.15);                // toe box
        put(ankle, rmesh(0.18, 0.03, 0.32, soleW, 0.012), 0, -0.09, 0.03);                    // sole and heel
        for (let k = 0; k < 3; k++) put(ankle, rmesh(0.085, 0.012, 0.012, laceMat, 0.004), 0, 0.05 - k * 0.032, 0.096 + k * 0.013, -0.35);
        legG.userData.knee = knee;
        legG.userData.ankle = ankle;
        return legG;
      }
      legLG = buildLeg(-1);
      legRG = buildLeg(1);
      lowerBody.add(legLG, legRG);

      // ---------------------------------------------------------------------
      // Torso. Pivot at the waist so it can lean into a run and twist against
      // the hips. Child positions are authored in marine space and shifted by
      // the pivot height.
      // ---------------------------------------------------------------------
      torsoG = new THREE.Group();
      torsoG.position.y = TORSO_PIVOT_Y;
      g.add(torsoG);
      const tAdd = (mesh, x, y, z) => { mesh.position.set(x, y - TORSO_PIVOT_Y, z); torsoG.add(mesh); return mesh; };

      // A chest wider than the waist, and shoulders that slope into the neck.
      tAdd(rmesh(0.37, 0.2, 0.23, uniformW, 0.07), 0, 0.77, 0);                             // abdomen
      tAdd(rmesh(0.46, 0.31, 0.26, uniformW, 0.08), 0, 0.99, 0);                            // chest
      for (const sx of [-1, 1]) { const tr = tAdd(rmesh(0.19, 0.08, 0.2, uniformW, 0.035), sx * 0.13, 1.16, -0.01); tr.rotation.z = sx * -0.32; }
      tAdd(rmesh(0.28, 0.07, 0.22, camoOD, 0.025), 0, 1.17, 0.02);                           // collar
      for (const sx of [-1, 1]) { const lap = tAdd(rmesh(0.1, 0.07, 0.02, camoOD, 0.008), sx * 0.06, 1.13, 0.125); lap.rotation.z = sx * 0.5; }
      // Shirt details that make the bare uniform read as a uniform: two chest
      // pockets with button flaps, a zip, a name tape, and a neck gaiter.
      for (const sx of [-0.115, 0.115]) {
        tAdd(rmesh(0.13, 0.12, 0.02, uniformW, 0.008), sx, 0.99, 0.133);
        tAdd(rmesh(0.135, 0.035, 0.025, uniformW, 0.008), sx, 1.05, 0.136);
      }
      tAdd(rmesh(0.012, 0.3, 0.01, strapMat, 0.003), 0, 0.93, 0.132);                        // zip
      tAdd(rmesh(0.15, 0.035, 0.012, patchMat, 0.004), 0.12, 1.1, 0.136);                    // name tape
      tAdd(rmesh(0.09, 0.012, 0.01, patchInk, 0.003), 0.12, 1.1, 0.143);
      const gaiter = tAdd(cyl(0.112, 0.125, 0.07, camoOD, 12), 0, 1.245, 0.01);
      gaiter.castShadow = true;
      // H-harness with a small chest rig — worn until the plate carrier replaces it.
      const bAdd = (mesh, x, y, z) => { tAdd(mesh, x, y, z); gearParts.bareTorso.push(mesh); return mesh; };
      for (const sx of [-0.13, 0.13]) {
        const st = bAdd(rmesh(0.05, 0.34, 0.025, strapMat, 0.01), sx, 1.02, 0.14);
        st.rotation.x = 0.06;
        bAdd(rmesh(0.05, 0.3, 0.025, strapMat, 0.01), sx, 1.02, -0.14);
      }
      bAdd(rmesh(0.32, 0.045, 0.025, strapMat, 0.01), 0, 1.16, -0.14);         // cross strap, back
      bAdd(rmesh(0.28, 0.045, 0.025, strapMat, 0.01), 0, 0.84, 0.143);         // chest strap
      bAdd(rmesh(0.045, 0.045, 0.02, buckleMat, 0.006), 0, 0.84, 0.158);
      for (const sx of [-0.12, 0.12]) {
        bAdd(rmesh(0.09, 0.1, 0.05, pouchMat, 0.018), sx, 0.83, 0.172);        // rig pouches
        bAdd(rmesh(0.092, 0.028, 0.052, strapMat, 0.008), sx, 0.875, 0.173);
      }
      // Plate carrier and everything that rides on it — the vest purchase.
      const vAdd = (mesh, x, y, z) => { tAdd(mesh, x, y, z); gearParts.vest.push(mesh); return mesh; };
      vAdd(rmesh(0.41, 0.34, 0.06, carrierW, 0.028), 0, 0.97, 0.158);         // front plate bag
      vAdd(rmesh(0.41, 0.36, 0.06, carrierW, 0.028), 0, 0.98, -0.155);        // back plate bag
      for (const sx of [-1, 1]) vAdd(rmesh(0.05, 0.19, 0.27, carrierW, 0.02), sx * 0.21, 0.86, 0.0);   // cummerbund
      // MOLLE webbing across the front, below the pouches.
      for (let r = 0; r < 2; r++) vAdd(rmesh(0.39, 0.018, 0.01, webMat, 0.004), 0, 0.835 + r * 0.045, 0.19);
      // Shoulder straps (padded) running over to the back.
      for (const sx of [-0.14, 0.14]) {
        const s1 = vAdd(rmesh(0.075, 0.045, 0.29, carrierW, 0.02), sx, 1.175, 0.0);
        s1.rotation.z = sx > 0 ? -0.18 : 0.18;
      }
      // Grab handle on the back.
      vAdd(rmesh(0.11, 0.028, 0.025, webMat, 0.01), 0, 1.14, -0.19);
      // Triple mag pouch with bungee retention.
      for (let i = -1; i <= 1; i++) {
        vAdd(rmesh(0.1, 0.13, 0.06, carrierPouchW, 0.02), i * 0.12, 0.9, 0.217);
        vAdd(rmesh(0.098, 0.028, 0.065, webMat, 0.008), i * 0.12, 0.96, 0.219);
        vAdd(rmesh(0.018, 0.045, 0.01, buckleMat, 0.004), i * 0.12, 0.945, 0.252);
      }
      vAdd(rmesh(0.18, 0.07, 0.04, carrierPouchW, 0.018), 0, 1.06, 0.205);     // admin pouch
      vAdd(rmesh(0.182, 0.022, 0.044, webMat, 0.008), 0, 1.095, 0.207);
      // Without the carrier the mags ride the belt: two pouches either side of the buckle.
      for (const sx of [-0.115, 0.115]) tAdd(rmesh(0.085, 0.11, 0.06, beltW, 0.018), sx, 0.625, 0.155);
      // Radio on the left of the carrier, with a whip antenna.
      vAdd(rmesh(0.065, 0.12, 0.045, nvgMat, 0.012), -0.185, 1.02, 0.21);
      const antenna = vAdd(cyl(0.005, 0.005, 0.2, nvgMat, 5), -0.19, 1.18, 0.205);
      antenna.rotation.z = 0.12;
      // Chest patch block (flag / unit suggestion) — sewn on the shirt, so always there.
      tAdd(rmesh(0.12, 0.085, 0.015, patchMat, 0.005), -0.12, 1.06, 0.135);
      tAdd(rmesh(0.042, 0.042, 0.012, patchInk, 0.004), -0.148, 1.07, 0.141);
      const patchRed = new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.7 });
      tAdd(rmesh(0.07, 0.017, 0.012, patchRed, 0.004), -0.097, 1.047, 0.141);
      // …and a second copy velcroed to the carrier, since the plates cover the shirt one.
      vAdd(rmesh(0.12, 0.085, 0.015, patchMat, 0.005), -0.12, 1.1, 0.192);
      vAdd(rmesh(0.042, 0.042, 0.012, patchInk, 0.004), -0.148, 1.11, 0.198);
      vAdd(rmesh(0.07, 0.017, 0.012, patchRed, 0.004), -0.097, 1.087, 0.198);
      // Assault pack: main bag, lid with buckles, side pocket, straps, bedroll.
      tAdd(rmesh(0.3, 0.34, 0.15, packW, 0.055), 0, 0.98, -0.245);
      tAdd(rmesh(0.27, 0.09, 0.16, packTrimW, 0.035), 0, 1.15, -0.245);
      for (const sx of [-0.085, 0.085]) {
        tAdd(rmesh(0.028, 0.13, 0.01, strapMat, 0.004), sx, 1.09, -0.322);
        tAdd(rmesh(0.032, 0.028, 0.012, buckleMat, 0.005), sx, 1.035, -0.324);
      }
      tAdd(rmesh(0.18, 0.12, 0.04, packTrimW, 0.025), 0, 0.93, -0.335);                       // front pocket
      for (const sx of [-0.13, 0.13]) tAdd(rmesh(0.055, 0.34, 0.03, pouchMat, 0.012), sx, 1.0, -0.135);   // shoulder straps
      tAdd(rmesh(0.07, 0.18, 0.08, packTrimW, 0.025), 0.185, 0.98, -0.24);    // bottle pocket
      const roll = tAdd(cyl(0.06, 0.06, 0.3, packTrimW, 12), 0, 0.77, -0.245);
      roll.rotation.z = Math.PI / 2;
      for (const sx of [-0.09, 0.09]) { const b = tAdd(cyl(0.064, 0.064, 0.018, strapMat, 12), sx, 0.77, -0.245); b.rotation.z = Math.PI / 2; }

      // --- Arms with elbow joints (posed to hold weapon) ---
      // arm*G = shoulder pivot; elbow*G = elbow pivot holding forearm + glove
      function buildArm(side) {
        const armG = new THREE.Group();
        armG.position.set(side * 0.34, 1.08 - TORSO_PIVOT_Y, 0.02);
        put(armG, rmesh(0.14, 0.12, 0.14, uniformW, 0.06), 0, -0.02, 0);                       // shoulder
        put(armG, rmesh(0.125, 0.24, 0.125, uniformW, 0.05), 0, -0.15, 0);                   // upper arm
        // Sleeve pocket with a velcro patch on the outside of the arm.
        put(armG, rmesh(0.018, 0.1, 0.08, uniformW, 0.006), side * 0.066, -0.1, 0);
        put(armG, rmesh(0.01, 0.05, 0.055, side > 0 ? patchMat : patchInk, 0.003), side * 0.076, -0.1, 0);
        const elbowPad = put(armG, rmesh(0.135, 0.09, 0.09, padW, 0.028), 0, -0.27, -0.045);
        gearParts.pads.push(elbowPad);
        const elbowG = new THREE.Group();
        elbowG.position.set(0, -0.28, 0);
        elbowG.rotation.set(side < 0 ? -0.35 : -0.2, 0, 0);
        const ox = side < 0 ? 0.02 : -0.01, oz = side < 0 ? 0.04 : 0.03;
        // CL-97: sleeves down, or rolled above the elbow over a bare forearm.
        const sleeve = part(elbowG, dress.sleeveDown), forearm = part(elbowG, dress.sleeveRolled), roll = part(armG, dress.sleeveRolled);
        put(sleeve, rmesh(0.115, 0.12, 0.115, uniformW, 0.05), ox, -0.05, oz * 0.6);          // forearm, fuller at the elbow
        put(sleeve, rmesh(0.105, 0.12, 0.105, uniformW, 0.045), ox, -0.15, oz);
        put(sleeve, rmesh(0.11, 0.035, 0.11, uniformW, 0.015), ox, -0.205, oz + 0.005);      // cuff
        put(forearm, rmesh(0.098, 0.12, 0.098, skinW, 0.045), ox, -0.05, oz * 0.6);
        put(forearm, rmesh(0.086, 0.13, 0.086, skinW, 0.04), ox, -0.15, oz);
        put(roll, rmesh(0.15, 0.06, 0.15, uniformW, 0.025), 0, -0.235, 0);                     // the roll, above the elbow
        put(roll, rmesh(0.142, 0.022, 0.142, uniformW, 0.01), 0, -0.2, 0);
        // Glove: palm, curled fingers, thumb, knuckle guard. Bare (CL-97): the same hand in skin.
        const gz = side < 0 ? 0.08 : 0.07;
        const glove = part(elbowG, dress.gloveOn), hand = part(elbowG, dress.handBare);
        put(glove, rmesh(0.1, 0.09, 0.1, gloveW, 0.028), ox, -0.255, gz);
        put(glove, rmesh(0.095, 0.055, 0.05, gloveW, 0.02), ox, -0.29, gz + 0.045, 0.5);
        put(glove, rmesh(0.03, 0.06, 0.035, gloveW, 0.012), ox - side * 0.055, -0.25, gz + 0.03, 0.2, 0, side * 0.4);
        put(glove, rmesh(0.09, 0.025, 0.03, padMat, 0.01), ox, -0.275, gz + 0.06);
        put(hand, rmesh(0.09, 0.085, 0.092, skinW, 0.03), ox, -0.255, gz);
        put(hand, rmesh(0.086, 0.05, 0.045, skinW, 0.02), ox, -0.288, gz + 0.042, 0.5);
        put(hand, rmesh(0.027, 0.055, 0.032, skinW, 0.012), ox - side * 0.05, -0.25, gz + 0.03, 0.2, 0, side * 0.4);
        if (side < 0) put(elbowG, rmesh(0.05, 0.03, 0.05, nvgMat, 0.008), 0.02, -0.19, 0.09);   // watch
        armG.add(elbowG);
        torsoG.add(armG);
        return { armG, elbowG };
      }
      ({ armG: armLG, elbowG: elbowLG } = buildArm(-1));
      ({ armG: armRG, elbowG: elbowRG } = buildArm(1));
      armLG.rotation.set(-0.85, 0.15, 0.55);
      armRG.rotation.set(-1.05, -0.05, -0.25);
      // Off-hand grip: the knife lives here (the right hand keeps the gun), oriented
      // to mirror the right-hand weapon mount so the blade points forward.
      gripL = new THREE.Group();
      gripL.position.set(0.02, -0.27, 0.13);
      gripL.rotation.set(1.23359, -0.24103, -0.08361);
      elbowLG.add(gripL);
      // Weapon mount on right-hand grip so gun follows arm/elbow during reload & walk
      gripR = new THREE.Group();
      gripR.position.set(-0.01, -0.26, 0.12); // slightly forward of palm (gloveR)
      elbowRG.add(gripR);
      weaponMount = new THREE.Group();
      // Hand-local base: matches old torso (0.36, 0.92, 0.38) + forward muzzle at rest
      weaponMount.position.set(0.12826, 0.15981, -0.10022);
      weaponMount.rotation.set(1.23359, 0.24103, 0.08361);
      gripR.add(weaponMount);

      }

      // ---------------------------------------------------------------------
      // Head. Pivot at the base of the neck (inside the torso group) so it can
      // nod with the run, glance toward the aim point and keep level while the
      // torso leans.
      // ---------------------------------------------------------------------
      const HEAD_PIVOT_Y = 1.22;
      const headG = new THREE.Group();
      if (!legacyBody) headG.scale.set(0.94, 0.97, 0.94); // less top-heavy; same head pivot
      headG.position.set(0, HEAD_PIVOT_Y - TORSO_PIVOT_Y, 0);
      torsoG.add(headG);
      const hAdd = (mesh, x, y, z) => { mesh.position.set(x, y - HEAD_PIVOT_Y, z); headG.add(mesh); return mesh; };

      hAdd(cyl(0.065, 0.085, 0.13, skinW, 10), 0, 1.24, 0);                                // neck
      headG.add(buildMarineHead(THREE, skinW));
      // The lower-face wrap leaves hair and ears exposed. Keep their group
      // separate through rigid merging so no wardrobe/rig contract changes.
      const bareFaceDetails = new THREE.Group();bareFaceDetails.visible = true;headG.add(bareFaceDetails);
      g.userData.bareFaceDetails = bareFaceDetails;
      const bareAdd = (mesh, x, y, z) => { hAdd(mesh, x, y, z);bareFaceDetails.add(mesh);return mesh; };
      for (const sx of [-1, 1]) bareAdd(rmesh(0.03, 0.07, 0.05, skinW, 0.014), sx * 0.13, 1.4, 0);
      hAdd(rmesh(0.176, 0.019, 0.024, skinW, 0.009), 0, 1.452, 0.137);                      // brow ridge follows the forehead
      // GP-123: one tapered bridge/tip surface instead of two stacked nose blocks.
      const noseGeo = new THREE.SphereGeometry(1, 12, 8), nosePos = noseGeo.attributes.position;
      for (let i = 0; i < nosePos.count; i++) {
        const y = nosePos.getY(i);
        nosePos.setXYZ(i, nosePos.getX(i) * .015 * (1 - .22 * y), y * .038,
          nosePos.getZ(i) * .019 * (1 - .25 * y) - .003 * y);
      }
      noseGeo.computeVertexNormals();
      hAdd(addCast(new THREE.Mesh(noseGeo, skinW)), 0, 1.413, .15);
      // Cropped hair, so the bare head reads as a head before the helmet is bought
      // (it sits inside the crown once it is).
      bareFaceDetails.add(buildMarineHair(THREE,hairW));
      // The hat — the bare-head look, hidden under the helmet. CL-97: the 8-point cover (field cap: crown, band,
      // brim), a boonie, or a ballcap worn forwards or backwards. All take the cap's camo.
      const hatG = new THREE.Group();
      hatG.position.y = -HEAD_PIVOT_Y;
      headG.add(hatG);
      gearParts.bareHead.push(hatG);
      const hatAt = (grp, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => put(grp, mesh, x, y, z, rx, ry, rz);
      const cover = dress.hats.cover = part(hatG);
      const crown=(rings,mat,n=24)=>{
        const p=[],uv=[],ix=[];
        for(const[y,rx,rz]of rings)for(let j=0;j<=n;j++){const a=(j/n+.0625)*Math.PI*2;p.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push(j/n,y*4);}
        for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();return addCast(new THREE.Mesh(geo,mat));
      };
      const bill=(w,d)=>{
        const s=new THREE.Shape();s.moveTo(-w*.5,0);s.quadraticCurveTo(-w*.56,d*.7,-w*.34,d);s.quadraticCurveTo(0,d*1.13,w*.34,d);s.quadraticCurveTo(w*.56,d*.7,w*.5,0);s.closePath();
        const edge=s.getPoints(12);edge.pop();const v=[],ix=[],n=edge.length;
        for(const h of[0,.008]){v.push(0,d*.45,h);for(const p of edge)v.push(p.x,p.y,h);}
        for(let j=0;j<n;j++){const a=j+1,b=(j+1)%n+1,q=n+1;ix.push(0,b,a,q,q+a,q+b,a,b,q+a,b,q+b,q+a);}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(v.length/3*2),2));geo.setIndex(ix);const p=geo.attributes.position;
        for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i),t=p.getZ(i);p.setXYZ(i,x,1.536-t-.012*(x/(w*.5))**2-.025*z/d,z+.098);}geo.computeVertexNormals();return addCast(new THREE.Mesh(geo,capW));
      };
      cover.add(crown([[1.505,.145,.151],[1.535,.146,.152],[1.61,.137,.144],[1.628,.122,.13],[1.628,0,0]],capW,8));
      cover.add(crown([[1.508,.147,.153],[1.532,.148,.154]],capBandW,8),bill(.255,.142));
      hatAt(cover,rmesh(.045,.026,.006,patchInk,.003),0,1.573,.145);
      const boonie = dress.hats.boonie = part(hatG);
      boonie.add(crown([[1.511,.15,.161],[1.55,.149,.158],[1.612,.135,.145],[1.626,.111,.12],[1.629,0,0]],capW));
      boonie.add(crown([[1.524,.153,.164],[1.548,.153,.163]],capBandW));
      const brimGeo=new THREE.RingGeometry(.146,.238,32,4),brimP=brimGeo.attributes.position;
      for(let i=0;i<brimP.count;i++){const x=brimP.getX(i),z=brimP.getY(i),t=(Math.hypot(x,z)-.146)/.092,a=Math.atan2(x,z);brimP.setXYZ(i,x,1.512-.025*t+.01*Math.sin(3*a)*t,z*1.1);}brimGeo.computeVertexNormals();capW.side=THREE.DoubleSide;boonie.add(addCast(new THREE.Mesh(brimGeo,capW)));
      for(const sx of[-1,1])for(const z of[-.055,.055])hatAt(boonie,cyl(.009,.009,.006,patchInk,8),sx*.146,1.57,z,0,0,Math.PI/2);
      for (const sx of [-1, 1]) hatAt(boonie, rmesh(0.006, 0.12, 0.006, strapMat, 0.002), sx * 0.142, 1.46, 0.03, 0, 0, sx * -0.12);   // chin cord
      const ballcap = (grp) => {
        grp.add(crown([[1.511,.135,.147],[1.551,.137,.147],[1.59,.12,.127],[1.625,.074,.077],[1.641,0,0]],capW),bill(.224,.155));
        hatAt(grp,cyl(.012,.013,.008,capBandW,8),0,1.642,0);
        for(let j=0;j<6;j++){const a=j/6*Math.PI*2,points=[[.132,1.516],[.133,1.55],[.115,1.59],[.07,1.627],[.007,1.642]].map(([r,y])=>new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r*1.08));grp.add(addCast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.0012,3,false),capBandW)));}
        hatAt(grp, rmesh(0.07, 0.03, 0.012, strapMat, 0.004), 0, 1.53, -0.148);                     // strap at the back
      };
      ballcap(dress.hats.ballcap = part(hatG));
      const back = dress.hats.ballcapBack = part(hatG);
      back.rotation.y = Math.PI;
      ballcap(back);
      // Helmet: a rounded high-cut shell in a camo cover, with a trim edge, side rails,
      // a shroud for the NVG mount, a velcro crown patch and a counterweight pouch.
      const hlAdd = (mesh, x, y, z) => { hAdd(mesh, x, y, z); gearParts.helmet.push(mesh); return mesh; };
      const shell = hlAdd(addCast(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), shellW)), 0, 1.455, 0.005);
      shell.scale.set(1.0, 0.95, 1.1);
      const trim = hlAdd(addCast(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.013, 6, 28), helmetMat)), 0, 1.445, 0.005);
      trim.rotation.x = Math.PI / 2; trim.scale.set(1.0, 1.1, 1.0);
      for (const sx of [-1, 1]) {
        hlAdd(rmesh(0.025, 0.035, 0.22, nvgMat, 0.008), sx * 0.198, 1.5, 0.01);              // ARC rails
        hlAdd(rmesh(0.018, 0.1, 0.03, strapMat, 0.006), sx * 0.15, 1.38, 0.05);             // chin strap
        const chinTop = new THREE.Vector3(sx * 0.15, 1.34, 0.05), chinEnd = new THREE.Vector3(sx * 0.06, 1.25, 0.135);
        const chinMid = chinTop.clone().add(chinEnd).multiplyScalar(0.5);
        const chin = hlAdd(rmesh(0.018, chinTop.distanceTo(chinEnd), 0.025, strapMat, 0.005), chinMid.x, chinMid.y, chinMid.z);
        chin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), chinEnd.sub(chinTop).normalize());
      }
      hlAdd(rmesh(0.14, 0.022, 0.025, strapMat, 0.006), 0, 1.25, 0.135);
      hlAdd(rmesh(0.09, 0.055, 0.025, nvgMat, 0.01), 0, 1.575, 0.2);                           // NVG shroud
      hlAdd(rmesh(0.1, 0.012, 0.08, pouchMat, 0.004), 0, 1.65, 0.0);                           // velcro crown patch
      hlAdd(rmesh(0.14, 0.08, 0.05, pouchMat, 0.015), 0, 1.53, -0.215);                        // counterweight pouch
      hlAdd(rmesh(0.02, 0.02, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a3a2a, emissive: 0x33ff55, emissiveIntensity: 0.6 }), 0.004), 0, 1.583, -0.169);  // seated IR strobe

      // NVG mount + dual tubes (pivot group: flip down over eyes)
      const nvgPivot = new THREE.Group();
      nvgPivot.position.set(0, 1.58 - HEAD_PIVOT_Y, 0.218);
      headG.add(nvgPivot);
      // Deployed is the reference pose, not stowed. The tubes used to be placed for
      // the stowed position and then swung 66 degrees to "flip down", which pointed
      // them at the marine's boots instead of through his eyes. Now the children sit
      // where they belong with the goggles ON — lenses at eye height (the eye slits
      // are at head-local y 0.20, z 0.18), tubes lying along +Z so they look where he
      // looks — and stowing rotates the whole assembly UP onto the helmet brow.
      // Rhino linkage: shroud axle, paired lifting arms, sliding shoe, bridge.
      const link=(parent,a,b,w,d,mat)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5),mesh=put(parent,rmesh(w,av.distanceTo(bv),d,mat,.003),mid.x,mid.y,mid.z);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return mesh;};
      put(nvgPivot,cyl(.017,.017,.078,nvgMat,10),0,0,0,0,0,Math.PI/2);
      for(const sx of[-1,1]){
        link(nvgPivot,[sx*.027,0,0],[sx*.027,-.089,.035],.012,.02,nvgMat);
        put(nvgPivot,cyl(.013,.013,.012,buckleMat,10),sx*.034,-.089,.035,0,0,Math.PI/2);
        link(nvgPivot,[sx*.025,-.089,.035],[sx*.018,-.13,.016],.012,.018,nvgMat);
      }
      put(nvgPivot,rmesh(.043,.036,.057,nvgMat,.005),0,-.128,.027);
      put(nvgPivot,rmesh(.148,.023,.033,nvgMat,.006),0,-.14,.035);
      for (const sx of [-0.055, 0.055]) {
        put(nvgPivot,cyl(.033,.038,.12,nvgMat,12),sx,-.16,.055,Math.PI/2);
        put(nvgPivot,cyl(.04,.04,.022,goggleMat,12),sx,-.16,.109,Math.PI/2);
        put(nvgPivot,cyl(.037,.037,.02,goggleMat,12),sx,-.16,-.006,Math.PI/2);
        put(nvgPivot,addCast(new THREE.Mesh(new THREE.CircleGeometry(.028,12),lensMat)),sx,-.16,.121);
      }
      const NVG_STOW_RX = -1.35;   // swung up and back, sitting on the helmet front
      nvgPivot.rotation.x = NVG_STOW_RX;
      gearParts.nvg.push(nvgPivot);

      // Rail-mounted ear defenders: sealed cushions, pivot hubs and two yoke arms.
      for (const sx of [-1, 1]) {
        const cushion=hlAdd(addCast(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),padMat)),sx*.157,1.398,-.003);cushion.scale.set(.021,.059,.045);
        const cup=hlAdd(addCast(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),pouchMat)),sx*.18,1.399,-.003);cup.scale.set(.026,.056,.043);
        hlAdd(cyl(.016,.016,.016,nvgMat,10),sx*.21,1.488,-.033).rotation.z=Math.PI/2;
        for(const z of[-.033,.028]){const arm=link(headG,[sx*.214,1.488-HEAD_PIVOT_Y,-.033],[sx*.204,1.41-HEAD_PIVOT_Y,z],.008,.009,nvgMat);gearParts.helmet.push(arm);}
        for(let k=0;k<3;k++)hlAdd(rmesh(.004,.004,.021,nvgMat,.001),sx*.205,1.373+k*.008,.001);
      }
      const boomPath=new THREE.CatmullRomCurve3([[.188,1.38,.018],[.18,1.342,.075],[.13,1.326,.171],[.061,1.329,.193]].map(([x,y,z])=>new THREE.Vector3(x,y-HEAD_PIVOT_Y,z)));
      const micBoom=addCast(new THREE.Mesh(new THREE.TubeGeometry(boomPath,14,.004,5,false),nvgMat));headG.add(micBoom);gearParts.helmet.push(micBoom);
      hlAdd(rmesh(.043,.024,.023,nvgMat,.011),.061,1.329,.193);

      // Selected protective eyewear remains in dress.eyes; the crown stays clear
      // for the rhino linkage rather than carrying a second floating goggle set.

      // Face (CL-32, Jerry): what shows above the mask when he has no helmet or goggles on.
      // Eyes with whites, brown irises, pupils and a catchlight, set in shaded sockets under
      // heavy lids; brows angled down at the middle; a nose bridge, cheekbones, sideburns,
      // and an old scar through the left brow.
      const skinShade = new THREE.MeshStandardMaterial({ color: 0x9c7f5e, roughness: 0.9 });
      const scarMat = new THREE.MeshStandardMaterial({ color: 0xcfb28e, roughness: 0.6 });
      dress.mats.skinShade = skinShade; dress.mats.scar = scarMat;
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
      const hRot = (mesh, rx, ry, rz) => { mesh.rotation.set(rx, ry, rz); return mesh; };
      for (const sx of [-1, 1]) {
        const ex = sx * 0.06;
        hAdd(rmesh(0.06, 0.033, 0.01, skinShade, 0.009), ex, 1.419, 0.144);                    // restrained socket shadow
        hAdd(rmesh(0.044, 0.019, 0.01, jawPrint, 0.008), ex, 1.419, 0.148);                   // white of the eye
        hAdd(rmesh(0.018, 0.018, 0.007, irisW, 0.007), ex - sx * 0.002, 1.419, 0.153);        // iris
        hAdd(new THREE.Mesh(rbox(0.009, 0.01, 0.005, 0.003), eyeMat), ex - sx * 0.002, 1.419, 0.156);  // pupil
        hAdd(new THREE.Mesh(rbox(0.003, 0.003, 0.002, 0.001), glintMat), ex - sx * 0.002 + 0.003, 1.422, 0.159); // catchlight
        hRot(hAdd(rmesh(0.049, 0.008, 0.01, skinW, 0.0035), ex, 1.43, 0.152), 0.2, 0, 0);   // upper lid
        hAdd(rmesh(0.044, 0.005, 0.007, skinShade, 0.0025), ex, 1.4075, 0.15);                // lower lid
        hRot(hAdd(rmesh(0.055, 0.009, 0.011, hairW, 0.004), ex + sx * 0.002, 1.45, 0.153), 0, 0, sx * 0.1); // brow
        hAdd(rmesh(0.03, 0.009, 0.008, skinW, 0.004), sx * 0.082, 1.398, 0.13);               // cheekbone blends into the head
        // The medium fade supplies the temple transition; no separate sideburn block.
        bareAdd(rmesh(0.012, 0.035, 0.02, skinShade, 0.005), sx * 0.142, 1.4, 0.0);               // inner ear
      }
      hAdd(rmesh(0.01, 0.008, 0.007, skinShade, 0.003), 0, 1.441, 0.151);                    // frown crease
      hRot(hAdd(rmesh(0.004, 0.027, 0.003, scarMat, 0.0015), -0.076, 1.445, 0.16), 0, 0, 0.3); // scar through the left brow
      // Jerry: a fitted cloth balaclava, always worn by the player. Every
      // surface uses maskW so the entire hood follows the existing camo item.
      headG.add(buildBalaclava(THREE, maskW));

      // CL-97: eyewear, over the eyes above the mask (Jerry: aviators, a pit-viper style, a Wayfarer style, the GWOT
      // ballistic goggles). Hidden while the NVG is down (updateMarineBody).
      const eyeG = new THREE.Group();
      eyeG.position.y = -HEAD_PIVOT_Y;
      headG.add(eyeG);
      const E = eyewearMats;
      dress.eyes.none = part(eyeG);
      const avi = dress.eyes.aviators = part(eyeG);
      for (const sx of [-1, 1]) {
        put(avi, rmesh(0.08, 0.068, 0.006, E.gold, 0.028), sx * 0.06, 1.413, 0.176, 0, 0, sx * -0.14);      // rim
        put(avi, rmesh(0.074, 0.062, 0.009, E.aviLens, 0.026), sx * 0.06, 1.411, 0.179, 0, 0, sx * -0.14);  // teardrop lens
        put(avi, rmesh(0.006, 0.006, 0.15, E.gold, 0.002), sx * 0.13, 1.432, 0.1);                          // temple
      }
      put(avi, rmesh(0.05, 0.005, 0.005, E.gold, 0.002), 0, 1.437, 0.18);                                  // double bridge
      put(avi, rmesh(0.03, 0.005, 0.005, E.gold, 0.002), 0, 1.424, 0.18);
      const viper = dress.eyes.pitViper = part(eyeG);
      put(viper, rmesh(0.2, 0.062, 0.01, E.viperLens, 0.02), 0, 1.42, 0.182);                              // the shield
      put(viper, rmesh(0.214, 0.02, 0.018, E.viperFrame, 0.008), 0, 1.456, 0.18);                          // top bar
      for (const sx of [-1, 1]) {
        put(viper, rmesh(0.045, 0.058, 0.009, E.viperLens, 0.016), sx * 0.112, 1.42, 0.16, 0, sx * 0.75, 0);   // wrap
        put(viper, rmesh(0.012, 0.022, 0.15, E.viperFrame, 0.006), sx * 0.132, 1.44, 0.07);                  // thick temple
      }
      const way = dress.eyes.wayfarer = part(eyeG);
      for (const sx of [-1, 1]) {
        put(way, rmesh(0.074, 0.05, 0.012, E.wayFrame, 0.01), sx * 0.058, 1.422, 0.177, 0, 0, sx * 0.06);     // frame
        put(way, rmesh(0.058, 0.036, 0.006, E.wayLens, 0.008), sx * 0.058, 1.418, 0.184, 0, 0, sx * 0.06);    // lens
        put(way, rmesh(0.012, 0.016, 0.15, E.wayFrame, 0.005), sx * 0.13, 1.44, 0.1);                         // temple
      }
      put(way, rmesh(0.16, 0.016, 0.014, E.wayFrame, 0.006), 0, 1.448, 0.178);                              // the heavy brow line
      put(way, rmesh(0.026, 0.012, 0.012, E.wayFrame, 0.004), 0, 1.428, 0.179);                             // bridge
      const gog = dress.eyes.goggles = part(eyeG);
      put(gog, rmesh(0.235, 0.072, 0.04, E.gogFrame, 0.02), 0, 1.425, 0.17);                                // foam frame
      put(gog, rmesh(0.214, 0.056, 0.01, E.gogLens, 0.016), 0, 1.426, 0.192);                               // one wide lens
      put(gog, rmesh(0.04, 0.02, 0.012, E.gogFrame, 0.006), 0, 1.395, 0.19);                               // nose cut
      put(gog, rmesh(0.278, 0.03, 0.33, E.gogStrap, 0.01), 0, 1.44, 0.0);                                   // strap round the head
      g.userData.eyewearG = eyeG;

      // Bake rigid parts together (see mergeRigidMeshes); the hip is animated on its own.
      mergeRigidMeshes(g, gearParts, new Set([hip, ...patches]));   // GB-123: the PGB patch keeps its own UVs (a merge box-projects them)
      { const src = hip.geometry.clone(), P = src.attributes.position, uvA = new Float32Array(P.count * 2); boxProjectUV(P.array, uvA); src.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); hip.geometry = src; }
      // CL-94: the wardrobe (D-66). Each item's own materials and the meshes that wear them, for
      // the dressing room to colour, camo, show or hide one item at a time.
      const wardrobe = {};
      for (const [item, m] of itemMats) wardrobe[item] = { mats: [...m.values()], meshes: [] };
      g.traverse((o) => { if (o.isMesh && matItem.has(o.material)) wardrobe[matItem.get(o.material)].meshes.push(o); });
      g.userData.wardrobe = wardrobe;
      g.userData.dress = dress;   // CL-97
      dressParts(g, null);

      g.userData.gripR = gripR;
      g.userData.weaponMount = weaponMount;
      g.userData.armLG = armLG;
      g.userData.armRG = armRG;
      g.userData.elbowLG = elbowLG;
      g.userData.gripL = gripL;
      g.userData.elbowRG = elbowRG;
      g.userData.forearmLG = elbowLG;
      g.userData.forearmRG = elbowRG;
      g.userData.legLG = legLG;
      g.userData.legRG = legRG;
      g.userData.kneeLG = legLG.userData.knee;
      g.userData.kneeRG = legRG.userData.knee;
      g.userData.ankleLG = legLG.userData.ankle;
      g.userData.ankleRG = legRG.userData.ankle;
      g.userData.hip = hip;
      g.userData.lowerBody = lowerBody;
      g.userData.torsoG = torsoG;
      g.userData.headG = headG;
      g.userData.nvgPivot = nvgPivot;
      g.userData.gearParts = gearParts;
      g.userData.hipGrip = hipGrip;   // CL-90
      // Nothing is worn until it is bought (see applyGearVisibility).
      for (const k of Object.keys(gearParts)) for (const m of gearParts[k]) m.visible = k.startsWith('bare');
      g.userData.torsoPivotY = TORSO_PIVOT_Y;
      g.userData.headPivotY = HEAD_PIVOT_Y;
      return g;
    }