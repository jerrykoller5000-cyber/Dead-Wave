// studio/inspector/marine.js — the marine's kit and moves, done the game's way (CL-196). Claude's (studio/*).
//
// Nothing here poses him. A move is the input the player would give (a key pressed or held, the mouse button, the
// right mouse button), sent to the game's own handlers, or the game's own debug hook where there is no key for it.
// So a reload is the game's reload, V's slow time is the game's, at whatever speed the clock runs.
//
// Kit: weapon(key | 'none'), akimbo(key | null), blade('knife' | 'machete' | 'katana'), mods() / fit(id, on),
//      gear(id, on) (helmet, vest, pads, nvg, laser, flashlight), wardrobe: camo(key), item(id, patch), body(patch),
//      finish(key), preset(name), state()
// Moves: MOVES (the list), play(id, { loop }), stop(), current(); the holds that pin a phase: hold(kind, u)
//
// The marine is in the Training Ground, so nothing he wears or buys here is saved (writeWardrobe and setCamo keep
// their hands off the save in there), and the Training Ground's cash covers every purchase.

const DEG = Math.PI / 180;
const MAG_GUNS = ['m4', 'ak', 'aa12', 'pistol', 'uzi', 'revolver', 'sniper', 'shotgun', 'launcher', 'minigun', 'flamer'];
const GUN_NAME = { minigun: 'Minigun', m4: 'M4', ak: 'AK', pistol: 'Pistol', uzi: 'Uzi', shotgun: 'Shotgun', aa12: 'AA-12', revolver: 'Revolver', sniper: 'Sniper', launcher: 'Launcher', flamer: 'Flamer', chainsaw: 'Chainsaw' };
export { GUN_NAME };

