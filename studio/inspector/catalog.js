// studio/inspector/catalog.js — every subject the inspector can show (CL-196). Claude's (studio/*).
//
// One entry per thing to look at. Each one is built by the game's own code: the builders in index.html come through the
// inspector's door (host.builders, the inspectHost() block in index.html), the rest are imported from their modules.
// Nothing here copies game code, so a change to a model shows here the moment the game has it.
//
// To add a subject: add an entry to the list it belongs in below, and run the check (DWInspect.check() in the page, or
// `node tools/camera.mjs check`). An entry is
//
//   {
//     id:       'group.name', lower case, unique (also the camera's target name and the review folder's name)
//     name:     what the list shows
//     group:    'Marine' | 'Zombies' | 'Weapons' | 'Animals & people' | 'Props & vehicles'
//     owner:    who answers notes on it (claude, grokbot, chatgpt, cursor, antigravity): the review folder's owner
//     source:   where its builder lives, for the info panel and the notes
//     kind:     'model' (default: an Object3D the inspector stages) | 'marine' (the live player) | 'zombie' (a live one)
//     build(c, variant) -> Object3D (or a Promise of one). c = { host, T (window.TT), THREE, B (host.builders),
//                          D (host.data), doc, rnd(seed) }. Throw (or return null) to report it broken.
//     variants: [{ key, name }] or (c) => [...]: a picker on the panel (tiers, kinds, designs); build gets the key
//     float:    metres above the floor (weapons sit at hand height); default: its lowest point on the floor
//     tick(root, dt, t, c, state): its own motion each frame, if it has one in the game (wings, rotors, a pose)
//     controls(c, root) -> [{ id, type: 'toggle' | 'button' | 'select', label, get, set, options }]: stable IDs for its own switches
//     notes:    a line for the info panel (what is real and what is not)
//   }
//
// Kinds 'marine' and 'zombie' are handled by subjects.js (the live player, and zombies the game spawns and runs).

const GROUPS = ['Marine', 'Zombies', 'Weapons', 'Animals & people', 'Props & vehicles'];
export { GROUPS };

// mulberry32: the game's seeded random (core/math.js), here so a subject's shape is the same on every load.
export function rnd(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const need = (f, name) => { if (typeof f !== 'function') throw new Error('the game has no ' + name + ' (index.html inspectHost builders)'); return f; };
const title = (k) => String(k).replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (m) => m.toUpperCase());

// The held gun's world scale: the game sizes each gun once for this marine (WEAPON_SIZE), so a copy at that scale
// is the size it is in his hands.
function heldScale(c, obj) {
  const v = new c.THREE.Vector3(1, 1, 1);
  if (obj) { obj.updateWorldMatrix(true, false); obj.getWorldScale(v); }
  return v;
}
function matchScale(c, g, src) { g.scale.copy(heldScale(c, src)); return g; }
// What a gun shows on the shelf: the moving parts at rest, no flash, no laser beam, lights off.
function bare(g) {
  const ud = g.userData || {};
  for (const k of ['flash', 'laser', 'flare', 'flashLight']) if (ud[k] && ud[k].isObject3D) ud[k].visible = false;
  g.traverse((o) => { if (o.isLight) o.intensity = 0; if (o.name === 'flash' || (o.userData && o.userData.isFlash)) o.visible = false; });
  return g;
}

// --- the marine ---------------------------------------------------------------------------------------------------
const MARINE = [
  { id: 'marine', name: 'The marine (live)', group: 'Marine', owner: 'claude', kind: 'marine',
    source: 'index.html: makeMarine, updateMarinePose, holdWeapon (the player himself)',
    notes: 'The player, run by the game: every pose, weapon, kit item and move below is the game doing it.' },
  { id: 'marine.fresh', name: 'Marine, fresh (default kit)', group: 'Marine', owner: 'claude',
    source: 'index.html: makeMarine()', notes: 'A second marine as makeMarine builds him, undressed by any save: the bind pose.',
    build: (c) => need(c.B.marine, 'makeMarine')() }
];

