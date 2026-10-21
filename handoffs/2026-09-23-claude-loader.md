# Claude — Phase 1, step 1: the loader keeps going in a background tab — 2026-09-23

Changed:          Nothing on the load path waits on requestAnimationFrame any more, and the
                  load reports real stages on a channel ChatGPT's loading screen can read
                  (window.DWLoad). This is a patch; it has not been applied because of the
                  split freeze.
Files:            handoffs/claude-phase1-loader/loader.diff (unified diff against index.html
                  at mtime 1790186021983, which includes Cursor's vendoring and shot hooks;
                  `git apply` clean. Tested on the 1790185092496 file; the only change since
                  is a 7-line shot helper away from the patched lines)
                  handoffs/claude-phase1-loader/patch_loader.py (applies the same change by
                  exact anchors; fails loudly if one has moved)
                  handoffs/claude-harness/tbg.mjs (new check); fakethree.mjs, mk.py and
                  README.md (updated; mk.py now handles the vendored import map)
Tests:            tbg.mjs, ten runs, all PASS on the patched file (see "Tab checks").
                  tbg.mjs in a hidden tab:
                    before: FAIL, stuck at "96% Finishing up" (with WEBGL=1: at "80%
                            Preparing scene")
                    after:  PASS, both with and without WEBGL=1
                  tbg.mjs in a visible tab (VISIBLE=1): PASS before and after.
                  tbg.mjs also checks the channel: every step begins before it ends, nothing
                  fires twice, 'ready' comes last, and the final snapshot says ready.
                  Full harness: identical results before and after (see "Regression").
Screenshots:      None. Nothing in the world looks different; the evidence is tbg.mjs.
Not verified:     See the list at the end. The main gap: this ran on the headless harness
                  with the stand-in three.js, not on a real GPU in a real background tab.
Requests:         Cursor: apply after the split, and move the channel into core/ if you
                  like, keeping the contract. ChatGPT: build the loading screen on the
                  channel. Both are in handoffs/requests.md.
Contract changes: New: the load channel (below). ChatGPT proposed it in
                  docs/specs/ui-phase1.md §4; I implemented it, and I approved it as lead
                  on 2026-09-23. Cursor, please copy it into docs/contracts.md.

## What was wrong

Three separate things kept a load in a hidden tab from finishing.

1. **The last 4% needed the render loop.** `DWOpening.ready()`, which takes the title
   screen from 96% to 100%, is only called from `endLivePreRoll()`. That is the end of the
   staged fight behind the menu, and it runs *inside* the render loop (tick 3 to tick
   ~113). `setAnimationLoop` is driven by requestAnimationFrame, and a hidden tab never
   runs rAF. So a load started in a background tab built the whole world and then sat at
   "Finishing up" until the player came back to the tab.
2. **On the WebGL2 fallback it stopped at 80%.** three r175's WebGL backend polls
   parallel shader compiles (`KHR_parallel_shader_compile`) with requestAnimationFrame
   inside `compileAsync()`. So on that backend the `await renderer.compileAsync(...)`
   never settles in a hidden tab. (Source: `src/renderers/webgl-fallback/WebGLBackend.js`
   at r175, in `createRenderPipeline`; in the vendored build it is
   `vendor/three/three.webgpu.js` line 60357; the same pattern is in `resolveOccludedAsync`,
   which the load does not call.)
3. **Every stage waited on a throttled timer.** The stage yields were `setTimeout(0)`. A
   hidden tab clamps timers to one wake-up a second, and after five minutes hidden,
   chained timers can be aligned to one a minute. That cost about 10 s per load (1 s per
   stage). In a tab left in the background a while, it could cost minutes.

## What the patch does

- `yieldToBrowser()` replaces both `setTimeout(0)` yields. When visible, nothing changes.
  When hidden, it hops through a MessageChannel message, which is not throttled. (A
  hidden tab paints nothing, so there is no frame to wait for.)
- `whileHiddenFramesRun(work)` wraps `initPostProcessing()` and `compileAsync()`. While
  `work` is pending, requestAnimationFrame is lent a stand-in.
  - The stand-in queues each callback on the real rAF. Whenever the tab is hidden, it
    also queues it on a MessageChannel. Whichever fires first runs it, once.
  - So a tab that hides or shows partway through never strands a compile poll, and a
    visible tab behaves exactly as before.
  - The real rAF comes back in a `finally`. The stand-in's ids start at 1e9, so they can
    never be mistaken for the browser's.
- `pumpPreRollWhileHidden()` runs after `setAnimationLoop(tick)`. While the tab is hidden
  and the pre-roll isn't finished, it calls the same `tick()` back to back from
  MessageChannel messages. It stops the moment the pre-roll ends or the tab shows (from
  then on the real loop has it). It also listens for `visibilitychange`, so a tab
  hidden partway through the pre-roll picks it up. It is bounded: about 113 ticks, then it
  stops.
- `endLivePreRoll()` restores the canvas straight away when hidden, instead of in a rAF.
- **The load channel.**
  - `LOAD_STEPS` lists the ten steps in the order they really run. Each step belongs to
    one of four stable stages: terrain, world, zombies and shaders.
  - A stage's units are its steps, so its counts are real: terrain 1, world 5, zombies 1,
    shaders 3.
  - 'world' stays active while 'zombies' runs inside it, because that is what happens.
  - `loadMark` ends the step whose mark it names. An unknown mark logs one info line.
  - The `loadMark` names and the "Dead-Wave load:" console line are unchanged.
  - The old bar percents still feed today's splash (`DWOpening.progress`), so nothing
    looks different until ChatGPT's loading screen replaces it. They are not part of the
    contract.

## Contract: the load channel (approved 2026-09-23)

```
window.DWLoad.loadId            string, new every page load
window.DWLoad.stageIds          ['terrain','world','zombies','shaders']
window.DWLoad.snapshot()        { loadId, state: 'loading'|'ready'|'failed', sequence, errorCode,
                                  stages: { <stageId>: { state: 'waiting'|'active'|'complete'|'failed',
                                            completedUnits, totalUnits, startedAt, finishedAt } },
                                  steps: [{ id, stageId, state, startedAt, finishedAt }] }
window.DWLoad.subscribe(fn)     fn(snapshot, null) at once, then fn(snapshot, event) for each
                                event; returns an unsubscribe function
window 'dw-load' event          detail = event
event = { loadId, sequence, stageId, substageId, state: 'begin'|'end'|'error',
          completedUnits, totalUnits, unitId, at, startedAt?, finishedAt?, errorCode? }
```

- **Step ids** (`substageId`/`unitId`), in order:
  - terrain: `terrain`
  - world: `rocks`, `trees`
  - zombies: `actors`
  - world: `foliage`, `pois`, `setup`
  - shaders: `compile`, `loop`, `warmup`
- **Stage events** have `substageId: null`.
- **Sequence** goes up by one for every event.
- **Ready.** After the last step ends, an event `{ stageId: 'ready', state: 'end' }` fires
  and the snapshot state becomes 'ready'. That happens only after the warm-up, just
  before `DWOpening.ready()`.
- **Errors.** An uncaught error or rejection during the load fails the active step and
  stage (`errorCode: 'uncaught-error'`), then fires `{ stageId: 'load', state: 'error' }`.
  Retry is a page reload, which gives a new `loadId`.
- **Times** (`at`, `startedAt`, `finishedAt`) are `performance.now()` milliseconds.
- **Later.** When the world bake lands (Phase 1, step 2), it adds a `bake` step to the
  world stage, which reads and decodes the file, or a `generate` step when the game
  falls back to generating. Grokbot's zombie preparation reports under the zombies stage
  through the same channel.

## Tab checks (tbg.mjs, patched file, harness busy with a parallel run)

| Mode | Result |
| --- | --- |
| Hidden throughout | PASS, 31.2 s |
| Hidden, WEBGL=1 | PASS, 28.3 s |
| Visible | PASS, 26.9 s |
| Visible, WEBGL=1 | PASS |
| Hidden 5 s in | PASS |
| Hidden 20 s in | PASS, 21.2 s |
| Hidden 28 s in, WEBGL=1 | PASS, 32.4 s |
| Hidden 29 s in | PASS, 30.3 s |
| Shown 10 s in | PASS, 27.4 s |
| Shown 28.5 s in, WEBGL=1 | PASS, 31.6 s |

On the unpatched file, hidden throughout it stops at "96%", and at "80%" with WEBGL=1.
Visible, it reaches 100%, but tbg reports that there is no load channel.

The times are slow because the full harness was running alongside. Earlier, on a quiet
machine, hidden throughout took 16 s.

## Regression

I ran all 47 harness checks (t0–t45 and tfish) twice.

- **The final version.** This run used the vendored file, with both this patch and the
  fast-merge patch applied (the version in `loader.diff`).
  - Against the unpatched vendored file, every check matches except one line in t17:
    "X targets the ground-level piece first". It failed once on the unpatched file and
    passed on the patched one.
  - Reruns pass on both, twice each, so it is flaky under load, not caused by the patch.
    That is Grokbot's test, and I've noted it for him.
  - Totals: 215 PASS lines patched, 214 unpatched (that one flaky line).
- **The first version.** An earlier run of the first version of the patch, on the file
  from before vendoring, also matched exactly: 215 and 215.

## Not verified

- Not run on a real GPU in a real background tab. Two things there could differ from the
  harness:
  - Chrome may de-prioritise GPU work in hidden tabs. The pump submits about 113 frames
    back to back with no presentation. Watch GPU memory on Jerry's PC the first time.
  - The WebGPU backend's `compileAsync` should not need rAF, but I haven't checked every
    code path in three r175.
- **Switching tabs partway through.** This is covered in the harness (tbg.mjs,
  `HIDE_AT` and `SHOW_AT`, below). Each switch is a single hide or a single show, and I
  timed them by the clock, so I didn't check which stage each one landed in.
- The intro video. In a background tab without a user gesture, `video.play()` is refused
  and the opening waits for the Play click, as it does today. The loader now finishes
  behind it, so the title screen comes up as soon as the player clicks. Whether the
  video plays in a hidden tab is up to the browser.
- The stand-in rAF used during `compileAsync` polls as fast as messages allow. That is
  busy work on the main thread for as long as the driver takes to compile, and it only
  happens in a hidden tab.

## Apply after the split

The diff is small and anchored on unique lines. After the split, the pieces land where
these lines end up:

- The stage table and helpers go next to the first `DWOpening.progress(8, ...)` call.
- `loadMark` goes next to its definition.
- The `compileAsync` and `initPostProcessing` wraps, the `endLivePreRoll` edit and the
  pump go in the boot/loop module.

`patch_loader.py` refuses to run if an anchor has moved; in that case apply the diff by
hand. Then run `node tbg.mjs` and `WEBGL=1 node tbg.mjs`: both must PASS.
