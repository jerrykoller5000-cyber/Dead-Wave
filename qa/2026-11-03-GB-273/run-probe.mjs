import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-03-GB-273/dusk-probe');
const WALKS_DIR = path.join(OUT_DIR, 'walks');
fs.mkdirSync(WALKS_DIR, { recursive: true });

// Exact 5 first-person seats from AG-203 (qa/2026-11-02-AG-203/sector-cull-audit.json)
const SEATS = [
  {
    id: 'seat1_hq_north_ring',
    short: 'seat1-hq-north',
    label: 'Seat 1: HQ Clearing North -> hq-thicket (N arc)',
    bandKind: 'hq-thicket',
    pos: { x: -4, z: 42 },
    yaw: 0.0, // looking +Z (North) across hq-thicket at z ~ 60
    pitch: -0.04,
    planePoint: { x: -4, z: 58 },
    planeNormal: { x: 0, z: 1 },
  },
  {
    id: 'seat2_hq_west_ring',
    short: 'seat2-hq-west',
    label: 'Seat 2: HQ Clearing West -> hq-thicket (W landing/rangers gap)',
    bandKind: 'hq-thicket',
    pos: { x: 42, z: -10 },
    yaw: Math.PI / 2, // looking +X (West) across hq-thicket at x ~ 60
    pitch: -0.04,
    planePoint: { x: 58, z: -10 },
    planeNormal: { x: 1, z: 0 },
  },
  {
    id: 'seat3_quarter_nw',
    short: 'seat3-quarter-nw',
    label: 'Seat 3: NW Approach -> quarter-nw band',
    bandKind: 'quarter-nw',
    pos: { x: 70, z: 62 },
    yaw: 1.95, // looking WNW across quarter-nw ([66,23]->[83,50]->[91.5,69.7]->[96,80])
    pitch: -0.04,
    planePoint: { x: 88, z: 65 },
    planeNormal: { x: 0.88, z: -0.47 },
  },
  {
    id: 'seat4_quarter_ne',
    short: 'seat4-quarter-ne',
    label: 'Seat 4: NE Approach -> quarter-ne band',
    bandKind: 'quarter-ne',
    pos: { x: -22, z: 76 },
    yaw: -0.45, // looking NNE/NE across quarter-ne ([-10,69]->[-30,95]->[-50,115])
    pitch: -0.04,
    planePoint: { x: -32, z: 95 },
    planeNormal: { x: -0.60, z: 0.80 },
  },
  {
    id: 'seat5_quarter_sw',
    short: 'seat5-quarter-sw',
    label: 'Seat 5: SW Approach -> quarter-sw band',
    bandKind: 'quarter-sw',
    pos: { x: 44, z: -68 },
    yaw: 2.35, // looking SW across quarter-sw ([50,-49]->[59,-70]->[68,-105])
    pitch: -0.04,
    planePoint: { x: 60, z: -72 },
    planeNormal: { x: 0.94, z: -0.34 },
  },
];

