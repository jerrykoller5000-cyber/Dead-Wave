# CL-281 stage 3 — proposed view-gun numbers

ChatGPT, GP-19994, 2026-10-31. **Data proposal for Claude; no game code changed.** This follows [stage 2's table](fp-stage2-table.md), `game/viewmodel-poses.js` and Claude's [stage-1 GPU corrections](../../handoffs/2026-10-31-claude-CL-281-stage1.md). View space is right `+x`, up `+y`, ahead `-z`; gun space has the bore along `+z`. `hip.at` is the firing grip's view-space position. `ads.rear` is the distance from the eye to `SIGHT[k].pos`, not the butt or the ocular lens. All lengths are game units (approximately metres), rotations radians, and reload beats fractions of that weapon's actual reload duration.

## Evidence and confidence

- I inspected AG-164's [shotgun hip](../../qa/2026-10-31-AG-164/shots/shotgun-fp-hip.png), [Breacher-12 hip](../../qa/2026-10-31-AG-164/shots/aa12-fp-hip.png), [revolver ADS](../../qa/2026-10-31-AG-164/shots/revolver-fp-aim.png) and [sniper ADS](../../qa/2026-10-31-AG-164/shots/sniper-fp-aim.png), plus its [audit](../../qa/2026-10-31-AG-164/report.md) and [shotgun reference card](../../qa/2026-10-31-AG-164/references/ref-shotguns.png). The old screenshots establish defects, not final view-space measurements. Hip locations and recoil below are **low-to-medium confidence inferences** for AG-168 to tune on the GPU.
- Grip and existing fore points are **high confidence**: copied from `WEAPON_HOLD` at `index.html:48989–48997`. Pump, port, drum, cylinder, hammer, magazine, bolt and scope locations are **high confidence where explicitly modeled** in `studio/weapon-longarms.js` and `studio/weapon-sidearms.js`. Socket orientations, magazine/cylinder palm positions and gun turns are **medium confidence** until hand-contact shots.
- Timing is **high confidence** where copied from `RELOAD_PLAN` (`index.html:23632–23644`) and `RELOAD_CUES` (`index.html:47486–47497`), but the view-specific cycles and fingers need integration tests. The stage-1 correction matters: elbows are **points** low and wide in view space; each hand rotates around its grip channel toward its elbow before the 35° wrist bend. A support hand coming from view left needs its forearm toward gun `+x`, because the view gun is turned 180° and gun `+x` becomes view left.

## VM_POSES: starting entries

Keep `VM.fov=60`, `adsFov=54`, `near=.01` and the existing world scope zoom. The shotgun/AA-12 stocks are about `.440/.406` behind their respective grips; the proposed hip distances leave their butt pads about `.27/.37` ahead of the eye before cant. The sniper butt is about `.523` behind its grip; hip `-.82` leaves about `.30`. The shotgun and AA-12 ADS rear distances leave their butt pads about `.10` ahead of the eye. The sniper deliberately differs: true scope relief puts its stock *behind* the eye, outside the visible scope picture. Never push the scope half a metre away merely to keep the butt in front of the eye.

```js
shotgun: {
  hip: { at: [0.19, -0.19, -0.71], yaw: 0.025, pitch: 0.045, roll: 0.105 },
  ads: { rear: 0.35 },                 // SIGHT.shotgun [0,.105,-.25]; bead at z=.915
  kick: { back: 0.075, up: 0.19, side: 0.035, ads: 0.58 },
  elbows: { r: [0.40, -0.78, 0.07], l: [-0.41, -0.77, 0.06] },
  reload: 'tube'
},
aa12: {
  hip: { at: [0.20, -0.23, -0.78], yaw: 0.03, pitch: 0.035, roll: 0.095 },
  ads: { rear: 0.43 },                 // SIGHT.aa12 [0,.1807,-.25]; rear aperture
  kick: { back: 0.032, up: 0.075, side: 0.015, ads: 0.48 },
  elbows: { r: [0.41, -0.80, 0.08], l: [-0.43, -0.79, 0.05] },
  reload: 'drum'
},
revolver: {
  hip: { at: [0.18, -0.13, -0.49], yaw: 0.01, pitch: 0.025, roll: 0.11 },
  ads: { rear: 0.43 },                 // SIGHT.revolver [0,.1073,-.40]; notch [-.05,.114]
  kick: { back: 0.055, up: 0.20, side: 0.032, ads: 0.55 },
  elbows: { r: [0.37, -0.76, 0.07], l: [-0.35, -0.76, 0.07] },
  reload: 'cylinder'
},
sniper: {
  hip: { at: [0.20, -0.20, -0.82], yaw: 0.025, pitch: 0.025, roll: 0.09 },
  ads: { rear: 0.17 },                 // see scope-axis correction below; ocular glass z=-.2185
  kick: { back: 0.09, up: 0.24, side: 0.018, ads: 0.58 },
  elbows: { r: [0.42, -0.79, 0.08], l: [-0.44, -0.78, 0.07] },
  reload: 'sniper'
}
```

The Breacher-12's per-shot kick is lower than the pump's, so its `.19 s` full-auto interval does not repeatedly throw the sight picture offscreen (J20). These are view-gun kicks, not permission to change the world camera's recoil. For the revolver, `SIGHT.revolver` intersects its modeled hammer spur: the spur reaches about `y=.120` at `z=-.08`, while the notch line there is about `y=.113`. **Pose numbers alone cannot clear J13** because the hammer lies on the bore's centre line. Lower/reshape the idle hammer or set an aim-safe hammer pose with Grokbot, and prove at least 5 mm between its projected silhouette and the sight line in ADS. Retain the keyed cock/fall during fire and the reload's `.88–1.0` cock pulse.

The sniper's model scope axis is `y=.14` (`studio/weapon-longarms.js:540–555`), but `SIGHT.sniper.pos.y=.180` in `game/sight-points.js`. That is a **40 mm axis mismatch**. Before enabling sniper ADS, coordinate a correction to `[0,.14,-.20]` and test the optic axis through the ocular and objective. With `ads.rear=.17`, the eye is about `.1515` behind the rear glass at `z=-.2185`, within the intended relief range in `game/sight-points.js`. At full scope, the existing 2X/4X/6X world FOV and `#scopeOverlay` must agree with the view gun: either mask the gun under the scope blackout or fade it as the eye enters the optic, with no abrupt raise snap. The 54° view-gun FOV must not magnify its metal into the scope image.

## Gun-local sockets

These are proposed `VM_SOCKETS` data for an authored-source override. `game/viewmodel.js:251–269` currently samples the settled third-person wrists instead. `grip` copies `WEAPON_HOLD`; `support` copies its fore point except for the moving pump; `part`/`port`/`work` are contact targets. Keep existing `gunEffects` muzzle and `SIGHT` instead of silently changing their coordinates.

```js
shotgun: { grip: [0,-.088,-.056], support: [0,-.035,.28],
  pumpRoot: [0,-.02,.28], port: [.02,-.05,.22], muzzle: [0,.03,.97] },
aa12: { grip: [0,-.145,-.166], support: [0,-.035,.36],
  drumFoot: [0,-.415,.05], work: [-.08,.05,.18], muzzle: [0,.015,.98] },
revolver: { grip: [0,-.07,-.04], support: [-.058,-.10,-.014],
  cylinderClosed: [0,.05,.02], cylinderOpen: [.095,.042,.03],
  ejector: [0,.046,.143], loaderFace: [.095,.042,-.02], muzzle: [0,.083,.35] },
sniper: { grip: [0,-.088,-.117], support: [0,-.005,.35],
  magFoot: [0,-.203,.02], boltKnob: [-.13,.067,-.16],
  scopeAxis: [0,.14,-.20], ocular: [0,.14,-.2185], muzzle: [0,.04,1.22] }
```

- Pump support is a **moving socket** on `gun.userData.pump`, not a fixed root point: `pumpRoot` starts `(0,-.02,.28)` (`studio/weapon-longarms.js:403–415`) and moves `-.12` in gun `z` during an empty-start reload pump (`index.html:24226–24235`). `port` is `reloadShell.position` on the bottom gate (`studio/weapon-longarms.js:441–446`). The forearm must follow the pump's actual matrix on every stroke, including the post-shot pump.
- The Breacher-12's seated drum centre is `(0,-.26,.05)` and its radius `.155`, so the proposed lower palm contact is `y≈-.415` (`studio/weapon-longarms.js:298–325`). Extended drum scaling can move the foot; recompute it from bounds as `footOf()` does. The `work` point is the visible left charging handle at `(-.08,.05,.18)` (`:273–278`), but it is static geometry: a press/rack needs a keyed part or hand pose.
- The revolver cylinder's base is `(0,.05,.02)` (`studio/weapon-sidearms.js:262–275`). Its actual open pose adds `.095` in `x`, `-.008` in `y`, `+.01` in `z` (`index.html:24306–24319`); target the open cylinder's rear face for loader contact. The ejector rod is at `(0,.046,.143)` on the fixed underlug (`studio/weapon-sidearms.js:289–297`), so an ejector press is a proposed hand gesture, not a modeled moving rod. Do not treat this cylinder as a detachable magazine.
- The sniper's magazine group is `(0,-.12,.02)` with its lower plate near local `y=-.083` (`studio/weapon-longarms.js:499–509`). The bolt pivot is `(-.055,.055,-.18)` and its knob-local grab is `(-.075,.012,.02)`, making the root-space grab `(-.13,.067,-.16)` **before bolt animation** (`:559–571`). Follow `gun.userData.bolt` through lift/pull/push/close, rather than freezing this number. The support forearm should approach from its own side and then rotate its hand toward that moving knob.

## VM_RELOADS: paste-ready values and needed schema extensions

The existing view engine reads `gun`, `hand`, `mag`, `places` for a detachable magazine. `drum` and `sniper` below fit that shape, except fixed/bolt `work` targeting still needs engine support. `tube` and `cylinder` intentionally introduce `kind` and cycle/part data: **Claude must implement those branches before adding their `VM_POSES` entries.** They must not be faked as magazine reloads. `places.*.y` is the desired forearm direction; `+x` in gun space keeps the support arm to view left after the bore turn. `pouch.at` alone is view space; the rest are gun-local. The shell uses the existing `cup` fingers; `loader` is a proposed new finger/prop state.

```js
drum: {
  gun: [[0,null], [.12,{pos:[-.065,.075,.025],rot:[.12,.24,-.27]}],
    [.52,{pos:[-.065,.075,.025],rot:[.12,.24,-.27]}],
    [.62,{pos:[-.055,.085,.018],rot:[.10,.19,-.22]}],
    [.78,{pos:[-.035,.05,.01],rot:[.13,.08,-.09]}], [1,null]],
  hand: [[0,'fore','fore'], [.12,'well','mag'], [.19,'below','mag'],
    [.34,'pouch','mag'], [.38,'pouch','pouch'], [.53,'below','mag'],
    [.62,'well','mag'], [.66,'well','cup'], [.76,'work','pinch'],
    [.83,'work','pinch'], [.88,'fore','fore'], [1,'fore','fore']],
  mag: {grab:.12,swapOut:.335,swapIn:.385,seat:.62},
  places: {well:{z:[0,.94,.34],y:[.62,-.28,-.73]},below:{drop:.19},
    work:{at:[-.08,.05,.18],z:[-.6,.25,-.75],y:[.65,-.35,-.67]},
    pouch:{at:[-.32,-.60,-.38],z:[.25,.9,.3],y:[-.4,-.6,.65]}}
},
sniper: {
  gun: [[0,null], [.16,{pos:[-.055,.065,.025],rot:[.11,.20,-.23]}],
    [.54,{pos:[-.06,.07,.025],rot:[.11,.20,-.23]}],
    [.62,{pos:[-.045,.07,.02],rot:[.08,.16,-.20]}],
    [.78,{pos:[-.035,.055,.02],rot:[.17,.06,-.10]}],
    [.94,{pos:[-.025,.035,.01],rot:[.11,.03,-.05]}], [1,null]],
  hand: [[0,'fore','fore'], [.10,'well','mag'], [.17,'below','mag'],
    [.30,'pouch','mag'], [.34,'pouch','pouch'], [.45,'below','mag'],
    [.54,'well','mag'], [.58,'well','cup'], [.62,'work','pinch'],
    [.72,'work','pinch'], [.83,'work','pinch'], [.94,'work','pinch'],
    [1,'fore','fore']],
  mag: {grab:.10,swapOut:.295,swapIn:.345,seat:.54},
  places: {well:{z:[0,.96,.28],y:[.60,-.28,-.75]},below:{drop:.14},
    work:{part:'bolt',grab:[-.075,.012,.02],z:[-.8,.1,-.6],y:[.6,-.25,-.76]},
    pouch:{at:[-.32,-.54,-.34],z:[.25,.9,.3],y:[-.4,-.6,.65]}}
},
tube: {
  kind:'shell',
  gun:[[0,null],[.12,{pos:[-.025,.055,.015],rot:[-.14,.10,.04]}],
    [.78,{pos:[-.025,.055,.015],rot:[-.14,.10,.04]}],
    [.90,{pos:[-.02,.04,.015],rot:[-.08,.05,.02]}],[1,null]],
  // One local cycle v=0..1 for each required shell; map it over the load window.
  cycle:[[0,'pouch','pouch'],[.18,'pouch','cup'],[.52,'port','cup'],
    [.76,'port','cup'],[.92,'port','open'],[1,'pouch','pouch']],
  shell:{loadStart:.12,loadEndFull:.88,loadEndEmpty:.78,visibleFrom:.18,
    seatAt:.76,pumpEmpty:[[.80,'pump'],[.90,'pump'],[.98,'fore']]},
  places:{port:{at:[.02,-.05,.22],z:[0,.9,.43],y:[.68,-.22,-.70]},
    pump:{part:'pump',at:[0,-.015,0],z:[0,.5,.866],y:[.65,-.42,-.64]},
    pouch:{at:[-.28,-.52,-.30],z:[.25,.9,.3],y:[-.4,-.6,.65]}}
},
cylinder: {
  kind:'part',part:'cylinder',
  gun:[[0,null],[.14,{pos:[-.025,.04,.025],rot:[-.06,.13,.05]}],
    [.78,{pos:[-.025,.04,.025],rot:[-.06,.13,.05]}],
    [.96,{pos:[-.015,.025,.012],rot:[-.03,.07,.02]}],[1,null]],
  hand:[[0,'fore','fore'],[.08,'part','open'],[.16,'ejector','open'],
    [.20,'ejector','pinch'],[.28,'pouch','open'],[.36,'pouch','loader'],
    [.46,'loader','loader'],[.76,'loader','open'],
    [.82,'part','cup'],[.94,'fore','fore'],[1,'fore','fore']],
  partKeys:{open:[0,.16],eject:[.14,.20,.28],load:[.28,.78],close:[.80,.96],
    hammer:[.88,.94,1]},
  places:{part:{part:'cylinder',at:[0,-.035,-.04],z:[0,.95,.31],y:[.65,-.3,-.7]},
    ejector:{at:[0,.046,.143],z:[0,.8,.6],y:[.65,-.3,-.7]},
    loader:{part:'cylinder',at:[0,0,-.06],z:[0,.9,.44],y:[.65,-.3,-.7]},
    pouch:{at:[-.24,-.49,-.27],z:[.25,.9,.3],y:[-.4,-.6,.65]}}
}
```

The Breacher-12 follows `RELOAD_PLAN.aa12` reach `.12`, pouch `.34`, seat `.62`, home `.84`; `RELOAD_CUES.aa12` has drum-out `.10`, drum-in `.52`, slap `.62`, charge `.80`. Its support palm must visibly span the drum's *lower face*, not just the feed tower. The sniper follows reach `.10`, pouch `.30`, seat `.54`, bolt work `.62–.94`; the cues are mag `.10/.13/.48/.55`, bolt up/back/forward/down `.66/.72/.83/.91`. Keep bolt and palm locked in the same moving part space through all four strokes.

The pump's game reload duration is dynamic: `.45 + need * .42` seconds, with `need` shells; the insertion window is `.12–.88`, or `.12–.78` if started empty (`index.html:24171–24242`). For each shell `i`, map `v = clamp((u-loadStart)/(loadEnd-loadStart)*need - i,0,1)` and use `cycle` to move shell and palm together. Only an empty-start reload pumps, over `.80–.98`, with sounds at `.80/.90`; normal post-shot pump remains separate (`index.html:23427–23490`). The current third-person `reloadShellState(u)` (`index.html:23658`) describes one fixed window, so the view cycle must use the actual `need` and must not show just one shell for a multi-shell reload.

The revolver's game reload duration is `.55 + need * .38` seconds, its cylinder opens by `.16`, spent brass ejects at `.18`, insertion spans `.28–.78`, it closes `.80–.96`, and the hammer pulse is `.88–1.0` (`index.html:24252–24347`). Keep the existing per-round `chamberStep` and sound pulses. `loader` is a **proposed visual prop/finger state**: the model has no authored speed-loader object, and stage 1 has no `'loader'` finger pose. Claude can either add one with the existing hand rig or keep `pinch` until Grokbot supplies the prop; do not display a floating loader. Akimbo revolvers have no free support hand and need their separate sequential dip path, not this single-gun reload.

## Integration checks before enabling the four poses

1. Extend `game/viewmodel.js` by reload kind: a visible shell following the support palm and port on each pump cycle; a cylinder whose mesh remains attached to the gun and whose hand targets follow its swing; `work` targeting a fixed drum handle or a moving bolt/pump. The current `magState(R,u)` assumes `R.mag`, `placeFrame('work')` only targets `gun.slide`, and `footOf()` only supports a detachable magazine. A `VM_POSES` entry will activate the view gun immediately, so stage the data with the engine branch in the same change.
2. Align the sniper's `SIGHT` point with the modeled scope axis and check eye relief through the ocular; reconcile the scope overlay with the view-gun depth/FOV. Clear the revolver's idle hammer from its notch line. These are hard optical blockers, not values to tune by moving the whole gun off centre.
3. Run the Inspector and gameplay camera through hip, ADS, shot, reload frame strips, crouch, look down/up, 16:9 and narrow viewport, four lights, suppressor/extended-mag variants and the scope's 2X/4X/6X. Check wrist bend ≤35°, hand/socket gap ≤1 cm, sight error near 0 NDC, no near-plane cut, no drum or pump crossing the eye, no detached brass or shell. Compare with AG-164 and have AG-168 score hands, wrists, placement, sights and motion ≥4/5. Record before/after shots, load time and frame rate. Every game run goes through the crew test slot; this docs-only proposal did not start the game.
