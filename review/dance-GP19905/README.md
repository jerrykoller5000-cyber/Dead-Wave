# Marine dance — articulated hops and ground finale

The delivery target is **exactly 20.000 seconds: 600 frames at 30 fps, 1280×720**. This refinement keeps the accepted music, wardrobe, cyan/amber lighting, fixed camera, and full-frame transparency. It improves the jump articulation and ends by braking the backspin into a supported reclining freeze.

**Status: frozen motion, both final exports, and all 14 native composite captures verified.** Evidence below belongs to GP-19905.

## Sequence

The first group of three side hops occupies **beats 9–12 (5.226–6.968 seconds)**. Two more follow at **beats 18–20 (10.453–11.614 seconds)**. Knees and ankles load, tuck in flight, and absorb the landing while the pelvis travels; the hands and upper body counter the jump.

The hand plant, kick-up, and handstand now precede the final backspin. The side roll begins during the last spin rotation at **beat 30.75 (17.857 seconds)**. Rotation finishes braking at beat 31.25, while the pose continues rolling smoothly into the supported recline. The final pose is reached at **beat 33.2 (19.279 seconds)** and held through 20 seconds—**about 0.721 seconds**. `choreography-timeline.json` records the exact beat and second boundaries.

Lateral and depth travel remain motion in the rendered scene. The camera stays fixed, and the full source frame is preserved; no CSS tracking or tight actor crop is part of this delivery.

## Files for the intro

- `marine-dance.mp4`: complete presentation with music.
- `marine-dance-transparent.webm`: silent VP9 alpha video, full 1280×720 frame.
- `audio-dance.mp3`: unchanged matching 20-second excerpt. It starts at source second **9.151494** in `Been Warned.mp3`, at the original pitch and speed, and fades from **19.55 to 20.00 seconds**.
- `outfit.json`: unchanged accepted player outfit and gear snapshot.
- `stage.js`: byte-identical accepted lighting and material treatment; shared game materials remain untouched.
- `disclaimer-preview.html`: isolated composite using existing disclaimer styling and selectable existing copy. It does not set Claude's final voice/card timeline.
- `integration-notes.txt`: exact duration, full-frame placement, clock basis, and verified layout evidence.

The choreography remains in `ui/disclaimer-dance.js` and operates on a fresh presentation character. No live intro integration is included here.

## Render and verification

From the repository root:

```powershell
node review/dance-GP19905/capture.mjs --render --motionblur
node review/dance-GP19905/encode.mjs
node review/dance-GP19905/capture.mjs --render --alpha --motionblur
node review/dance-GP19905/encode.mjs --alpha
node review/dance-GP19905/composite-check.mjs
```

The encoder requires 600 contiguous PNG frames. Accepted motion blur uses nine temporal samples across a **13.33 ms shutter**, accumulated at integer precision before alpha composition. `node review/dance-GP19905/encode.mjs --verify` and `node review/dance-GP19905/encode.mjs --alpha --verify` inspect existing outputs without rendering again. The temporary 600-frame source folders were removed after full decode verification; run the corresponding capture command above before re-encoding. Complete `render-proof.json` and `render-alpha-proof.json`, 28 selected images in `final-stills/`, the native audit, and composite captures remain.

## Native pose evidence

`final-audit/proof.json` checks **601 poses, 26 boundaries, and 13 deterministic seeks** against frozen motion SHA-256 `732005e7e52293ef76f3be09512aabb31695c9ece4b80027ee395e44498aacbc`. All **nine quality gates pass**; repeated seeks differ by zero, and there are no browser errors or clipped vertices. Minimum source-frame margin is **75.601 px**, planted palm error peaks at **0.877 mm**, and free-wrist bend peaks at **28.591°**.

The floor gate allows **2 mm**: the worst case is a **1.242 mm boot/toe intersection during kick-up at 12.7 seconds**. This is within that tolerance, not literally zero penetration. `final-sheet-v2/contact-sheet.png` provides the bright visual review of the refined jumps and supported ground pose.

## Final export and layout evidence

Both output verification files pass: **600 decoded frames, exactly 20.000 seconds, 1280×720**. The MP4 audio has **0 measured lag samples** against the unchanged excerpt (normalized correlation **0.998701**). The silent WebM has decoded alpha from **0 to 255**. These checks verify the exports and mux timing; they do not measure subjective musical timing.

The command `node review/dance-GP19905/composite-check.mjs` returned **PASS composite** for **14 screenshots**: left/right travel, standing near/far depth, lowest/highest screen vertex, and the final freeze at 19.8 seconds, each at **1280×720 and 900×900**. The decoded source margin is at least **75 px**, viewport margin **65.700 px**, and gap above existing text **21.853 px**. There is **no actor/text overlap, no source or viewport cropping, and no browser error** in these captures; all decoded corner pixels are transparent.

`composite-proof/contact-sheet.png` was visually inspected, and `composite-proof/proof.json` records every seek, source hash, rectangle, alpha bound, and result. The square layout preserves the complete fixed frame and consequently displays a smaller dancer. The selected final source frames remain in `final-stills/`.

The shared game regression suite was not run by this presentation subtask; see the crew handoff for the final suite result. Claude's production voice/card timing, live game startup, and real-time intro decode performance remain outside this isolated check. Numerical contact and torso-proxy checks do not constitute exhaustive self-collision testing.
