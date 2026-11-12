// tag281 - AG-281 J128 (Jerry, 10 Nov, standing, D-140): the props and buildables, no clipping, nothing floating.
// Every prop and buildable (walls, floors, barricades, sandbags, wire, railing, platform, pillar, stairs, traps, the range props):
// each part on what holds it and none through another; each one standing on the ground or what it is built on, on a slope too.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };

  try {
    const THREE = T.THREE;
    const Box3 = THREE.Box3;

    // Helper: compute local bounding box of an Object3D's geometry
    function localBounds(obj) {
      const b = new Box3();
      obj.updateMatrixWorld(true);
      b.setFromObject(obj);
      return b;
    }

    // --- 1. BUILDABLE FOUNDATION / SKIRT DEPTHS ON SLOPES (D-140: nothing floating on slopes) ---
    // Every buildable must have foundation or skirt reaching <= -0.60m so that when placed on uneven
    // terrain or slopes, no daylight or floating gap appears underneath.
    const kinds = ['barricade', 'sandbag', 'wire', 'railing', 'platform', 'pillar', 'floor', 'stairs', 'spikes'];
    for (const k of kinds) {
      const mesh = T.spawnBuild(k, 0, 0)?.mesh;
      ok(!!mesh, 'spawnBuild ' + k + ' creates a mesh');
      if (mesh) {
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        const b = new Box3().setFromObject(mesh);
        const minThresh = (k === 'spikes' ? -0.58 : -0.64);
        ok(b.min.y <= minThresh, k + ' foundation reaches ground/slope skirt depth (min.y ' + b.min.y.toFixed(3) + ' <= ' + minThresh + ')');
        if (mesh.parent) mesh.parent.remove(mesh);
      }
    }

    // --- 2. INTERNAL MESH NON-CLIPPING & SEATING AUDIT ---
    // A. Barricade:
    {
      const bMesh = T.makeBuildMesh ? T.makeBuildMesh('barricade') : T.spawnBuild('barricade', 0, 0)?.mesh;
      if (bMesh) {
        bMesh.position.set(0, 0, 0);
        bMesh.updateMatrixWorld(true);
        // Find X-braces inside inner
        const inner = bMesh.userData.inner || bMesh;
        let xBraces = [];
        inner.traverse(o => {
          if (o.isMesh && o.rotation && Math.abs(o.rotation.z) > 0.3 && Math.abs(o.rotation.z) < 1.2) {
            xBraces.push(o);
          }
        });
        ok(xBraces.length >= 4, 'barricade has diagonal bay X-braces (found ' + xBraces.length + ')');
        if (xBraces.length >= 2) {
          // Check that opposing diagonal braces are separated in Z to avoid intersection clipping
          const zPos = xBraces.map(b => b.position.z);
          const zDiff = Math.abs(zPos[0] - zPos[1]);
          ok(zDiff >= 0.04, 'barricade diagonal X-braces separated in Z with no overlap (zDiff ' + zDiff.toFixed(3) + ' >= 0.04)');
        }
        if (bMesh.parent) bMesh.parent.remove(bMesh);
      }
    }

    // B. Railing:
    {
      const rMesh = T.makeBuildMesh ? T.makeBuildMesh('railing') : T.spawnBuild('railing', 0, 0)?.mesh;
      if (rMesh) {
        rMesh.position.set(0, 0, 0);
        rMesh.updateMatrixWorld(true);
        const g = rMesh.userData.inner || rMesh;
        // Verify balusters do not penetrate the toe-kick board (y=0 to 0.13)
        let toeKick = null, balusters = [];
        g.traverse(o => {
          if (!o.isMesh) return;
          const pos = o.position;
          if (pos.y < 0.12 && Math.abs(pos.x) < 0.01) toeKick = o;
          if (Math.abs(pos.x) >= 0.20 && Math.abs(pos.x) <= 0.80 && pos.y > 0.15) balusters.push(o);
        });
        ok(!!toeKick, 'railing has bottom toe-kick board');
        ok(balusters.length >= 6, 'railing has baluster segments (found ' + balusters.length + ')');
        if (balusters.length > 0) {
          const minBalusterY = Math.min(...balusters.map(b => {
            const bb = new Box3().setFromObject(b);
            return bb.min.y;
          }));
          ok(minBalusterY >= 0.12, 'railing balusters seat flush on toe-kick with zero penetration (minY ' + minBalusterY.toFixed(3) + ' >= 0.12)');
        }
        if (rMesh.parent) rMesh.parent.remove(rMesh);
      }
    }

    // C. Platform:
    {
      const pMesh = T.makeBuildMesh ? T.makeBuildMesh('platform') : T.spawnBuild('platform', 0, 0)?.mesh;
      if (pMesh) {
        pMesh.position.set(0, 0, 0);
        pMesh.updateMatrixWorld(true);
        // Find grating bars: bearing bars along Z, cross tie-rods along X
        let zBars = [], xBars = [];
        pMesh.traverse(o => {
          if (!o.isMesh || !o.geometry) return;
          const b = new Box3().setFromObject(o);
          const sz = new THREE.Vector3();
          b.getSize(sz);
          const w = (o.geometry.parameters && o.geometry.parameters.width != null) ? o.geometry.parameters.width : sz.x;
          const d = (o.geometry.parameters && o.geometry.parameters.depth != null) ? o.geometry.parameters.depth : sz.z;
          if (w > 1.5 && d < 0.1) xBars.push(o);
          if (d > 1.5 && w < 0.1) zBars.push(o);
        });
        ok(zBars.length >= 5, 'platform has grating bearing bars (found ' + zBars.length + ')');
        ok(xBars.length >= 5, 'platform has grating cross tie-rods (found ' + xBars.length + ')');
        if (zBars.length > 0 && xBars.length > 0) {
          const zY = zBars[0].position.y;
          const xY = xBars[0].position.y;
          const diff = Math.abs(xY - zY);
          ok(diff >= 0.012, 'platform grating crossbars sit on top of bearing bars without clipping (diff ' + diff.toFixed(3) + ' >= 0.012)');
        }
        if (pMesh.parent) pMesh.parent.remove(pMesh);
      }
    }

    // D. Pillar:
    {
      const pilMesh = T.makeBuildMesh ? T.makeBuildMesh('pillar') : T.spawnBuild('pillar', 0, 0)?.mesh;
      if (pilMesh) {
        pilMesh.position.set(0, 0, 0);
        pilMesh.updateMatrixWorld(true);
        // Find lower foot gusset fins (near y=0.15-0.25)
        let footGus = [];
        pilMesh.traverse(o => {
          if (o.isMesh && o.position.y > 0.15 && o.position.y < 0.30 && (Math.abs(o.position.x) > 0.15 || Math.abs(o.position.z) > 0.15)) {
            footGus.push(o);
          }
        });
        ok(footGus.length >= 4, 'pillar has lower foot gusset brackets (found ' + footGus.length + ')');
        if (footGus.length > 0) {
          const minGusY = Math.min(...footGus.map(g => new Box3().setFromObject(g).min.y));
          ok(minGusY >= 0.125, 'pillar foot gusset fins sit on upper baseplate with zero penetration (minY ' + minGusY.toFixed(3) + ' >= 0.125)');
        }
        if (pilMesh.parent) pilMesh.parent.remove(pilMesh);
      }
    }

    // E. Stairs:
    {
      const sMesh = T.spawnBuild('stairs', 0, 0)?.mesh;
      if (sMesh) {
        sMesh.position.set(0, 0, 0);
        sMesh.updateMatrixWorld(true);
        const b = new Box3().setFromObject(sMesh);
        ok(b.min.y <= -0.65, 'stairs foundation footing sill reaches ground/slope depth (min.y ' + b.min.y.toFixed(3) + ' <= -0.65)');
        if (sMesh.parent) sMesh.parent.remove(sMesh);
      }
    }

    // F. Spikes:
    {
      const spMesh = T.spawnBuild('spikes', 0, 0)?.mesh;
      if (spMesh) {
        spMesh.position.set(0, 0, 0);
        spMesh.updateMatrixWorld(true);
        const b = new Box3().setFromObject(spMesh);
        ok(b.min.y <= -0.58, 'spikes pit foundation skirt reaches ground/slope depth (min.y ' + b.min.y.toFixed(3) + ' <= -0.58)');
        if (spMesh.parent) spMesh.parent.remove(spMesh);
      }
    }

    // --- 3. RANGE PROPS IN TRAINING GROUND ---
    const D = T.trainingDbg;
    if (D) {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
      const mBtn = document.getElementById('modeTraining');
      if (mBtn) mBtn.click();
      ok(await until(() => D.state().active, 20000), 'Training Ground is active');

      const tg = D.tg();
      ok(!!tg, 'training ground tg exists');

      // A. Range computer wall mount (no floating gap from wall):
      if (tg) {
        const consoleObj = tg.group.getObjectByName('training-range-console');
        ok(!!consoleObj, 'training-range-console exists in tg.group');
        if (consoleObj) {
          consoleObj.updateMatrixWorld(true);
          const cBox = new Box3().setFromObject(consoleObj);
          // Wall is at tg.origin.x + R.minX (-8.0m relative to tg.origin)
          const wallX = tg.origin.x - 8.0;
          const distToWall = Math.abs(cBox.min.x - wallX);
          ok(distToWall <= 0.035, 'range computer sits flush against the wall with no floating gap (dist ' + (distToWall * 100).toFixed(1) + ' cm <= 3.5 cm)');
        }

        // B. Target plate pivot hinge and backing frame:
        const t0 = tg.targets[0];
        ok(!!t0 && !!t0.pivot, 'target 0 and pivot exist');
        if (t0 && t0.pivot) {
          let backingUprights = [];
          t0.pivot.traverse(o => {
            if (o.isMesh && o.name !== 'target-plate' && o.position.y > 0.6) {
              backingUprights.push(o);
            }
          });
          ok(backingUprights.length > 0, 'target has backing frame uprights supporting silhouette plate (found ' + backingUprights.length + ')');
          if (backingUprights.length > 0) {
            // CB-311 item (Director OK, --review): 'behind' is down the lane, away from the firing line, whichever way the plate
            // is built to face (GP-20102 turned it: the line looks along +z, the backing is on +z). The lane runs from the firing
            // line to this target; in the pivot's own frame each upright must sit at least 15 mm past the plate along it.
            const V3 = T.THREE.Vector3, line = tg.group.getObjectByName('firing-line'), plate = t0.plate || t0.pivot.getObjectByName('target-plate');
            tg.group.updateMatrixWorld(true);
            const pw = t0.pivot.getWorldPosition(new V3()), lw = line ? line.getWorldPosition(new V3()) : null;
            ok(!!line && !!plate, 'the firing line and the target plate are there to measure from');
            if (line && plate) {
              const lane = new V3(0, 0, pw.z - lw.z).normalize();   // the line runs across the lanes (along x); downrange is along z
              const dir = lane.clone().transformDirection(t0.pivot.matrixWorld.clone().invert());   // down the lane, in the pivot's frame
              const depth = Math.min(...backingUprights.map(u => u.position.clone().sub(plate.position).dot(dir)));
              ok(depth >= 0.015, 'target backing uprights sit behind the silhouette plate, down the lane, without penetration (' + depth.toFixed(3) + ' m past the plate >= 0.015)');
            }
          }
        }

        // C. Firing line bench:
        const firingBench = tg.group.getObjectByName('training-firing-bench');
        ok(!!firingBench, 'training-firing-bench exists in tg.group');
      }
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
