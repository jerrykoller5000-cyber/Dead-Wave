// qa/2026-11-11-AG-310/patch-ag310-v2.mjs
// Iteration-2 surgical CRLF-preserving patcher for AG-310 in index.html.

import assert from 'node:assert/strict';
import fs from 'node:fs';

const FILE = 'C:/Users/Zero/Desktop/Tiny Trek/index.html';
let src = fs.readFileSync(FILE, 'utf8');

function replaceOnce(label, targetLf, replacementLf) {
  const target = targetLf.replace(/\r?\n/g, '\r\n');
  const replacement = replacementLf.replace(/\r?\n/g, '\r\n');
  const first = src.indexOf(target);
  assert(first !== -1, `Anchor not found for ${label}`);
  const second = src.indexOf(target, first + target.length);
  assert(second === -1, `Anchor matched multiple times for ${label}`);
  src = src.slice(0, first) + replacement + src.slice(first + target.length);
}

// 1. rackGunCopy 0-vertex guard + queueOrRefreshArmoryRack + synchronous mirrorTrainingRack call
replaceOnce(
  'rackGunCopy-zero-guard',
  `        const prep = list.map(({geometry, m}) => {
          const temporary = !!geometry.index, geo = temporary ? geometry.toNonIndexed() : geometry;
          total += geo.attributes.position.count;
          return {geo, temporary, m};
        });
        const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2);`,
  `        const prep = list.map(({geometry, m}) => {
          const temporary = !!geometry.index, geo = temporary ? geometry.toNonIndexed() : geometry;
          total += geo.attributes.position.count;
          return {geo, temporary, m};
        });
        if (!total) { for (const p of prep) if (p.temporary) p.geo.dispose(); continue; }
        const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2);`
);

replaceOnce(
  'refreshArmoryRack-dirty-and-mirror',
  `    function refreshArmoryRack(force) {
      const rack = house.armoryRack;
      if (!rack) return;
      if (force) clearRackGunCache();
      const kinds = armoryDisplayKinds();
      const key = kinds.map(gunLookKey).join(',');
      if (!force && key === armoryRackKey) return;
      armoryRackKey = key;`,
  `    let armoryRackDirty = false;
    function queueOrRefreshArmoryRack(force = false) {
      if (!force && typeof armoryOpenNow === 'function' && armoryOpenNow()) { armoryRackDirty = true; return; }
      refreshArmoryRack(force);
    }
    function refreshArmoryRack(force) {
      armoryRackDirty = false;
      const rack = house.armoryRack;
      if (!rack) return;
      if (force) clearRackGunCache();
      const kinds = armoryDisplayKinds();
      const key = kinds.map(gunLookKey).join(',');
      if (!force && key === armoryRackKey) return;
      armoryRackKey = key;`
);

replaceOnce(
  'refreshArmoryRack-mirror-sync',
  `      mirrorTrainingRack(!!force);   // CL-115
    }`,
  `      mirrorTrainingRack();   // CL-115
    }`
);

// 2. fitArmoryMod pair branch & buyWeapon: use queueOrRefreshArmoryRack(false)
replaceOnce(
  'fitArmoryMod-pair-queue',
  `        applyArmoryLoadout(runArmory.loadout(), runArmory.read());
        syncOffhandVisibility();
        refreshArmoryRack(false);`,
  `        armoryLive = true;
        syncOffhandVisibility();
        queueOrRefreshArmoryRack(false);`
);

replaceOnce(
  'buyWeapon-queue-rack',
  `      noteArmoryGun(w);
      armoryLive = true;
      refreshArmoryRack(false);`,
  `      noteArmoryGun(w);
      armoryLive = true;
      queueOrRefreshArmoryRack(false);`
);

// 3. openArmoryCatalogue: suppress redundant second synchronous armoryUI.render()
replaceOnce(
  'openArmoryCatalogue-suppress',
  `      container.appendChild(shopEl);
      shopEl.classList.add('armory-inline');
      renderShop();
    }`,
  `      container.appendChild(shopEl);
      shopEl.classList.add('armory-inline');
      withArmoryBuy(() => renderShop());
    }`
);

