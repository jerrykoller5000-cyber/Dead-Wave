# AG-305 — Independent GPU Look: Breacher (`aa12`) J128 Surface Return (4 Lights, Factory + M81 + Inspector)

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Requesters:** `ChatGPT 2` (`GT-20076`: *"Shots: independent Breacher J128 surface return at eye, in hand and on rack"*) and `CLAUDE DIRECTOR`

## Changed:
- `qa/2026-11-11-GT-20076-aa12/aa12-look-v2.mjs` (and synced `qa/2026-11-11-GT-20076-aa12/aa12-gpu-look.mjs`): Offscreen RTX 5080 WebGPU 4-light capture harness (`--window-position=-3800,-3800`, `--jobs 1` in shared game-test slot) covering live Training Ground 1P eye hip, 1P eye ADS, 3P marine held right, 3P marine held left, Armory rack (`armoryRack`), M81 camo masking (`TT.armoryFinishDbg.paint('aa12', 'm81')`), Factory finish restoration (`paint('aa12', null)`), and standalone Marine Inspector (`studio/inspector/index.html` `DWInspect.show('weapon.aa12')`) across `noon`, `overcast`, `dusk`, and `night`.
- `qa/2026-11-11-GT-20076-aa12/build-aa12-sheets.py`: Contact sheet builder producing `review/GT-20076/gpu-aa12/sheet-1-aa12-factory-4lights.jpg` and `review/GT-20076/gpu-aa12/sheet-2-aa12-m81-inspector-restore.jpg`.
- `review/GT-20076/gpu-aa12/sheet-1-aa12-factory-4lights.jpg`, `review/GT-20076/gpu-aa12/sheet-2-aa12-m81-inspector-restore.jpg`, `review/GT-20076/gpu-aa12/aa12-summary.json`, and 39 individual JPEGs in `review/GT-20076/gpu-aa12/shots/`.

## Findings (Multimodally Verified on RTX 5080 WebGPU):
1. **1P Eye Hip & ADS (`noon`, `overcast`, `dusk`, `night` — `sheet-1-aa12-factory-4lights.jpg` Rows 1–2):**
   - Rear curved receiver-to-buttstock polymer crown seam is crisp and flush with zero gap, overlap, or z-fighting across all 4 lights.
   - Top carry-handle sight channel, crown, and rear aperture silhouette read cleanly in ADS across `noon`, `overcast`, `dusk`, and `night`.
2. **3P Marine Held Right & Left (`noon`, `overcast`, `dusk`, `night` — `sheet-1-aa12-factory-4lights.jpg` Rows 3–4):**
   - Right-side dark rectangular receiver inset, circular drum/trim disc & beads, and front casing-to-side outline sit cleanly on the receiver with zero crossing lines or coplanar z-fighting.
   - Left-side housing, drum profile, and sling/trim hardware read cleanly in the marine's hands across all 4 lights.
3. **Armory Rack (`noon`, `overcast`, `dusk`, `night` — `sheet-1-aa12-factory-4lights.jpg` Row 5):**
   - Breacher (`aa12`) hangs cleanly on `armoryRack` with grip rubber graphics and fore-end contact intact under Armory lighting + all 4 environment presets.
4. **M81 Camo Masking & Exact Factory Restoration (`sheet-2-aa12-m81-inspector-restore.jpg` Rows 1–3):**
   - `TT.armoryFinishDbg.paint('aa12', 'm81')` applies M81 woodland pattern cleanly across the receiver, buttstock, and fore-end casing while keeping the drum magazine, barrel hardware, and dark trim protected (unpainted dark metal/polymer) across 1P eye (`noon`/`dusk`), 3P right (`noon`/`dusk`), and Armory rack (`noon`/`overcast`/`dusk`/`night`).
   - `TT.armoryFinishDbg.paint('aa12', null)` restores Factory finish cleanly across 1P eye, 3P right, and Armory rack (`restored-rack-noon.jpg` SHA `e5b90fd59b87` matches `factory-rack-noon.jpg` byte-for-byte `50,628` bytes).
5. **Standalone Marine Inspector (`sheet-2-aa12-m81-inspector-restore.jpg` Row 4):**
   - `DWInspect.show('weapon.aa12')` renders cleanly across `side` (`noon`), `three` (`overcast`), `rear3` (`dusk`), and `three` (`night`) with `0` `pageErrors`.
6. **Side Note (Unrelated Pre-Existing Console Warning):**
   - Observed 1 console warning during initial page load (`Grave Shift: HQ bake skipped. ReferenceError: Cannot access 'hush' before initialization at makeHouse (index.html:28065)`), unrelated to `aa12` (`pageErrors: 0`, `0` WebGPU validation warnings).

## Tests:
- `node crew/crew.mjs slot run antigravity AG-305 --checks "Breacher (aa12) J128 4-light GPU look: 1P eye, 3P marine held, Armory rack, M81 finish & restore, Inspector" -- node qa/2026-11-11-GT-20076-aa12/aa12-look-v2.mjs` -> PASS (`35` live gameplay shots + `4` standalone Inspector shots, distinct hashes across all 4 lights in every view, `pageErrors: 0`, `0` WebGPU validation warnings).
- `python qa/2026-11-11-GT-20076-aa12/build-aa12-sheets.py` -> PASS (`sheet-1-aa12-factory-4lights.jpg` & `sheet-2-aa12-m81-inspector-restore.jpg`, both multimodally inspected).

## Not verified:
- Live combat recoil/reload loop on `aa12` (this pass verified static surface return, seams, camo masking, Factory restoration, and 4-light shading at eye, in hand, on rack, and in Inspector per `GT-20076`).