// The moves. setup: once, when chosen. run: the move itself (again every `every` game seconds while it loops).
// keys: held the whole time it is on (walking, running, crouching), on the treadmill: he stays on the stage.
// stop: undo it when another move is chosen (the desk also lets go of every key and button).
export const MOVES = [
  // Poses & holds
  { id: 'stand', cat: 'Poses & holds', name: 'Standing, unarmed', setup: (d) => d.weapon('none') },
  { id: 'stand-armed', cat: 'Poses & holds', name: 'Standing, the gun ready', setup: (d) => d.weapon(d.gunOr('m4')) },
  { id: 'aim', cat: 'Poses & holds', name: 'Shoulder aim (right mouse)', setup: (d) => d.weapon(d.gunOr('m4')), run: (d) => d.aim(true), stop: (d) => d.aim(false) },
  { id: 'akimbo-pistol', cat: 'Poses & holds', name: 'Akimbo pistols', setup: (d) => d.akimbo('pistol'), stop: (d) => d.akimbo(null) },
  { id: 'akimbo-uzi', cat: 'Poses & holds', name: 'Akimbo Uzis', setup: (d) => d.akimbo('uzi'), stop: (d) => d.akimbo(null) },
  { id: 'akimbo-revolver', cat: 'Poses & holds', name: 'Akimbo revolvers', setup: (d) => d.akimbo('revolver'), stop: (d) => d.akimbo(null) },
  { id: 'smoke', cat: 'Poses & holds', name: 'Bored: the cigarette (idle)', setup: (d) => d.weapon('none'), run: (d) => d.smoke() },
  // Locomotion
  { id: 'walk', cat: 'Locomotion', name: 'Walk forward', keys: ['KeyW'] },
  { id: 'walk-back', cat: 'Locomotion', name: 'Walk backward', keys: ['KeyS'] },
  { id: 'strafe-left', cat: 'Locomotion', name: 'Strafe left', keys: ['KeyA'] },
  { id: 'strafe-right', cat: 'Locomotion', name: 'Strafe right', keys: ['KeyD'] },
  { id: 'run', cat: 'Locomotion', name: 'Run (sprint)', keys: ['ShiftLeft', 'KeyW'] },
  { id: 'crouch', cat: 'Locomotion', name: 'Crouch', keys: ['KeyC'] },
  { id: 'crouch-walk', cat: 'Locomotion', name: 'Crouch walk', keys: ['KeyC', 'KeyW'] },
  { id: 'turn-left', cat: 'Locomotion', name: 'Turn in place, left', run: (d) => d.turn(90), every: 2.2 },
  { id: 'turn-right', cat: 'Locomotion', name: 'Turn in place, right', run: (d) => d.turn(-90), every: 2.2 },
  { id: 'jump', cat: 'Locomotion', name: 'Jump, standing', run: (d) => d.jump(), every: 1.7 },
  { id: 'jump-run', cat: 'Locomotion', name: 'Jump, running', keys: ['ShiftLeft', 'KeyW'], run: (d) => d.jump(), every: 1.9, after: 0.6 },
  // Reloads: every gun with one
  ...MAG_GUNS.map((k) => ({ id: 'reload-' + k, cat: 'Reloads', name: 'Reload: ' + GUN_NAME[k], setup: (d) => d.weapon(k), run: (d) => d.reload(), every: 3.4, after: 0.5 })),
  { id: 'saw-start', cat: 'Reloads', name: 'Chainsaw: the pull start', run: async (d) => { d.weapon('none'); await d.wait(0.6); d.weapon('chainsaw'); }, every: 3.6 },
  // Combat
  { id: 'fire', cat: 'Combat', name: 'Fire a burst (this gun)', setup: (d) => d.weapon(d.gunOr('m4')), run: (d) => d.fire(0.45), every: 1.6, after: 0.4 },
  { id: 'fire-aimed', cat: 'Combat', name: 'Fire, shouldered', setup: (d) => d.weapon(d.gunOr('m4')), run: async (d) => { d.aim(true); await d.wait(0.35); await d.fire(0.45); }, stop: (d) => d.aim(false), every: 1.8 },
  { id: 'knife', cat: 'Combat', name: 'Knife', setup: (d) => d.blade('knife'), run: (d) => d.melee(), every: 1.3 },
  { id: 'machete', cat: 'Combat', name: 'Machete', setup: (d) => d.blade('machete'), run: (d) => d.melee(), every: 1.4 },
  { id: 'katana', cat: 'Combat', name: 'Katana', setup: (d) => d.blade('katana'), run: (d) => d.melee(), every: 1.4 },
  { id: 'grenade', cat: 'Combat', name: 'Throw a grenade', run: (d) => d.grenade(0.4), every: 2.6, after: 0.3 },
  // CL-252: D-87 took the dive out (CL-248); V slows time with him on his feet, so the four dive moves are this one.
  { id: 'slow-time', cat: 'Combat', name: 'Slow time (V)', setup: (d) => d.weapon(d.gunOr('m4')), run: (d) => d.slowTime(), every: 4.2, after: 0.4 },
  { id: 'vault', cat: 'Combat', name: 'Vault a sandbag wall', run: (d) => d.vault(), stop: (d) => d.clearProps(), every: 3, after: 0.3 },
  { id: 'draw', cat: 'Combat', name: 'Draw and holster', setup: (d) => d.weapon(d.gunOr('m4')), run: (d) => d.press('Digit4'), every: 1.8 },
  { id: 'medpen', cat: 'Combat', name: 'Med pen', run: (d) => d.medpen(), every: 3.2 },
  // Crew-served
  { id: 'm240', cat: 'Crew-served', name: 'Man the M240', run: (d) => d.mount('m240'), stop: (d) => d.clearProps() },
  { id: 'm240-carry', cat: 'Crew-served', name: 'Carry the M240', run: (d) => d.carry('m240'), stop: (d) => d.clearProps() },
  { id: 'mortar', cat: 'Crew-served', name: 'Man the mortar', run: (d) => d.mount('mortar'), stop: (d) => d.clearProps() },
  { id: 'mortar-carry', cat: 'Crew-served', name: 'Carry the mortar', run: (d) => d.carry('mortar'), stop: (d) => d.clearProps() },
  { id: 'knockout', cat: 'Crew-served', name: 'Knocked out, up from the bed (the room shows)', run: (d) => d.knockout(), stop: (d) => d.endKnockout() }
];
export const MOVE_CATS = [...new Set(MOVES.map((m) => m.cat))];

