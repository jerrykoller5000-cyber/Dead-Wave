# GP-19902 marine rig audit

Read-only source audit; no game/studio/tooling files changed. Geometry edge cases below are source-based predictions, not rendered findings.

## Safest character source

Use `TT.makeMarine()` in the already loaded native game page and `TT.dressMarine(fresh)` to apply that page's current wardrobe. Pose/render the new marine in its own THREE scene. Do not detach the live marine, use `clone()` on it, or export/reimport it with ObjectLoader for the working animation. Factory construction retains CPU deform callbacks, live references and actual current fitted body/head/kit. A fresh marine does not receive held/carried gameplay weapons, their effects, or the live shadow proxy.

The fresh factory root starts at zero. The game's live marine is subsequently placed at y=-.7 under a roll pivot at y=.7 (`index.html:17670` vicinity). For breakdance rotations use an independent outer translation/yaw root and hip pivot at .7, with the fresh marine at -.7 beneath it. Never copy the live root's -.7 without also providing the corresponding pivot.

`mergeRigidMeshes` merges only same-parent Mesh siblings by material and gear set. It leaves joint Groups intact. Hip/patches are explicitly kept; hands have a dummy child to prevent merge; live shoulder caps each have their own holder. The resulting factory rig remains articulated at every needed joint.

## Joint layout

- Root userData gives `lowerBody`, `hip`, `torsoG`, `headG`, `armLG/RG`, `elbowLG/RG`, `legLG/RG`, `kneeLG/RG`, `ankleLG/RG`, `gripL/R`, `weaponMount`.
- Facing +Z, up +Y. The L suffix means -X; R means +X (these names are not anatomical left/right).
- Lower body Group is root identity. Thigh pivots `[±.13,.62,0]`; knees `[0,-.27,0]`; ankles `[0,-.25,.01]`. Sole contact approx ankle-local `[0,-.103,.03]`. Boot toe extends to local +Z .185.
- Torso pivot root `[0,.7,0]`; shoulder pivots torso-local `[±.34,.38,.02]`; elbows `[0,-.28,0]`.
- Wrist accessible as `elbow.userData.wrist`; -X wrist `[.02,-.214,.06]`; +X wrist `[-.01,-.214,.05]`.
- Palm center relative wrist is `[0,-.048,.016]` both sides. Palm normal is +Z, extended fingers hang along -Y. This is the useful hand-plant contact, not gripL/R (those grip origins are forward of the real palm).
- Head pivot torso-local `[0,.52,0]`, fitted head scale `[.94,.97,.94]`.

Sources: `studio/marine-body.js:230-297` legs/boots; `:401-458` arms/hands; `studio/marine.js` adoptMarine and exact chain declarations; `studio/marine-hand.js` hand conventions/point API; `index.html` makeMarine and rollPivot.

## Deform updates

After assigning transforms call root.updateMatrixWorld(true), then:

```js
for (const arm of [u.armLG,u.armRG]) arm.userData.liveShoulder?.bend();
for (const leg of [u.legLG,u.legRG]) leg.userData.bootShaft?.userData.bend();
for (const elbow of [u.elbowLG,u.elbowRG]) {
  const wrist=elbow.userData.wrist;
  wrist.userData.hand.set(chosenHandPose).update();
}
```

Shoulder and boot mesh onBeforeRender/onBeforeShadow also call bend automatically. Hand pose deformation is explicit. Import `HAND_POSES`/`lerpPose` from `studio/marine-hand.js`; no studio edits needed.

The arm sleeve-cap deformation linearly blends torso-fixed vertices with arm-rotated vertices. It is intended to close shoulders under normal motion; repeated exact 180° arm reversals risk shrinkage/creasing. Favor arms raised about 125–150° with torso lean to achieve the silhouette rather than shoulder-only 180° bends. Hip/pelvis is rigid with overlapping thigh caps, not a continuous skinned pelvis: full horizontal side splits can show hard seams. Use modest straddles, bent knees and tilted pelvis for power moves; inspect the contact sheet at extremes. These are anticipated limits requiring native visual review.

## Outfit adaptation

`TT.dressMarine(fresh)` applies exact current page profile materials/styles (and changes no world gun furniture because fresh is not worldMarine). The factory's ownership visibility is bare-head/bare-torso only; copy `live.userData.gearParts[k][i].visible` to matching fresh entries after dressing, plus live nvgPivot rotation, eyewearG.visible and bareFaceDetails.visible where present. Both are freshly built from the same deterministic factory so gear array ordering matches. Do not indiscriminately copy `.visible` over the entire tree: that reveals alternate gloves/shorts/hats hidden by the wardrobe.

Storage key is `tt_wardrobe`. Fresh camera test profiles have default m81 woodland, coyoteBrown mask, cover, down sleeves/full trousers/gloves/black boots, hair darkBrown/eyes brown/skin3. This is not proof of Jerry's currently saved in-game wardrobe: that requires the actual live profile or explicit snapshot. All render proof should name what profile was used.

## Contact choreography

Use beat-time pose targets plus constrained two-bone IK for support limbs. Existing `studio/ik.js` `ikLimb()` is world-space, handles arbitrary parent rotation/scale and an optional actual endLocal offset; existing `index.html` `solveArmIK` preserves natural negative elbow bend and the wrist x offset. The public studio solver ignores endLocal.x; for palm plants solve to wrist, allow <=2 cm x approximation or implement the existing analytic branch in the independent UI module.

For a desired planted palm point P and world palm quaternion Q: wrist target = P - Q*[0,-.048,.016]. Solve shoulder/elbow to that wrist target, then wrist.localQ = inverse(elbow.worldQ)*Q. `Q=Rx(π/2)` makes palm normal world-down and fingertips toward -Z; prepend world yaw for another fingertip direction. Planted boot target similarly subtracts desired foot quaternion times `[0,-.103,.03]` from sole point. Keep support points fixed over their stance interval, blend hand/foot release on offbeats, and move pelvis so reach stays below .50m for legs/.50m shoulder-to-wrist. World-fixed supports make six-step, freezes and floorwork read far better than uniformly oscillating all limbs.

Suggested phrases: 8 beats swagger/bounce; 16 top rock/Indian step; 16 cross-step/running man; 16 crouch into six-step/CC kicks; 16 supported sweep/backspin; 16 alternating freezes and knee-up recovery; reprise top rock and final freeze on last hit. Smooth pose interpolation with quicker beat accents; weight shifts should precede foot lift.

## Rendering

TT.THREE is the vendored `three.webgpu.js` superset, also mapped by import specifier `three`. It exposes WebGPURenderer, Scene, PerspectiveCamera and ordinary geometries/materials. Use `new THREE.WebGPURenderer({antialias:true,alpha:true,powerPreference:'high-performance'})`, await `.init()`, falling back via `{forceWebGL:true}` if necessary. Own scene/render loop means gameplay cannot overwrite the fresh character's pose. Matching native color pipeline is SRGB output and NoToneMapping; a separate polished stage can choose its own tested lighting/tone map intentionally.

Object3D `.clone()` recursively JSON-copies userData with references to other rig objects/geometry; the game already avoids this via cloneLean for weapons. ObjectLoader export loses the shoulder/boot callbacks and hand rig closures even if userData is stripped. A static export is possible but dynamic fidelity would require explicitly saving/reconstructing these deformers, so the factory route is substantially safer for this clip.
