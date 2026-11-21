AH-5 Training Area speed baseline for D-218 pass 3 is complete (`qa/2026-11-21-AH-5.md`, raw JSON `qa/AH-5/bench-webgpu.json` & `qa/AH-5/bench-webgl.json`, harness `qa/AH-5/bench-training.mjs`; 2 `--exclusive` slot runs on native RTX 5080 at `1920x1080 @1.00x`, `gfx: high`, `FPS & HARDWARE: ON`, `0` page errors; no game files touched).

### Headline Numbers (`10 spots × 4 ways = 40 views` per condition, `240` views total)
- **WebGPU (default):** `119 / 120` views locked at **60 FPS** (`16.67 ms`):
  - `Lights ON (0 zombies)`: `60 fps` (`16.67 ms`) on `40/40` views · `208–422 draws` (med `297`) · `181k–280k tris` (med `223k`). (3P Spawn ref: `60 fps, 16.67 ms, 402 draws, 355k tris`).
  - `Lights OFF (0 zombies)`: `60 fps` on `39/40` views · `93–298 draws` (med `159`) · `117k–216k tris`. Only dip: `08-armory W` (`40 fps / 25.06 ms avg / 361.5 ms worst`) from a **one-time `361.5 ms` lazy shader compile hitch** on first dark-material exposure (`60 fps / 17ms worst` on revisit).
  - `10 Zombies (Build Room, Lights ON)`: `60 fps` (`16.46–16.74 ms`) on `40/40` initial views · `218–442 draws` (med `324`) · `278k–1,003k tris` (med `587k`); `04-backstop S` dipped to `55 fps / low 31 / worst 32ms` on revisit (`421 draws, 497k tris`).
- **WebGL2 (`?renderer=webgl`):** CPU/driver draw-call & skinning bound:
  - `Lights ON (0 zombies)`: `50–60 fps` (`4/40` <60; worst `50 fps / 20.0 ms` at `05-build-centre E` with `422 draws`; 3P Spawn ref `44 fps / 22.81 ms / 406 draws`).
  - `Lights OFF (0 zombies)`: `5–60 fps` (`7/40` <60; `07-infirmary W` hit a **`934.2 ms` one-time shader compile stall (`5 fps`)** then locked `60 fps` on revisit; `08-armory N` `45 fps / 223.9 ms worst`).
  - `10 Zombies (Build Room, Lights ON)`: `42–60 fps` (`12/40` <60; `10-doorway` `[48,42,44,49] fps` / `20.4–24.1 ms`, `08-armory W` `44 fps / 22.55 ms / 397 draws / 967k tris`, `09-hq-panel E` `54 fps`).

### Top 3 Pass-3 Takeaways for `claude2`
1. **No cross-room occlusion (`sceneCull` off when `training.active`, `index.html:2535`):** Facing the solid dividing wall (`x=-8`) or even `1.6m` in front of the **closed** black security shutter (`10-doorway E`) still draws the entire other room + all 10 Build Room shamblers (`422–442 draws`, up to `1,003k tris` at `04-backstop S` & `986k` at `05-build-centre E`). Zone-gating Range vs Build Room across `x=-8` will cut worst-case draws & tris roughly in half.
2. **Warm 1 `lights-off` frame at Training entry** to eliminate the `361.5 ms` WebGPU / `934.2 ms` WebGL first-toggle shader compile hitch.
3. **Ceiling light fixture draw cost (`~115–140 draws`):** Lights OFF cuts draws by `115–140` everywhere (`422 → 298` at `05-build-centre E`, `208 → 93` at `07-infirmary W`); batching/instancing static fixture meshes reclaims >100 draws with lights ON.

### Worst-View Screenshots (`qa/AH-5/`)
- **WebGPU:** `webgpu-worst-1-lights-off-08-armory-W.png`, `webgpu-worst-2-zombies-10-09-hq-panel-N.png`, `webgpu-worst-3-zombies-10-05-build-centre-E.png`, `webgpu-worst-4-zombies-10-04-backstop-S.png`, `webgpu-worst-5-lights-on-05-build-centre-E.png`
- **WebGL:** `webgl-worst-1-lights-off-07-infirmary-W.png`, `webgl-worst-2-zombies-10-10-doorway-E.png`, `webgl-worst-3-zombies-10-10-doorway-S.png`, `webgl-worst-4-zombies-10-08-armory-W.png`, `webgl-worst-5-lights-off-08-armory-N.png`
