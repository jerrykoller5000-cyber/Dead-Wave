# Marine dance — GP-19903

This iteration is **32.533333 seconds: 976 frames at 30 fps, 1280×720**. The routine covers 56 beats at **103.322299 BPM**, followed by the small remainder needed to finish on a whole video frame. The music is **not sped up**: `Been Warned.mp3` begins at source time **9.151494 seconds**, with a brief entry fade and an ending fade from 31.7 seconds. The original 60-second GP-19902 assets remain preserved in their own folder.

The character uses `outfit.json`, the saved player wardrobe snapshot carried forward from GP-19902: PAP Digital clothing/equipment, rolled sleeves, worn Feldgrau gloves, aviators, and the retained full training kit. The final stage conceals material patterns on a **fresh presentation actor** using cloned materials and silhouette lighting. The normal game character and its materials are untouched. `--diagnostic-light` shows the outfit under the original brighter stage for anatomy checks.

## Integration

- `marine-dance.mp4`: complete presentation with music. Play this alone for the simplest intro integration.
- `marine-dance-transparent.webm`: silent VP9 video with alpha for placing the actor over Claude's intro.
- `audio-dance.mp3`: the matching excerpt for the transparent video. Start, pause, and seek them together. Do not also play the MP4 soundtrack.
- `ui/disclaimer-dance.js`: reusable motion module. `createDisclaimerDance(freshMarine)` exposes `root`, `sample(seconds)`, and `duration`; `DISCLAIMER_DANCE` supplies timing and section boundaries. For live rendering, sample from the audio clock.
- `stage.js`: separate presentation styling. `createDanceStage(THREE, scene)` exposes `configureActor(marine)`, `update(seconds, beat, rootPosition)`, lighting controls, and cleanup. The capture harness demonstrates the setup without adding it to normal gameplay.

## Reproduce

Run from the repository root. Native capture uses the existing `tools/camera.mjs` harness. A full render requires 976 numbered PNGs; the encoder rejects incomplete sequences.

```powershell
node review/dance-GP19903/capture.mjs --sheet --diagnostic-light --out review/dance-GP19903/bright-sheet
node review/dance-GP19903/capture.mjs --render --motionblur
node review/dance-GP19903/encode.mjs
node review/dance-GP19903/capture.mjs --render --alpha --motionblur
node review/dance-GP19903/encode.mjs --alpha
```

Motion blur averages three subframes across a **13.33 ms shutter** (0.4 frame), retaining transparency. Render outputs default to `frames/` and `frames-alpha/`. Use `capture.mjs --audit` for pose/ground-contact/seek checks; use `encode.mjs --verify` or `--alpha --verify` to recheck an existing delivery.

## Verification status

**Both deliveries passed verification.** Each is 32.53 seconds, 976 frames at 1280×720. The MP4 has zero measured audio lag; the WebM alpha decodes from 0 to 255. `manifest.json` records exact source and asset hashes. Capture folders contain `proof.json` with the renderer, wardrobe, sampled poses, and browser errors. Each completed encode writes an adjacent `.verification.json` checking frame count, duration, dimensions, and audio alignment or transparency. Beat-to-frame markers describe the intended timing; visual review must still establish that the moves land cleanly.

The final native audit (`finalcheck4/proof.json`) sampled every delivery frame plus the endpoint: 977 poses, no floor penetration, no elbow hyperextension, no hands entering the conservative shirt/torso proxy, and planted palms within 1.4 mm of their targets. The 15 seek checks are exact; 16 internal boundaries are continuous. Bright poses were inspected in `finalcheck4-poses/contact-sheet.png`. This is not a full triangle-to-triangle self-collision guarantee or a substitute for judging the finished motion at playback speed.

The shared `npm test` run remains incomplete: see `npm-attempt.txt`. It reached 17 tests, including the retained t1/t3 failures and two untriaged t14 failures, before being stopped. The suite does not import this presentation module. Cursor has the completion/triage request. No shared test was changed. Claude intro integration, independent playback/mix review, and the eventual intro loading/decode budget remain to be checked in that integration.