// 4. openCIF & closeCIF: session bump + flush armoryRackDirty on closeCIF
replaceOnce(
  'openCIF-closeCIF-session',
  `    function openCIF(armoryOnly = false) {
      if(rangeFeature?.owns())rangeFeature.exit();
      if (fullMapOpen) setFullMap(false);
      if (!gameStarted || gameOver || won || cifOpen || shopOpen) return;
      if (nightLockdown()) { refuseLockdown(); return; }   // CU-82
      cifOpen = true;
      paused = true;`,
  `    function openCIF(armoryOnly = false) {
      if(rangeFeature?.owns())rangeFeature.exit();
      if (fullMapOpen) setFullMap(false);
      if (!gameStarted || gameOver || won || cifOpen || shopOpen) return;
      if (nightLockdown()) { refuseLockdown(); return; }   // CU-82
      armoryPics.session++;
      cifOpen = true;
      paused = true;`
);

replaceOnce(
  'closeCIF-session-and-rack',
  `    function closeCIF() {
      if (!cifOpen) return;
      cifOpen = false;
      dressPointers.clear(); dressPinch = null; dressPointerId = null; dressDrag = false;
      if (dressRAF) cancelAnimationFrame(dressRAF);
      dressRAF = 0;
      if (AudioSys.cifLocker) AudioSys.cifLocker(false); else AudioSys.shutter(false);   // CL-161
      cifEl.classList.remove('show');
      cifEl.classList.remove('armory-only');   // CL-103b
      paused = false;
      syncReticleVisibility();
    }`,
  `    function closeCIF() {
      if (!cifOpen) return;
      armoryPics.session++;
      cifOpen = false;
      dressPointers.clear(); dressPinch = null; dressPointerId = null; dressDrag = false;
      if (dressRAF) cancelAnimationFrame(dressRAF);
      dressRAF = 0;
      if (AudioSys.cifLocker) AudioSys.cifLocker(false); else AudioSys.shutter(false);   // CL-161
      cifEl.classList.remove('show');
      cifEl.classList.remove('armory-only');   // CL-103b
      if (armoryRackDirty) refreshArmoryRack(false);
      paused = false;
      syncReticleVisibility();
    }`
);

// 5. armoryPics, runArmoryPicJob, armoryPicture, armoryPreview, warmArmoryPics, finishSwatch, paintArmoryGun, armoryUI.onFit
replaceOnce(
  'armoryPics-v2',
  `    const armoryPics = { r: null, scene: null, cam: null, canvas: null, ready: null, cache: new Map(), drawn: 0, queue: Promise.resolve(), lastDrawAt: 0 };
    function armoryOpenNow() {
      const p = document.getElementById('armoryPanel');
      return !!(cifOpen && cifEl.classList.contains('armory-show') && p && !p.hidden);
    }
    function canvasToPngUrl(cv) {
      return new Promise((resolve) => {
        cv.toBlob((blob) => {
          if (!blob) { resolve(null); return; }
          const fr = new FileReader();
          fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(blob);
        }, 'image/png');
      });
    }
    function runArmoryPicJob(forceOpen, fn) {
      const step = armoryPics.queue.then(async () => {
        if (!forceOpen && !armoryOpenNow()) return null;
        if (!(await armoryPicsReady()) || !armoryPics.r) return null;
        if (!forceOpen && !armoryOpenNow()) return null;
        if (performance.now() - armoryPics.lastDrawAt < 14) {
          await new Promise((r) => requestAnimationFrame(() => r()));
          if (!forceOpen && !armoryOpenNow()) return null;
        }
        const out = await fn();
        armoryPics.lastDrawAt = performance.now();
        return out;
      }, () => null);
      armoryPics.queue = step.then(() => null, () => null);
      return step;
    }`,
  `    const armoryPics = { r: null, scene: null, cam: null, canvas: null, ready: null, cache: new Map(), drawn: 0, queue: Promise.resolve(), lastDrawAt: 0, session: 0, warmed: false };
    function armoryOpenNow() {
      const p = document.getElementById('armoryPanel');
      return !!(cifOpen && cifEl.classList.contains('armory-show') && p && !p.hidden);
    }
    function canvasToPngUrl(cv) {
      return new Promise((resolve) => {
        cv.toBlob((blob) => {
          if (!blob) { resolve(null); return; }
          const fr = new FileReader();
          fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(blob);
        }, 'image/png');
      });
    }
    function runArmoryPicJob(forceOpen, sess, fn) {
      const okOpen = () => forceOpen || (armoryPics.session === sess && armoryOpenNow());
      const step = armoryPics.queue.then(async () => {
        if (!okOpen()) return null;
        if (!forceOpen) {
          await new Promise((r) => requestAnimationFrame(() => r()));
          if (!okOpen()) return null;
        }
        if (!(await armoryPicsReady()) || !armoryPics.r) return null;
        if (!okOpen()) return null;
        if (!forceOpen && performance.now() - armoryPics.lastDrawAt < 18) {
          await new Promise((r) => requestAnimationFrame(() => r()));
          if (!okOpen()) return null;
        }
        const out = await fn(okOpen);
        armoryPics.lastDrawAt = performance.now();
        return out;
      }, () => null);
      armoryPics.queue = step.then(() => null, () => null);
      return step;
    }`
);

