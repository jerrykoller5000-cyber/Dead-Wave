// qa/2026-11-11-AG-310/patch-ag310.mjs
// Anchored CRLF-preserving patcher for AG-310 loaned Armory/CIF functions in index.html.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

// 1. applyArmoryLoadout: refreshArmoryRack(false) so closing unchanged Armory doesn't re-bake 11 guns
replaceOnce(
  'applyArmoryLoadout',
  `    function applyArmoryLoadout(_loadout) {
      armoryLive = true;
      // The locker holds a snapshot for display; magazineStore is the live ammo ledger.
      // Restoring the snapshot here erased purchases made at the open workbench.
      refreshArmoryRack(true);`,
  `    function applyArmoryLoadout(_loadout) {
      armoryLive = true;
      // The locker holds a snapshot for display; magazineStore is the live ammo ledger.
      // Restoring the snapshot here erased purchases made at the open workbench.
      refreshArmoryRack(false);`
);

// 2. fitArmoryMod pair branch: refreshArmoryRack(false)
replaceOnce(
  'fitArmoryMod-pair',
  `        applyArmoryLoadout(runArmory.loadout(), runArmory.read());
        syncOffhandVisibility();
        refreshArmoryRack(true);`,
  `        applyArmoryLoadout(runArmory.loadout(), runArmory.read());
        syncOffhandVisibility();
        refreshArmoryRack(false);`
);

// 3. rackGunCopy & refreshArmoryRack: per-gunLookKey flat template cache
replaceOnce(
  'rackGunCopy-cache',
  `    const _rkV = new THREE.Vector3(), _rkN = new THREE.Vector3(), _rkNM = new THREE.Matrix3(), _rkM = new THREE.Matrix4(), _rkI = new THREE.Matrix4();
    function rackGunCopy(kind) {
      const wrap = carryGunCopy(kind);
      if (!wrap) return null;`,
  `    const _rkV = new THREE.Vector3(), _rkN = new THREE.Vector3(), _rkNM = new THREE.Matrix3(), _rkM = new THREE.Matrix4(), _rkI = new THREE.Matrix4();
    const _rkCache = new Map();
    function clearRackGunCache() {
      for (const entry of _rkCache.values()) for (const p of entry.parts) p.geo.dispose();
      _rkCache.clear();
    }
    function rackGunCopy(kind) {
      const cacheKey = gunLookKey(kind) + '|' + (gunFurniture?.[kind]?.[0]?.map ? 'p' : '');
      const cached = _rkCache.get(cacheKey);
      if (cached) {
        const flat = new THREE.Group();
        for (const p of cached.parts) {
          const mesh = new THREE.Mesh(p.geo.clone(), p.mat);
          mesh.castShadow = false; mesh.receiveShadow = false; mesh.raycast = rackNoRay;
          flat.add(mesh);
        }
        flat.userData.length = cached.length;
        return flat;
      }
      const wrap = carryGunCopy(kind);
      if (!wrap) return null;`
);

replaceOnce(
  'rackGunCopy-store-and-refresh',
  `      flat.userData.length = wrap.userData.length;
      return flat;
    }
    function rackNoRay() {}
    function disposeRackCopy(g) { g.traverse((o) => { if (o.isMesh && o.geometry && o.geometry !== RACK_PEG_GEO) o.geometry.dispose(); }); }
    function refreshArmoryRack(force) {
      const rack = house.armoryRack;
      if (!rack) return;
      const kinds = armoryDisplayKinds();
      const key = kinds.map(gunLookKey).join(',');
      if (!force && key === armoryRackKey) return;
      armoryRackKey = key;`,
  `      flat.userData.length = wrap.userData.length;
      if (_rkCache.size >= 48) {
        const oldest = _rkCache.keys().next().value;
        const oldEntry = _rkCache.get(oldest);
        if (oldEntry) for (const p of oldEntry.parts) p.geo.dispose();
        _rkCache.delete(oldest);
      }
      _rkCache.set(cacheKey, { length: flat.userData.length, parts: flat.children.map((m) => ({ geo: m.geometry.clone(), mat: m.material })) });
      return flat;
    }
    function rackNoRay() {}
    function disposeRackCopy(g) { g.traverse((o) => { if (o.isMesh && o.geometry && o.geometry !== RACK_PEG_GEO) o.geometry.dispose(); }); }
    function refreshArmoryRack(force) {
      const rack = house.armoryRack;
      if (!rack) return;
      if (force) clearRackGunCache();
      const kinds = armoryDisplayKinds();
      const key = kinds.map(gunLookKey).join(',');
      if (!force && key === armoryRackKey) return;
      armoryRackKey = key;`
);

