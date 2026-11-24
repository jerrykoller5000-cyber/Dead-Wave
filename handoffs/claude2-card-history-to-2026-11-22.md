# Claude 2 card notes moved out of crew/status/claude2.md (23 Nov, trim)

### Where things stand (claude2, 22 Nov ~07:00Z, Opus 5.5)
- LANDED: CB-374 quick semi taps (index a113bd7a, tcb341 NEW) and ChatGPT CH-2 phase 1 (index 00deadb2 + 5 UI files). Cloud green on 00deadb2.
- CB-373 OPEN: native ABBA asked of ChatGPT on review/CB-373/index.cb373bd.html (fix B warm-in-countdown + fix D three getKeys memo) ->
  review/CB-373/native-bd/. Land B with make-cb373b.py on live; D = same getKeys replacement in vendor/three/three.webgpu.js (make-cb373d.py shows it).
- Leads: carry seat solver allocs (Claude 3 told), Training flow field built from valley terrain under the room (updateFlowFieldOn), the buy stall (--buy trace).
- Loans out: ChatGPT (D-231 t285/t332, CH-2 phase 2 scope + guards, D-238 chip LOD one condition), Claude 9 (CI-3: I run make-s1.py), Claude 3 (CC-366 2 lines after numbers).
- PC quirk: cp/open('w') onto an existing file can fail EINVAL from the VM (ui/training-panel.js): write it with device_commit_files instead.

### Where things stand (claude2, 22 Nov ~01:05Z, Opus 5.5)
- CB-373 part 1 DONE+LANDED: call-in pool fill (index 5d75c3c5) + tcb340; Director ACCEPTED 00:56Z. Report handoffs/2026-11-22-claude2-CB-373.md,
  findings review/CB-373/FINDINGS.md. tools/hitchhunt.mjs v3 (f2721ad8) on the PC: native runs by ChatGPT (--exclusive).
- NEXT (CB-373 still open): read review/CB-373/native-v3/hitchhunt.txt ("new render pipelines" list) -> fix B first-kill compile
  (likely warm skullDropMesh per kind in the Training warm-up, ~68960), C bomber blast frame, D allocators (60-270 MB GCs).
- Then lever C (pick a new tcb number; tcb339/tcb340 are taken), CB-370.

### Where things stand (claude2, 21 Nov ~23:35Z, Opus 5.5)
- LANDED CB-372 (D-235): rack spots fixed (catalogue order); a carried gun leaves a bare peg. index.html 8d6fadbf, tcb339 (new),
  t180 D-235 line (--review, Director OK). Native sheet review/CB-372/rack-sheet-native.jpg. Also CI-2 glove + ctx.viewLights (9e917109).
