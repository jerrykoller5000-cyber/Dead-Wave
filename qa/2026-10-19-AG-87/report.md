# AG-87 — GP-19932 Live Recheck (`zombie.screamer` & `zombie.spitter`) on Jerry's RTX 5080

- **Date**: 2026-10-19
- **GPU / Renderer**: `NVIDIA GeForce RTX 5080` (`WebGPURenderer` / `Direct3D11`, non-headless via machine-wide game-test slot)
- **Contact Sheet**: `qa/2026-10-19-AG-87/shots/gp19932-sheet.jpg` (Row 1 = Screamer live before / ChatGPT statue / live front after / live 3/4 after; Row 2 = Spitter live before / ChatGPT statue / live front after / live 3/4 after)

---

## Visual & Budget Verification (`mode: 'live'`)

| Subject | Live Counts (`tris` / `meshes`) | Budget (`tris` / `draws`) | Before (`GP-19930`) | After (`GP-19932` Live) | Verdict |
| --- | ---: | ---: | --- | --- | --- |
| `zombie.screamer` | `5,768` / `4` | `≤ 6,000` / `≤ 4` | `qa/2026-10-19-AG-86/shots/gp19930-screamer-front.png` (grey upper head, black unlit eyes) | `qa/2026-10-19-AG-87/shots/gp19932-screamer-live-front.png`, `gp19932-screamer-live-three.png` | **PASS** — Dark obsidian upper head and glowing magenta/pink eyes (`0xf373ce`) are fully restored in `mode: 'live'`, matching `review/zombie-look-GP19932/after/screamer-statue-front.png` inside `5,768` tris / `4` meshes. |
| `zombie.spitter` | `5,228` / `4` | `≤ 6,000` / `≤ 4` | `qa/2026-10-19-AG-86/shots/gp19930-spitter-front.png` (dark brown non-emissive chin drips) | `qa/2026-10-19-AG-87/shots/gp19932-spitter-live-front.png`, `gp19932-spitter-live-three.png` | **PASS** — All four chin acid drips now glow bright yellow-green ooze (`0xb6cb38`) in `mode: 'live'`, matching the glowing belly seam and `review/zombie-look-GP19932/after/spitter-statue-front.png` inside `5,228` tris / `4` meshes. |
