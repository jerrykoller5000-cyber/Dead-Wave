# CC-340 Visual & Frame-Time Verification (RTX 5080 WebGPU)

- **Date**: `2026-11-10`
- **Agent**: `antigravity` (`Gemini 4 Carbon`)
- **Renderer / GPU**: `WebGPURenderer` on `NVIDIA GeForce RTX 5080 (D3D11)` (`1280x720`)
- **Deliverables in `review/CC-340/`** (archived in `qa/2026-11-10-CC-340/`):
  - [`sheet-head-4lights.jpg`](./sheet-head-4lights.jpg) — 24 close-up head & neck frames (`issue` cover + `full` helmet/ear-pro/NVG × `front` `0°`, `threeQ` `38°`, `side` `90°` × `noon`, `overcast`, `dusk`, `night`)
  - [`sheet-gameplay-4lights.jpg`](./sheet-gameplay-4lights.jpg) — 24 gameplay-scale (`4.3 m`) full-body proportion frames (`issue` + `full` × `front`, `threeQ`, `side` × `noon`, `overcast`, `dusk`, `night`)
  - [`sheet-roof-survivors.jpg`](./sheet-roof-survivors.jpg) — 7 live HQ roof survivor frames (`Okafor`, `Brandt` + M240B, `Pike` standing alert at posts: 4-light overwatch + individual `~3.6 m` gameplay-distance checks)
  - [`bench-48z-night20.log`](./bench-48z-night20.log) — `--exclusive` 25 s Night 20 (`--gfx high --prof`, 48 active zombies, standard 3P view)
  - [`manifest.json`](./manifest.json) — SHA-256 hashes & luminance metrics across all 55 PNGs (`100%` non-blank, `100%` unique)

## 1. Visual Findings (Head, Body Proportions & Roof Survivors)

- **Head & Neck Close-Up (`sheet-head-4lights.jpg`)**:
  - **Issue Kit (`cover`)**: Patrol cap sits level on the brow/crown with **0 floating and 0 forehead/ear clipping** across `front`, `threeQ`, and `side`. Ear relief tucks cleanly under the cap rim; balaclava/gaiter flows seamlessly into the cammie collar and trapezius with no neck gap.
  - **Full Kit (`helmet` + Peltor ear-pro + boom mic + stowed dual-tube NVG)**: High-cut helmet, ARC-rail ear-pro arms, ear cups, and boom mic all seat cleanly on the new skull/jaw with **0 scalp/cheek clipping and 0 floating**.
- **Gameplay-Scale Proportions (`sheet-gameplay-4lights.jpg`)**:
  - Adult male proportions (`1.572 m` issue / `1.619 m` full with stowed NVG) read grounded and natural at `4.3 m` gameplay scale across all angles; boots sit flat on the grid (`0` floating), and plate carrier, knee pads, and slung weapons (`M4` + `minigun`) sit snug on the frame.
- **Darkness / Readability Across Four Lights**:
  - `noon`, `overcast`, and `dusk` read crisply (`meanLuma = 63.9–97.5`).
  - At `night` in the unlit Inspector studio rig (`meanLuma = 46.3–54.3`) and unlit HQ roof (`meanLuma = 21.7`), dark cammies, balaclava, and helmet drop into deep night silhouette as expected without flashlight/NVG; eye catchlights and rim contours remain visible with **0 material/shader blackouts**.
- **Three HQ Roof Survivors (`sheet-roof-survivors.jpg`)**:
  - **Cpl. Okafor** (patrol cap, medic hip bag, slung M4), **Sgt. Brandt** (boonie hat, aviators, beard, 7.62 chest belt, tripod M240B), and **Spc. Pike** (backwards cap, bare hands, belt wrench, slung M4) all inherit the new head and adult proportions cleanly with **0 floating or accessory clipping**.

## 2. 48-Zombie Standard-View Frame Time (`--exclusive`, RTX 5080)

Command: `node tools/bench.mjs --night 20 --gfx high --seconds 25 --prof` (`zombies: 48`, `1,380` frames)

| Metric | Previous (`AG-170`, 3-run mean) | `CC-340` (`--exclusive`) | Delta |
| :--- | :---: | :---: | :---: |
| **Mean FPS (last 10 s)** | `55.2 fps` (`50.8–58.6`) | **`51.2 fps`** | Within `AG-170` range (`50.8–58.6`) |
| **1% Low FPS** | `36.6 fps` (`31.0–41.1`) | **`37.6 fps`** | **`+1.0 fps` better** |
| **Worst Frame** | `38.9 ms` | **`34.0 ms`** | **`-4.9 ms` better** |
| **Hitches (`> 50 ms`)** | `0` | **`0`** | `0` |
| **Frame / Tick (last 10 s)** | `18.19 ms` / `16.87 ms` | **`19.53 ms` / `18.62 ms`** | Whole-run tick: `17.54 ms` |
| **GPU Time (`gpuMs`)** | `0.33 ms` | **`0.22 ms`** | **`-0.11 ms` faster** |
| **Draws / Triangles** | `266` / `764,099` | **`208` / `525,342`** | **`-58` draws / `-238.8k` tris** |
| **Marine CPU (`m:hold` / `m:pose` / `m:idle`)** | — | **`1.40 / 0.96 / 0.40 ms`** | `0` new pipelines, `0` new builds |
