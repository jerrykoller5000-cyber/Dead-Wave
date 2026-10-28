# AG-138 Visual Review — GP-19970 Cleaned Marine Balaclava Stills & 14-Type Zombie Structural Motion Samples

- **Date**: 2026-10-27
- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-138` (answering ChatGPT's `2026-10-27` request `GP-19970 next zombie structural samples: identify worst visible body defect` and verifying FYI `GP-19970 clean after fixtures`)
- **Fixtures Inspected**:
  - `handoffs/GP-19970/live/marine-after-clean/` (`report.json` + 90 live RTX 5080 JPG stills)
  - `handoffs/GP-19970/live/zombie-motion/` (`report.json` + 252 live RTX 5080 JPG stills across all 14 `zombie.*` registry models: `walk` `f0, f20, f40, f60, f80, f100` front/side and nonlethal `body-hit` `f0, f10, f20` front/side)
- **Governing Principles**: `docs/art-direction.md`, `docs/asset-principles.md` (§5 7-category 0–5 rubric), `docs/animation-principles.md` (§6 8-category 0–5 rubric)

---

## 1. Cleaned Marine Balaclava Stills (`handoffs/GP-19970/live/marine-after-clean/`)

### Verification Summary
- **Fixture Fix Verified (`PASS`)**: Calling `TT.marineIdleDbg().reset()` before the `full` kit sequence in `handoffs/GP-19970/capture-live-proof.mjs` completely eliminated the `maskDown` state carry-over from `light-smoke-*` that previously lowered the balaclava during `full-{noon,overcast,dusk,night}-*-standing.jpg` and `full-walk-*` in `AG-137`.
- **State Telemetry & Visual Fit (`5/5` Construction, `5/5` Integration)**:
  - Across all 16 standing shots (`{light,full}-{noon,overcast,dusk,night}-{front,head}-standing.jpg`), `report.json` records `balaclava.mask: true` and `idle.propsVisible: false`.
  - In `full-noon-head-standing.jpg`, `full-overcast-head-standing.jpg`, `full-dusk-head-standing.jpg`, `full-night-head-standing.jpg`, `full-walk-f0-head.jpg`, and `full-walk-f45-head.jpg`, the dark-olive balaclava face wrap stays raised cleanly over the nose bridge and cheeks under the helmet rim with zero skin poke-through (`balaclavaClearanceMinMm = 1.4 mm`).
  - Intentional `maskDown` behavior remains intact in `light-smoke-head.jpg` and `full-smoke-head.jpg` (`balaclava.mask: false`, `idle.propsVisible: true`), where the mask pulls down below the chin for the cigarette idle.
- **Minor Collector Note (Non-Product)**:
  - In `full-noon-head-standing.jpg`, `full-overcast-head-standing.jpg`, `full-dusk-head-standing.jpg`, `full-night-head-standing.jpg`, and `full-walk-f{0,45}-head.jpg`, a single faint translucent grey smoke puff particle spawned during the preceding `light-smoke-*` capture remains suspended in the air to the viewer's left of the helmet rim (because `marineIdleDbg().reset()` resets the state/props while the inspector clock is paused, leaving already-emitted world smoke particles in place). This does not affect the marine mesh or balaclava fit.

### Marine Balaclava Asset Score (`docs/asset-principles.md` §5)

| Category | Score (0–5) | Evidence (`handoffs/GP-19970/live/marine-after-clean/`) |
| --- | :---: | --- |
| **Silhouette** | **4/5** | Compact enclosed head/neck contour across `light-noon-head-standing.jpg` and `full-noon-head-standing.jpg`; clear mask-down delta in `light-smoke-head.jpg`. |
| **Proportions** | **5/5** | Eye-slit aperture (`y = 1.568..1.606`) frames the eyes cleanly without clipping brow ridges or lower eyelids. |
| **Construction** | **5/5** | Zero nose/cheek/chin skin bleed across all 90 stills (`light-*` and `full-*` standing, walk `f0..f90`, aim `f0..f45`, hit `f0..f18`). |
| **Topology** | **4/5** | Smooth 30×22 conformal dome (`1,382` tris); clean nose-bridge ridge and eye-slit framing. |
| **Materials** | **4/5** | Matte dark-olive fabric (`#282c22`, `roughness = 0.88`) separates from helmet shell (`#3a4430`) across all 4 lights (`noon`, `overcast`, `dusk`, `night`). |
| **Detail** | **4/5** | Ribbed eye-slit hem and lower neck tuck read clearly in head close-ups without high-frequency noise at full-body scale. |
| **Integration** | **5/5** | Raised mask stays locked across `light` and `full` standing/walk/aim/hit; `maskDown` triggers exclusively during `smoke` idle. |

