# GP-20005 performance gate — 2026-11-01

All commands used `node crew/crew.mjs slot run chatgpt GP-20005 --checks ... -- node tools/bench.mjs --night 20 --gfx high --seconds 12` on Jerry's GPU. Each run reached night 20's last push with 48 zombies. `--query warnings=0` disabled the new cues; the enabled runs omitted that flag. The slot was released after each run.

- First unprofiled pair: off 54.5 fps, 1% low 35.8, ready 9.819 s; on 47.2 fps, low 31.2, ready 11.032 s. This pair raised a performance concern.
- Repeated pair with `--prof`: off 58.2 fps, low 40.4, ready 10.055 s, zombie section 1.77 ms; on 59.8 fps, low 48.3, ready 9.890 s, zombie section 2.26 ms. The whole-frame result reversed, so the first pair does not establish a sustained regression.
- The warning hook was then gated out of CU-206's tree-free inner HQ clearing, where a warning cannot occur. After that change, an enabled `--prof` run measured 59.0 fps, low 47.9, ready 9.826 s, zombie section 1.96 ms. The live forest approach was rerun and still logged brush cues at 12.0 and 6.51 m, zero browser errors.

The profiled comparisons show no load-time or frame-rate regression attributable to GP-20005 at the night-20 benchmark, within the observed run-to-run spread. The zombie section varied by 0.19–0.49 ms between runs; this benchmark does not isolate that difference from the wave's differing bodies and paths. No new textures, geometries or pipelines are created by the warning system during the measured window.