replaceOnce(
  'refreshArmoryRack-mirror',
  `      mirrorTrainingRack();   // CL-115
    }`,
  `      mirrorTrainingRack(!!force);   // CL-115
    }`
);

// 4. renderShop & buyWeapon: avoid double armoryUI.render() during armoryUI's own buy callbacks, and refreshArmoryRack(false)
replaceOnce(
  'renderShop-decl',
  `    function renderShop() {`,
  `    let armoryBuying = false;
    function renderShop() {`
);

replaceOnce(
  'renderShop-armoryInline',
  `      if (unifiedArmory && shopEl.classList.contains('armory-inline')) armoryUI.render();`,
  `      if (unifiedArmory && shopEl.classList.contains('armory-inline') && !armoryBuying) armoryUI.render();`
);

replaceOnce(
  'buyWeapon-rack',
  `      noteArmoryGun(w);
      armoryLive = true;
      refreshArmoryRack(true);`,
  `      noteArmoryGun(w);
      armoryLive = true;
      refreshArmoryRack(false);`
);

// 5. closeShop returnToArmory -> openCIF(true)
replaceOnce(
  'closeShop-returnToArmory',
  `      if (returnToArmory) { openCIF(); armoryUI.open(); cifEl.classList.add('armory-only'); }`,
  `      if (returnToArmory) { openCIF(true); armoryUI.open(); }`
);