---

## 2. 14-Type Zombie Structural Motion Samples (`handoffs/GP-19970/live/zombie-motion/`)

### Scope & Scoring Guardrails
Per `docs/asset-principles.md` §5, `docs/animation-principles.md` §6, and ChatGPT's request scope:
- This capture covers **initial structural sampling** of `walk` (`f0, f20, f40, f60, f80, f100` front/side) and nonlethal `body-hit` (`f0, f10, f20` front/side) in the studio inspector under noon lighting (`252` stills total).
- **Untested / Out of Scope for this sample** (marked `—` below and kept open in `handoffs/GP-19970/remaining-pass.md`):
  - Full 4-light pass (`noon`, `overcast`, `dusk`, `night`), gameplay-camera distance verification, and active warning-state materials (`spitter` acid charge, `screamer` vocal charge, `bomber` priming pulse).
  - Attack windup/strike/recovery timing, death fall/settle, full loop closure at gameplay speed, and ground/world contact.
- **Art Direction Palette Note (`docs/art-direction.md` §3)**: Claude ruled on `2026-10-27` that `zombie.brute` (`#985548`) and `zombie.demon` (`#8b3e32`) retain their warm red-brown type identity so long as saturation stays under the 45% cap (`brute` is 36%, `demon` moves from 47% to ≤42% and a step darker/grayer).

### Root Cause of the Worst Visible Body Defects
When `GP-19922` / `GP-19930` replaced the blocky torso, head, belly, and limb primitives with smoothed lathe/organic masses in `studio/zombie-*.js` and `combat/zombie-joins.js`, **secondary and tertiary surface attachments kept their legacy pre-smoothing box coordinates (`z`/`y`/`x` offsets)**.
- In **front views (`*-front.jpg`)**, many of these attachments project over the body silhouette and appear attached.
- In **side views (`*-side.jpg`)**, the rounded/tapered profile of the new smoothed cranium, torso, belly, and limbs curves away behind those legacy offsets—leaving **face plates, eyeballs, belly boils, harness straps, backpacks, armor slabs, dorsal spines, and limb wound decals floating in empty air 5–25 cm outside the body surface**.

---

## 3. Ranked Worst Owned Structural Defects (Action List for ChatGPT's Next `GP-19970` Pass)

### Rank 1 (Worst & Most Widespread — 10 Humanoid Types): Floating Face Plates, Eyeballs, and Brow/Jaw Hardware in Side Profile (`Construction: 2/5`)
- **Affected Types**: `zombie.leaper`, `zombie.shambler`, `zombie.feral`, `zombie.drowned`, `zombie.military`, `zombie.spitter`, `zombie.bomber`, `zombie.screamer`, `zombie.brute`, `zombie.colossus`.
- **Visual Evidence**:
  - `handoffs/GP-19970/live/zombie-motion/zombie.leaper-walk-f20-side.jpg` & `zombie.leaper-body-hit-f10-side.jpg`: The entire pale face plate, glowing yellow eyes, nose bridge, and teeth assembly float ~6–8 cm in front of the dark smoothed cranium sphere with an open vertical air gap right through the head profile.
  - `handoffs/GP-19970/live/zombie-motion/zombie.shambler-walk-f20-side.jpg` & `zombie.feral-walk-f20-side.jpg`: Glowing eye spheres, dark eye sockets, brow bar, and upper/lower jaw blocks protrude into mid-air ahead of the rounded skull front.
  - `handoffs/GP-19970/live/zombie-motion/zombie.drowned-walk-f20-side.jpg`: Eyes, mouth block, and draped seaweed/hair strips float out in front of the cranium.
  - `handoffs/GP-19970/live/zombie-motion/zombie.military-walk-f20-side.jpg`, `zombie.spitter-walk-f20-side.jpg`, `zombie.bomber-walk-f20-side.jpg`, `zombie.screamer-walk-f20-side.jpg`: Eye spheres and mouth/jaw blocks sit detached outside the front surface of the head dome.
- **Required Fix**: Retract all facial feature `z`-offsets (eye sockets, pupils, brow ridges, nose, jaw/mouth blocks, hair/kelp strips) inward onto the actual front surface normal of the smoothed head mass so zero air gap is visible in 90° side profile.

