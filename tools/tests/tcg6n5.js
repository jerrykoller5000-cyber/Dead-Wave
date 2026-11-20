// tcg6n5 - CG-6, J153 note 5 (Jerry: "the camo resizes when I turn toward the armory"), the in-game row. Real renderer only.
// three r175 drew every material's map through one shared TextureNode whose uv-matrix uniform was pointed at a texture's
// matrix once per RENDER, so in a frame the guns' camo could take another texture's tiling (the Training range floor's
// repeat, 4 x 10.5) depending on the draw order, i.e. the view direction. core/texture-uv-per-object.js (Claude 7) makes
// it per object. This row is the game's own frame: Training, first person, the shotgun in DBDU, turned 105 degrees left
// from the firing line by real mousemove events (Claude 7's review/CG-6/native-probe4.mjs), where the leak showed. Then,
// in one task (no game tick in between), the same scene and camera are drawn with ONLY the range floor's repeat changed (1 x 1, and
// its own 4 x 10.5), and once with the view gun and arms hidden (to find their pixels). The gun's and sleeves' pixels must
// not change when only the floor's tiling does. Controls: the same frame drawn twice is the same, and the floor's change
// does show on the floor (the row is not blind). Proved red on the tree before the fix and green with it (CB-335).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  if (!THREE || THREE.STAND_IN) return 'INFO tcg6n5 draws real frames: the stand-in three has no renderer (run it with tools/realtest.mjs)';
  const errs = []; const onErr = (e) => errs.push(String(e.message || e.error)); window.addEventListener('error', onErr);
  let floor = null, rep0 = null, vmRoot = null, vmVis = true;
  try {
    const D = T.trainingDbg;
    document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 180000) await wait(200);
    ok(D.state().active, 'the Training Ground is up');
    // The game's first-minute warm-up draws hidden stand-in frames (the canvas hidden): wait until it shows the real one.
    const t2 = Date.now(); while (T.renderer.domElement.style.visibility === 'hidden' && Date.now() - t2 < 240000) await wait(250);
    ok(T.renderer.domElement.style.visibility !== 'hidden', 'the warm-up is over and the canvas shows the game (' + ((Date.now() - t2) / 1000).toFixed(0) + ' s)');
    await wait(3000); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons();
    const W = T.getWardrobe(); W.guns = W.guns || {}; for (const k of Object.keys(T.weaponMeshes)) W.guns[k] = 'dbdu'; T.dressGuns(W);
    T.setCamo && T.setCamo('flecktarn', false);
    T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false);
    for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(200); }
    const tg = D.tg(), s = tg.spawn; T.player.position.set(s.x, tg.floorY, s.z); T.setViewFirstDbg(true);
    const V = T.viewmodelDbg(); const t1 = Date.now(); while (!(V && V.info.key === 'shotgun' && V.info.raise > 0.999) && Date.now() - t1 < 30000) await wait(100);
    ok(!!V && V.info.key === 'shotgun' && V.info.raise > 0.999, 'first person, the shotgun raised (' + (V && V.info.key) + ', raise ' + (V && V.info.raise.toFixed(3)) + ')');
    await wait(1500);
    // The eye's yaw (the eye follows the view's own yaw, driven by mousemove; setAimYawDbg would only turn the body).
    const yaw = () => { const d = new THREE.Vector3(); T.camera.updateMatrixWorld(); T.camera.getWorldDirection(d); return Math.atan2(d.x, d.z) * 180 / Math.PI; };
    const turn = (a, b) => ((b - a + 540) % 360) - 180;
    const look = async (dx) => { dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: 0, bubbles: true })); await wait(400); };
    const y0 = yaw(); await look(-100); await wait(1200);
    const per100 = Math.abs(turn(y0, yaw())) || 5;   // degrees one 100 px move turns him (his sensitivity)
    const sign = Math.sign(turn(y0, yaw())) || 1;      // which way a leftward move turns the yaw number
    for (let i = 0; i < 12; i++) { const left = turn(y0, yaw()) * sign; if (Math.abs(left - 105) < 4) break; await look(-Math.round((105 - left) / per100 * 100 * 0.8)); await wait(700); }
    await wait(1500);
    const leftDeg = turn(y0, yaw()) * sign;
    ok(Math.abs(leftDeg - 105) < 8, 'turned ' + leftDeg.toFixed(1) + ' degrees left from the firing line by mousemove (want 105; ' + per100.toFixed(2) + ' deg per 100 px)');

    floor = T.scene.getObjectByName('training-range-floor');
    const fmap = floor && floor.material && floor.material.map;
    ok(!!fmap, 'the range floor has its tiled map (' + (fmap ? fmap.repeat.x + ' x ' + fmap.repeat.y : 'none') + ')');
    vmRoot = V.root; vmVis = vmRoot.visible;
    let camoMeshes = 0; vmRoot.traverse((o) => { if (o.isMesh && o.visible) { const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.map && m.map !== fmap) camoMeshes++; } });
    ok(camoMeshes > 0, 'the view gun and arms draw textured parts (' + camoMeshes + ')');
    rep0 = fmap.repeat.clone();
    // One task: draw the frame five times, nothing advancing in between.
    const cv = T.renderer.domElement, c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
    const g = c2.getContext('2d', { willReadFrequently: true });
    // A plain render of the game's scene and camera (not renderFrame: the post chain's scene pass renders once per FRAME,
    // so a second renderFrame in the same task only re-composites the cached picture; and it re-places the view gun).
    const R = T.renderer;
    const grab = () => { R.setRenderTarget(null); R.render(T.scene, T.camera); g.clearRect(0, 0, c2.width, c2.height); g.drawImage(cv, 0, 0); return g.getImageData(0, 0, c2.width, c2.height).data; };
    const setRep = (x, y) => { fmap.repeat.set(x, y); fmap.updateMatrix(); };
    setRep(1, 1); const A1 = grab(); const A2 = grab();
    setRep(rep0.x, rep0.y); const B = grab();
    vmRoot.visible = false; const C = grab(); vmRoot.visible = vmVis;
    setRep(1, 1); const A3 = grab(); setRep(rep0.x, rep0.y);
    const w = c2.width, h = c2.height, N = w * h, dmax = (P, Q, i) => Math.max(Math.abs(P[i] - Q[i]), Math.abs(P[i + 1] - Q[i + 1]), Math.abs(P[i + 2] - Q[i + 2]));
    const raw = new Uint8Array(N); for (let p = 0; p < N; p++) raw[p] = dmax(B, C, p * 4) > 24 ? 1 : 0;
    // The view gun's pixels, one pixel in from their edge (an edge pixel blends the floor behind it), and the floor's: two out.
    const mask = new Uint8Array(N), near = new Uint8Array(N);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const p = y * w + x;
      if (raw[p] && raw[p - 1] && raw[p + 1] && raw[p - w] && raw[p + w]) mask[p] = 1;
      for (let dy = -2; dy <= 2 && !near[p]; dy++) for (let dx = -2; dx <= 2; dx++) if (raw[p + dy * w + dx]) { near[p] = 1; break; } }
    let gunPx = 0, gunMoved = 0, gunMoved2 = 0, same = 0, floorPx = 0, floorMoved = 0;
    for (let p = 0; p < N; p++) { const i = p * 4;
      if (mask[p]) { gunPx++; if (dmax(A1, B, i) > 24) gunMoved++; if (dmax(A3, B, i) > 24) gunMoved2++; if (dmax(A1, A2, i) > 24) same++; }
      else if (!near[p]) { floorPx++; if (dmax(A1, B, i) > 24) floorMoved++; } }
    const cols = new Set(); for (let p = 0; p < N; p += 7) { const i = p * 4; cols.add((B[i] >> 3) << 10 | (B[i + 1] >> 3) << 5 | (B[i + 2] >> 3)); }
    ok(cols.size > 200, 'the captured frame is a picture, not a flat fill (' + cols.size + ' colours)');
    const pc = (a, b) => (100 * a / Math.max(1, b)).toFixed(2) + '%';
    ok(gunPx > 0.02 * N, 'the view gun and arms cover ' + gunPx + ' px of the ' + w + 'x' + h + ' frame');
    ok(same <= 0.002 * gunPx, 'the same frame drawn twice is the same on the gun (' + same + ' px, ' + pc(same, gunPx) + ')');
    ok(floorMoved > 0.01 * floorPx, 'the floor\'s repeat change shows on the floor (' + floorMoved + ' px, ' + pc(floorMoved, floorPx) + ' of the rest)');
    ok(gunMoved <= 0.01 * gunPx && gunMoved2 <= 0.01 * gunPx, 'note 5: the gun\'s and sleeves\' camo does not change when only the range floor\'s repeat does (1x1 vs ' + rep0.x + 'x' + rep0.y + ': ' + gunMoved + ' and ' + gunMoved2 + ' of ' + gunPx + ' px changed, ' + pc(Math.max(gunMoved, gunMoved2), gunPx) + '; limit 1%)');
    ok(T.renderer.domElement.style.visibility !== 'hidden', 'the canvas is still shown after the captures');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  finally { try { if (floor && rep0) { floor.material.map.repeat.copy(rep0); floor.material.map.updateMatrix(); } if (vmRoot) vmRoot.visible = vmVis; } catch (_) {} window.removeEventListener('error', onErr); }
  return out.join('\n');
})()