async function run() {
  const srv = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });

    // 1. First verify ?wallcull=0 disables wallCull cleanly
    console.log('[AG-222] Verifying ?wallcull=0 URL flag...');
    await page.goto(`${srv.origin}/index.html?solid=1&debug=1&raf=timer&wallcull=0`, { timeout: 180000 });
    await page.waitFor('Boolean(window.TT && window.TT.stepFrame && window.TT.wallCullDbg)', { timeout: 180000 });
    const offFlagCheck = await page.evaluate(`(() => {
      const T = window.TT;
      return {
        wallCullDbg: T.wallCullDbg(),
        stoneWalls: T.wallBandsDbg && T.wallBandsDbg.stone ? T.wallBandsDbg.stone() : true,
      };
    })()`);
    console.log('[AG-222] ?wallcull=0 check:', offFlagCheck);

    // 2. Load default launcher page (stone walls + wallCull ON by default)
    console.log('[AG-222] Loading default index.html (stone walls + wallCull ON)...');
    await page.goto(`${srv.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 180000 });
    await page.waitFor('Boolean(window.TT && window.TT.stepFrame && window.TT.wallCullDbg)', { timeout: 180000 });

    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const libCode = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await page.evaluate(libCode);

    console.log('[AG-222] Starting match from Jerry launcher and warming up sceneCull spheres across the map...');
    const warmupStats = await page.evaluate(`(async () => {
      const T = window.TT;
      const THREE = T.THREE;
      await startMatch(T, 'JERRY');
      T.flightHold(true);
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      T.setShotView(null);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setMouseFireDbg(false);
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));

      window.__stepRendered = (dt = 1 / 60) => {
        const nf = T.renderer && T.renderer._nodes && T.renderer._nodes.nodeFrame;
        if (nf && typeof nf.update === 'function') {
          nf.update();
          if (T.renderer.info) T.renderer.info.frame = nf.frameId;
        }
        T.stepFrame(dt);
      };

      // Visit a grid of points across the valley so every ud.maxDist prop (28m/55m) and every static sceneCull unit
      // has its bounding sphere measured (spheres < 6 per frame) and registered into wallCull!
      const visitPts = [
        [0, 0], [-4, 42], [-10, 68], [42, -10], [65, -18],
        [70, 62], [95, 78], [-22, 76], [-45, 110], [44, -68], [68, -95],
        [-40, -45], [20, 85], [85, 20], [-80, 40], [40, -90]
      ];
      for (const [vx, vz] of visitPts) {
        const gy = T.sampleHeight(vx, vz);
        T.player.position.set(vx, gy, vz);
        for (let i = 0; i < 35; i++) window.__stepRendered(1 / 60);
      }
      // Step until T.cullDbg.spheres === 0
      let guard = 0;
      while (T.cullDbg.spheres > 0 && guard < 200) {
        window.__stepRendered(1 / 60);
        guard++;
      }
      if (T.renderer && typeof T.renderer.compileAsync === 'function') {
        await T.renderer.compileAsync(T.scene, T.camera);
      }
      return {
        cullDbg: { ...T.cullDbg },
        wallCullDbg: T.wallCullDbg ? {
          cells: T.wallCullDbg().cells,
          hidden: T.wallCullDbg().hidden,
          tested: T.wallCullDbg().tested,
          segments: T.wallCullDbg().segments,
          ms: T.wallCullDbg().ms
        } : null,
      };
    })()`, 180000);
    console.log('[AG-222] Warmup complete:', warmupStats);

    // Install the in-page AG-203 / AG-222 audit & toggle helpers
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      const wcObj = T.wallCullDbg().cull;
      const origUpdate = wcObj.update.bind(wcObj);
      const origIsHidden = wcObj.isHidden.bind(wcObj);

      const diffCanvasA = document.createElement('canvas');
      diffCanvasA.width = 1920; diffCanvasA.height = 1080;
      const ctxA = diffCanvasA.getContext('2d', { willReadFrequently: true });

      const diffCanvasB = document.createElement('canvas');
      diffCanvasB.width = 1920; diffCanvasB.height = 1080;
      const ctxB = diffCanvasB.getContext('2d', { willReadFrequently: true });

      window.__ag222 = {
        wcEnabled: true,
        setWallCullEnabled(on) {
          this.wcEnabled = !!on;
          if (on) {
            wcObj.update = origUpdate;
            wcObj.isHidden = origIsHidden;
          } else {
            wcObj.reset();
            wcObj.update = () => ({ cells: wcObj.cellCount, hidden: 0, tested: 0, segments: wcObj.stats.segments });
            wcObj.isHidden = () => false;
            T.cullShowAll();
          }
        },

        snapCanvasTo(target) {
          const ctx = target === 'A' ? ctxA : ctxB;
          ctx.drawImage(T.renderer.domElement, 0, 0, 1920, 1080);
        },

        compareCanvases(yMinFrac = 0.0, yMaxFrac = 1.0) {
          const imgA = ctxA.getImageData(0, 0, 1920, 1080).data;
          const imgB = ctxB.getImageData(0, 0, 1920, 1080).data;
          const y0 = Math.floor(1080 * yMinFrac);
          const y1 = Math.floor(1080 * yMaxFrac);
          let diffPixels = 0;
          let diffPixelsOver8 = 0;
          let maxChannelDiff = 0;
          let sumAbsDiff = 0;
          let minX = 1920, minY = 1080, maxX = -1, maxY = -1;
          const totalPixels = 1920 * (y1 - y0);
          for (let y = y0; y < y1; y++) {
            for (let x = 0; x < 1920; x++) {
              const i = (y * 1920 + x) * 4;
              const dr = Math.abs(imgA[i] - imgB[i]);
              const dg = Math.abs(imgA[i + 1] - imgB[i + 1]);
              const db = Math.abs(imgA[i + 2] - imgB[i + 2]);
              const dm = Math.max(dr, dg, db);
              sumAbsDiff += (dr + dg + db) / 3;
              if (dm > maxChannelDiff) maxChannelDiff = dm;
              if (dm > 2) diffPixels++;
              if (dm > 8) {
                diffPixelsOver8++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          return {
            totalPixels,
            diffPixelsOver2: diffPixels,
            diffPixelsOver8,
            pctDiffOver8: +(diffPixelsOver8 * 100 / Math.max(1, totalPixels)).toFixed(4),
            meanAbsDiff: +(sumAbsDiff / Math.max(1, totalPixels)).toFixed(4),
            maxChannelDiff,
            diffBBox: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
          };
        },

        classifyOwner(o) {
          for (let p = o; p; p = p.parent) {
            const nm = (p.name || '').toLowerCase();
            const ud = p.userData || {};
            if (ud.wallBand || nm.includes('wallband')) return 'wall-bands';
            if (ud.shortcutLogs) return 'shortcut-logs';
            if (nm.includes('tree') || nm.includes('forest') || ud.treeBatch || ud.treeInst) return 'trees-forest';
            if (nm.includes('under') || nm.includes('foliage') || nm.includes('fern') || nm.includes('grass')) return 'understory-foliage';
            if (nm.includes('history') || ud.cullKids) return 'history-props';
            if (nm.includes('hq') || nm.includes('house') || nm.includes('fob') || nm.includes('tower') || nm.includes('church') || nm.includes('bridge') || nm.includes('camp') || nm.includes('cave') || nm.includes('mine')) return 'landmarks-pois';
            if (nm.includes('zombie')) return 'zombies';
            if (nm.includes('viewmodel') || p === T.marine || p === T.player) return 'player-viewmodel';
          }
          const gTris = o.geometry ? (o.geometry.index ? o.geometry.index.count / 3 : (o.geometry.attributes.position ? o.geometry.attributes.position.count / 3 : 0)) : 0;
          if (o.count && o.count > 20) return 'trees-or-understory-instanced';
          if (gTris > 8000) return 'terrain-water-ground';
          return 'world-props-other';
        },

        auditSeat(seat) {
          const frustum = new THREE.Frustum();
          const projScreenMatrix = new THREE.Matrix4();
          const box = new THREE.Box3();
          const v = new THREE.Vector3();

          T.scene.updateMatrixWorld(true);
          T.camera.updateMatrixWorld(true);
          projScreenMatrix.multiplyMatrices(T.camera.projectionMatrix, T.camera.matrixWorldInverse);
          frustum.setFromProjectionMatrix(projScreenMatrix);

          const gy = T.sampleHeight(seat.pos.x, seat.pos.z);
          const distToWall = Math.hypot(seat.planePoint.x - seat.pos.x, seat.planePoint.z - seat.pos.z);

          let totalFrustumDraws = 0, totalFrustumTris = 0;
          let behindBandDraws = 0, behindBandTris = 0;
          let staticBehindDraws = 0, staticBehindTris = 0;
          const byOwnerBehind = {};
          const remainingBehindDetails = [];

          const isVis = (o) => {
            for (let p = o; p; p = p.parent) if (p.visible === false) return false;
            return (o.layers.mask & T.camera.layers.mask) !== 0 && !(o.userData && o.userData.vmEyeHide);
          };

          const findCullUnit = (o) => {
            let cur = o;
            while (cur && cur.parent && cur.parent !== T.scene) {
              if (cur.parent.userData && cur.parent.userData.cullKids) return cur;
              cur = cur.parent;
            }
            return cur;
          };

          T.scene.traverse((o) => {
            if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh)) return;
            if (!isVis(o) || !o.geometry || !o.geometry.attributes.position) return;

            const baseTris = o.geometry.index
              ? Math.floor(o.geometry.index.count / 3)
              : Math.floor(o.geometry.attributes.position.count / 3);
            const instCount = (o.isInstancedMesh || (typeof o.count === 'number' && o.count > 1)) ? Math.max(1, o.count) : 1;
            const totalObjTris = baseTris * instCount;

            if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();

            let inFrustum = true;
            if (o.frustumCulled !== false && instCount === 1) {
              box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
              inFrustum = frustum.intersectsBox(box);
            }
            if (!inFrustum) return;

            totalFrustumDraws += 1;
            totalFrustumTris += totalObjTris;

            const owner = this.classifyOwner(o);
            if (owner === 'player-viewmodel' || owner === 'terrain-water-ground' || owner === 'wall-bands') return;

            box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
            box.getCenter(v);
            if (instCount > 1 && !o.isInstancedMesh) return;

            if (instCount > 1 && o.isInstancedMesh) {
              const m4 = new THREE.Matrix4();
              let instBehind = 0;
              for (let idx = 0; idx < Math.min(instCount, 600); idx++) {
                o.getMatrixAt(idx, m4);
                m4.premultiply(o.matrixWorld);
                const ix = m4.elements[12], iz = m4.elements[14];
                const signedD = (ix - seat.planePoint.x) * seat.planeNormal.x + (iz - seat.planePoint.z) * seat.planeNormal.z;
                if (signedD > 2.0) instBehind++;
              }
              if (instBehind > 0) {
                const frac = instBehind / Math.min(instCount, 600);
                const trisBehind = Math.round(totalObjTris * frac);
                behindBandDraws += (frac > 0.5 ? 1 : 0);
                behindBandTris += trisBehind;
                byOwnerBehind[owner] = byOwnerBehind[owner] || { draws: 0, tris: 0, partialInstancedDraws: 0 };
                if (frac > 0.5) byOwnerBehind[owner].draws += 1;
                else byOwnerBehind[owner].partialInstancedDraws += 1;
                byOwnerBehind[owner].tris += trisBehind;
              }
              return;
            }

            const signedDist = (v.x - seat.planePoint.x) * seat.planeNormal.x + (v.z - seat.planePoint.z) * seat.planeNormal.z;
            if (signedDist > 2.0) {
              behindBandDraws += 1;
              behindBandTris += totalObjTris;
              staticBehindDraws += 1;
              staticBehindTris += totalObjTris;
              byOwnerBehind[owner] = byOwnerBehind[owner] || { draws: 0, tris: 0, partialInstancedDraws: 0 };
              byOwnerBehind[owner].draws += 1;
              byOwnerBehind[owner].tris += totalObjTris;

              const cu = findCullUnit(o);
              const cud = cu && cu.userData ? cu.userData : {};
              const c = cud._cull || null;
              if (remainingBehindDetails.length < 40) {
                remainingBehindDetails.push({
                  name: o.name || (cu && cu.name) || '(unnamed)',
                  owner,
                  tris: totalObjTris,
                  pos: { x: +v.x.toFixed(1), y: +v.y.toFixed(1), z: +v.z.toFixed(1) },
                  boxMaxY: +box.max.y.toFixed(2),
                  signedDist: +signedDist.toFixed(1),
                  cullR: c ? +c.r.toFixed(2) : null,
                  wcCell: c ? c.wc : null,
                  wcHidden: (c && c.wc >= 0) ? wcObj.isHidden(c.wc) : false,
                  noCull: !!cud.noCull,
                  spans: !!cud.spans,
                });
              }
            }
          });

          const wc = T.wallCullDbg();
          return {
            seatPos: { x: seat.pos.x, y: +gy.toFixed(2), z: seat.pos.z },
            distToWallM: +distToWall.toFixed(2),
            rendererInfo: {
              calls: T.renderer.info.render.calls,
              triangles: T.renderer.info.render.triangles,
            },
            cullDbg: { ...T.cullDbg },
            wallCullDbg: wc ? {
              cells: wc.cells,
              hidden: wc.hidden,
              tested: wc.tested,
              segments: wc.segments,
              ms: +wc.ms.toFixed(4),
            } : null,
            totalFrustumDraws,
            totalFrustumTris,
            behindBandDraws,
            behindBandTris,
            staticBehindDraws,
            staticBehindTris,
            byOwnerBehind,
            remainingBehindSample: remainingBehindDetails,
          };
        }
      };
      return 1;
    })()`);

    // =========================================================================
    // PART 1: 5-Seat A/B Re-Shoot (wallCull OFF vs wallCull ON)
    // =========================================================================
    console.log('[AG-222] Running Part 1: 5-Seat A/B Audit & 1080p Captures...');
    const seatsAudit = [];

    for (const seat of SEATS) {
      // Position player at seat and settle with wallCull OFF first, capture OFF screenshot & audit
      const offData = await page.evaluate(`(async () => {
        const T = window.TT;
        const H = window.__ag222;
        const seat = ${JSON.stringify(seat)};
        const gy = T.sampleHeight(seat.pos.x, seat.pos.z);
        T.setWorldTime(0.50);
        if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
        T.player.position.set(seat.pos.x, gy, seat.pos.z);
        T.player.rotation.y = seat.yaw;
        T.setAimYawDbg(seat.yaw);
        T.setOtsAimDbg(seat.yaw, seat.pitch);
        T.setVelDbg(0, 0);

        H.setWallCullEnabled(false);
        for (let i = 0; i < 40; i++) window.__stepRendered(1 / 60);
        if (T.renderer && typeof T.renderer.compileAsync === 'function') {
          await T.renderer.compileAsync(T.scene, T.camera);
        }
        window.__stepRendered(0);
        H.snapCanvasTo('A');
        return H.auditSeat(seat);
      })()`);

      const offShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `${seat.short}-off.jpg`), Buffer.from(offShot.data, 'base64'));

      // Now enable wallCull ON at the exact same pose (stepped with dt=0 so zero wind/cloud drift!)
      const onData = await page.evaluate(`(async () => {
        const T = window.TT;
        const H = window.__ag222;
        const seat = ${JSON.stringify(seat)};
        H.setWallCullEnabled(true);
        // Step 12 frames with dt=0 so sceneCull & wallCull settle (reads >= 2) while world clock / wind / clouds stay frozen
        for (let i = 0; i < 12; i++) window.__stepRendered(0);
        H.snapCanvasTo('B');
        const audit = H.auditSeat(seat);
        const pixelDiff = H.compareCanvases(0.0, 1.0);
        return { audit, pixelDiff };
      })()`);

      const onShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `${seat.short}-on.jpg`), Buffer.from(onShot.data, 'base64'));

      const drawsOff = offData.behindBandDraws;
      const drawsOn = onData.audit.behindBandDraws;
      const drawsDropped = drawsOff - drawsOn;
      const pctDropped = +(drawsDropped * 100 / Math.max(1, drawsOff)).toFixed(1);

      const seatEntry = {
        id: seat.id,
        short: seat.short,
        label: seat.label,
        bandKind: seat.bandKind,
        off: offData,
        on: onData.audit,
        comparison: {
          behindBandDrawsOff: drawsOff,
          behindBandDrawsOn: drawsOn,
          behindBandDrawsDropped: drawsDropped,
          pctBehindBandDrawsDropped: pctDropped,
          targetTwoThirdsMet: pctDropped >= 66.7,
          frustumDrawsOff: offData.totalFrustumDraws,
          frustumDrawsOn: onData.audit.totalFrustumDraws,
          rendererCallsOff: offData.rendererInfo.calls,
          rendererCallsOn: onData.audit.rendererInfo.calls,
          rendererCallsSaved: offData.rendererInfo.calls - onData.audit.rendererInfo.calls,
          pixelDiffOnVsOff: onData.pixelDiff,
        }
      };
      seatsAudit.push(seatEntry);
      console.log(`[AG-222] ${seat.id}: behindBandDraws ${drawsOff} -> ${drawsOn} (-${drawsDropped}, -${pctDropped}% | target >=66.7%: ${seatEntry.comparison.targetTwoThirdsMet}) | rendererCalls: ${offData.rendererInfo.calls} -> ${onData.audit.rendererInfo.calls} | pxDiff>8: ${onData.pixelDiff.pctDiffOver8}%`);
    }

    // =========================================================================
    // PART 2: Ring Walk & Gap Crossing Walks (Pop Check)
    // =========================================================================
    console.log('[AG-222] Discovering exact gap coordinates on hq-thicket and quarter bands for gap walks...');
    const walksConfig = await page.evaluate(`(() => {
      const T = window.TT;
      // Find actual trail crossings on hq-thicket (r=60) and quarter walls
      // Let's inspect wallSegmentsFromBand or wallBands gaps
      const bands = T.wallBandsDbg.bands();
      return bands.slice(0, 5);
    })()`);
    console.log('[AG-222] Main bands:', walksConfig);

    // Define 5 walks:
    // 1. Walk along the HQ stone ring (inside the North-to-NW arc, r=52m, looking across the wall & breaches)
    // 2. Walk straight through the HQ North trail gap
    // 3. Walk straight through the HQ West (Landing/Rangers) trail gap
    // 4. Walk straight through the Quarter-NW walk/trail gap
    // 5. Walk straight through the Quarter-NE walk/trail gap
    const WALKS = [
      {
        id: 'walk1_hq_ring_arc',
        label: 'Walk 1: Along HQ Stone Ring (North-to-West Arc)',
        frames: 72,
        checkpoints: [0, 14, 28, 42, 56, 71],
        stepPos: `(f, n) => {
          const t = f / Math.max(1, n - 1);
          // Arc at radius 51m from angle 1.65 rad (North, x=-4, z=51) to 0.35 rad (WNW, x=48, z=17)
          const ang = 1.65 - t * 1.30;
          const r = 51.0;
          const x = Math.cos(ang) * r;
          const z = Math.sin(ang) * r;
          // Look obliquely outward across the stone ring (approx 35 deg ahead along the ring)
          const targetX = Math.cos(ang - 0.22) * 68.0;
          const targetZ = Math.sin(ang - 0.22) * 68.0;
          const yaw = Math.atan2(targetX - x, targetZ - z);
          return { x, z, yaw, pitch: -0.03 };
        }`
      },
      {
        id: 'walk2_gap_hq_north',
        label: 'Walk 2: Through HQ Ring North Trail Gap',
        frames: 72,
        checkpoints: [0, 14, 28, 42, 56, 71],
        stepPos: `(f, n) => {
          const t = f / Math.max(1, n - 1);
          // Find the exact North trail gap on hq-thicket near z = +60 (PATHS[0] or crossing trail)
          // Let's walk along the exact gap centerline discovered from wallCull.blocked!
          const g = window.__ag222GapCenters.hqNorth;
          const dist = 16.0 - t * 24.0; // from 16m inside ring to 8m outside ring
          const x = g.x - g.nx * dist;
          const z = g.z - g.nz * dist;
          const yaw = Math.atan2(g.nx, g.nz);
          return { x, z, yaw, pitch: -0.02 };
        }`
      },
      {
        id: 'walk3_gap_hq_west',
        label: 'Walk 3: Through HQ Ring West (Landing) Gap',
        frames: 72,
        checkpoints: [0, 14, 28, 42, 56, 71],
        stepPos: `(f, n) => {
          const t = f / Math.max(1, n - 1);
          const g = window.__ag222GapCenters.hqWest;
          const dist = 16.0 - t * 24.0;
          const x = g.x - g.nx * dist;
          const z = g.z - g.nz * dist;
          const yaw = Math.atan2(g.nx, g.nz);
          return { x, z, yaw, pitch: -0.02 };
        }`
      },
      {
        id: 'walk4_gap_quarter_nw',
        label: 'Walk 4: Through Quarter-NW Wall Gap',
        frames: 72,
        checkpoints: [0, 14, 28, 42, 56, 71],
        stepPos: `(f, n) => {
          const t = f / Math.max(1, n - 1);
          const g = window.__ag222GapCenters.quarterNw;
          const dist = 15.0 - t * 22.0;
          const x = g.x - g.nx * dist;
          const z = g.z - g.nz * dist;
          const yaw = Math.atan2(g.nx, g.nz);
          return { x, z, yaw, pitch: -0.02 };
        }`
      },
      {
        id: 'walk5_gap_quarter_ne',
        label: 'Walk 5: Through Quarter-NE Wall Gap',
        frames: 72,
        checkpoints: [0, 14, 28, 42, 56, 71],
        stepPos: `(f, n) => {
          const t = f / Math.max(1, n - 1);
          const g = window.__ag222GapCenters.quarterNe;
          const dist = 15.0 - t * 22.0;
          const x = g.x - g.nx * dist;
          const z = g.z - g.nz * dist;
          const yaw = Math.atan2(g.nx, g.nz);
          return { x, z, yaw, pitch: -0.02 };
        }`
      }
    ];

    // Locate the exact open gap centers on hq-thicket, quarter-nw, and quarter-ne
    const gapCenters = await page.evaluate(`(() => {
      const T = window.TT;
      const wc = T.wallCullDbg().cull;

      // 1. Scan hq-thicket (r=60) for open gaps where a horizontal ray from r=45 to r=75 at eye height is NOT blocked by wallCull
      const openAngles = [];
      for (let i = 0; i < 720; i++) {
        const ang = (i / 720) * Math.PI * 2;
        const c = Math.cos(ang), s = Math.sin(ang);
        const x0 = c * 46, z0 = s * 46, y0 = T.sampleHeight(x0, z0) + 1.45;
        const x1 = c * 74, z1 = s * 74, y1 = T.sampleHeight(x1, z1) + 1.20;
        if (!wc.blocked(x0, y0, z0, x1, y1, z1)) {
          openAngles.push(ang);
        }
      }
      // Group contiguous open angles into gap clusters
      const clusters = [];
      for (const a of openAngles) {
        const last = clusters[clusters.length - 1];
        if (!last || Math.abs(a - last[last.length - 1]) > 0.03) clusters.push([a]);
        else last.push(a);
      }
      const ringGaps = clusters.map(cl => {
        const mid = cl[Math.floor(cl.length / 2)];
        return {
          ang: +mid.toFixed(4),
          widthM: +(cl.length * (Math.PI * 2 / 720) * 60).toFixed(2),
          x: +(Math.cos(mid) * 60).toFixed(2),
          z: +(Math.sin(mid) * 60).toFixed(2),
          nx: +Math.cos(mid).toFixed(4),
          nz: +Math.sin(mid).toFixed(4),
        };
      }).filter(g => g.widthM >= 2.5 && g.widthM <= 18);

      // Pick North gap (highest +z) and West gap (highest +x)
      const hqNorth = [...ringGaps].sort((a, b) => b.z - a.z)[0] || { x: -11.5, z: 58.9, nx: -0.19, nz: 0.98 };
      const hqWest = [...ringGaps].sort((a, b) => b.x - a.x)[0] || { x: 58.9, z: -11.4, nx: 0.98, nz: -0.19 };

      // 2. Scan quarter-nw ([66,23]->[83,50]->[91.54,69.7]->[96,80]->[118,118]) for its open walk/trail gap
      // Walk gap is at vertex 2: [91.54, 69.7], tangent roughly from [83,50] to [96,80] (dx=13, dz=30 => normal=(0.918, -0.397))
      let quarterNw = { x: 91.54, z: 69.7, nx: 0.918, nz: -0.397 };
      for (let off = -12; off <= 12; off += 0.5) {
        const tx = -0.397, tz = 0.918;
        const gx = 91.54 + tx * off, gz = 69.7 + tz * off;
        const x0 = gx - 0.918 * 12, z0 = gz - (-0.397) * 12, y0 = T.sampleHeight(x0, z0) + 1.45;
        const x1 = gx + 0.918 * 12, z1 = gz + (-0.397) * 12, y1 = T.sampleHeight(x1, z1) + 1.20;
        if (!wc.blocked(x0, y0, z0, x1, y1, z1)) {
          quarterNw = { x: +gx.toFixed(2), z: +gz.toFixed(2), nx: 0.918, nz: -0.397 };
          break;
        }
      }

      // 3. Scan quarter-ne ([-10,69]->[-30,95]->[-50,115]->[-75,130]) around vertex 2: [-50, 115]
      // Tangent from [-30,95] to [-75,130] is dx=-45, dz=35 => outward NE normal is (-0.614, 0.789)
      let quarterNe = { x: -50.0, z: 115.0, nx: -0.614, nz: 0.789 };
      for (let off = -12; off <= 12; off += 0.5) {
        const tx = -0.789, tz = -0.614;
        const gx = -50.0 + tx * off, gz = 115.0 + tz * off;
        const x0 = gx - (-0.614) * 12, z0 = gz - 0.789 * 12, y0 = T.sampleHeight(x0, z0) + 1.45;
        const x1 = gx + (-0.614) * 12, z1 = gz + 0.789 * 12, y1 = T.sampleHeight(x1, z1) + 1.20;
        if (!wc.blocked(x0, y0, z0, x1, y1, z1)) {
          quarterNe = { x: +gx.toFixed(2), z: +gz.toFixed(2), nx: -0.614, nz: 0.789 };
          break;
        }
      }

      window.__ag222GapCenters = { ringGaps, hqNorth, hqWest, quarterNw, quarterNe };
      return window.__ag222GapCenters;
    })()`);
    console.log('[AG-222] Discovered gap centers:', gapCenters);

    const walksAudit = [];

    for (const w of WALKS) {
      console.log(`[AG-222] Running ${w.id} (${w.label})...`);
      // Pre-settle at frame 0 of the walk
      await page.evaluate(`(() => {
        const T = window.TT;
        const H = window.__ag222;
        H.setWallCullEnabled(true);
        const stepFn = ${w.stepPos};
        const p0 = stepFn(0, ${w.frames});
        const gy = T.sampleHeight(p0.x, p0.z);
        T.player.position.set(p0.x, gy, p0.z);
        T.player.rotation.y = p0.yaw;
        T.setAimYawDbg(p0.yaw);
        T.setOtsAimDbg(p0.yaw, p0.pitch);
        for (let i = 0; i < 30; i++) window.__stepRendered(1 / 60);
        return 1;
      })()`);

      const frameTrace = [];
      let totalCellsShownEvents = 0;
      let totalCellsHiddenEvents = 0;
      let maxCheckpointOnVsOffDiffPct = 0;

      for (let f = 0; f < w.frames; f++) {
        const isCheckpoint = w.checkpoints.includes(f);
        const stepRes = await page.evaluate(`(() => {
          const T = window.TT;
          const H = window.__ag222;
          const stepFn = ${w.stepPos};
          const pose = stepFn(${f}, ${w.frames});
          const gy = T.sampleHeight(pose.x, pose.z);
          T.player.position.set(pose.x, gy, pose.z);
          T.player.rotation.y = pose.yaw;
          T.setAimYawDbg(pose.yaw);
          T.setOtsAimDbg(pose.yaw, pose.pitch);

          // Step 1 frame with wallCull ON
          window.__stepRendered(1 / 60);
          const wc = T.wallCullDbg();
          const res = {
            f: ${f},
            x: +pose.x.toFixed(2),
            y: +gy.toFixed(2),
            z: +pose.z.toFixed(2),
            yaw: +pose.yaw.toFixed(3),
            hiddenCells: wc.hidden,
            testedCells: wc.tested,
            wallMs: +wc.ms.toFixed(4),
            cullHiddenUnits: T.cullDbg.hidden,
            rendererCalls: T.renderer.info.render.calls,
            checkpointDiff: null,
          };

          if (${isCheckpoint}) {
            H.snapCanvasTo('A'); // wallCull ON
            // Temporarily unhide all wallCull cells at exact same frame (dt=0) to check if ANY visible geometry in the gap was missing!
            H.setWallCullEnabled(false);
            window.__stepRendered(0);
            H.snapCanvasTo('B'); // wallCull OFF reference at identical frame
            res.checkpointDiff = H.compareCanvases(0.0, 1.0);
            // Restore wallCull ON and re-settle its state for the walk
            H.setWallCullEnabled(true);
            window.__stepRendered(0);
            window.__stepRendered(0);
          }
          return res;
        })()`);

        if (f > 0) {
          const prevHid = frameTrace[f - 1].hiddenCells;
          if (stepRes.hiddenCells < prevHid) totalCellsShownEvents += (prevHid - stepRes.hiddenCells);
          if (stepRes.hiddenCells > prevHid) totalCellsHiddenEvents += (stepRes.hiddenCells - prevHid);
        }
        if (stepRes.checkpointDiff && stepRes.checkpointDiff.pctDiffOver8 > maxCheckpointOnVsOffDiffPct) {
          maxCheckpointOnVsOffDiffPct = stepRes.checkpointDiff.pctDiffOver8;
        }
        frameTrace.push(stepRes);

        if (isCheckpoint) {
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, captureBeyondViewport: false });
          fs.writeFileSync(path.join(WALKS_DIR, `${w.id}-f${String(f).padStart(2, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
        }
      }

      const walkSummary = {
        id: w.id,
        label: w.label,
        frames: w.frames,
        checkpoints: w.checkpoints,
        hiddenCellsStart: frameTrace[0].hiddenCells,
        hiddenCellsMin: Math.min(...frameTrace.map(x => x.hiddenCells)),
        hiddenCellsMax: Math.max(...frameTrace.map(x => x.hiddenCells)),
        hiddenCellsEnd: frameTrace[frameTrace.length - 1].hiddenCells,
        totalCellsShownDuringWalk: totalCellsShownEvents,
        totalCellsHiddenDuringWalk: totalCellsHiddenEvents,
        maxWallMs: Math.max(...frameTrace.map(x => x.wallMs)),
        avgWallMs: +(frameTrace.reduce((s, x) => s + x.wallMs, 0) / frameTrace.length).toFixed(4),
        maxCheckpointOnVsOffDiffPct,
        checkpointDiffs: frameTrace.filter(x => x.checkpointDiff).map(x => ({
          f: x.f,
          pos: { x: x.x, z: x.z },
          hiddenCells: x.hiddenCells,
          rendererCalls: x.rendererCalls,
          ...x.checkpointDiff,
        })),
        trace: frameTrace,
      };
      walksAudit.push(walkSummary);
      console.log(`[AG-222] ${w.id}: hiddenCells [${walkSummary.hiddenCellsMin}..${walkSummary.hiddenCellsMax}] | shownEvents=${totalCellsShownEvents} | maxCheckpointDiffOver8=${maxCheckpointOnVsOffDiffPct}% | avgWallMs=${walkSummary.avgWallMs}ms`);
    }

    // =========================================================================
    // PART 3: Dawn & Dusk Shadow Check Behind a Wall
    // =========================================================================
    console.log('[AG-222] Running Part 3: Dawn & Dusk Shadow Check Behind a Wall...');
    const SHADOW_CHECKS = [
      {
        id: 'dawn_west_wall',
        label: 'Dawn (06:30, worldTime=0.27) — Sun Behind West HQ Stone Wall Casting Long Shadow Toward Player',
        worldTime: 0.27,
        seat: SEATS[1], // Seat 2: HQ West Ring (pos: [42, -10], looking +X toward x=58 wall; Dawn sun is at +X/+Z shining from behind the wall toward -X)
      },
      {
        id: 'dusk_ne_wall',
        label: 'Dusk (17:30, worldTime=0.73) — Sun Behind NE Quarter Stone Wall Casting Long Shadow Toward Player',
        worldTime: 0.73,
        seat: SEATS[3], // Seat 4: NE Approach -> quarter-ne (pos: [-22, 76], looking NE toward [-32, 95] wall; Dusk sun is at -X/+Z shining from behind the wall)
      },
    ];

    const shadowAudit = [];
    for (const sc of SHADOW_CHECKS) {
      // Capture OFF first
      const offShadow = await page.evaluate(`(async () => {
        const T = window.TT;
        const H = window.__ag222;
        const sc = ${JSON.stringify(sc)};
        const seat = sc.seat;
        const gy = T.sampleHeight(seat.pos.x, seat.pos.z);
        T.setWorldTime(sc.worldTime);
        if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
        T.player.position.set(seat.pos.x, gy, seat.pos.z);
        T.player.rotation.y = seat.yaw;
        T.setAimYawDbg(seat.yaw);
        T.setOtsAimDbg(seat.yaw, -0.10); // pitch slightly down (-0.10 rad) to frame both the stone wall and its ground shadow in front of the wall

        H.setWallCullEnabled(false);
        for (let i = 0; i < 30; i++) window.__stepRendered(1 / 60);
        if (T.renderer && typeof T.renderer.compileAsync === 'function') {
          await T.renderer.compileAsync(T.scene, T.camera);
        }
        window.__stepRendered(0);
        H.snapCanvasTo('A');
        return {
          sunIntensity: +T.sun.intensity.toFixed(4),
          sunPos: { x: +T.sun.position.x.toFixed(2), y: +T.sun.position.y.toFixed(2), z: +T.sun.position.z.toFixed(2) },
          playerPos: { x: +T.player.position.x.toFixed(2), y: +T.player.position.y.toFixed(2), z: +T.player.position.z.toFixed(2) },
          sunShadowDbg: T.sunShadowDbg ? T.sunShadowDbg() : null,
          audit: H.auditSeat(seat),
        };
      })()`);

      const offShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `shadow-${sc.id}-off.jpg`), Buffer.from(offShot.data, 'base64'));

      // Capture ON at identical worldTime (dt=0)
      const onShadow = await page.evaluate(`(async () => {
        const T = window.TT;
        const H = window.__ag222;
        const sc = ${JSON.stringify(sc)};
        H.setWallCullEnabled(true);
        for (let i = 0; i < 12; i++) window.__stepRendered(0);
        H.snapCanvasTo('B');
        return {
          audit: H.auditSeat(sc.seat),
          fullFrameDiff: H.compareCanvases(0.0, 1.0),
          groundShadowBandDiff: H.compareCanvases(0.52, 0.95),
          hiddenByWall: (() => {
            const out = [], W = T.wallCullDbg().cull;
            const visit = (o) => { const c = o.userData && o.userData._cull; if (c && c.hidden && c.wc >= 0 && W.isHidden(c.wc)) { const b = new T.THREE.Box3().setFromObject(o); out.push({ name: o.name || o.type, kids: o.children.length, r: +c.r.toFixed(2), x: +o.position.x.toFixed(1), z: +o.position.z.toFixed(1), y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2), cast: !!o.castShadow, mesh: !!o.isMesh }); } };
            for (const o of T.scene.children) { visit(o); if (o.userData && o.userData.cullKids) for (const k of o.children) visit(k); }
            return out;
          })(),
        };
      })()`);

      const onShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `shadow-${sc.id}-on.jpg`), Buffer.from(onShot.data, 'base64'));

      const entry = {
        id: sc.id,
        label: sc.label,
        worldTime: sc.worldTime,
        sunIntensity: offShadow.sunIntensity,
        sunOffsetFromPlayer: {
          dx: +(offShadow.sunPos.x - offShadow.playerPos.x).toFixed(2),
          dy: +(offShadow.sunPos.y - offShadow.playerPos.y).toFixed(2),
          dz: +(offShadow.sunPos.z - offShadow.playerPos.z).toFixed(2),
        },
        behindBandDrawsOff: offShadow.audit.behindBandDraws,
        behindBandDrawsOn: onShadow.audit.behindBandDraws,
        rendererCallsOff: offShadow.audit.rendererInfo.calls,
        rendererCallsOn: onShadow.audit.rendererInfo.calls,
        fullFrameDiff: onShadow.fullFrameDiff,
        groundShadowBandDiff: onShadow.groundShadowBandDiff, hiddenByWall: onShadow.hiddenByWall,
      };
      shadowAudit.push(entry);
      console.log("HIDDEN " + sc.id + " " + JSON.stringify(entry.hiddenByWall)); console.log(`[AG-222] Shadow ${sc.id}: behindBandDraws ${entry.behindBandDrawsOff} -> ${entry.behindBandDrawsOn} | groundShadowDiff>8: ${entry.groundShadowBandDiff.pctDiffOver8}% | fullDiff>8: ${entry.fullFrameDiff.pctDiffOver8}%`);
    }

    const fullTelemetry = {
      taskId: 'AG-222',
      feature: 'GB-273 walls cull (game/wall-cull.js)',
      generatedAt: new Date().toISOString(),
      urlOffFlagCheck: offFlagCheck,
      warmupStats,
      gapCenters,
      seatsAudit,
      walksAudit: walksAudit.map(({ trace, ...rest }) => rest),
      shadowAudit,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(fullTelemetry, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'walks-traces.json'), JSON.stringify(walksAudit, null, 2));
    console.log('[AG-222] Saved telemetry.json and walks-traces.json successfully.');
  } finally {
    await browser.close().catch(() => {});
    await srv.close().catch(() => {});
  }
}

run().catch((err) => {
  console.error('[AG-222] Fatal error:', err);
  process.exit(1);
});