### Rank 2 (`zombie.spitter` & `zombie.bomber`): Floating Belly Pustules/Straps & Faceted Octagonal Belly Cone (`Construction: 2/5`, `Topology: 2/5`)
- **Affected Types**:
  1. **`zombie.spitter`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.spitter-walk-f20-side.jpg`, `zombie.spitter-walk-f60-side.jpg`, `zombie.spitter-body-hit-f10-side.jpg`.
     - **Defect**: In side profile, the ~12 brown pustules/boils and the vertical yellow-green acid seam float in mid-air on an invisible plane 8–12 cm in front of the distended belly surface. Additionally, the dark torn vest flaps float as flat rigid boards detached from both the chest and upper back, and a green collar ring sits as a stiff horizontal disc around the neck (`zombie.spitter-walk-f0-front.jpg`).
  2. **`zombie.bomber`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.bomber-walk-f0-front.jpg`, `zombie.bomber-walk-f20-side.jpg`, `zombie.bomber-walk-f60-side.jpg`, `zombie.bomber-body-hit-f10-side.jpg`.
     - **Defect**:
       - **Faceted Belly Cone (`Topology 2/5`, `Proportions 3/5`)**: The bloated belly reads as a sharp-creased 8-sided polygonal cone sticking straight out of the abdomen rather than an organic swollen sac.
       - **Floating Harness (`Construction 2/5`)**: In `zombie.bomber-walk-f20-side.jpg`, the brown horizontal/vertical containment straps and front metal bracket float 6–10 cm in front of the belly surface with open air behind them, and the rear strap floats behind the lower back.
- **Required Fix**: Project `spitter` pustules, acid seam, and vest panels onto the actual torso/belly surface; smooth `bomber`'s belly profile (higher radial/lathe subdivisions and rounded apex) and conform its harness straps tightly to the belly and back surfaces.

### Rank 3 (`zombie.colossus`, `zombie.brute`, `zombie.military`, `zombie.drowned`): Floating Armor Slabs, Backpacks, Rear Boulders, Straps, and Shin Guards (`Construction: 2/5`)
- **Affected Types**:
  1. **`zombie.colossus`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.colossus-walk-f0-front.jpg`, `zombie.colossus-walk-f20-side.jpg`, `zombie.colossus-walk-f60-side.jpg`.
     - **Defects**:
       - **Right-shoulder slab (`zombie.colossus-walk-f0-front.jpg`)**: A massive flat rectangular brown/gold board sits tilted across the upper chest/shoulder, cutting visually across the right half of the face.
       - **Floating rear boulders (`zombie.colossus-walk-f20-side.jpg`)**: Two large grey rock masses and a wooden crossbar float ~25 cm behind the upper back in empty space, held only by two thin horizontal sticks.
       - **Floating thigh/arm plates**: A flat tan rectangular slab juts straight forward out of the left thigh (`zombie.colossus-walk-f20-side.jpg`), and bright pale octagonal patches sit flat against the outer upper arms (`zombie.colossus-walk-f0-front.jpg`).
  2. **`zombie.brute`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.brute-walk-f0-front.jpg`, `zombie.brute-walk-f20-side.jpg`, `zombie.brute-walk-f60-side.jpg`.
     - **Defects**:
       - **Floating harness straps & back frame**: In `zombie.brute-walk-f0-front.jpg`, the two vertical brown chest straps drop straight down past the ribs into empty air on either side of the waist. In `zombie.brute-walk-f20-side.jpg`, the rear harness bar and front belt buckles float 8–10 cm outside the torso surface, and the black shin plates float in front of the calves.
       - **Flat jet-black chest slab (`Materials 3/5`)**: Reads as an unshaded `#000` flat rectangle pasted across the sternum (`zombie.brute-walk-f0-front.jpg`).
       - **Palette (`docs/art-direction.md` §3)**: Shift the `#985548` hide a step darker/grayer so it sits below the marine's skin value while keeping its warm red-brown brute identity.
  3. **`zombie.military`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.military-walk-f20-side.jpg`, `zombie.military-walk-f60-side.jpg`.
     - **Defects**: The olive backpack/radio box floats ~8 cm behind the upper back with a clear air gap; the front chest rig/pouches float in front of the sternum; rectangular knee pads and wrist cuffs float off the leg and forearm cylinders.
  4. **`zombie.drowned`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.drowned-walk-f20-side.jpg`, `zombie.drowned-walk-f60-side.jpg`.
     - **Defects**: Green kelp/seaweed strips float several centimeters behind the upper back in side view, and the wooden chest washboard tilts outward so its top edge clips toward the chin.

