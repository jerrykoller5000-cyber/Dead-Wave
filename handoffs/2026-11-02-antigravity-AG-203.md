Changed:
- Completed `AG-203` (`J67`: *Stone walls against the hedges*) on Jerry's RTX 5080 WebGPU PC, delivering:
  - **(a) Studio Dry-Stone Wall (`2.5–3.5 m`) vs Today's Hedge (`world/wall-bands.js`)**: Built a studio-only dry-stone wall band (`2.80–3.45 m` intact height, dipping to `1.75–2.10 m` at tumbled breaches with fallen rubble stones on the verge, `1.28 m` battered base tapering to `0.92 m` top, `1.04 m` overhanging coping slabs, `3.45 m` squared gate piers framing the `4.0 m` trail gap, cushion moss pads on coping/ledges, and climbing ivy vines on both faces; folded into **`3` draws**: `stone`, `moss`, `ivy` with `castShadow = true, receiveShadow = true`) and rendered it beside today's `1.1–1.7 m` hedge from the exact same **3 spots** (`Spot 1: 1P Choke-Point Trail Gap`, `Spot 2: 3/4 Oblique Face`, `Spot 3: Elevated Overview`) across all **4 lights** (`noon`, `overcast`, `dusk`, `night` — Rules 18–19) in `qa/2026-11-02-AG-203/sheet.jpg`. No world files were changed on disk.
  - **(b) 5-Seat Sector-Cull Audit (`qa/2026-11-02-AG-203/sector-cull-audit.json`)**: Measured frustum draws and triangles vs behind-band draws and triangles across 5 representative first-person seats facing the `hq-thicket` and `quarter-*` bands, plus sightline occlusion at `2.5 m`, `3.0 m`, and `3.5 m` wall heights:
    - **Seat 1 (`HQ Clearing North -> hq-thicket`)**: **`172 / 318` draws (`54.1%`)** and **`728,004 / 1,258,228` tris (`57.9%`)** behind the band (`170` world/prop draws + `2` history-prop draws + `630,796` instanced forest tris); a `3.0–3.5 m` wall sightline-hides **`168 / 172` draws (`97.7%`)**.
    - **Seat 2 (`HQ Clearing West -> hq-thicket`)**: **`117 / 259` draws (`45.2%`)** and **`762,636 / 1,222,011` tris (`62.4%`)** behind the band (`97` world/prop draws + `20` history-prop draws + `647,930` instanced forest tris); a `3.0–3.5 m` wall sightline-hides **`106–108 / 117` draws (`90.6–92.3%`)**.
    - **Seat 3 (`NW Approach -> quarter-nw`)**: **`119 / 257` draws (`46.3%`)** and **`689,965 / 1,108,958` tris (`62.2%`)** behind the band (`99` world/prop draws + `20` history-prop draws + `592,222` instanced forest tris); a `3.0–3.5 m` wall sightline-hides **`110 / 119` draws (`92.4%`)**.
    - **Seat 4 (`NE Approach -> quarter-ne`)**: **`77 / 212` draws (`36.3%`)** and **`523,888 / 1,003,913` tris (`52.2%`)** behind the band (`75` world/prop draws + `1` landmark draw + `1` history-prop draw + `429,593` instanced forest tris); a `3.0–3.5 m` wall sightline-hides **`74 / 77` draws (`96.1%`)**.
    - **Seat 5 (`SW Approach -> quarter-sw`)**: **`60 / 199` draws (`30.2%`)** and **`499,702 / 908,013` tris (`55.0%`)** behind the band (`60` world/prop draws + `445,428` instanced forest tris); a `3.0–3.5 m` wall sightline-hides **`57 / 60` draws (`95.0%`)**.

Files:
- `qa/2026-11-02-AG-203/report.md`
- `qa/2026-11-02-AG-203/sheet.jpg`
- `qa/2026-11-02-AG-203/sector-cull-audit.json`
- `qa/2026-11-02-AG-203/studio-wall-stats.json`
- `qa/2026-11-02-AG-203/hedge-spot1-noon.jpg` .. `qa/2026-11-02-AG-203/hedge-spot3-night.jpg` (12 frames)
- `qa/2026-11-02-AG-203/stone-spot1-noon.jpg` .. `qa/2026-11-02-AG-203/stone-spot3-night.jpg` (12 frames)
- `handoffs/2026-11-02-antigravity-AG-203.md`

Tests:
- Rendered all 24 comparison frames (`3` spots × `4` lights × `Hedge vs Studio Stone Wall`) and ran the 5-seat frustum & sightline-occlusion audit in headless Chrome with hardware WebGPU on NVIDIA GeForce RTX 5080.
- Visually inspected `qa/2026-11-02-AG-203/sheet.jpg` to verify all 24 frames and the 5-seat audit panel are sharp and readable.

Screenshots:
- `qa/2026-11-02-AG-203/sheet.jpg`
- `qa/2026-11-02-AG-203/hedge-spot1-noon.jpg`
- `qa/2026-11-02-AG-203/stone-spot1-noon.jpg`
- `qa/2026-11-02-AG-203/hedge-spot2-noon.jpg`
- `qa/2026-11-02-AG-203/stone-spot2-noon.jpg`
- `qa/2026-11-02-AG-203/hedge-spot3-noon.jpg`
- `qa/2026-11-02-AG-203/stone-spot3-noon.jpg`

Not verified:
- Studio prototype and sector-cull measurement only; per `AG-203`, nothing in `world/*` was changed ahead of Claude's `CL-296` decision.

Requests:
- To `claude`: `AG-203` (`J67`: studio dry-stone wall vs hedge 24-frame sheet + 5-seat sector-cull audit) is ready in `qa/2026-11-02-AG-203/report.md` and `qa/2026-11-02-AG-203/sheet.jpg` for `CL-296`.

Contract changes:
- None.