// 6. dressFrame + openCIF(armoryOnly = false) (AG-310 fix #3: Armory-only openCIF never boots or renders hidden cifMarine)
replaceOnce(
  'openCIF-armoryOnly',
  `    function dressFrame(now) {
      if (!cifOpen) return;
      const t = (now || performance.now()) / 1000, dt = Math.min(0.1, Math.max(0, t - (dressLastT || t))); dressLastT = t;
      if (!dressDrag && dressRotate) dressYaw += 0.008;
      if (dressYawTo != null && !dressDrag && !dressRotate) {
        const dy = Math.atan2(Math.sin(dressYawTo - dressYaw), Math.cos(dressYawTo - dressYaw));
        dressYaw += dy * (1 - Math.exp(-dt * 6));
        if (Math.abs(dy) < 0.01) dressYawTo = null;
      }
      if (dressDrag) dressYawTo = null;
      poseDressPreview(t);
      frameDressCamera(dt);
      if (dressPreview) dressPreview.rotation.y = dressYaw;
      if (dressRenderer && dressScene && dressCam) dressRenderer.render(dressScene, dressCam);
      dressRAF = requestAnimationFrame(dressFrame);
    }
    function openCIF() {
      if(rangeFeature?.owns())rangeFeature.exit();
      if (fullMapOpen) setFullMap(false);
      if (!gameStarted || gameOver || won || cifOpen || shopOpen) return;
      if (nightLockdown()) { refuseLockdown(); return; }   // CU-82
      cifOpen = true;
      paused = true;
      if (AudioSys.cifLocker) AudioSys.cifLocker(true); else AudioSys.shutter(true);   // CL-161
      pauseEl.classList.remove('show');
      cifEl.classList.add('show');
      syncReticleVisibility();
      mouseFireHeld = false; zoomHeld = false;
      stopFiring();
      AudioSys.chainsawStop();
      cancelPlaceMode();
      for (const k of Object.keys(keys)) keys[k] = false;
      if (cifHintEl) cifHintEl.textContent = dressLabel('dress', training.active ? 'trainingHint' : 'hint', 'Each piece takes its own camo. Drag him to turn him.');
      previewFocus = dressItem;
      setDressRotation(false); frameDressOn(null); dressLastT = 0; dressZoomTo = dressView.zoom = 1; dressPointers.clear(); dressPinch = null; dressPointerId = null; dressDrag = false;   // CL-125 / GP-138: he opens still, the whole of him in view
      renderDressItems();
      renderDressChoices();
      ensureDressView();
      cifTabsEl.querySelector('button.on')?.focus({preventScroll:true});
      if (dressRAF) cancelAnimationFrame(dressRAF);
      dressFrame();
    }`,
  `    function dressFrame(now) {
      if (!cifOpen || cifEl.classList.contains('armory-only')) { dressRAF = 0; return; }
      const t = (now || performance.now()) / 1000, dt = Math.min(0.1, Math.max(0, t - (dressLastT || t))); dressLastT = t;
      if (!dressDrag && dressRotate) dressYaw += 0.008;
      if (dressYawTo != null && !dressDrag && !dressRotate) {
        const dy = Math.atan2(Math.sin(dressYawTo - dressYaw), Math.cos(dressYawTo - dressYaw));
        dressYaw += dy * (1 - Math.exp(-dt * 6));
        if (Math.abs(dy) < 0.01) dressYawTo = null;
      }
      if (dressDrag) dressYawTo = null;
      poseDressPreview(t);
      frameDressCamera(dt);
      if (dressPreview) dressPreview.rotation.y = dressYaw;
      if (dressRenderer && dressScene && dressCam) dressRenderer.render(dressScene, dressCam);
      dressRAF = requestAnimationFrame(dressFrame);
    }
    function openCIF(armoryOnly = false) {
      if(rangeFeature?.owns())rangeFeature.exit();
      if (fullMapOpen) setFullMap(false);
      if (!gameStarted || gameOver || won || cifOpen || shopOpen) return;
      if (nightLockdown()) { refuseLockdown(); return; }   // CU-82
      cifOpen = true;
      paused = true;
      if (AudioSys.cifLocker) AudioSys.cifLocker(true); else AudioSys.shutter(true);   // CL-161
      pauseEl.classList.remove('show');
      cifEl.classList.toggle('armory-only', !!armoryOnly);
      cifEl.classList.add('show');
      syncReticleVisibility();
      mouseFireHeld = false; zoomHeld = false;
      stopFiring();
      AudioSys.chainsawStop();
      cancelPlaceMode();
      for (const k of Object.keys(keys)) keys[k] = false;
      if (dressRAF) { cancelAnimationFrame(dressRAF); dressRAF = 0; }
      if (armoryOnly) return;   // AG-310: Armory-only openCIF never boots or renders hidden cifMarine
      if (cifHintEl) cifHintEl.textContent = dressLabel('dress', training.active ? 'trainingHint' : 'hint', 'Each piece takes its own camo. Drag him to turn him.');
      previewFocus = dressItem;
      setDressRotation(false); frameDressOn(null); dressLastT = 0; dressZoomTo = dressView.zoom = 1; dressPointers.clear(); dressPinch = null; dressPointerId = null; dressDrag = false;   // CL-125 / GP-138: he opens still, the whole of him in view
      renderDressItems();
      renderDressChoices();
      ensureDressView();
      cifTabsEl.querySelector('button.on')?.focus({preventScroll:true});
      dressFrame();
    }`
);