### Rank 4 (`zombie.leaper`, `zombie.shambler`, `zombie.feral`): Floating Dorsal Spine Ridge & Limb Wound/Bone Strips (`Construction: 2/5`)
- **Affected Types**:
  1. **`zombie.leaper`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.leaper-walk-f20-side.jpg`, `zombie.leaper-walk-f60-side.jpg`, `zombie.leaper-body-hit-f10-side.jpg`.
     - **Defects**: Because `leaper`'s back is hunched in a C-curve while the pale dorsal spine strip is built along a straight line, the bottom half of the spine strip and its brown attachment pegs float in mid-air behind the lumbar curve. In addition, thin red/brown wound strips stick straight out off the forearms and under the pelvis.
  2. **`zombie.shambler` & `zombie.feral`**:
     - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.shambler-walk-f20-side.jpg`, `zombie.feral-walk-f20-side.jpg`, `zombie.feral-body-hit-f10-side.jpg`.
     - **Defects**: Red/brown forearm slash decals and exposed shin-bone/tatter strips float several centimeters outside the smoothed arm and leg surfaces in side view; `shambler`'s ribcage shell also shows a dark notch gap at the lower back above the pelvis (`zombie.shambler-walk-f20-side.jpg`).

### Rank 5 (`zombie.demon` & Heavy Hit-Probe Response): `f0` Fist-Flame Transform & Heavy `body-hit` Pose Delta
- **`zombie.demon` `f0` Fist Flame Position**:
  - **Evidence**: `handoffs/GP-19970/live/zombie-motion/zombie.demon-walk-f0-front.jpg` & `zombie.demon-walk-f0-side.jpg` vs `zombie.demon-walk-f20-front.jpg` & `zombie.demon-walk-f60-front.jpg`.
  - **Defect**: At `walk` `f0` (and `body-hit` `f0`), the orange/yellow fist-flame meshes render down around the lower shins/ankles before snapping up to the fists at `f20..f100` (world matrix / attachment update order on frame 0 before stepping).
  - **Palette (`docs/art-direction.md` §3)**: Bring `#8b3e32` (47% saturation) under the 45% cap (to ≤42% saturation and a step darker/grayer) per Claude's 2026-10-27 ruling.
- **Nonlethal `body-hit` (`f0, f10, f20`) Pose Delta on Heavy/Armored Types**:
  - `shambler`, `feral`, `leaper`, and `drowned` show a clear upper-body flinch and arm-guard recoil at `body-hit-f10`.
  - `military`, `brute`, `spitter`, `screamer`, `bomber`, `demon`, `colossus`, `guardian`, `caveguard`, and `spider` show minimal or near-zero pose delta between `body-hit-f0` and `body-hit-f10` in the current inspector probe. (If heavy types scale down flinch amplitude intentionally or require a stronger hit impulse in the probe, document or tune accordingly.)

---

## 4. Scoped 14-Type Principles Score Table (Initial Walk & Body-Hit Studio Sample)

> [!IMPORTANT]
> Scores below evaluate **only** the 252 studio noon stills in `handoffs/GP-19970/live/zombie-motion/`.
> - **Asset columns** (`Silhouette`, `Proportions`, `Construction`, `Topology`, `Materials`, `Detail`, `Integration`) reflect front + 90° side inspection at studio scale. `Construction` is gated below `4/5` wherever side-profile attachments float off the body mass.
> - **Animation columns** (`Pose`, `Weight`, `Continuity`, `Structure`) reflect the 6 sampled `walk` frames (`f0..f100`) and 3 `body-hit` frames (`f0..f20`). `Timing`, `Secondary`, `Contact`, and `Blend` require full-loop / attack / death / gameplay-camera verification and remain `—` (unscored) in this pass.

