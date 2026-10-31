# CL-281 stage 2 — proposed view gun numbers

ChatGPT, GP-19993, 2026-10-31. **Proposal for Claude; no game code changed.** The keys below use the stage-1 shapes in `game/viewmodel-poses.js`. Units are game metres and radians. View space is right `+x`, up `+y`, forward `-z`; gun space has its bore along `+z`. `hip.at` is the *grip* in view space. `ads.rear` locates `SIGHT[k].pos` on the view centre line; it is not necessarily the physical rear notch. Gun and hand paths use normalized reload progress `u`.

## Evidence and confidence

- [AG-164's GPU baseline](../../qa/2026-10-31-AG-164/report.md) and its [rifle](../../qa/2026-10-31-AG-164/references/ref-rifles.png) and [SMG](../../qa/2026-10-31-AG-164/references/ref-sidearms.png) reference cards are the framing brief. The cards name *Call of Duty: Modern Warfare*, *Counter-Strike 2* and *Battlefield* for rifles, and *Call of Duty*, *Counter-Strike 2* and *Left 4 Dead* for SMGs. They specify a low right hip pocket, clear centre, straight wrists and centred sights; they do **not** measure these games' camera coordinates. The numeric poses here are my inference, to tune on AG-168's GPU sheet against AG-164's [M4](../../qa/2026-10-31-AG-164/shots/m4-fp-hip.png), [AK](../../qa/2026-10-31-AG-164/shots/ak-fp-hip.png) and [Wasp](../../qa/2026-10-31-AG-164/shots/uzi-fp-hip.png) baselines.
- **High confidence:** local grip and existing support points copied from `WEAPON_HOLD` at `index.html:48824–48829`; model features and sight anchors read from the builders and `game/sight-points.js`; normalized beats copied from `RELOAD_PLAN` and `RELOAD_CUES` at `index.html:23562–23567,47321–47325`.
- **Medium confidence:** magazine feet inferred from the model groups and floor geometry; eye relief chosen to keep the long-gun butt in front of the near plane. **Low to medium confidence:** hip rotation/placement, recoil and elbow hints; these need tcl281/AG GPU shots and wrist/sight tests before becoming shipped values. The old first-person shots show defects, not a measured target pose.

At scale 1, the M4's butt is about 0.493 m behind its grip in gun space; the AK's is about 0.502 m behind. A pistol-like hip grip `z=-0.385` would put either butt behind the eye. The proposed hip grip distances `-0.70` and `-0.75` keep the butt roughly 0.21–0.25 m ahead. In ADS, the M4 `SIGHT.pos.z=-0.12` is 0.449 m ahead of its butt; `ads.rear=0.54` leaves the butt about 0.09 m ahead. The AK sight anchor at `z=0` is 0.597 m ahead of its butt; `ads.rear=0.70` leaves about 0.10 m. This margin should still be checked under recoil, sway and a reload. The Wasp's folded butt is only about 0.088 m behind its `SIGHT.pos.z=-0.25`; `ads.rear=0.34` leaves about 0.25 m.

## VM_POSES entries to start from

`m4` is the GW-4, `ak` the KR-7, `uzi` the Wasp. Keep stage 1's global `VM.fov=60` and `adsFov=54`; the Wasp should not inherit the old claustrophobic world-camera zoom. The hip grips project near NDC `(0.25,-0.50)`, `(0.26,-0.49)` and `(0.31,-0.58)` at 16:9 and 60° before the gun's own turn. These are starts, not measured final placements.

```js
m4: {
  hip: { at: [0.18, -0.205, -0.70], yaw: -0.065, pitch: 0.035, roll: -0.11 },
  ads: { rear: 0.54 },                  // SIGHT.m4.pos [0, .134, -.12]; holo dot is at z .045
  kick: { back: 0.044, up: 0.09, side: 0.018, ads: 0.50 },
  elbows: { r: [0.33, -0.61, -0.10], l: [-0.31, -0.57, -0.26] },
  reload: 'carbine'
},
ak: {
  hip: { at: [0.195, -0.215, -0.75], yaw: -0.075, pitch: 0.045, roll: -0.12 },
  ads: { rear: 0.70 },                  // SIGHT.ak.pos [0, .0943, 0]; low leaf, long stock
  kick: { back: 0.063, up: 0.15, side: 0.032, ads: 0.58 },
  elbows: { r: [0.35, -0.63, -0.12], l: [-0.33, -0.58, -0.27] },
  reload: 'ak'
},
uzi: {
  hip: { at: [0.17, -0.18, -0.54], yaw: -0.06, pitch: 0.025, roll: -0.10 },
  ads: { rear: 0.34 },                  // SIGHT.uzi.pos [0, .156, -.25]; folded stock
  kick: { back: 0.025, up: 0.062, side: 0.016, ads: 0.45 },
  elbows: { r: [0.27, -0.58, -0.08], l: [-0.23, -0.56, -0.18] },
  reload: 'smg'
}
```

The AK kicks more than the GW-4; the Wasp's individual kick is light so its 14 shots/s (`WEAPON_STATS.uzi.interval=1/14`) reads as a quick series rather than a long camera jump. GB-259 still owns the final per-weapon sight picture. All three hip entries keep the sight and muzzle below centre until aimed; the GPU pass must confirm this at the actual scaled model size.

## Gun-local sockets and model evidence

The current `game/viewmodel.js:251–269` reads wrist frames from the posed third-person marine; it does **not** consume an authored socket table yet. These coordinates are the proposed targets for that extension, not existing `VM_POSES` fields. Use grip/support for the wrists, `magFoot` as the centre of the magazine's bottom face for the left palm, and `work` for a bolt release or charging handle. `SIGHT` and the model's `gunEffects` already supply sight and muzzle; retain them.

```js
// Proposed VM_SOCKETS, gun-local metres; copy exact grip from WEAPON_HOLD.
m4: { grip: [0, -0.106, -0.076], support: [0, -0.005, 0.36],
      magFoot: [0, -0.278, 0.04], work: [-0.038, -0.03, 0.11],
      muzzle: [0, 0.02, 0.98] },
ak: { grip: [0, -0.126, -0.095], support: [0, -0.025, 0.37],
      magFoot: [0, -0.331, 0.14], work: [0.083, 0.042, 0.13],
      muzzle: [0, -0.005, 1.02] },
uzi: { grip: [0, -0.088, -0.027], support: [-0.055, -0.035, 0.055],
       magFoot: [0, -0.324, -0.043], work: [0, 0.115, 0.11],
       muzzle: [0, 0.03, 0.48] }
```

M4: the grip and existing foregrip are at `index.html:48828`; handguard spans `z=.21–.70` in `studio/weapon-longarms.js:101–109`, so `z=.36` keeps the support palm on it. Magazine group is at `(0,-.16,.05)` and its floor is near local `y=-.118` (`:137–147`). The `work` point is a **candidate** on the left receiver control at `(-.037,-.03,.112)` (`:68–74`); the builder has no explicit animated bolt-release node. Confirm its visual meaning before using a press pose. The charging-handle geometry is centred at `(0,.068,-.195)` (`:64–66`) if a rack is used instead.

AK: grip/fore are `index.html:48829`; the lower wooden handguard runs `z=.244–.535` (`studio/weapon-longarms.js:210–216`). The curved magazine group's `y=-.06`, floor `y≈-.271`, and forward curve put the proposed bottom near `(0,-.331,.14)` (`:234–245`). The right-side charging knob at `(.083,.042,.13)` is explicit (`:175–179`). The magazine must hook at the front and rock home rather than rise perfectly straight.

Wasp: grip is `index.html:48827`; the model's enlarged grip/magwell spans roughly `z=-.10…+.06` (`studio/weapon-sidearms.js:351–360`). The proposed support point is on its front-left face, not the old third-person fore point at `(0,-.03,.18)` on the forward shroud. It needs a GPU hand-clearance check, since the right firing hand occupies the same compact grip. Its magazine group starts at `(0,-.205,-.0435)` with a baked rake, floor near `y=-.324` (`:381–390`). The top charging knob is at `(0,.115,.11)` and below the sight line (`:325–339`).

## VM_RELOADS entries to start from

These use stage 1's `gun`, `hand`, `mag`, `places` schema. The third-person plans put M4/AK hand reach at `.12`, pouch `.34`, seat `.62`, home `.84`; Wasp reach `.10`, pouch `.32`, seat `.58`, home `.80`. Sounds are M4 `.08/.12/.52/.60/.80`, AK `.10/.50/.80`, Wasp `.08/.12/.50/.58/.76` (`index.html:47321–47325`). A small gun lift/roll keeps the well visible while the butt stays in front of the near plane. `pouch` is view space; the other places are gun-local.

```js
carbine: {
  gun: [[0, null],
    [.12, { pos: [-.055, .06, .015], rot: [.12, .23, -.28] }],
    [.54, { pos: [-.055, .065, .015], rot: [.12, .23, -.28] }],
    [.62, { pos: [-.052, .075, .012], rot: [.10, .20, -.25] }],
    [.78, { pos: [-.032, .045, 0], rot: [.18, .08, -.08] }],
    [1, null]],
  hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.19, 'below', 'mag'],
    [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.52, 'below', 'mag'],
    [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.76, 'work', 'open'],
    [.82, 'work', 'open'], [.88, 'fore', 'fore'], [1, 'fore', 'fore']],
  mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
  places: {
    well: { z: [0, .94, .34], y: [-.55, -.34, -.76] }, below: { drop: .14 },
    work: { at: [-.038, -.03, .11], z: [-1, .05, .1], y: [-.35, -.65, -.65] },
    pouch: { at: [-.29, -.51, -.32], z: [.25, .9, .3], y: [-.4, -.6, .65] }
  }
},
ak: {
  gun: [[0, null],
    [.12, { pos: [-.065, .065, .012], rot: [.15, .25, -.32] }],
    [.34, { pos: [-.07, .07, .01], rot: [.18, .26, -.36] }],
    [.50, { pos: [-.07, .07, .01], rot: [.18, .26, -.36] }],
    [.62, { pos: [-.058, .075, .008], rot: [.12, .22, -.28] }],
    [.79, { pos: [-.025, .045, 0], rot: [.20, .06, -.10] }],
    [1, null]],
  hand: [[0, 'fore', 'fore'], [.10, 'well', 'mag'], [.19, 'below', 'mag'],
    [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.50, 'below', 'mag'],
    [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.76, 'work', 'pinch'],
    [.83, 'work', 'pinch'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
  mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
  places: {
    well: { z: [.15, .90, .41], y: [-.60, -.28, -.75] }, below: { drop: .16 },
    work: { at: [.083, .042, .13], z: [.65, .25, -.72], y: [-.7, .15, -.4] },
    pouch: { at: [-.31, -.54, -.35], z: [.25, .9, .3], y: [-.4, -.6, .65] }
  }
},
smg: {
  gun: [[0, null],
    [.10, { pos: [-.035, .05, .015], rot: [.10, .20, -.23] }],
    [.51, { pos: [-.035, .055, .015], rot: [.10, .22, -.23] }],
    [.58, { pos: [-.03, .065, .008], rot: [.08, .16, -.18] }],
    [.72, { pos: [-.018, .04, 0], rot: [.14, .08, -.05] }],
    [1, null]],
  hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.17, 'below', 'mag'],
    [.32, 'pouch', 'mag'], [.36, 'pouch', 'pouch'], [.49, 'below', 'mag'],
    [.58, 'well', 'mag'], [.62, 'well', 'cup'], [.70, 'work', 'pinch'],
    [.78, 'work', 'pinch'], [.82, 'fore', 'fore'], [1, 'fore', 'fore']],
  mag: { grab: .10, swapOut: .315, swapIn: .365, seat: .58 },
  places: {
    well: { z: [0, .98, .20], y: [-.7, -.2, -.68] }, below: { drop: .12 },
    work: { at: [0, .115, .11], z: [0, -1, 0], y: [-.75, 0, -.66] },
    pouch: { at: [-.24, -.46, -.29], z: [.25, .9, .3], y: [-.4, -.6, .65] }
  }
}
```

### Integration gaps to close before pasting

1. `game/viewmodel.js:296–305` only uses `work` when `gun.slide` exists. All three models set `gun.userData.slide=null`, so these `work` keys currently fall through to the magazine foot. The proposed `places.work.at` is a new datum: Claude needs to let `placeFrame('work')` use a gun-local fixed point when no slide exists, with its supplied palm/forearm basis. This is a **motion-engine change**, not implemented here. For the GW-4 it should be a left-side bolt-release press at `.80`; for the AK a right-side charging-handle draw at `.80`; for the Wasp a top-knob pull at `.76`. Keep the existing sound beats or have the sound owner align them after inspection.
2. `readSockets` currently samples third-person hands; it does not consume `VM_SOCKETS`. The Wasp's magwell support and all authored wrist orientations need a source override. That must be checked with the 35° wrist limit and visible finger contact.
3. The current magazine follows the support palm between `grab` and `seat`, but has no keyed rock angle. The AK's magazine needs a front-hook and rotation around its catch at `.10–.19` and `.50–.62` to make `akRockOut/In` read as a rock-in rather than a vertical slide. Keep the third-person event/sound times; add rotation to the view magazine's path or hand frame, then run the wrist/mag contact checks.
4. Validate each hip pose and every reload beat in the Inspector and gameplay camera, at 16:9 and a narrow viewport, with suppressor and extended magazine fitted. Check NDC sight centring, butt/stock and mag against the near plane, muzzle/laser direction, no wrist past 35°, no hand farther than 1 cm from its socket, and AG-164's framing. The model builders are Grokbot's; this proposal does not move their geometry.