// 7. armoryPicture, armoryPreview, finishSwatch, paintArmoryGun, armoryUI (AG-310 fixes #1 and #2)
replaceOnce(
  'armoryPics-and-swatches',
  `    const armoryPics = { r: null, scene: null, cam: null, canvas: null, ready: null, cache: new Map(), drawn: 0 };
    function gunLookKey(kind) {
      const fin = (wardrobeState && wardrobeState.guns && wardrobeState.guns[kind]) || '';
      return kind + '|' + (suppressor[kind] ? 's' : '') + (extMag[kind] ? 'e' : '') + (heavyFitted[kind] ? 'h' : '') + '|' + fin;
    }
    function armoryPicsReady() {
      if (armoryPics.ready) return armoryPics.ready;
      armoryPics.ready = (async () => {
        try {
          const cv = document.createElement('canvas'); cv.width = 400; cv.height = 200;
          const r = new THREE.WebGPURenderer({ canvas: cv, antialias: true, alpha: true, forceWebGL: FORCE_WEBGL });
          if (r.init) await r.init();
          r.setSize(400, 200, false);
          if (r.setClearColor) r.setClearColor(0x000000, 0);
          const sc = new THREE.Scene();
          sc.add(new THREE.HemisphereLight(0xfff4e2, 0x2a3020, 1.35));
          const key = new THREE.DirectionalLight(0xfff6e8, 1.6); key.position.set(-2, 3, 2.5); sc.add(key);
          const rim = new THREE.DirectionalLight(0xbcd6ff, 0.7); rim.position.set(2, 1.5, -3); sc.add(rim);
          const cam = new THREE.PerspectiveCamera(20, 2, 0.05, 30);
          Object.assign(armoryPics, { r, scene: sc, cam, canvas: cv });
          return true;
        } catch (e) { armoryPics.r = null; return false; }
      })();
      return armoryPics.ready;
    }
    const _apLo = new THREE.Vector3(), _apHi = new THREE.Vector3(), _apV = new THREE.Vector3(), _apM = new THREE.Matrix4();
    function shownBounds(root) {
      _apLo.set(Infinity, Infinity, Infinity); _apHi.set(-Infinity, -Infinity, -Infinity);
      root.updateMatrixWorld(true);
      const walk = (o) => {
        if (!o.visible) return;
        if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          const P = o.geometry.attributes.position;
          for (let i = 0; i < P.count; i += 2) { _apV.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(o.matrixWorld); _apLo.min(_apV); _apHi.max(_apV); }
        }
        for (const c of o.children) walk(c);
      };
      walk(root);
      return Number.isFinite(_apLo.x) ? { lo: _apLo.clone(), hi: _apHi.clone() } : null;
    }
    async function armoryPicture(kind) {
      if (!weaponMeshes[kind]) return null;
      const key = gunLookKey(kind);
      if (armoryPics.cache.has(key)) return armoryPics.cache.get(key);
      if (!(await armoryPicsReady()) || !armoryPics.r) return null;
      try {
        const g = carryGunCopy(kind);
        if (!g) return null;
        const holder = new THREE.Group(); holder.add(g); armoryPics.scene.add(holder);
        holder.rotation.y = 0.18;   // a touch of three-quarter, so the far side reads
        const b = shownBounds(holder);
        if (b) holder.position.sub(_apV.copy(b.lo).add(b.hi).multiplyScalar(0.5));
        const len = b ? Math.max(b.hi.z - b.lo.z, (b.hi.y - b.lo.y) * 2, 0.15) : 0.8;
        const cam = armoryPics.cam;
        const dist = (len * 0.58) / Math.tan((cam.fov * Math.PI / 180) / 2) / cam.aspect;
        cam.position.set(-dist, dist * 0.12, 0); cam.lookAt(0, 0, 0);
        armoryPics.r.render(armoryPics.scene, cam);
        const out = document.createElement('canvas'); out.width = 400; out.height = 200;
        out.getContext('2d').drawImage(armoryPics.canvas, 0, 0);
        armoryPics.scene.remove(holder);
        const url = out.toDataURL('image/png');
        armoryPics.cache.set(key, url); armoryPics.drawn++;
        return url;
      } catch (e) { return null; }
    }
    // GP-141: real model at the requested angle. Share the thumbnail renderer; no frame loop or angle cache.
    async function armoryPreview(kind, view = {}) {
      if (!weaponMeshes[kind] || !(await armoryPicsReady()) || !armoryPics.r) return null;
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
        return out.toDataURL('image/png');
      } catch (_) { return null; }
      finally { if (holder) armoryPics.scene.remove(holder); } // Geometry/materials belong to gameplay.
    }
    // CL-114: the finishes the Armory's workbench offers a gun: factory, every camo (the ones still to earn locked), and
    // the rune finish once it is his. Swatches are painted once and kept.
    const finishSwatches = new Map();
    function finishSwatch(key) {
      if (!key) return null;
      if (finishSwatches.has(key)) return finishSwatches.get(key);
      let url = null;
      try {
        const sw = document.createElement('canvas'); sw.width = 96; sw.height = 48;
        const c = sw.getContext('2d');
        if (key === RUNE_FINISH_KEY) { const img = runeFinishTex().image; if (img) c.drawImage(img, 0, 0, sw.width, sw.height); }
        else { const tile = document.createElement('canvas'); tile.width = tile.height = 48; if (paintCamoTile(key, tile)) { c.drawImage(tile, 0, 0); c.drawImage(tile, 48, 0); } }
        url = sw.toDataURL('image/png');
      } catch (_) { url = null; }
      finishSwatches.set(key, url);
      return url;
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
      refreshArmoryRack(true);
      publishUI('armory-finish', { gun: kind, finish: key || null });
      return true;
    }
    const armoryUI = mountArmory({
      armory: runArmory,
      getFinishes: (kind) => armoryFinishes(kind),   // CL-114
      onFinish: (kind, key) => paintArmoryGun(kind, key),
      getLaser: (gunId) => armoryLaser(gunId),
      onLaser: (gunId, id) => setArmoryLaser(gunId, id),
      // CL-113: the real guns, their attachments, and fitting them.
      getMods: (kind) => armoryMods(kind),
      onFit: (kind, id, on) => { const okFit = fitArmoryMod(kind, id, on); if (okFit) { AudioSys.magThud && AudioSys.magThud(0.6, 0); refreshArmoryRack(true); } return okFit; },
      onBuyMod: (kind, id) => {
        if (phase !== 'prep' || nightLockdown() || !weaponOwned[kind]) return false;
        const mod = armoryMods(kind).find(m => m.id === id);
        if (!mod || mod.owned || bank < mod.price) return false;
        if (id === 'ext') buyExtMag(kind);
        else if (id === 'heavy') buyHeavyBarrel(kind);
        else if (id === 'suppressor') buySuppressor(kind);
        else if (id.startsWith('load:') && kind === 'shotgun') buyShotgunLoad(id.slice(5));   // CB-248
        else if (id.startsWith('optic:')) buyOptic(kind, id.slice(6));
        else if (id === 'laserLight') buyGear(GEAR.find(gr => gr.key === 'laserLight'));
        else if (id === 'auto') buyPistolAuto();
        else if (id === 'pair') buyDualWield(kind);
        else if (id === 'tank') buySawTank();
        return !!armoryMods(kind).find(m => m.id === id)?.owned;
      },
      getAmmoTypes: (kind) => ammoTypeState(kind),   // CB-294 (GP-20083): the types, counts and the change as it runs
      onBuyAmmoType: (kind, type) => { if (phase !== 'prep' || nightLockdown()) return false; return buyAmmoType(kind, type); },
      getAmmoOffer: (kind) => {
        if (!weaponOwned[kind]) return null;
        const quote = ammoRestockPlan(kind);
        return { price: quote.cost, full: !quote.cost, affordable: bank >= quote.cost,
          shortfall: Math.max(0, quote.cost - bank) };
      },
      onBuyAmmo: (kind) => {
        if (phase !== 'prep' || nightLockdown()) return false;
        if (kind === 'm240' || kind === 'mortar') return buyAmmo(kind === 'm240' ? '7.62 belt' : '60mm');
        return buyWeaponAmmo(kind).bought > 0;
      },
      getCash: () => bank,
      getGunOffers: () => WEAPON_ORDER.filter(w => !weaponOwned[w])
        .sort((a, b) => Number(training.active || equipmentStocked(b, day)) - Number(training.active || equipmentStocked(a, day)) || weaponPrice(a) - weaponPrice(b))
        .map(w => {
        const price = weaponPrice(w), available = training.active || equipmentStocked(w, day);
        return { kind: w, name: WEAPON_STATS[w].name, price, available, affordable: bank >= price,
          shortfall: Math.max(0, price - bank),
          night: GUN_STOCK_NIGHT[w] };
      }),
      onBuyGun: (kind) => {
        if (phase !== 'prep' || nightLockdown()) return false;
        buyWeapon(kind);
        return !!weaponOwned[kind];
      },
      getBuildOffers: () => ['m240', 'mortar'].map(kind => {
        const owned = !!buildUnlocked[kind], price = BUILD_UNLOCK_PRICE[kind];
        const calibre = kind === 'm240' ? '7.62 belt' : '60mm';
        return { kind, name: BUILD_NAMES[kind], icon: WHEEL_ICONS[kind], owned, price, affordable: bank >= price,
          shortfall: Math.max(0, price - bank),
          ammo: { price: AMMO_PACK[calibre].cost, full: (reserveAmmo[calibre] | 0) >= reserveCap(calibre),
            affordable: bank >= AMMO_PACK[calibre].cost, shortfall: Math.max(0, AMMO_PACK[calibre].cost - bank) } };
      }),
      onBuyBuild: (kind) => {
        if (phase !== 'prep' || nightLockdown() || !['m240', 'mortar'].includes(kind)) return false;
        buyBuild(kind);
        return !!buildUnlocked[kind];
      },`,
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
    }
    function gunLookKey(kind) {
      const fin = (wardrobeState && wardrobeState.guns && wardrobeState.guns[kind]) || '';
      return kind + '|' + (suppressor[kind] ? 's' : '') + (extMag[kind] ? 'e' : '') + (heavyFitted[kind] ? 'h' : '') + (laserLightFitted[kind] ? 'l' : '') + '|' + (opticFitted[kind] || '') + '|' + fin;
    }
    function armoryPicsReady() {
      if (armoryPics.ready) return armoryPics.ready;
      armoryPics.ready = (async () => {
        try {
          const cv = document.createElement('canvas'); cv.width = 400; cv.height = 200;
          const r = new THREE.WebGPURenderer({ canvas: cv, antialias: true, alpha: true, forceWebGL: FORCE_WEBGL });
          if (r.init) await r.init();
          r.setSize(400, 200, false);
          if (r.setClearColor) r.setClearColor(0x000000, 0);
          const sc = new THREE.Scene();
          sc.add(new THREE.HemisphereLight(0xfff4e2, 0x2a3020, 1.35));
          const key = new THREE.DirectionalLight(0xfff6e8, 1.6); key.position.set(-2, 3, 2.5); sc.add(key);
          const rim = new THREE.DirectionalLight(0xbcd6ff, 0.7); rim.position.set(2, 1.5, -3); sc.add(rim);
          const cam = new THREE.PerspectiveCamera(20, 2, 0.05, 30);
          Object.assign(armoryPics, { r, scene: sc, cam, canvas: cv });
          return true;
        } catch (e) { armoryPics.r = null; return false; }
      })();
      return armoryPics.ready;
    }
    const _apLo = new THREE.Vector3(), _apHi = new THREE.Vector3(), _apV = new THREE.Vector3(), _apM = new THREE.Matrix4();
    function shownBounds(root) {
      _apLo.set(Infinity, Infinity, Infinity); _apHi.set(-Infinity, -Infinity, -Infinity);
      root.updateMatrixWorld(true);
      const walk = (o) => {
        if (!o.visible) return;
        if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          const P = o.geometry.attributes.position;
          for (let i = 0; i < P.count; i += 2) { _apV.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(o.matrixWorld); _apLo.min(_apV); _apHi.max(_apV); }
        }
        for (const c of o.children) walk(c);
      };
      walk(root);
      return Number.isFinite(_apLo.x) ? { lo: _apLo.clone(), hi: _apHi.clone() } : null;
    }
    async function armoryPicture(kind, forceOpen = false) {
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
      onFit: (kind, id, on) => { const okFit = fitArmoryMod(kind, id, on); if (okFit) { AudioSys.magThud && AudioSys.magThud(0.6, 0); refreshArmoryRack(false); } return okFit; },
      onBuyMod: (kind, id) => withArmoryBuy(() => {
        if (phase !== 'prep' || nightLockdown() || !weaponOwned[kind]) return false;
        const mod = armoryMods(kind).find(m => m.id === id);
        if (!mod || mod.owned || bank < mod.price) return false;
        if (id === 'ext') buyExtMag(kind);
        else if (id === 'heavy') buyHeavyBarrel(kind);
        else if (id === 'suppressor') buySuppressor(kind);
        else if (id.startsWith('load:') && kind === 'shotgun') buyShotgunLoad(id.slice(5));   // CB-248
        else if (id.startsWith('optic:')) buyOptic(kind, id.slice(6));
        else if (id === 'laserLight') buyGear(GEAR.find(gr => gr.key === 'laserLight'));
        else if (id === 'auto') buyPistolAuto();
        else if (id === 'pair') buyDualWield(kind);
        else if (id === 'tank') buySawTank();
        return !!armoryMods(kind).find(m => m.id === id)?.owned;
      }),
      getAmmoTypes: (kind) => ammoTypeState(kind),   // CB-294 (GP-20083): the types, counts and the change as it runs
      onBuyAmmoType: (kind, type) => withArmoryBuy(() => { if (phase !== 'prep' || nightLockdown()) return false; return buyAmmoType(kind, type); }),
      getAmmoOffer: (kind) => {
        if (!weaponOwned[kind]) return null;
        const quote = ammoRestockPlan(kind);
        return { price: quote.cost, full: !quote.cost, affordable: bank >= quote.cost,
          shortfall: Math.max(0, quote.cost - bank) };
      },
      onBuyAmmo: (kind) => withArmoryBuy(() => {
        if (phase !== 'prep' || nightLockdown()) return false;
        if (kind === 'm240' || kind === 'mortar') return buyAmmo(kind === 'm240' ? '7.62 belt' : '60mm');
        return buyWeaponAmmo(kind).bought > 0;
      }),
      getCash: () => bank,
      getGunOffers: () => WEAPON_ORDER.filter(w => !weaponOwned[w])
        .sort((a, b) => Number(training.active || equipmentStocked(b, day)) - Number(training.active || equipmentStocked(a, day)) || weaponPrice(a) - weaponPrice(b))
        .map(w => {
        const price = weaponPrice(w), available = training.active || equipmentStocked(w, day);
        return { kind: w, name: WEAPON_STATS[w].name, price, available, affordable: bank >= price,
          shortfall: Math.max(0, price - bank),
          night: GUN_STOCK_NIGHT[w] };
      }),
      onBuyGun: (kind) => withArmoryBuy(() => {
        if (phase !== 'prep' || nightLockdown()) return false;
        buyWeapon(kind);
        return !!weaponOwned[kind];
      }),
      getBuildOffers: () => ['m240', 'mortar'].map(kind => {
        const owned = !!buildUnlocked[kind], price = BUILD_UNLOCK_PRICE[kind];
        const calibre = kind === 'm240' ? '7.62 belt' : '60mm';
        return { kind, name: BUILD_NAMES[kind], icon: WHEEL_ICONS[kind], owned, price, affordable: bank >= price,
          shortfall: Math.max(0, price - bank),
          ammo: { price: AMMO_PACK[calibre].cost, full: (reserveAmmo[calibre] | 0) >= reserveCap(calibre),
            affordable: bank >= AMMO_PACK[calibre].cost, shortfall: Math.max(0, AMMO_PACK[calibre].cost - bank) } };
      }),
      onBuyBuild: (kind) => withArmoryBuy(() => {
        if (phase !== 'prep' || nightLockdown() || !['m240', 'mortar'].includes(kind)) return false;
        buyBuild(kind);
        return !!buildUnlocked[kind];
      }),`
);

// 8. Armory-only openCIF(true) call sites (34606, 65592, 68206) + T.armoryDbg.picture(k, true)
replaceOnce(
  'hq-armory-action',
  `      else if (a === 'cif') openCIF();
      else if (a === 'armory') { openCIF(); if (cifOpen) { cifEl.classList.add('armory-only'); if (armoryUI && armoryUI.open) armoryUI.open(); if (AudioSys.armoryBench) AudioSys.armoryBench(); } }   // CL-103b: the Armory alone`,
  `      else if (a === 'cif') openCIF();
      else if (a === 'armory') { openCIF(true); if (cifOpen) { if (armoryUI && armoryUI.open) armoryUI.open(); if (AudioSys.armoryBench) AudioSys.armoryBench(); } }   // CL-103b: the Armory alone`
);