- t214 (revolver loader, 1 fail) and t336 (2 Training floor fails) fail on live too: not mine, owners to be told.
- CB-373 (D-237 #1-2) IN: tools/hitchhunt.mjs (new, not landed in tools yet: cloud copy) records every frame in Training with step,
  alive, pipelines/programs, heap -> hitches > 33 ms with cause + per-kind steady cost. Native run needed (Antigravity 2 is idle).
- Loans out: Claude 10 (CJ-2/CJ-3/glow, landed), ChatGPT (D-231 shop tabs, D-222, D-237 slow-mo, impact callers), Claude 3 (CC-365 reset
  line), Claude 5 (CE-23 3 hunks + prewarmDeath), Claude 7 (t219, landed). Lever C next after CB-373 (note: tcb339 is now CB-372's).

### Where things stand (claude2, 21 Nov ~20:40Z, Opus 5.5)
- LANDED: hidden walk v2 (index 06047e6b; GP-20187 frame -8%, matrices -0.70 ms; READY delta inside noise) and the HQ Armory
  cage collider CB-371 (index b72be932 + tools/tests/tcb338.js). Tools landed: tools/strict48.mjs, strict48-fixture.js,
  bench.mjs opt-in flags (--fixture --page --map --window --vsync --out --cal), abtime.mjs --page. Backups _DELETE ME/CB-369-backup/.
  Ready to commit: index.html, those tools, tcb338.
- Noise: A/A floor 16.7% of the frame (launch speed states, 23 vs 27 ms same code). --cal + "frame at median speed" in
  strict48; abtime --page review/CB-369/hidden/index.hidwalk2-ab.html for in-page A/B.
- CD-18 A1/A5: waiting ChatGPT 3's native rack pictures (review/CB-369/cd18/rack-shots.mjs; copy index.cd18-0604.html was on
  d00a853c: rebuild on live with make-cd18.py) -> Director LOOK -> land + tcb337.
- Lever C: review/CB-369/LEVER-C-NOTE.md. CI-2 (Claude 9): answered free; add {hemi, ambientFill, flashlight} to createViewmodel ctx at landing.
- Cloud lesson: kill only exact node PIDs (pgrep-like greps matched my own shell); an orphan Chrome keeps the cloud slot lease.

### Where things stand (claude2, 21 Nov ~08:40Z, Opus 5.5)
- D-216 hidden walk (REVIEW): review/CB-369/hidden/index.hidwalk-9f26.html 4297f233 (make-hidden.py rebases). The frame's matrix
  walk skips hidden subtrees (62% of its 4,398 nodes with 48 brutes); bones walked even hidden. Cloud: walk-exact 0 wrong,
  stale reads 0, t204/t111/t142/t164/t271/tcl288a green (t222 times out in the cloud on live too). WAITING ChatGPT 2 native
  strict ABBA (same file, ?hidwalk=0 = control). Green -> land; then next levers: marine hidden parts in the hold walks
  (Claude 3 FYI), draws.
- GU-5 restart + WebGL forest LANDED (index 9f264756). Stars wait for the Director's look.
- CD-18 A1/A5 (REVIEW): review/CB-369/cd18/index.cd18-9f26.html 6e9b5d05 + tcb337.js (cand 10/0, live 5/3, planted peg FAIL).
  WAITING Claude 1's before/after pictures, then the Director's LOOK, then land index + tcb337.
- crew.mjs signed-reply rule LANDED (crew/request-status.mjs + test). panel.html line 424 still old (Director's file).
- Cloud test page: fakethree/faketsl stubs landed (TSL.color, mat4, InterleavedBuffer); the page had stopped booting.
- Pass 3 (CB-370) notes from AH-5 in handoffs/2026-11-21-claude2-CB-369-s4.md.

### Where things stand (claude2, 21 Nov ~01:10Z, Opus 5.5)
- CB-369 (D-216): vault static batch candidate A review/CB-369/index.cb369.html 5af04a41 (live ce43865a + 4 lines;
  make-candidate.py rebases) + core/static-batch.js (NEW, landed unused, 530b3fc1). Vault 124->41 / 115->38 shadow;
  48-brute view 571->407 draws (cloud). Sheet vault-before-after.jpg. B = A + nearest-16 zombie shadow cap (5004b135,
  ?zshadowcap=999 off; cloud 48->20 casters). WAITING: Director LOOK (A, B pick, camera fix) + ChatGPT 2 native strict ABBA.
  Census: unnamed meshes = forest instanced (48), nothing to batch. Next big: marine body 50 draws (Claude 3's body).
- CB-368 HELD; copy fixed: manifest-v2.json (minus hitH A = ChatGPT 2's fb7a4591; rebased on ce43865a / e3bb0cab).
- camera.mjs stale-scene fix: review/CB-369/camera.cb369.mjs (make-camera.py), lands on the Director's OK.
- Training WebGPU zero draws: early-return list sent to ChatGPT; waiting DWOpening.active value.
- PC shell is slow: tar the tree in pieces (<170 s each); background jobs die with the call.

### Where things stood (claude2, 20 Nov ~20:40Z, Opus 5.5)
- CB-363 jaw packer seam: ACCEPTED in review (Director 19:34Z). review/CB-363 (index.cb363.html e4f928b8 on live 06f08f88, 5 lines;
  packer-probe.mjs 48/48). Lands later as ONE jaw batch (CB-363 + ChatGPT joins rebased on 3b859926 + Claude 3 s43 tags + Claude 5
  swing) after the Director's motion look. If index.html moves first: rebuild with review/CB-363/make-candidate.py (rebase).
- CB-365 CE-18c TT-ready code proof: ACCEPTED 19:34Z. Done.
- CB-367 tools/abtime.mjs (in-page A/B, diagnostic only) DONE: calibrated (+2.4 ms known -> +2.58 in PROF zombies). Cloud = --fake
  --headless (CPU only, noisy); native = no flags. Cache-on-shared-object limit: --warm-first B.
- CB-368 spider batch review copy (review/CB-368, manifest.json) built; native t111/t222/t278 asked of ChatGPT 2. hitH pick A
  does NOT fix t111 on P5 (head lower in play than at build): A2/A3 asked of the Director (my pick A3: posed head top + 0.03*s).
  t278 threw on the fake page (death finds no knee skin verts on model42). LANDED fakethree 4a024970 (Bezier/Line/CurvePath).
- CB-369 brute draws (D-216 priority): brute = 1 skin = 2 draws (96 of 584). Big lever = scene: relay vault ~100 draws, ~89
  unnamed meshes, marine body 50, 265 shadow draws. PLAN.md sent; waiting the Director's OK to build (1) the vault static batch
  (core/ helper; vault model studio/relay-vault-model.js, owner to confirm). Parts census run timed out (CDP): rerun the probe with --quick (draws-probe.mjs already has byPart/shadowByGroup); the PC copy is the current one.
- Later: CC-359 step 4 LOD1 for Claude 3. CB-343 queue.
- Cloud: tree /home/claude/tt (fresh each session). The cloud tarball MUST add assets/intro/*.js *.css in a SECOND tar
  (--exclude=assets/intro wins over explicit paths); without them TT never appears. The real page runs in the cloud headless with
  &raf=timer (WebGL, ~12 min a probe page); tests use the fake-three page.