// --- zombies: one entry per type the game has (ZOMBIE_TYPES) --------------------------------------------------------
function zombies(c) {
  const Z = c.D.ZOMBIE_TYPES || {};
  return Object.keys(Z).filter((k) => Z[k] && Z[k].name).map((k) => ({
    id: 'zombie.' + k.toLowerCase(), typeKey: k, name: Z[k].name, group: 'Zombies', owner: 'grokbot', kind: 'zombie',
    source: 'index.html: makeZombieMesh("' + k + '"), updateZombies, game/*-motion.js',
    notes: 'Live: spawned and run by the game (its gait, its abilities, its attacks on the marine). Statue: the mesh at rest.'
  }));
}

// --- weapons --------------------------------------------------------------------------------------------------------
function weapons(c) {
  const T = c.T, order = (c.D.WEAPON_ORDER || Object.keys(T.weaponMeshes || {}));
  const out = order.map((k) => ({
    id: 'weapon.' + k, name: ({ aa12: 'AA-12', m4: 'M4', ak: 'AK' })[k] || title(k), group: 'Weapons', owner: 'grokbot', float: 1.1, margin: 1.05,
    source: 'index.html: make' + title(k).replace(/ /g, '') + '() → studio/weapon-*.js', gun: k,
    build: (c2) => {
      const make = c2.B.guns && c2.B.guns[k];
      if (!make) throw new Error('no builder for gun ' + k);
      return bare(matchScale(c2, make(), c2.T.weaponMeshes && c2.T.weaponMeshes[k]));
    },
    controls: (c2, g) => gunControls(c2, g, k)
  }));
  const blade = (key, name) => ({
    id: 'weapon.' + key, name, group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'index.html: makeKnife() → studio/weapon-sidearms.js',
    build: (c2) => {
      const held = c2.T.knifeMesh ? c2.T.knifeMesh() : null, g = need(c2.B.knife, 'makeKnife')();
      const model = g.userData && g.userData[key + 'Model'];
      if (!model) throw new Error('the blade group has no ' + key + 'Model');
      for (const k2 of ['knifeModel', 'macheteModel', 'katanaModel']) if (g.userData[k2]) g.userData[k2].visible = k2 === key + 'Model';
      // GB-177: the knife's blade is built edge-sideways (groundBlade rotate) for its hold; show it edge-down like the machete.
      if (key === 'knife') model.rotation.z = -Math.PI / 2;
      g.visible = true;   // the game keeps the blade group hidden until he draws it
      return matchScale(c2, g, held);
    }
  });
  out.push(blade('knife', 'Knife'), blade('machete', 'Machete'));
  out.push(
    { id: 'weapon.katana', name: 'Katana', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'studio/katana.js: makeKatanaModel',
      build: async (c2) => (await import('../katana.js')).makeKatanaModel({ THREE: c2.THREE }) },
    { id: 'weapon.katana-sheathed', name: 'Katana, sheathed', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'studio/katana.js: makeSheathedKatana',
      build: async (c2) => (await import('../katana.js')).makeSheathedKatana({ THREE: c2.THREE }) },
    { id: 'weapon.m240', name: 'M240 (on its tripod)', group: 'Weapons', owner: 'grokbot', source: 'index.html: makeM240Mesh() → studio/weapon-heavy.js',
      build: (c2) => need(c2.B.m240, 'makeM240Mesh')(false) },
    { id: 'weapon.m240-folded', name: 'M240, folded (carried)', group: 'Weapons', owner: 'grokbot', source: 'index.html: makeM240Mesh(true)',
      build: (c2) => need(c2.B.m240, 'makeM240Mesh')(true) },
    { id: 'weapon.mortar', name: 'Mortar', group: 'Weapons', owner: 'grokbot', source: 'index.html: makeMortarMesh() → studio/weapon-heavy.js',
      build: (c2) => need(c2.B.mortar, 'makeMortarMesh')() },
    { id: 'weapon.mortar-collapsed', name: 'Mortar, collapsed (carried)', group: 'Weapons', owner: 'grokbot', source: 'index.html: makeMortarMesh(null, true)',
      build: (c2) => need(c2.B.mortar, 'makeMortarMesh')(null, true) },
    { id: 'weapon.mortar-round', name: 'Mortar round (60 mm)', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'index.html: makeMortarRoundMesh()',
      build: (c2) => need(c2.B.mortarRound, 'makeMortarRoundMesh')() },
    { id: 'weapon.frag-grenade', name: 'Frag grenade (in his hand)', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'index.html: the grenadeHand group',
      build: (c2) => {
        const src = c2.T.grenadeAnimDbg ? c2.T.grenadeAnimDbg().hand : null;
        if (!src) throw new Error('no grenadeHand');
        const g = need(c2.B.cloneLean, 'cloneLean')(src); g.visible = true; g.traverse((o) => { o.visible = true; });
        g.position.set(0, 0, 0); g.rotation.set(0, 0, 0);
        return matchScale(c2, g, src);
      } },
    { id: 'weapon.holy-grenade', name: 'Holy hand grenade', group: 'Weapons', owner: 'claude', float: 1.1, source: 'world/rabbit.js: buildHolyGrenade',
      build: async (c2) => (await import('../../world/rabbit.js')).buildHolyGrenade(c2.THREE) },
    { id: 'weapon.med-pen', name: 'Med pen', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'index.html: makeMedPenMesh()',
      build: (c2) => need(c2.B.medPen, 'makeMedPenMesh')() },
    { id: 'weapon.rune-pistol', name: 'Rune pistol', group: 'Weapons', owner: 'grokbot', float: 1.1, source: 'index.html: makeRunePistol()',
      build: (c2) => bare(matchScale(c2, need(c2.B.runePistol, 'makeRunePistol')(), c2.T.weaponMeshes && c2.T.weaponMeshes.pistol)) },
    { id: 'weapon.shovel', name: 'Shovel (burial crew)', group: 'Weapons', owner: 'claude', source: 'index.html: makeShovelMesh()',
      build: (c2) => need(c2.B.shovel, 'makeShovelMesh')() }
  );
  return out;
}
// A gun's own switches, through the game's own look functions (the same ones the armory uses on his guns).
function gunControls(c, g, k) {
  const out = [], ud = g.userData || {};
  if (ud.suppressor && c.B.gunSuppressor) out.push({ id: 'suppressor', type: 'toggle', label: 'Suppressor', get: () => !!ud.suppressed, set: (on) => c.B.gunSuppressor(g, on) });
  if (c.B.gunExtLook) out.push({ id: 'ext', type: 'toggle', label: 'Extended magazine', get: () => !!g.userData._dwiExt, set: (on) => { g.userData._dwiExt = !!on; c.B.gunExtLook(g, k, !!on); } });
  if (c.B.gunHeavyLook) out.push({ id: 'heavy', type: 'toggle', label: 'Heavy barrel', get: () => !!g.userData._dwiHeavy, set: (on) => { g.userData._dwiHeavy = !!on; c.B.gunHeavyLook(g, k, !!on); } });
  if (ud.flash && ud.flash.isObject3D) out.push({ id: 'flash', type: 'toggle', label: 'Muzzle flash', get: () => !!ud.flash.visible, set: (on) => { ud.flash.visible = !!on; } });
  if (ud.laser && ud.laser.isObject3D) out.push({ id: 'laser', type: 'toggle', label: 'Laser beam', get: () => !!ud.laser.visible, set: (on) => { ud.laser.visible = !!on; } });
  return out;
}