replaceOnce(
  'armoryPicture-and-preview-v2',
  `    async function armoryPicture(kind, forceOpen = false) {
      if (!weaponMeshes[kind]) return null;
      const key = gunLookKey(kind);
      if (armoryPics.cache.has(key)) return (!forceOpen && !armoryOpenNow()) ? null : armoryPics.cache.get(key);
      if (!forceOpen && !armoryOpenNow()) return null;
      return runArmoryPicJob(forceOpen, async () => {
        if (armoryPics.cache.has(key)) return (!forceOpen && !armoryOpenNow()) ? null : armoryPics.cache.get(key);
        let holder = null;
        try {
          const g = carryGunCopy(kind);
          if (!g) return null;
          holder = new THREE.Group(); holder.add(g); armoryPics.scene.add(holder);
          holder.rotation.y = 0.18;   // a touch of three-quarter, so the far side reads
          const b = shownBounds(holder);
          if (b) holder.position.sub(_apV.copy(b.lo).add(b.hi).multiplyScalar(0.5));
          const len = b ? Math.max(b.hi.z - b.lo.z, (b.hi.y - b.lo.y) * 2, 0.15) : 0.8;
          const cam = armoryPics.cam;
          const dist = (len * 0.58) / Math.tan((cam.fov * Math.PI / 180) / 2) / cam.aspect;
          cam.position.set(-dist, dist * 0.12, 0); cam.far = 30; cam.updateProjectionMatrix(); cam.lookAt(0, 0, 0);
          if (typeof armoryPics.r.compileAsync === 'function') {
            await armoryPics.r.compileAsync(armoryPics.scene, cam);
            if (!forceOpen && !armoryOpenNow()) return null;
          }
          armoryPics.r.render(armoryPics.scene, cam);
          const out = document.createElement('canvas'); out.width = 400; out.height = 200;
          out.getContext('2d').drawImage(armoryPics.canvas, 0, 0);
          armoryPics.scene.remove(holder); holder = null;
          const url = await canvasToPngUrl(out);
          if (!url) return null;
          armoryPics.cache.set(key, url); armoryPics.drawn++;
          return (!forceOpen && !armoryOpenNow()) ? null : url;
        } catch (e) { return null; }
        finally { if (holder) armoryPics.scene.remove(holder); }
      });
    }
    // GP-141: real model at the requested angle. Share the thumbnail renderer; no frame loop or angle cache.
    async function armoryPreview(kind, view = {}) {
      if (!weaponMeshes[kind] || !armoryOpenNow()) return null;
      return runArmoryPicJob(false, async () => {
        let holder = null;
        try {
          const gun = carryGunCopy(kind);
          if (!gun) return null;
          const bounds = new THREE.Box3(), part = new THREE.Box3(), matrix = new THREE.Matrix4();
          gun.updateMatrixWorld(true);
          gun.traverseVisible(o => {
            const points = o.isMesh && o.geometry?.attributes?.position;
            if (!points) return;
            const local = new THREE.Box3().setFromBufferAttribute(points);
            if (o.isInstancedMesh) {
              for (let i = 0; i < o.count; i++) {
                o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld);
                bounds.union(part.copy(local).applyMatrix4(matrix));
              }
            } else bounds.union(part.copy(local).applyMatrix4(o.matrixWorld));
          });
          if (bounds.isEmpty()) return null;
          const centre = bounds.getCenter(new THREE.Vector3());
          const radius = Math.max(.05, bounds.getSize(new THREE.Vector3()).length() / 2);
          gun.position.sub(centre);
          holder = new THREE.Group(); holder.add(gun);
          const yaw = Number.isFinite(view?.yaw) ? view.yaw : 0;
          const pitch = Number.isFinite(view?.pitch) ? Math.max(-Math.PI/3, Math.min(Math.PI/3, view.pitch)) : 0;
          holder.rotation.set(0, yaw % (Math.PI*2), pitch);
          armoryPics.scene.add(holder);
          const cam = armoryPics.cam, halfY = cam.fov * Math.PI / 360;
          const halfAngle = Math.min(halfY, Math.atan(Math.tan(halfY) * cam.aspect));
          const distance = radius * 1.08 / Math.sin(halfAngle) / Math.max(1, Math.min(2.5, Number.isFinite(view?.zoom) ? view.zoom : 1));
          cam.position.set(-distance, 0, 0); cam.lookAt(0, 0, 0);
          cam.far = Math.max(30, distance + radius * 2); cam.updateProjectionMatrix();
          if (typeof armoryPics.r.compileAsync === 'function') {
            await armoryPics.r.compileAsync(armoryPics.scene, cam);
            if (!armoryOpenNow()) return null;
          }
          armoryPics.r.render(armoryPics.scene, cam);
          const out = document.createElement('canvas'); out.width = 400; out.height = 200;
          out.getContext('2d').drawImage(armoryPics.canvas, 0, 0);
          armoryPics.scene.remove(holder); holder = null;
          const url = await canvasToPngUrl(out);
          return (!url || !armoryOpenNow()) ? null : url;
        } catch (_) { return null; }
        finally { if (holder) armoryPics.scene.remove(holder); } // Geometry/materials belong to gameplay.
      });
    }
    // CL-114: the finishes the Armory's workbench offers a gun: factory, every camo (the ones still to earn locked), and
    // the rune finish once it is his. Swatches are painted straight to canvases and kept (AG-310).
    const finishSwatches = new Map();
    function finishSwatch(key) {
      if (!key) return null;
      let master = finishSwatches.get(key);
      if (master === undefined) {
        try {
          const sw = document.createElement('canvas'); sw.width = 96; sw.height = 48;
          const c = sw.getContext('2d');
          if (key === RUNE_FINISH_KEY) { const img = runeFinishTex().image; if (img) c.drawImage(img, 0, 0, sw.width, sw.height); else master = null; }
          else { const tile = document.createElement('canvas'); tile.width = tile.height = 48; if (paintCamoTile(key, tile)) { c.drawImage(tile, 0, 0); c.drawImage(tile, 48, 0); } else master = null; }
          if (master === undefined) master = sw;
        } catch (_) { master = null; }
        finishSwatches.set(key, master);
      }
      if (!master) return null;
      const out = document.createElement('canvas'); out.width = 96; out.height = 48;
      out.getContext('2d').drawImage(master, 0, 0);
      return out;
    }
    function armoryFinishes(kind) {
      if (!GUNS.includes(kind)) return null;
      const list = [{ key: '', name: sayText('cif.menu.factory', {}, 'Factory finish'), locked: false, hint: '', swatch: null }];
      const keys = runeFinishUnlocked() ? [RUNE_FINISH_KEY, ...CAMO_KEYS] : CAMO_KEYS;
      for (const key of keys) {
        const locked = key === RUNE_FINISH_KEY ? !runeFinishUnlocked() : !camoUnlocks.isUnlocked(key);
        list.push({ key, name: sayText('cif.pattern.' + key, {}, key), locked, hint: locked ? (camoUnlockHint(key) || '') : '', swatch: finishSwatch(key) });
      }
      list.sort((a, b) => Number(a.locked) - Number(b.locked));
      return { current: wardrobeState.guns[kind] || '', list };
    }
    function paintArmoryGun(kind, key) {
      if (!GUNS.includes(kind)) return false;
      let next;
      if (!key) { next = JSON.parse(JSON.stringify(wardrobeState)); delete next.guns[kind]; }
      else {
        if (key === RUNE_FINISH_KEY ? !runeFinishUnlocked() : !camoUnlocks.isUnlocked(key)) return false;
        next = withGun(wardrobeState, kind, key, isGunFinishKey);
      }
      if (!commitWardrobe(next)) return false;
      refreshArmoryRack(false);
      publishUI('armory-finish', { gun: kind, finish: key || null });
      return true;
    }
    const withArmoryBuy = (fn) => { armoryBuying = true; try { return fn(); } finally { armoryBuying = false; } };
    const armoryUI = mountArmory({
      armory: runArmory,
      getFinishes: (kind) => armoryFinishes(kind),   // CL-114
      onFinish: (kind, key) => paintArmoryGun(kind, key),
      getLaser: (gunId) => armoryLaser(gunId),
      onLaser: (gunId, id) => setArmoryLaser(gunId, id),
      // CL-113: the real guns, their attachments, and fitting them.
      getMods: (kind) => armoryMods(kind),
      onFit: (kind, id, on) => { const okFit = fitArmoryMod(kind, id, on); if (okFit) { AudioSys.magThud && AudioSys.magThud(0.6, 0); refreshArmoryRack(false); } return okFit; },`,
  `    async function warmArmoryPics() {
      if (armoryPics.warmed || INSPECT || window.DWInspect || window.DWInspectHost) return;
      if (!(await armoryPicsReady()) || !armoryPics.r) return;
      armoryPics.warmed = true;
      let holder = null, dummyGeo = null, dummyMat = null;
      try {
        holder = new THREE.Group();
        const g = carryGunCopy('pistol');
        if (g) holder.add(g);
        dummyGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
        dummyMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d6, map: camoTile('m81'), roughness: 0.62, metalness: 0.05 });
        const dm = new THREE.Mesh(dummyGeo, dummyMat);
        dm.position.set(0, 0, 0);
        holder.add(dm);
        armoryPics.scene.add(holder);
        const cam = armoryPics.cam;
        cam.position.set(-1.2, 0.14, 0); cam.far = 30; cam.updateProjectionMatrix(); cam.lookAt(0, 0, 0);
        armoryPics.r.render(armoryPics.scene, cam);
        try { await armoryPics.r.backend?.device?.queue?.onSubmittedWorkDone?.(); } catch (_) {}
      } catch (_) {}
      finally {
        if (holder && armoryPics.scene) armoryPics.scene.remove(holder);
        if (dummyGeo) dummyGeo.dispose();
        if (dummyMat) dummyMat.dispose();
      }
      try { await armoryPicture('pistol', true); } catch (_) {}
    }
    async function armoryPicture(kind, forceOpen = false) {
      if (!weaponMeshes[kind]) return null;
      const key = gunLookKey(kind);
      const sess = armoryPics.session;
      const okNow = () => forceOpen || (armoryPics.session === sess && armoryOpenNow());
      if (armoryPics.cache.has(key)) return okNow() ? armoryPics.cache.get(key) : null;
      if (!okNow()) return null;
      return runArmoryPicJob(forceOpen, sess, async (okOpen) => {
        if (armoryPics.cache.has(key)) return okOpen() ? armoryPics.cache.get(key) : null;
        let holder = null;
        try {
          const g = carryGunCopy(kind);
          if (!g) return null;
          holder = new THREE.Group(); holder.add(g); armoryPics.scene.add(holder);
          holder.rotation.y = 0.18;   // a touch of three-quarter, so the far side reads
          const b = shownBounds(holder);
          if (b) holder.position.sub(_apV.copy(b.lo).add(b.hi).multiplyScalar(0.5));
          const len = b ? Math.max(b.hi.z - b.lo.z, (b.hi.y - b.lo.y) * 2, 0.15) : 0.8;
          const cam = armoryPics.cam;
          const dist = (len * 0.58) / Math.tan((cam.fov * Math.PI / 180) / 2) / cam.aspect;
          cam.position.set(-dist, dist * 0.12, 0); cam.far = 30; cam.updateProjectionMatrix(); cam.lookAt(0, 0, 0);
          armoryPics.r.render(armoryPics.scene, cam);
          const out = document.createElement('canvas'); out.width = 400; out.height = 200;
          out.getContext('2d').drawImage(armoryPics.canvas, 0, 0);
          armoryPics.scene.remove(holder); holder = null;
          const url = await canvasToPngUrl(out);
          if (!url) return null;
          armoryPics.cache.set(key, url); armoryPics.drawn++;
          return okOpen() ? url : null;
        } catch (e) { return null; }
        finally { if (holder) armoryPics.scene.remove(holder); }
      });
    }
    // GP-141: real model at the requested angle. Share the thumbnail renderer; no frame loop or angle cache.
    async function armoryPreview(kind, view = {}) {
      if (!weaponMeshes[kind] || !armoryOpenNow()) return null;
      const sess = armoryPics.session;
      return runArmoryPicJob(false, sess, async (okOpen) => {
        let holder = null;
        try {
          const gun = carryGunCopy(kind);
          if (!gun) return null;
          const bounds = new THREE.Box3(), part = new THREE.Box3(), matrix = new THREE.Matrix4();
          gun.updateMatrixWorld(true);
          gun.traverseVisible(o => {
            const points = o.isMesh && o.geometry?.attributes?.position;
            if (!points) return;
            const local = new THREE.Box3().setFromBufferAttribute(points);
            if (o.isInstancedMesh) {
              for (let i = 0; i < o.count; i++) {
                o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld);
                bounds.union(part.copy(local).applyMatrix4(matrix));
              }
            } else bounds.union(part.copy(local).applyMatrix4(o.matrixWorld));
          });
          if (bounds.isEmpty()) return null;
          const centre = bounds.getCenter(new THREE.Vector3());
          const radius = Math.max(.05, bounds.getSize(new THREE.Vector3()).length() / 2);
          gun.position.sub(centre);
          holder = new THREE.Group(); holder.add(gun);
          const yaw = Number.isFinite(view?.yaw) ? view.yaw : 0;
          const pitch = Number.isFinite(view?.pitch) ? Math.max(-Math.PI/3, Math.min(Math.PI/3, view.pitch)) : 0;
          holder.rotation.set(0, yaw % (Math.PI*2), pitch);
          armoryPics.scene.add(holder);
          const cam = armoryPics.cam, halfY = cam.fov * Math.PI / 360;
          const halfAngle = Math.min(halfY, Math.atan(Math.tan(halfY) * cam.aspect));
          const distance = radius * 1.08 / Math.sin(halfAngle) / Math.max(1, Math.min(2.5, Number.isFinite(view?.zoom) ? view.zoom : 1));
          cam.position.set(-distance, 0, 0); cam.lookAt(0, 0, 0);
          cam.far = Math.max(30, distance + radius * 2); cam.updateProjectionMatrix();
          armoryPics.r.render(armoryPics.scene, cam);
          const out = document.createElement('canvas'); out.width = 400; out.height = 200;
          out.getContext('2d').drawImage(armoryPics.canvas, 0, 0);
          armoryPics.scene.remove(holder); holder = null;
          const url = await canvasToPngUrl(out);
          return (!url || !okOpen()) ? null : url;
        } catch (_) { return null; }
        finally { if (holder) armoryPics.scene.remove(holder); } // Geometry/materials belong to gameplay.
      });
    }
    // CL-114: the finishes the Armory's workbench offers a gun: factory, every camo (the ones still to earn locked), and
    // the rune finish once it is his. Swatches are painted straight to canvases and kept (AG-310).
    const finishSwatches = new Map();
    function finishSwatch(key) {
      if (!key) return null;
      let master = finishSwatches.get(key);
      if (master === undefined) {
        try {
          const sw = document.createElement('canvas'); sw.width = 96; sw.height = 48;
          const c = sw.getContext('2d');
          if (key === RUNE_FINISH_KEY) { const img = runeFinishTex().image; if (img) c.drawImage(img, 0, 0, sw.width, sw.height); else master = null; }
          else { const tile = document.createElement('canvas'); tile.width = tile.height = 48; if (paintCamoTile(key, tile)) { c.drawImage(tile, 0, 0); c.drawImage(tile, 48, 0); } else master = null; }
          if (master === undefined) master = sw;
        } catch (_) { master = null; }
        finishSwatches.set(key, master);
      }
      if (!master) return null;
      if (!master.isConnected) return master;
      const out = document.createElement('canvas'); out.width = 96; out.height = 48;
      out.getContext('2d').drawImage(master, 0, 0);
      return out;
    }
    function armoryFinishes(kind) {
      if (!GUNS.includes(kind)) return null;
      const list = [{ key: '', name: sayText('cif.menu.factory', {}, 'Factory finish'), locked: false, hint: '', swatch: null }];
      const keys = runeFinishUnlocked() ? [RUNE_FINISH_KEY, ...CAMO_KEYS] : CAMO_KEYS;
      for (const key of keys) {
        const locked = key === RUNE_FINISH_KEY ? !runeFinishUnlocked() : !camoUnlocks.isUnlocked(key);
        list.push({ key, name: sayText('cif.pattern.' + key, {}, key), locked, hint: locked ? (camoUnlockHint(key) || '') : '', swatch: finishSwatch(key) });
      }
      list.sort((a, b) => Number(a.locked) - Number(b.locked));
      return { current: wardrobeState.guns[kind] || '', list };
    }
    function paintArmoryGun(kind, key) {
      if (!GUNS.includes(kind)) return false;
      let next;
      if (!key) { next = JSON.parse(JSON.stringify(wardrobeState)); delete next.guns[kind]; }
      else {
        if (key === RUNE_FINISH_KEY ? !runeFinishUnlocked() : !camoUnlocks.isUnlocked(key)) return false;
        next = withGun(wardrobeState, kind, key, isGunFinishKey);
      }
      if (!next) return false;
      wardrobeState = next;
      writeWardrobe();
      const mats = gunFurniture && gunFurniture[kind];
      if (mats) {
        const pick = (wardrobeState.guns && wardrobeState.guns[kind]) || '';
        const tex = pick && isGunFinishKey(pick) ? camoTile(pick) : null;
        const rune = tex && pick === RUNE_FINISH_KEY;
        for (const mat of mats) {
          const nextMap = tex || mat.userData.issueMap;
          const nextEmissiveMap = mat.emissive ? (rune ? runeFinish.glowTex : null) : mat.emissiveMap;
          const needRebuild = !!mat.map !== !!nextMap || !!mat.emissiveMap !== !!nextEmissiveMap;
          mat.map = nextMap;
          if (mat.emissive) {
            mat.emissiveMap = nextEmissiveMap;
            mat.emissive.setHex(rune ? 0xffffff : 0x000000);
            mat.emissiveIntensity = rune ? 0.55 * Math.max(0, runeFinish.level) : 1;
          }
          mat.color.setHex(tex ? 0xe6e2d6 : mat.userData.issueColor);
          mat.roughness = tex ? 0.62 : mat.userData.issueRoughness;
          mat.metalness = tex ? 0.05 : mat.userData.issueMetalness;
          if (needRebuild) mat.needsUpdate = true;
        }
      }
      AudioSys.kioskTab();
      queueOrRefreshArmoryRack(false);
      publishUI('armory-finish', { gun: kind, finish: key || null });
      return true;
    }
    const withArmoryBuy = (fn) => { armoryBuying = true; try { return fn(); } finally { armoryBuying = false; } };
    const armoryUI = mountArmory({
      armory: runArmory,
      getFinishes: (kind) => armoryFinishes(kind),   // CL-114
      onFinish: (kind, key) => paintArmoryGun(kind, key),
      getLaser: (gunId) => armoryLaser(gunId),
      onLaser: (gunId, id) => setArmoryLaser(gunId, id),
      // CL-113: the real guns, their attachments, and fitting them.
      getMods: (kind) => armoryMods(kind),
      onFit: (kind, id, on) => { const okFit = fitArmoryMod(kind, id, on); if (okFit) { AudioSys.magThud && AudioSys.magThud(0.6, 0); queueOrRefreshArmoryRack(false); } return okFit; },`
);