replaceOnce(
  'training-armory-action',
  `      else if (a === 'cif') openCIF();
      else if (a === 'armory') { openCIF(); if (cifOpen) { cifEl.classList.add('armory-only'); if (armoryUI && armoryUI.open) armoryUI.open(); if (AudioSys.armoryBench) AudioSys.armoryBench(); } }`,
  `      else if (a === 'cif') openCIF();
      else if (a === 'armory') { openCIF(true); if (cifOpen) { if (armoryUI && armoryUI.open) armoryUI.open(); if (AudioSys.armoryBench) AudioSys.armoryBench(); } }`
);

replaceOnce(
  'openMenuDbg-armory',
  `            else if (name === 'cif') openCIF();
            else if (name === 'armory') { openCIF(); if (cifOpen) { cifEl.classList.add('armory-only'); if (armoryUI && armoryUI.open) armoryUI.open(); } }`,
  `            else if (name === 'cif') openCIF();
            else if (name === 'armory') { openCIF(true); if (cifOpen) { if (armoryUI && armoryUI.open) armoryUI.open(); } }`
);

replaceOnce(
  'armoryDbg-picture',
  `picture: (k) => armoryPicture(k), pics:`,
  `picture: (k) => armoryPicture(k, true), pics:`
);

// 9. mirrorTrainingRack: async pipeline pre-compile on live Training updates so newly painted/modded rack copies never stall main renderFrame()
replaceOnce(
  'mirrorTrainingRack',
  `    function mirrorTrainingRack() {
      const r = training.copies && training.copies.rack, src = house.armoryRack;
      if (!r || !src) return;
      for (const c of r.children.slice()) r.remove(c);
      for (const c of src.children) {
        const copy = cloneLean(c);   // CL-136
        copy.traverse((o) => { if (o.isMesh) o.raycast = rackNoRay; });
        r.add(copy);
      }
    }`,
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
    }`
);

// Verify zero bare LF
const bareLf = src.replace(/\r\n/g, '').indexOf('\n');
assert.equal(bareLf, -1, 'Bare LF detected in patched index.html');

const tmp = `${FILE}.tmp-${process.pid}`;
fs.writeFileSync(tmp, src, 'utf8');
fs.renameSync(tmp, FILE);
console.log('Patched index.html cleanly (CRLF verified, 0 bare LF).');