// --- animals and people -------------------------------------------------------------------------------------------
const flap = (root, dt, t) => {   // the wing beat updateWildlife gives a bird (rotation.z on each wing)
  const ud = root.userData, a = Math.sin(t * 14) * 0.7;
  if (ud.wingL) ud.wingL.rotation.z = a;
  if (ud.wingR) ud.wingR.rotation.z = -a;
};
function animals(c) {
  const B = c.B, D = c.D;
  const simple = (key, name, builder, extra = {}) => ({ id: 'animal.' + key, name, group: 'Animals & people', owner: 'claude', source: 'index.html: ' + builder + '()',
    build: (c2) => need(c2.B[key.replace(/-(\w)/g, (m, x) => x.toUpperCase())], builder)(), ...extra });
  const RABBIT_ACTS = [{ key: 'loaf', name: 'Loafing' }, { key: 'graze', name: 'Grazing' }, { key: 'groom', name: 'Grooming' }, { key: 'drink', name: 'Drinking' }, { key: 'hop', name: 'Hopping' }];
  const out = [
    { id: 'animal.rabbit', name: 'Rabbit', group: 'Animals & people', owner: 'claude', source: 'index.html: makeRabbitMesh(), poseRabbit()',
      variants: RABBIT_ACTS, notes: 'Posed every frame by the game\'s poseRabbit; the coat is the game\'s random pick.',
      build: (c2) => need(c2.B.rabbit, 'makeRabbitMesh')(),
      tick: (root, dt, t, c2, st) => {
        const pose = c2.B.poseRabbit; if (!pose) return;
        const act = st.variant || 'loaf', r = st.r || (st.r = { mesh: root, vel: { x: 0, y: 0, z: 0 }, phase: 0, groomSide: 1, earFlick: 0 });
        r.act = act === 'hop' ? 'hop' : act === 'loaf' ? 'idle' : act; r.mode = act === 'hop' ? 'bolt' : 'idle';
        r.phase = (r.phase || 0) + dt; r.vel.z = act === 'hop' ? 3 : 0;
        r.earFlick = (t % 3) < 0.4 ? (t % 3) / 0.4 : 0;
        pose(r, Math.max(dt, 1 / 120));
      } },
    { id: 'animal.killer-rabbit', name: 'Killer rabbit', group: 'Animals & people', owner: 'claude', source: 'world/rabbit.js: buildKillerRabbit',
      build: async (c2) => (await import('../../world/rabbit.js')).buildKillerRabbit(c2.THREE) },
    { id: 'animal.bird', name: 'Bird', group: 'Animals & people', owner: 'claude', source: 'index.html: makeBirdMesh()', float: 1.2,
      build: (c2) => need(c2.B.bird, 'makeBirdMesh')(), tick: flap },
    { id: 'animal.bee', name: 'Bee', group: 'Animals & people', owner: 'claude', source: 'index.html: makeBeeMesh()', float: 0.6,
      build: (c2) => need(c2.B.bee, 'makeBeeMesh')(), tick: (r, dt, t) => flap(r, dt, t * 4) },
    { id: 'animal.butterfly', name: 'Butterfly', group: 'Animals & people', owner: 'claude', source: 'index.html: makeButterflyMesh()', float: 0.6,
      build: (c2) => need(c2.B.butterfly, 'makeButterflyMesh')(), tick: (r, dt, t) => flap(r, dt, t * 0.8) },
    simple('frog', 'Frog', 'makeFrogMesh'),
    simple('squirrel', 'Squirrel', 'makeSquirrelMesh'),
    simple('turtle', 'Turtle', 'makeTurtleMesh'),
    { id: 'animal.fish', name: 'Fish', group: 'Animals & people', owner: 'claude', source: 'index.html: makeFishMesh(FISH_KINDS[n])', float: 0.4,
      variants: () => (D.FISH_KINDS || []).map((f, i) => ({ key: String(i), name: f.name || f.key || f.id || 'Fish ' + (i + 1) })),
      build: (c2, v) => { const kinds = c2.D.FISH_KINDS || []; return need(c2.B.fish, 'makeFishMesh')(kinds[+v || 0]); } },
    simple('lily-pad', 'Lily pad', 'makeLilyPadMesh', { float: 0.04 }),
    simple('nest', 'Bird\'s nest', 'makeNestMesh'),
    simple('burrow', 'Rabbit burrow', 'makeBurrowMesh')
  ];
  for (const who of ['okafor', 'brandt', 'pike']) out.push({
    id: 'person.' + who, name: title(who) + ' (survivor)', group: 'Animals & people', owner: 'claude', source: 'index.html: makeSurvivorFigure("' + who + '")',
    build: (c2) => need(c2.B.survivor, 'makeSurvivorFigure')(who)
  });
  out.push(
    { id: 'person.skeletal-marine', name: 'Skeletal marine (the pit)', group: 'Animals & people', owner: 'claude', source: 'index.html: makeSkeletalMarine()',
      build: (c2) => need(c2.B.skeletalMarine, 'makeSkeletalMarine')() },
    { id: 'person.cave-guardian', name: 'Cave guardian', group: 'Animals & people', owner: 'claude', source: 'world/cave-guardian.js: makeCaveGuardianRig(CAVE_DESIGNS[k])',
      variants: () => Object.keys(D.CAVE_DESIGNS || { wet: 1 }).map((k) => ({ key: k, name: title(k) })),
      notes: 'Standing and breathing (guardianStand), at the game\'s GUARDIAN_SCALE. The fight poses play in the game.',
      build: async (c2, v) => {
        const M = await import('../../world/cave-guardian.js'), d = (c2.D.CAVE_DESIGNS || {})[v || 'wet'] || {};
        const g = M.makeCaveGuardianRig(d); g.scale.setScalar(c2.D.GUARDIAN_SCALE || 1.3); g.userData._dwiGuardian = M;
        return g;
      },
      tick: (root, dt, t, c2, st) => {
        const M = root.userData._dwiGuardian; if (!M || !root.userData.rig) return;
        st.look = st.look || new c2.THREE.Vector3();
        root.updateWorldMatrix(true, false);
        st.look.set(0, 1.2, 4).applyMatrix4(root.matrixWorld);
        M.guardianStand(root, root.userData.rig, t, st.look);
      } }
  );
  return out;
}