// 6. mirrorTrainingRack: restore clean synchronous swap (remove compileForLiveTarget main-thread stall)
replaceOnce(
  'mirrorTrainingRack-clean',
  `    let _trainingRackSeq = 0;
    function mirrorTrainingRack(sync = false) {
      const r = training.copies && training.copies.rack, src = house.armoryRack;
      if (!r || !src) return;
      const seq = ++_trainingRackSeq;
      const copies = src.children.map((c) => {
        const copy = cloneLean(c);   // CL-136
        copy.traverse((o) => { if (o.isMesh) o.raycast = rackNoRay; });
        return copy;
      });
      const swapIn = () => {
        if (seq !== _trainingRackSeq) return;
        for (const c of r.children.slice()) r.remove(c);
        for (const copy of copies) r.add(copy);
      };
      if (!sync && training.active && gameStarted && !training.wake && !INSPECT && typeof compileForLiveTarget === 'function' && renderer && typeof renderer.compileAsync === 'function') {
        const staged = new THREE.Group();
        r.updateWorldMatrix(true, false);
        staged.matrixAutoUpdate = false;
        staged.matrix.copy(r.matrixWorld);
        const culled = [];
        for (const copy of copies) {
          copy.traverse((o) => { if (o.isMesh) { culled.push([o, o.frustumCulled]); o.frustumCulled = false; } });
          staged.add(copy);
        }
        staged.updateMatrixWorld(true);
        Promise.resolve().then(() => compileForLiveTarget(staged)).catch(() => {}).finally(() => {
          for (const [o, fc] of culled) o.frustumCulled = fc;
          swapIn();
        });
        return;
      }
      swapIn();
    }`,
  `    function mirrorTrainingRack() {
      const r = training.copies && training.copies.rack, src = house.armoryRack;
      if (!r || !src) return;
      for (const c of r.children.slice()) r.remove(c);
      for (const c of src.children) {
        const copy = cloneLean(c);   // CL-136
        copy.traverse((o) => { if (o.isMesh) o.raycast = rackNoRay; });
        r.add(copy);
      }
    }`
);

