# Marine dance — final 20-second cut

Delivery is **exactly 20.000 seconds: 600 frames at 30 fps, 1280×720**. Music starts at **9.151494 seconds** in the original `Been Warned.mp3`, at the original **103.322299 BPM**, with unchanged pitch and playback speed. It fades from **19.55 to 20.00 seconds**.

Twenty seconds spans **34.440766333 beats**; the duration is not rounded to a whole beat. Movement occupies beats 0–34, with the final pose held for the remaining **0.255956 seconds**.

## Intro integration

- `marine-dance.mp4`: complete presentation with music.
- `marine-dance-transparent.webm`: silent full-frame VP9 video with alpha, for placement over the intro.
- `audio-dance.mp3`: matching 20-second excerpt for the transparent video. Start, pause, and seek them together; avoid also playing the MP4 soundtrack.
- `outfit.json`: the accepted player wardrobe and retained training gear snapshot, copied unchanged from GP-19903.
- `stage.js`: the accepted GP-19903 lighting/styling, copied byte-for-byte. It conceals clothing patterns on a fresh presentation actor through cloned materials; normal game character materials are untouched.

The reusable motion remains in `ui/disclaimer-dance.js`; the capture harness creates an independent actor and stage. This delivery does not modify the live intro. Earlier GP-19902 and GP-19903 assets remain preserved.

## Render and encode

From the repository root:

```powershell
node review/dance-GP19904/capture.mjs --render --motionblur
node review/dance-GP19904/encode.mjs
node review/dance-GP19904/capture.mjs --render --alpha --motionblur
node review/dance-GP19904/encode.mjs --alpha
```

The encoder requires exactly 600 contiguous numbered PNGs in `frames/` or `frames-alpha/`. Motion blur uses nine subframes across a 13.33 ms shutter. `encode.mjs --verify` and `encode.mjs --alpha --verify` recheck an existing delivery without re-encoding.

## Evidence

The audio was decoded to **960,000 samples per channel at 48 kHz: exactly 20 seconds**. Details are recorded in `audio-timeline.json`; MP3 container padding is not part of the decoded excerpt.

Both final videos pass full decode verification: **600 frames, 20.000 seconds, 1280×720**. MP4 audio alignment is **0 samples of lag**; the WebM alpha sample spans **0–255**. `manifest.json` records exact file hashes. `render-proof.json` and `render-alpha-proof.json` identify the final nine-sample integer-precision blur renderer, avoiding both triple outlines and additive banding. Selected actual frames are in `final-stills/`.

The native bright audit checks **601 poses, 27 transitions, and 13 deterministic seeks**. All nine quality gates pass; no browser errors or clipped vertices. Minimum frame margin is 73 px, planted palms miss by at most 0.87 mm, and hop boot surfaces remain at least 34.7 mm apart. `audit-summary.json` is the compact evidence; `final-audit/proof.json` retains the full measurements and `sheet1/contact-sheet.png` shows bright poses. Actual hip travel spans **434 screen pixels**; forward/back travel changes apparent scale by **26%**. See `choreography-timeline.json` for the complete 20-second sequence.

The brief grab is at 4.646–4.936 seconds. Three together-foot hops follow at 5.226–6.968 seconds; two more at 17.421–18.583. Head and shoulders counter the stronger hip groove; power moves remain planted. Lighting and wardrobe match the accepted previous cut.

The diagnostic torso proxy is not exhaustive mesh self-collision. Human normal-speed playback/mix judgement and the live intro's startup/decode performance remain for integration. Full shared npm regression was not rerun here; the prior GP-19903 incomplete Chrome run remains assigned to Cursor. No shared test expectations changed.

## Disclaimer layout proof

`composite-proof/contact-sheet.png` and `proof.json` show ten native captures at **1280×720 and 900×900**, using the actual left/right, near/far and lowest-screen extremes with existing disclaimer copy. No cropped body or text overlap; the longest card clears the actor by at least **21.85 px**. The existing stage placement works unchanged. `disclaimer-preview.html` is an isolated layout preview with a selected card held for inspection, not Claude's production voice/card timeline. It buffers the short local media for reliable preview seeks.

Temporary full-frame PNG sequences were removed after video verification; selected frames and both complete render proofs are retained. Run the capture commands to regenerate them; use `encode.mjs --verify` or `--alpha --verify` to inspect existing videos without source frames.
