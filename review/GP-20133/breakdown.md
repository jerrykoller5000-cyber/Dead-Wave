# GP-20133: first current-tree profile, 2026-11-13

Exclusive native WebGPU / RTX 5080, 1280x720. Current index SHA256 ffdccc856e3536de3a752a18c1aa7e4eeafecfe4c0a3b92a2f8b5d57357c4294. Production source unchanged during run; zero runtime errors. Review-only proxy inserts inclusive function timers; DevTools CPU sampling and existing bench profiler are enabled. These are diagnostic frame times, NOT uninstrumented acceptance measurements and NOT a historical regression comparison. Default graphics preset not explicitly pinned in this pilot; pin High in the matched follow-up.

- uzi: full 32 rounds; idle 18.104 ms -> firing 22.823 ms (26.063%). Per shot: muzzle/light positioning 0.028 ms; case spawn 0.122; firing sound 0.334; impact insert 0.047; exact traces 0.666; all projectile work 3.138; HUD 0.175. GPU render 1.09 ms/frame. New pipelines/node builds 0/2.
- ak: full 30 rounds; idle 21.302 ms -> firing 26.063 ms (22.351%). Per shot: muzzle/light positioning 0.03 ms; case spawn 0.117; firing sound 0.337; impact insert 0.05; exact traces 0.683; all projectile work 2.74; HUD 0.137. GPU render 0.28 ms/frame. New pipelines/node builds 0/0.
- minigun: full 300 rounds; idle 22.094 ms -> firing 25.677 ms (16.215%). Per shot: muzzle/light positioning 0.021 ms; case spawn 0.079; firing sound 0.248; impact insert 0.037; exact traces 0.587; all projectile work 2.095; HUD 0.127. GPU render 1.047 ms/frame. New pipelines/node builds 2/2.
- pistol akimbo: full 24 rounds; idle 16.623 ms -> firing 18.686 ms (12.411%). Per shot: muzzle/light positioning 0.017 ms; case spawn 0.05; firing sound 0.3; impact insert 0.017; exact traces 0.429; all projectile work 1.317; HUD 0.125. GPU render 0.912 ms/frame. New pipelines/node builds 0/0.

Timers overlap: exact trace is inside trainingRound, inside updateProjectiles. GPU timing covers the whole render; muzzle-light GPU cost is not isolated yet. spawnSmokePuff had zero calls; updateSmoke totals 0.2–2.0 ms over each firing window, so this path does not explain sustained lag. Barrel heat effects require a separate timed breakdown.

Main measured firing deltas are CPU rendering, repeated hold/arms solve, viewmodel, projectile traversal and effects. m:hold2+arms rises from ~0.004–0.006 ms idle to 0.785/0.947/1.213/0.983 ms per firing frame (WASP/KR-7/minigun/pistol pair). Render CPU rises 1.2–1.65 ms/frame on WASP/KR-7/pair; GPU remains about 0.23–1.09 ms. Impact insertion itself is only 0.017–0.05 ms/shot; do not assume GT-20105 impacts are the primary cause. Minigun also creates two pipelines/two node builds; its worst interval is 200.1 ms. Raw CPU samples prominently attribute work to matrix updates and holdWeapon/holdHand/holdDiveHand. viewmodel.filter is a renderer forwarding callback and its inclusive time is NOT evidence that the filter itself is slow.

Evidence: current-profile.json (eight idle/fire phases), breakdown.json, *-cpu.json, *-idle.png and *-firing.png. Harness profile.mjs uses the existing slot and bench instrumentation, forwards every effect and gameplay call, and never edits production files.

Next: obtain Director-provided d52e2139f export (no git), pin same High settings and camera, add cold/warm repeated paired passes without CPU sampler for acceptance, isolate source call sites and renderer/rig/collision paths. Send this breakdown before any production changes. No fix or 10% acceptance claim yet.

## Follow-up, current-tree bar

Director waived unavailable d52e2139f export in requests.md: current-tree full-magazine mean frame time within ~10% of idle is the bar. Two High low-overhead passes (no CPU sampler/general timers/bench profiler; residual impact/dummy timers present) saved in clean-summary.json: WASP +4.54/+5.40%, KR-7 +17.88/+19.13%, minigun +3.10/+6.01%, pistol pair +9.51/+0.35%. KR-7 fails; no completion claim. Minigun cold216.6ms hitch remains.

Review-only HUD ABBA (hud-abba.json) removes60 redundant chip/name DOM mutations per30-round magazine, preserves identical HUD end text, but firing times drift17.24/19.79/26.15/27.10ms and do not establish a causal speed benefit. No production optimization based on it. Paired harness removes general timers but Q.objects retains impact/dummy method timing; do not call those earlier measurements completely uninstrumented. Browser launches with --mute-audio, while AudioSys is unmuted: graph/API CPU work runs, audible listening is not verified.

Claude5 LATER: holdWeapon and both calls remain his CE-12 ownership; second solve assessed after first review ~21-22Z. Tick order is Claude2 shell. Do not edit those paths here. Current render-only case/light ablation is diagnostic: restores visual flags after each draw, never used as acceptance.
