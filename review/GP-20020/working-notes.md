# GP-20020 first-person placement working notes

Claude's request calls this GP-20019, but `node crew/crew.mjs newid chatgpt` allocated GP-20020 because GP-20019 already appeared in the request log. Claude was informed. Nine Jerry reference images and measured targets are at `docs/jerry/2026-11-03-fp-refs/`.

Current-source baseline: shared-slot real WebGPU `node review/GP-20020/pose-probe.mjs` captured all 12 view guns at 1080p, hip and ADS, with `problems=[]` and no page errors (`baseline-all/probe.json`). `hip-sweep.mjs` mutates only live nested `VM_POSES` values for comparisons; each image and telemetry sample is in `hip-sweep/`. Its first multiweapon runs stopped when the viewmodel transiently became inactive on sniper or flamer after several candidate changes. The script now saves each preceding sample; no source pose changed because of those failures. Single-weapon and `--target` runs exit 0.

Jerry's long-gun aim at hip: muzzle/sight NDC x +0.21..+0.25, y -0.11..-0.20; support hand x +0.19..+0.23, y -0.31..-0.46; a 35–45° line from lower right to center. Family: Military. The pictures must be reviewed at 1080p gameplay scale, with stock visible at lower-right hip and support sleeve entering upward from bottom. Claude owns sleeve anatomy/elbows and will refit hands as these positions land.

Landed source changes in `game/viewmodel-poses.js`:
- M4 hip `[0.18,-0.21,-0.40]`, yaw `-0.07`: tested muzzle `+0.210,-0.154`, support wrist `+0.244,-0.468`, zero page errors; screenshot `hip-sweep/m4/m4-target.png` inspected.
- AK hip `[0.18,-0.21,-0.40]`, yaw `-0.07`: tested muzzle `+0.205,-0.136`, support wrist `+0.239,-0.439`, zero page errors; screenshot `hip-sweep/ak/m4-target.png` inspected.
- Shotgun hip `[0.18,-0.21,-0.40]`, yaw `-0.12`: tested muzzle `+0.216,-0.118`, support wrist `+0.229,-0.516` (palm sits above wrist), zero page errors; screenshot `hip-sweep/shotgun/shotgun-target.png` inspected.
- Pistol hip y `-0.15` and roll `0` for an upright gun and lower rear notch. The tested nearby `pistol-upright` candidate used y `-0.17`, with muzzle `+0.244,-0.236`; source y `-0.15` is a 2 cm higher refinement for Jerry's rear-sight y near `-0.26`. Screenshot inspected. Current sleeve/elbow directions remain Claude's hand task.
- Revolver hip `[0.20,-0.19,-0.49]`, yaw `0.20`, retaining roll `0.12` for a low-right one-hand silhouette. Tested candidate muzzle `+0.158,-0.140`; screenshot `hip-sweep/revolver/revolver-low.png` inspected. Claude was told the support hand must leave the hip shot.

Sniper hip `[0.21,-0.28,-0.55]`, yaw `0` landed after a shared-slot three-candidate 1080p WebGPU check. The selected `hip-sweep/sniper/sniper-right.png` visibly puts the scope low right with muzzle NDC `+0.130,-0.183` and zero page errors, close to Jerry's AWP reference. Claude was asked to judge the still-visible support hand against the one-hand AWP shot.

Remaining gun placements to inspect/tune: Wasp/Uzi (MAC-10 reference), Breacher-12/AA12, flamer (Rust reference), launcher, minigun, chainsaw. The latter two may have purposeful centered or heavy framing; judge by Jerry's rule and their gameplay function, and log any intentional exception. After all source poses, run the focused real-renderer `tcl281` via the shared slot and request Antigravity final four-light all-gun visual gate. Coordinated full `npm test`, load and 48-zombie frame budget remain Cursor/Claude integration.