// Kit presets (AG-75 had CIF presets): one click for a whole look.
export const PRESETS = {
  issue:  { name: 'Issue (as he starts)', gear: { helmet: false, vest: false, pads: false, nvg: false, laser: false, flashlight: false }, items: { cap: { style: 'cover' }, eyewear: { style: 'none' }, shirt: { sleeves: 'down' }, trousers: { cut: 'trousers' }, gloves: { worn: true }, boots: { colour: 'black' } }, camo: 'm81' },
  full:   { name: 'Full kit', gear: { helmet: true, vest: true, pads: true, nvg: true, laser: true, flashlight: true }, items: { gloves: { worn: true }, shirt: { sleeves: 'down' }, trousers: { cut: 'trousers' } } },
  hot:    { name: 'Hot weather', gear: { helmet: false, vest: false, pads: false, nvg: false }, items: { cap: { style: 'boonie' }, eyewear: { style: 'aviators' }, shirt: { sleeves: 'rolled' }, trousers: { cut: 'shorts' }, gloves: { worn: false }, boots: { colour: 'tan' } }, camo: 'coyoteBrown' },
  night:  { name: 'Night ops', gear: { helmet: true, vest: true, pads: true, nvg: true, laser: true }, items: { gloves: { worn: true }, eyewear: { style: 'none' } }, camo: 'blackout' }
};