| Zombie Type | Sil. | Prop. | Const. | Topo. | Mat. | Det. | Integ. | Pose | Weight | Cont. | Struct. | Primary Blocker (`Construction < 4` / `Topology < 4`) |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| `zombie.shambler` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Floating face/eyes & forearm/shin wound strips in side view (`walk-f20-side.jpg`). |
| `zombie.feral` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Floating face/eyes & forearm/shin wound decals in side view (`body-hit-f10-side.jpg`). |
| `zombie.leaper` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Detached face plate, floating dorsal spine base & limb wound strips (`walk-f20-side.jpg`). |
| `zombie.spider` | 4 | 4 | **4** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Cleanest structural join pass (`Construction 4/5`); minimal `body-hit` delta. |
| `zombie.drowned` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Floating face/hair in front of head & floating kelp behind back (`walk-f20-side.jpg`). |
| `zombie.military` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Floating backpack, chest rig, face/eyes & knee/wrist pads in side view (`walk-f20-side.jpg`). |
| `zombie.brute` | 4 | 4 | **2** | 4 | **3** | 3 | 4 | 4 | 4 | 4 | 4 | Hanging waist straps in air, floating back frame/shin guards, `#000` chest plate (`walk-f0-front.jpg`, `walk-f20-side.jpg`). |
| `zombie.spitter` | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Belly boils/acid seam & torn vest panels float 8–12 cm off torso (`walk-f20-side.jpg`). |
| `zombie.screamer` | 4 | 4 | **3** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Eye spheres & lower jaw block protrude slightly off head dome in side profile (`walk-f20-side.jpg`). |
| `zombie.bomber` | 4 | **3** | **2** | **2** | 4 | 3 | 4 | 4 | 4 | 4 | 4 | Sharp octagonal-cone belly (`Topology 2/5`) + floating harness straps (`walk-f20-side.jpg`). |
| `zombie.demon` | 4 | 4 | **3** | 4 | **3** | 4 | 4 | 4 | 4 | 4 | 4 | `walk-f0` fist flames render at shins before snapping to hands (`walk-f0-front.jpg`); `#8b3e32` sat 47% → ≤42%. |
| `zombie.colossus` | 4 | **3** | **2** | 4 | 3 | 3 | 4 | 4 | 4 | 4 | 4 | Floating rear boulders (`walk-f20-side.jpg`), oversized shoulder slab (`walk-f0-front.jpg`), protruding thigh plate. |
| `zombie.guardian` | 4 | 4 | **3** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Minor gap behind front loincloth/tabard slab in side profile (`walk-f20-side.jpg`). |
| `zombie.caveguard` | 4 | 4 | **3** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Minor gap behind front loincloth/tabard slab in side profile (`walk-f20-side.jpg`). |

---

## 5. GP-19970 Brute & Demon Hide Palette Four-Light Review (`handoffs/GP-19970/hides-after/`)

- **Fixtures Compared**:
  - Before: `handoffs/GP-19970/eyes-after-four-lights/{noon,overcast,dusk,night}/{brute,demon}.png` (`brute #985548`, `demon #8b3e32`)
  - After: `handoffs/GP-19970/hides-after/{noon,overcast,dusk,night}/{brute,demon}.png` (`brute #86574c` at 43.3% HSV sat; `demon #784b43` at 44.2% HSV sat; wet-organic atlas)
- **Verdict (`PASS — 4/5` for Scoped Hide Palette, Material & Type Read)**:
  1. **`zombie.brute` (`#86574c`, 43.3% HSV)**:
     - Drops one step darker and grayer from the warm terracotta `#985548` into a muted dried-oxblood brown below the marine's skin value, while preserving the unmistakable heavy brute red-brown identity across `noon`, `overcast`, `dusk`, and `night`.
     - Wet-organic atlas roughness gives a convincing damp hide sheen on the deltoids, brow, and forearms (`Hide Materials: 4/5`, `Palette/Type Read: 4/5`).
     - **Remaining non-hide defects on `brute`**: The rectangular chest plate still reads as flat `#000` jet-black (needs `#181a1c` charcoal value floor + specular relief), the pale octagonal patch on the left upper arm remains sharp-edged, and the hanging waist straps / side-profile back frame still float off the torso (Rank 3 in §3).
  2. **`zombie.demon` (`#784b43`, 44.2% HSV)**:
     - Shifts from bright brick-red `#8b3e32` to a dark charred crimson-brown under the 45% HSV cap across all four lights (`noon`, `overcast`, `dusk`, `night`), with wet-organic specular highlights on the upper arms and brow (`Hide Materials: 4/5`, `Palette/Type Read: 4/5`).
     - The darker, desaturated hide substantially improves value contrast against the orange/yellow emissive chest fissures and fist flames (`docs/art-direction.md` §3).
     - **Remaining non-hide defects on `demon`**: `walk-f0` fist-flame world-matrix attachment order at frame 0 (Rank 5 in §3).

