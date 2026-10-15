# Marine dance — directional hops and active floorwork

The delivery remains **exactly 20.000 seconds: 600 frames at 30 fps, 1280×720**. GP-19906 keeps the accepted outfit, dark cyan/amber lighting, music excerpt, fixed camera, and full-frame transparency.

**Status: frozen motion, both final exports, and all 14 native composite captures verified.** Evidence below belongs to GP-19906.

## Sequence

The single group of three side hops occupies **beats 9–12 (5.226–6.968 seconds)**. The pelvis leans into each push, the feet remain close, and the body catches the landing. Short launch/catch acceleration ramps replace the previous easing through the entire airborne path.

The former second hop group is now a **heel-toe shimmy**, blended in from beat 16 and sustained through beat 20.5. Chest, head, hips, and arms counter the footwork. The handstand remains before the finale, followed by a quicker shoulder flop into a **driven backspin** with scissoring legs, tucked arms, and a curled torso.

The side roll now begins during the last spin rotation at **beat 30.4 (17.653 seconds)**. Rotation finishes braking at beat 31.25; cheek-rest reach begins at beat 31.9, while the pose keeps unfolding. The final pose arrives at **beat 33.2 (19.279478 seconds)** and holds for **0.720522 seconds** through the 20-second endpoint. `choreography-timeline.json` is the authoritative motion timeline.

## Files for the intro

- `marine-dance.mp4`: complete staged presentation with music.
- `marine-dance-transparent.webm`: silent full-frame VP9 alpha.
- `audio-dance.mp3`: unchanged 20-second excerpt from source seconds **9.151494–29.151494**, original pitch and speed, fade **19.55–20.00 seconds**.
- `stage.js` and `outfit.json`: unchanged accepted presentation treatment and wardrobe.
- `disclaimer-preview.html`: private composite using the existing disclaimer styling and copy.
- `integration-notes.txt`: full-frame layout and audio-clock instructions for Claude.

The full frame preserves actual scene-space lateral/depth travel. No CSS tracking, recentering, or tight actor crop is used. Choreography lives in `ui/disclaimer-dance.js` and acts on a fresh presentation character; this package does not change the live intro.

## Render and verification

From the repository root:

```powershell
node review/dance-GP19906/capture.mjs --render --motionblur
node review/dance-GP19906/encode.mjs
node review/dance-GP19906/capture.mjs --render --alpha --motionblur
node review/dance-GP19906/encode.mjs --alpha
node review/dance-GP19906/composite-check.mjs
```

The capture uses **nine temporal samples**, **13.33 ms shutter**, and integer-precision premultiplied accumulation. The encoder requires 600 contiguous source PNGs. Verify existing deliveries with `node review/dance-GP19906/encode.mjs --verify` and `node review/dance-GP19906/encode.mjs --alpha --verify`. If temporary frame folders have been cleaned after verification, rerun the corresponding capture before encoding.

## Native pose evidence

`final-audit/proof.json` matches frozen source SHA-256 `d11fe67f4d07a964cd176673e990d6fd50a0158e32828f617480ffc2d95e8070`. It checks **601 poses, 28 boundaries, and 13 deterministic seeks**. All **nine quality gates pass**, repeated seeks differ by zero, and there are no browser errors or clipped vertices. Source-frame margin is at least **75.601 px**, planted-palm error peaks at **0.877 mm**, and free-wrist bend peaks at **28.167°**.

The floor gate allows **2 mm**. The worst intersection remains **1.242 mm**, at a boot/toe during the kick-up at 12.7 seconds. It is within tolerance, not mathematically zero penetration. Contact and torso-proxy checks are numerical diagnostics, not exhaustive mesh self-collision verification.

## Final export and layout evidence

Both verification files pass: **600 decoded frames, exactly 20.000 seconds, 1280×720**. The MP4 audio has **0 measured lag samples** against the unchanged excerpt (normalized correlation **0.998701**). The silent WebM decodes alpha from **0 to 255**. These checks verify export integrity and mux timing; they do not measure subjective musical timing.

`node review/dance-GP19906/composite-check.mjs` returned **PASS composite** for **14 screenshots** at **1280×720 and 900×900**: left/right travel, standing near/far depth, lowest/highest screen vertex, and final freeze at **19.8 seconds**. Right and near extrema coincide at **9.433 seconds** in this revision. The minimum decoded source margin is **75 px**, viewport margin **66.600 px**, and gap above existing text **21.853 px**. These captures have **no source or viewport cropping, no text overlap, and no browser errors**; all decoded corners are transparent.

`composite-proof/contact-sheet.png` was visually inspected. `composite-proof/proof.json` records each timestamp, rectangle, alpha bound, and result. Square screens retain the complete fixed frame and therefore display a smaller dancer. Complete `render-proof.json` and `render-alpha-proof.json`, **39 selected PNGs** in `final-stills/`, both export verification files, the native audit, and all composite captures remain as evidence.

Shared npm results belong in the root crew handoff. Production voice/card timing, live game startup, and real-time intro decoding are outside this private staged check. The audio asset is byte-identical to GP-19905. Only the copied audio-analysis metadata’s three stale choreography hints were corrected to beat 33.2 and the 0.720522-second hold; track, excerpt, tempo, and decoded-audio evidence are unchanged. `choreography-timeline.json` provides the complete motion sequence.