export function createMarineDesk(ix) {
  const T = ix.T, host = ix.host;
  const st = { move: null, loop: true, next: 0, running: false, keys: new Set(), treadmill: false, props: [], token: 0, ko: null, abort: new AbortController(), holds: {}, error: null };

  // --- input, the player's way ----------------------------------------------------------------------------------
  function key(type, code) {
    const e = new KeyboardEvent(type, { code, key: code.replace(/^Key|^Digit/, '').toLowerCase(), bubbles: true, cancelable: true });
    e.__dwi = true;   // the inspector's own: its key filter lets it through to the game
    document.body.dispatchEvent(e);   // from the page, like a real key (some of the game's listeners ask where it came from)
  }
  function holdKey(code, on) {
    if (on) { if (st.keys.has(code)) return; st.keys.add(code); }
    else { if (!st.keys.has(code)) return; st.keys.delete(code); }
    if (code in host.keys) host.keys[code] = !!on; else key(on ? 'keydown' : 'keyup', code);
  }
  function press(code) { key('keydown', code); key('keyup', code); }
  function releaseAll() { for (const c of [...st.keys]) holdKey(c, false); if (T.setMouseFireDbg) T.setMouseFireDbg(false); }
  // Each move owns its pending waits. Switching moves cancels them before any later input can run.
  const wait = (sec) => ix.waitGame(sec, st.abort.signal);

  // --- kit ------------------------------------------------------------------------------------------------------
  const order = () => T.WEAPON_ORDER || host.data.WEAPON_ORDER || [];
  const current = () => (T.getCurrentWeapon ? T.getCurrentWeapon() : host.state().weapon);
  const unarmed = () => (T.isUnarmed ? T.isUnarmed() : host.state().unarmed);
  function weapon(k) {
    if (k == null) return unarmed() ? 'none' : current();
    if (k === 'none') { if (!unarmed() && T.toggleHolster) T.toggleHolster(); return 'none'; }
    const i = order().indexOf(k);
    if (i < 0) throw new Error('no gun "' + k + '" (' + order().join(', ') + ')');
    if (unarmed() && T.toggleHolster) T.toggleHolster();
    if (current() !== k) T.setWeapon(i);
    return current();
  }
  const gunOr = (dflt) => (unarmed() ? dflt : current());
  function akimbo(k) {
    const s = host.state();
    if (!k) { if (s.akimbo) press('KeyY'); return false; }
    weapon(k);
    if (T.setDualOwnedDbg) T.setDualOwnedDbg(k, true);
    if (!host.state().akimbo) press('KeyY');
    return host.state().akimbo;
  }
  function blade(kind) {
    if (T.setKatanaOwned) T.setKatanaOwned(kind === 'katana');
    if (T.setMacheteOwned) T.setMacheteOwned(kind === 'machete');
    return kind;
  }
  // The armory's mods for this gun (ext / heavy / suppressor / auto / tank), bought if need be (the Training Ground's
  // cash), fitted by the armory's own fitArmoryMod.
  function mods(w = current()) { return T.armoryDbg ? T.armoryDbg.mods(w) : []; }
  const BUY = { ext: 'buyExtMag', heavy: 'buyHeavyBarrel', suppressor: 'buySuppressor', auto: 'buyPistolAuto', tank: 'buySawTank' };
  function fit(id, on, w = current()) {
    const m = mods(w).find((x) => x.id === id);
    if (!m) throw new Error(w + ' has no ' + id + ' (' + mods(w).map((x) => x.id).join(', ') + ')');
    if (on && !m.owned) { const b = T[BUY[id]]; if (typeof b === 'function') (id === 'auto' || id === 'tank') ? b() : b(w); }
    return T.armoryDbg.fit(w, id, !!on);
  }
  const GEAR_IDS = ['helmet', 'vest', 'pads', 'nvg', 'laser', 'flashlight'];
  function gear(id, on) {
    const g = T.getGearOwned ? T.getGearOwned() : null;
    if (!g) return null;
    if (on == null) return !!g[id];
    if (!GEAR_IDS.includes(id)) throw new Error('no gear "' + id + '" (' + GEAR_IDS.join(', ') + ')');
    g[id] = !!on;
    if (id === 'laser' && T.setLasersDbg) T.setLasersDbg(!!on);
    if (T.applyGearVisibility) T.applyGearVisibility();
    if (T.updateCarriedGear) T.updateCarriedGear(0, true);
    return !!g[id];
  }
  function nvg(down) { const s = T.getNvgDown ? T.getNvgDown() : null; if (gear('nvg') && down != null && s !== down && T.toggleNvgDbg) T.toggleNvgDbg(); }
  // Wardrobe: the CIF's own path (withItem + commitWardrobe through TT.setWardrobeItem); never saved in here.
  function camo(k) { if (k == null) return T.getCamo ? T.getCamo() : null; T.setCamo(k, false); return k; }
  function item(id, patch) { if (!T.setWardrobeItem) throw new Error('no TT.setWardrobeItem'); return T.setWardrobeItem(id, patch); }
  function body(patch) {
    const w = T.getWardrobe(); Object.assign(w.body, patch); T.dressMarine(T.marine, w);
    if (T.dressGuns) T.dressGuns(w);
    return { ...w.body };
  }
  function insulated(on) { if (on && T.lightningDbg) T.lightningDbg.wear(); return T.lightningDbg ? T.lightningDbg.worn() : false; }
  // The gun's finish, painted by the game's own dressGuns (every finish: the armory's unlocks are the game's, not the
  // inspector's business). Not saved, like the rest of the wardrobe in here.
  function finish(k, w = current()) {
    const st = T.getWardrobe();
    if (!st.guns) st.guns = {};
    if (!k) delete st.guns[w]; else st.guns[w] = k;
    T.dressGuns(st);
    return k || '';
  }
  const finishes = (w = current()) => {
    const r = T.armoryFinishDbg ? T.armoryFinishDbg.list(w) : null;
    return r && Array.isArray(r.list) ? r.list.filter((f) => f.key).map((f) => ({ key: f.key, name: f.name || f.key })) : [];
  };
  function preset(name) {
    const p = PRESETS[name]; if (!p) throw new Error('no preset "' + name + '" (' + Object.keys(PRESETS).join(', ') + ')');
    for (const [k, v] of Object.entries(p.gear || {})) gear(k, v);
    if (p.camo) { try { camo(p.camo); } catch (_) { /* a camo this build doesn't have */ } }
    for (const [k, v] of Object.entries(p.items || {})) item(k, v);
    return name;
  }

  // --- the moves' parts -----------------------------------------------------------------------------------------
  async function reload() {
    const w = current();
    if (T.magazinesDbg && T.magazinesDbg(w) && T.setMagazinesDbg) { const m = T.magazinesDbg(w), size = (m && m.size) || 30; T.setMagazinesDbg(w, 1, [size, size, size]); }
    else if (T.setAmmoDbg) T.setAmmoDbg(w, 1);
    press('KeyR');
  }
  async function fire(sec = 0.4) {
    const w = current();
    if (T.setAmmoDbg) T.setAmmoDbg(w, 999);
    T.setMouseFireDbg(true); await wait(sec); T.setMouseFireDbg(false);
  }
  function melee() { if (T.setKnifeCd) T.setKnifeCd(0); press('KeyF'); }
  async function grenade(hold = 0.4) { if (host.state().akimbo) akimbo(null); if (T.setGrenadesDbg) T.setGrenadesDbg(6); holdKey('KeyG', true); await wait(hold); holdKey('KeyG', false); }
  function slowTime() {   // CL-252: V, as the game has it since CL-248 (a full meter first)
    if (T.setDiveMeterDbg) T.setDiveMeterDbg(1);
    press('KeyV');
  }
  function jump() { return T.airDbg ? T.airDbg.jumpNow() : (press('Space'), true); }
  function turn(deg) { T.setAimYawDbg((T.player.rotation.y || 0) + deg * DEG); }
  function aim(on) { if (T.setZoomHeldDbg) T.setZoomHeldDbg(!!on); }
  function home() { const C = ix.stage.center; host.placePlayer(C.x, C.z, 0); }
  function clearProps() {
    if (host.state().mortar) {
      if (typeof T.dismountMortar !== 'function') throw new Error('the game has no dismountMortar');
      T.dismountMortar();
    }
    if (host.state().carried) {
      const hook = typeof T.setDownMortar === 'function' ? T.setDownMortar : T.m240VisDbg && T.m240VisDbg().setDown;
      if (typeof hook !== 'function') throw new Error('the game has no crew-served set-down hook');
      const existing = new Set(T.builds || []), p = T.player.position;
      hook(p.x, p.z + 1.2, true);
      // Shouldering removes the old piece; setting it down builds a new one. This one is ours too.
      for (const b of T.builds || []) if (!existing.has(b)) { b._dwi = true; st.props.push(b); }
      if (host.state().mortar && T.dismountMortar) T.dismountMortar();
    }
    const owned = new Set([...st.props, ...(T.builds || []).filter((b) => b && b._dwi)]);
    for (const b of owned) if ((T.builds || []).includes(b)) T.removeBuild(b, true);
    st.props.length = 0;
    if (T.updateGhostPreview) T.updateGhostPreview();
    if (host.state().carried || host.state().mortar) throw new Error('crew-served cleanup did not release the marine');
  }
  function prop(kind, dx, dz, yaw = 0) {
    const p = T.player.position, b = T.spawnBuild(kind, p.x + dx, p.z + dz);
    if (!b) throw new Error('the game would not build a ' + kind + ' here');
    b._dwi = true; st.props.push(b);
    if (yaw && b.mesh) b.mesh.rotation.y = yaw;
    return b;
  }
  async function vault() {
    clearProps(); home(); weapon(gunOr('pistol'));
    await wait(0.1);
    // he steps up square to the wall's face, the way t142 stands him (its box, not its spawn point: the piece sits on
    // the build grid's edge)
    const b = prop('sandbag', 0, 1.3), box = T.thinBoxFor ? T.thinBoxFor(b) : { cx: b.x, cz: b.z, hx: 1, hz: 0.27 };
    const thinX = box.hx < box.hz, half = thinX ? box.hx : box.hz;
    host.placePlayer(thinX ? box.cx - (half + 0.85) : box.cx, thinX ? box.cz : box.cz - (half + 0.85), thinX ? Math.PI / 2 : 0);
    await wait(0.4);
    if (!T.tryVault()) { holdKey('KeyW', true); holdKey('Space', true); await wait(0.15); holdKey('Space', false); holdKey('KeyW', false); }
  }
  async function mount(kind) {
    clearProps(); home(); weapon('none');
    const b = prop(kind, 0, 1.1);
    await wait(0.2);
    T.mountMortar(b);
    if (host.state().mortar !== kind || host.state().carried) throw new Error('the game did not mount the ' + kind);
    return b;
  }
  async function carry(kind) {
    await mount(kind); await wait(0.6); T.shoulderMortar();
    const carried = T.getMortarCarried ? T.getMortarCarried() : null;
    if (!host.state().carried || host.state().mortar || carried && carried.kind !== kind) throw new Error('the game did not shoulder the ' + kind);
  }
  async function medpen() { if (T.setHp) T.setHp(60); if (T.buyMedkit) T.buyMedkit(); await wait(0.05); press('KeyH'); }
  function smoke() {
    const I = T.marineIdleDbg ? T.marineIdleDbg() : null;
    if (!I) return;
    Object.assign(I.state, { quiet: 25.5, phase: 'bored', time: 0, lit: false });
  }
  async function knockout() {
    const ud = T.marine && T.marine.userData || {};
    const nodes = [T.player, host.rollPivot, T.marine, ud.weaponMount, ud.offhandMount].filter((node) => node && node.position && node.quaternion && node.scale);
    st.ko = { backdrop: ix.stage.backdrop(), rig: nodes.map((node) => ({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), visible: node.visible })) };
    ix.stage.backdrop('off');
    T.trainingDbg.blackout();
  }
  function endKnockout() {
    const tr = host.training();
    const prior = st.ko;
    if (prior) {
      ix.stage.backdrop(prior.backdrop === 'off' ? 'studio' : prior.backdrop);
      for (const saved of prior.rig || []) { saved.node.position.copy(saved.position); saved.node.quaternion.copy(saved.quaternion); saved.node.scale.copy(saved.scale); saved.node.visible = saved.visible; }
      st.ko = null;
    }
    if (tr.wake) { tr.wake = null; if (host.audio && host.audio.knockoutEnd) host.audio.knockoutEnd(0.3); }
    if (tr.blackout) tr.blackout.classList.remove('on');
    home();
  }

  // --- playing a move -------------------------------------------------------------------------------------------
  const desk = {
    weapon, akimbo, blade, mods, fit, gear, nvg, camo, item, body, insulated, finish, finishes, preset, gunOr, current, unarmed,
    reload, fire, melee, grenade, slowTime, jump, turn, aim, vault, mount, carry, medpen, smoke, knockout, endKnockout, clearProps,
    press, holdKey, wait, home,
    MOVES, MOVE_CATS, PRESETS, GEAR_IDS, GUN_NAME
  };
  function reportMoveError(m, e) {
    st.error = String(e && e.message || e);
    if (ix.errors) ix.errors.push({ id: 'marine.' + m.id, error: st.error, stage: 'move' });
    ix.ui && ix.ui.toast('That move did not run: ' + st.error, true);
    console.warn('[inspector] move', m.id, e);
  }
  function stop() {
    const m = st.move;
    st.token++;
    st.abort.abort(); st.abort = new AbortController();
    // The game's blur handler cancels a charging grenade. Releasing G first would throw it.
    if (st.keys.has('KeyG')) window.dispatchEvent(new Event('blur'));
    releaseAll();
    for (const kind of Object.keys(st.holds)) { try { hold(kind, null); } catch (e) { console.warn('[inspector] release hold', kind, e); } }
    if (m && m.stop) { try { m.stop(desk); } catch (e) { reportMoveError(m, e); } }
    if (T.setZoomHeldDbg) T.setZoomHeldDbg(false);
    st.move = null; st.treadmill = false; st.running = false;
  }
  async function runOnce(m, token) {
    if (!m.run) return true;
    st.running = true;
    let ok = true;
    try { await m.run(desk); } catch (e) {
      ok = false;
      if (e.name !== 'AbortError' && token === st.token) reportMoveError(m, e);
    }
    if (token === st.token) st.running = false;
    return ok;
  }
  async function play(id, { loop } = {}) {
    const m = MOVES.find((x) => x.id === id);
    if (!m) throw new Error('no move "' + id + '" (DWInspect.marine.moves())');
    stop(); st.error = null;
    if (loop != null) st.loop = !!loop;
    const token = st.token;
    st.move = m;
    home();
    try {
      if (m.setup) await m.setup(desk);
      if (token !== st.token) return null;
      for (const k of m.keys || []) holdKey(k, true);
      st.treadmill = !!(m.keys && m.keys.some((k) => /Key[WASD]|Arrow/.test(k)));
      if (m.after) await wait(m.after);
      if (token !== st.token) return null;
      st.next = ix.clock.gameTime + (m.every || 1e9);
      const ran = await runOnce(m, token);
      if (token !== st.token) return null;
      if (!ran && st.error) throw new Error(st.error);
      return m;
    } catch (e) {
      if (e.name === 'AbortError' || token !== st.token) return null;
      if (!st.error) reportMoveError(m, e);
      stop(); throw e;
    }
  }
  // The desk's frame: the treadmill, and the loop's next go.
  function frame() {
    const m = st.move;
    if (st.treadmill) { const C = ix.stage.center, P = T.player.position; P.x = C.x; P.z = C.z; }
    if (m && m.run && st.loop && m.every && !st.running && ix.clock.gameTime >= st.next) {
      st.next = ix.clock.gameTime + m.every;
      if (!m.keys) home();
      const token = st.token;
      runOnce(m, token).then((ok) => { if (!ok && token === st.token) stop(); });
    }
  }
  // Pin a phase with the game's own holds (GAIT.holdU, reloadClipDbg.hold, handsDbg.knifeHold / drawHold,
  // holdGrenadeAnim): u 0..1 (or null to let go). grenade takes [phase, t].
  function hold(kind, u) {
    const G = T.gaitDbg && T.gaitDbg.GAIT;
    if (!['walk', 'run', 'reload', 'knife', 'draw', 'grenade'].includes(kind)) throw new Error('no hold "' + kind + '" (walk, run, reload, knife, draw, grenade)');
    if (u != null) {
      if (kind === 'grenade') {
        if (!Array.isArray(u) || !['grab', 'raise', 'cocked', 'throw', 'back'].includes(u[0]) || !Number.isFinite(+u[1])) throw new Error('grenade hold needs [phase, finite seconds]');
        u = [u[0], Math.max(0, Math.min(0.6, +u[1]))];
      } else {
        if (!Number.isFinite(+u)) throw new Error(kind + ' hold needs a finite phase');
        u = Math.max(0, Math.min(kind === 'draw' ? 1.2 : 1, +u));
      }
    }
    switch (kind) {
      case 'walk': if (!G) throw new Error('the game has no gait hold'); G.holdU = u; G.holdRun = 0; delete st.holds.run; break;
      case 'run': if (!G) throw new Error('the game has no gait hold'); G.holdU = u; G.holdRun = u == null ? 0 : 1; delete st.holds.walk; break;
      case 'reload': T.reloadClipDbg.hold(u == null ? null : +u); break;
      case 'knife': T.handsDbg.knifeHold(u == null ? null : +u); break;
      case 'draw': T.handsDbg.drawHold(u == null ? null : +u); break;
      case 'grenade': T.holdGrenadeAnim(u ? u[0] : null, u ? u[1] : 0); break;
      default: throw new Error('no hold "' + kind + '" (walk, run, reload, knife, draw, grenade)');
    }
    if (u == null) delete st.holds[kind]; else st.holds[kind] = Array.isArray(u) ? [...u] : u;
    return kind;
  }
  function holdState(kind) { const value = st.holds[kind]; return Array.isArray(value) ? [...value] : value ?? null; }
  function state() {
    const s = host.state();
    return { ...s, move: st.move ? st.move.id : null, loop: st.loop, treadmill: st.treadmill, running: st.running, holds: Object.fromEntries(Object.keys(st.holds).map((k) => [k, holdState(k)])), error: st.error, blade: T.isKatanaOwned && T.isKatanaOwned() ? 'katana' : T.isMacheteOwned && T.isMacheteOwned() ? 'machete' : 'knife', camo: camo() };
  }
  // Ready for inspection: all guns and kit, no harm can come to him, the gun he starts with in his hand.
  function prepare() {
    try { T.grantAllWeapons(); } catch (e) { console.warn('[inspector] grantAllWeapons', e); }
    try { if (!host.state().god) T.runDevCommand('godmode'); } catch (_) {}
    try { if (T.setGrenadesDbg) T.setGrenadesDbg(6); } catch (_) {}
    home();
  }
  Object.assign(desk, { play, stop, frame, hold, holdState, state, prepare, setLoop: (on) => { st.loop = !!on; return st.loop; } });
  Object.defineProperties(desk, { move: { enumerable: true, get: () => st.move }, loop: { enumerable: true, get: () => st.loop } });
  return desk;
}