// --- props and vehicles -------------------------------------------------------------------------------------------
const BUILD_KINDS = ['wall', 'floor', 'barricade', 'sandbag', 'wire', 'railing', 'platform', 'pillar', 'stairs', 'spikes', 'mine', 'lure', 'light', 'flame', 'heavy'];   // GB-234: the mortar has no tiers now; it shows as weapon.mortar
function props(c) {
  const D = c.D, tracks = D.UPGRADE_TRACKS || {};
  const out = [];
  for (const k of BUILD_KINDS) {
    const tr = tracks[k];
    out.push({ id: 'build.' + k, name: (tr && tr.names && tr.names[0]) || title(k), group: 'Props & vehicles', owner: 'grokbot',
      source: 'index.html: makeTieredMesh({ type: "' + k + '", tier }) (the build menu\'s models, every tier)',
      variants: () => ((tracks[k] && tracks[k].names) || [title(k)]).map((n, i) => ({ key: String(i), name: n })),
      build: (c2, v) => { const m = need(c2.B.tiered, 'makeTieredMesh')({ type: k, tier: +v || 0 }); if (!m) throw new Error('makeTieredMesh has no ' + k); return m; } });
  }
  out.push({ id: 'build.barrel', name: 'Fuel drum', group: 'Props & vehicles', owner: 'grokbot', source: 'index.html: makeBarrelBuildMesh()',
    build: (c2) => need(c2.B.barrel, 'makeBarrelBuildMesh')() });
  out.push(
    { id: 'prop.skull', name: 'Skull (drop)', group: 'Props & vehicles', owner: 'grokbot', source: 'index.html: makeSkullMesh(kind, still)', float: 0.3,
      variants: () => Object.keys(D.SKULL_LOOK || { shambler: 1 }).map((k) => ({ key: k, name: title(k) })),
      build: (c2, v) => need(c2.B.skull, 'makeSkullMesh')(v || Object.keys(c2.D.SKULL_LOOK || { shambler: 1 })[0], true) },
    { id: 'prop.skull-bag', name: 'Skull bag', group: 'Props & vehicles', owner: 'grokbot', source: 'index.html: makeSkullBag()',
      build: (c2) => need(c2.B.skullBag, 'makeSkullBag')() },
    { id: 'prop.cash', name: 'Cash stack', group: 'Props & vehicles', owner: 'chatgpt', source: 'index.html: makeCashStackMesh(value)',
      variants: [{ key: '5', name: '$5' }, { key: '25', name: '$25' }, { key: '100', name: '$100' }, { key: '500', name: '$500' }],
      build: (c2, v) => need(c2.B.cash, 'makeCashStackMesh')(+v || 25) },
    { id: 'prop.supply-crate', name: 'Supply crate', group: 'Props & vehicles', owner: 'grokbot', source: 'index.html: makeSupplyCrate()',
      build: (c2) => need(c2.B.crate, 'makeSupplyCrate')() },
    { id: 'prop.parachute', name: 'Parachute (supply drop)', group: 'Props & vehicles', owner: 'claude', source: 'assets/intro/airborne.js: createAirborneRig(THREE, ground).chute()',
      build: (c2) => { const mk = window.createAirborneRig; if (typeof mk !== 'function') throw new Error('no createAirborneRig'); const rig = mk(c2.THREE, () => 0); return rig.chute(); } },
    { id: 'prop.kiosk', name: 'Kiosk', group: 'Props & vehicles', owner: 'chatgpt', source: 'index.html: makeKiosk()',
      build: (c2) => need(c2.B.kiosk, 'makeKiosk')() },
    { id: 'prop.tree', name: 'Tree', group: 'Props & vehicles', owner: 'claude', source: 'index.html: buildTreeMeshes (as makeTree grows one)',
      variants: [{ key: 'pine', name: 'Pine' }, { key: 'oak', name: 'Oak' }, { key: 'autumn', name: 'Autumn' }, { key: 'birch', name: 'Birch' }],
      build: (c2, v) => need(c2.B.tree, 'tree')(v || 'pine', 1, 4242) },
    { id: 'prop.fire', name: 'Fire', group: 'Props & vehicles', owner: 'claude', source: 'index.html: makeFireTongues, animateFireTongues',
      build: (c2) => need(c2.B.fireTongues, 'makeFireTongues')(9, 0.45, 1.1),
      tick: (root, dt, t, c2) => { if (c2.B.animateFireTongues) c2.B.animateFireTongues(root, t, 1); } },
    { id: 'prop.bone-raft', name: 'Bone raft (the pit)', group: 'Props & vehicles', owner: 'claude', source: 'index.html: makeBoneRaft()',
      build: (c2) => need(c2.B.boneRaft, 'makeBoneRaft')() },
    { id: 'prop.insulated-boots', name: 'Insulated boots', group: 'Props & vehicles', owner: 'claude', source: 'world/lightning.js: buildInsulatedBoots',
      build: async (c2) => (await import('../../world/lightning.js')).buildInsulatedBoots(c2.THREE) },
    { id: 'prop.rubber-boot', name: 'Rubber boot', group: 'Props & vehicles', owner: 'claude', source: 'world/lightning.js: buildRubberBoot',
      build: async (c2) => (await import('../../world/lightning.js')).buildRubberBoot(c2.THREE) },
    { id: 'prop.worn-boots', name: 'Worn boots (the mast)', group: 'Props & vehicles', owner: 'claude', source: 'world/lightning.js: buildWornBoots',
      build: async (c2) => (await import('../../world/lightning.js')).buildWornBoots(c2.THREE) },
    { id: 'prop.rabbit-mound', name: 'Rabbit mound', group: 'Props & vehicles', owner: 'claude', source: 'world/rabbit.js: buildMound',
      build: async (c2) => (await import('../../world/rabbit.js')).buildMound(c2.THREE) },
    { id: 'prop.reliquary', name: 'Reliquary', group: 'Props & vehicles', owner: 'claude', source: 'world/rabbit.js: buildReliquary',
      build: async (c2) => (await import('../../world/rabbit.js')).buildReliquary(c2.THREE) },
    { id: 'prop.relay-vault', name: 'Relay vault', group: 'Props & vehicles', owner: 'claude', source: 'studio/relay-vault-model.js: makeVaultModel',
      build: async (c2) => {
        const [V, K] = await Promise.all([import('../relay-vault-model.js'), import('../katana.js')]);
        const api = V.makeVaultModel({ THREE: c2.THREE, makeKatana: () => K.makeKatanaModel({ THREE: c2.THREE }) });
        api.group.userData._dwiVault = api; return api.group;
      },
      controls: (c2, g) => { const api = g.userData._dwiVault; if (!api) return [];
        const out2 = [];
        if (api.setDoor) out2.push({ id: 'door', type: 'toggle', label: 'Door open', get: () => !!g.userData._dwiDoor, set: (on) => { g.userData._dwiDoor = !!on; api.setDoor(on ? 1 : 0); } });
        if (api.setLift) out2.push({ id: 'lift', type: 'toggle', label: 'Lift up', get: () => !!g.userData._dwiLift, set: (on) => { g.userData._dwiLift = !!on; api.setLift(on ? 1 : 0); } });
        if (api.setCutaway) out2.push({ id: 'cutaway', type: 'toggle', label: 'Cutaway', get: () => !!g.userData._dwiCut, set: (on) => { g.userData._dwiCut = !!on; api.setCutaway(!!on); } });
        return out2; } },
    { id: 'prop.pit-tentacles', name: 'Pit tentacles', group: 'Props & vehicles', owner: 'claude', source: 'world/pit-tentacles.js: makePitTentacles, tentacleIdle',
      build: async (c2) => {
        const M = await import('../../world/pit-tentacles.js');
        const g = M.makePitTentacles({ cx: 0, cz: 0, floorY: 0, waterY: 0 });
        g.userData._dwiTent = M;
        for (const a of g.userData.arms || []) { M.tentacleShow(a, true); M.tentacleIdle(a, 0, 1); M.tentacleSettle(a); M.tentacleUpdate(a, 0); }
        return g;
      },
      tick: (root, dt, t) => { const M = root.userData._dwiTent; if (!M) return; for (const a of root.userData.arms || []) { M.tentacleIdle(a, t, 1); M.tentacleSettle(a); M.tentacleUpdate(a, t); } } }
  );
  // The history props (world/history-props.js): the story told by the places
  const H = (key, name, fn) => ({ id: 'prop.' + key, name, group: 'Props & vehicles', owner: 'claude', source: 'world/history-props.js: ' + fn.name,
    build: async (c2) => fn(await import('../../world/history-props.js'), c2) });
  out.push(
    H('survey-board', 'Survey board (warren)', function buildSurveyBoard(M, c2) { return M.buildSurveyBoard(c2.THREE, c2.doc, { n: 3, theme: 'root' }); }),
    H('lockdown-door', 'Lockdown door', function buildLockdownDoor(M, c2) { return M.buildLockdownDoor(c2.THREE, c2.doc); }),
    H('cordon-gate', 'Cordon gate', function buildCordonGate(M, c2) { return M.buildCordonGate(c2.THREE, c2.doc, {}); }),
    H('trailhead-board', 'Trailhead board', function buildTrailheadBoard(M, c2) { return M.buildTrailheadBoard(c2.THREE, c2.doc); }),
    H('hikers-cache', 'Hikers\' cache', function buildHikersCache(M, c2) { return M.buildHikersCache(c2.THREE, {}); }),
    H('ranger-truck', 'Ranger truck', function buildRangerTruck(M, c2) { return M.buildRangerTruck(c2.THREE, c2.doc); }),
    H('brass', 'Spent brass', function buildBrass(M, c2) { return M.buildBrass(c2.THREE, 24, c2.rnd(7), 0.45); }),
    H('dropped-helmet', 'Dropped helmet', function buildDroppedHelmet(M, c2) { return M.buildDroppedHelmet(c2.THREE); }),
    H('iron-below-boards', 'Iron Below boards', function buildIronBelowBoards(M, c2) { return M.buildIronBelowBoards(c2.THREE, c2.doc); }),
    H('mine-timbers', 'Mine timbers', function buildMineTimbers(M, c2) { return M.buildMineTimbers(c2.THREE, 3.2, 3.0); }),
    H('cut-bars', 'Cut bars (mine)', function buildCutBars(M, c2) { return M.buildCutBars(c2.THREE, 2.8, 2.8, true); }),
    H('horseshoe', 'Horseshoe', function buildHorseshoe(M, c2) { return M.buildHorseshoe(c2.THREE); }),
    H('ruined-foundation', 'Ruined foundation', function buildRuinedFoundation(M, c2) { return M.buildRuinedFoundation(c2.THREE, c2.rnd(11), { w: 6, d: 5, door: true }); }),
    H('chimney', 'Chimney (Coldwater)', function buildChimney(M, c2) { return M.buildChimney(c2.THREE, c2.rnd(5)); }),
    H('church', 'Church shell (Coldwater)', function buildChurchShell(M, c2) { return M.buildChurchShell(c2.THREE, c2.rnd(5)); }),
    H('iron-banded-grave', 'Iron-banded grave', function buildIronBandedGrave(M, c2) { return M.buildIronBandedGrave(c2.THREE, c2.rnd(5)); }),
    H('open-grave', 'Open grave', function buildOpenGrave(M, c2) { return M.buildOpenGrave(c2.THREE, c2.rnd(5)); }),
    H('traps', 'Traps (the trapper)', function buildTraps(M, c2) { return M.buildTraps(c2.THREE); }),
    H('cellar-hatch', 'Cellar hatch', function buildCellarHatch(M, c2) { return M.buildCellarHatch(c2.THREE); })
  );
  // The first people's stones (world/first-people.js), with the game's own lichen and carvings
  const stoneKit = async (c2) => {
    const M = await import('../../world/first-people.js');
    const lichen = new c2.THREE.CanvasTexture(M.makeLichenTexture(c2.doc));
    if ('colorSpace' in lichen) lichen.colorSpace = c2.THREE.SRGBColorSpace;
    const stoneMat = new c2.THREE.MeshStandardMaterial({ color: 0xffffff, map: lichen, roughness: 0.97 });
    const carvingTex = (k) => new c2.THREE.CanvasTexture(M.makeGlyphCarving(c2.doc, k));
    return { M, stoneMat, carvingTex };
  };
  out.push(
    { id: 'prop.standing-stone', name: 'Standing stone', group: 'Props & vehicles', owner: 'claude', source: 'world/first-people.js: buildStandingStone',
      variants: [0, 2, 4, 7].map((k) => ({ key: String(k), name: 'Glyph ' + k })),
      build: async (c2, v) => { const K = await stoneKit(c2); return K.M.buildStandingStone(c2.THREE, { doc: c2.doc, rnd: c2.rnd(3 + (+v || 0)), k: +v || 0, stoneMat: K.stoneMat, carvingTex: K.carvingTex }).group; } },
    { id: 'prop.ring-stone', name: 'Ring stone', group: 'Props & vehicles', owner: 'claude', source: 'world/first-people.js: buildRingStone',
      build: async (c2) => { const K = await stoneKit(c2); return K.M.buildRingStone(c2.THREE, { doc: c2.doc, rnd: c2.rnd(9), stoneMat: K.stoneMat, ring: K.M.makeRingCarving(c2.doc) }).group; } },
    { id: 'prop.marrow-door', name: 'Marrow door', group: 'Props & vehicles', owner: 'claude', source: 'world/first-people.js: buildMarrowDoor',
      build: async (c2) => {
        // the Marrow (chalk) cave's mouth, as index.html's mouthPoint traces it, without the rag
        const K = await stoneKit(c2), d = (c2.D.CAVE_DESIGNS || {}).chalk || { w: 3.4, h: 4.6, p: 2.4, skew: 0 }, k = 2 / (d.p || 2.4), edge = [];
        for (let i = 0; i <= 34; i++) { const t = (i / 34) * Math.PI, c = Math.cos(t), s = Math.sin(t), y = d.h * Math.pow(Math.max(0, s), k); edge.push([d.w * Math.sign(c) * Math.pow(Math.abs(c), k) + (d.skew || 0) * y, y]); }
        const door = K.M.buildMarrowDoor(c2.THREE, { doc: c2.doc, rnd: c2.rnd(13), edge, height: d.h });
        return door.group || door;
      } }
  );
  // vehicles
  out.push(
    { id: 'vehicle.cargo-plane', name: 'Cargo plane', group: 'Props & vehicles', owner: 'claude', source: 'index.html: makeCargoPlane() → world/cargo-plane.js', float: 3,
      build: (c2) => need(c2.B.cargoPlane, 'makeCargoPlane')(),
      tick: (root, dt) => { if (typeof root.userData.tick === 'function') root.userData.tick(dt, 1); } },
    { id: 'vehicle.heron', name: 'Heron floatplane', group: 'Props & vehicles', owner: 'claude', source: 'world/heron.js: buildHeron',
      build: async () => (await import('../../world/heron.js')).buildHeron(),
      tick: (root, dt) => { for (const p of root.userData.props || []) p.rotation.z += dt * 40; } }
  );
  return out;
}

// The whole list, in the order the browser shows it. Built from the game's own tables at boot (the zombie types, the
// guns, the build tiers), so a new type or gun is listed without touching this file.
export function makeCatalog(c) {
  const all = [...MARINE];
  for (const part of [zombies, weapons, animals, props]) {
    try { all.push(...part(c)); } catch (e) { all.push({ id: 'broken.' + part.name, name: part.name + ' (could not list)', group: 'Props & vehicles', owner: 'claude', broken: String(e && e.message || e) }); }
  }
  const seen = new Set();
  for (const e of all) {
    if (typeof e.id !== 'string' || !/^[a-z0-9][a-z0-9.-]*$/.test(e.id)) throw new Error('Inspector subject needs a stable lowercase id: ' + e.id);
    if (seen.has(e.id)) throw new Error('Duplicate inspector subject id: ' + e.id + '; choose an explicit permanent id');
    seen.add(e.id);
    e.kind = e.kind || 'model';
    e.review = e.review || 'inspect-' + e.id.replace(/\./g, '-');
  }
  return all;
}