// 7. trainingWarmCompile: warm painted gun MeshStandardMaterial variants on main + warmArmoryPics() behind blackout
replaceOnce(
  'trainingWarmCompile-painted-and-armoryPics',
  `            addSolidKeepers(tg.group);
            addSolidKeepers(training.perimeter?.group);
            tg.group.add(cutawayKeepers);`,
  `            addSolidKeepers(tg.group);
            addSolidKeepers(training.perimeter?.group);
            let paintWarmGeo = null, paintWarmMat = null;
            try {
              paintWarmGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
              paintWarmMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d6, map: camoTile('m81'), roughness: 0.62, metalness: 0.05 });
              for (const sh of [false, true]) {
                const pm = new THREE.Mesh(paintWarmGeo, paintWarmMat);
                pm.castShadow = sh; pm.receiveShadow = sh; pm.frustumCulled = false;
                cutawayKeepers.add(pm);
              }
              cutawayKeepers.userData._ag310WarmDispose = () => { paintWarmGeo?.dispose(); paintWarmMat?.dispose(); };
            } catch (_) {}
            tg.group.add(cutawayKeepers);`
);

replaceOnce(
  'trainingWarmCompile-painted-cleanup',
  `            if (cutawayKeepers.parent) cutawayKeepers.parent.remove(cutawayKeepers);
            while (cutawayKeepers.children.length) cutawayKeepers.remove(cutawayKeepers.children[cutawayKeepers.children.length - 1]);`,
  `            if (cutawayKeepers.parent) cutawayKeepers.parent.remove(cutawayKeepers);
            while (cutawayKeepers.children.length) cutawayKeepers.remove(cutawayKeepers.children[cutawayKeepers.children.length - 1]);
            try { cutawayKeepers.userData._ag310WarmDispose?.(); } catch (_) {}`
);

replaceOnce(
  'trainingWarmCompile-warmArmoryPics-call',
  `          warmFrame('training-clean');
          try { await renderer.backend?.device?.queue?.onSubmittedWorkDone?.(); } catch (_) {}
          finish();`,
  `          warmFrame('training-clean');
          try { await warmArmoryPics(); } catch (_) {}
          try { await renderer.backend?.device?.queue?.onSubmittedWorkDone?.(); } catch (_) {}
          finish();`
);

// Verify zero bare LF
let bareLf = 0;
for (let i = 0; i < src.length; i++) {
  if (src.charCodeAt(i) === 10 && (i === 0 || src.charCodeAt(i - 1) !== 13)) bareLf++;
}
assert.equal(bareLf, 0, `Expected 0 bare LF, got ${bareLf}`);

const tmp = FILE + '.tmp-' + process.pid;
fs.writeFileSync(tmp, src, 'utf8');
fs.renameSync(tmp, FILE);
console.log('PATCH_V2_OK lines=' + src.split('\r\n').length + ' bareLF=' + bareLf);
