# tools/disclaimer — how the AI disclosure video is made (CL-191)

The disclosure that plays before the caracal is one video, `assets/disclaimer/disclaimer.mp4` (1920×1080, 60 fps
H.264 + AAC, ~21.8 s). Picture and sound are baked together here, so at play time nothing keeps time: the browser's
media pipeline plays it, hardware-decoded and off the main thread, while the game builds its world behind it.
`assets/intro/disclaimer.js` only starts it, skips it and hands over to the opening.

## Rebuild

    tools/disclaimer/build.sh              # ~25 min; writes assets/disclaimer/disclaimer.mp4

Needs ffmpeg (libvpx-vp9, libx264), python3 + numpy + scipy + pillow, node 22+ and Chrome (driven through the repo's
`tools/cdp.mjs`, no packages; `CHROME=/path` picks the browser). On Windows run it from Git Bash.
Sources: `src/` (Jerry's clips, `src/README.md` maps them to his file names) and GPT's dancer,
`DANCE=review/dance-GP19906/marine-dance-transparent.webm` by default (full-frame 1280×720 alpha, 30 fps, 20 s).

## What is where

| file | what |
| --- | --- |
| `timeline.json` | every cue: the siren, the drop (song 9.151494 s = GPT's beat 0 = dancer frame 0), each line's in/out and voice start, the chirps, the shot, the tail. Both the mix and the picture read it. |
| `words.json` | when each word is said in each voice line (Whisper word timestamps, the ones after a pause corrected to where the silence ends). The words come on as they are spoken. |
| `mix.py` | the sound: siren, song (ducked under the voices, cut dead by the shot), voices, the distant guy (band-limited, panned left, echoed, far back), the rifle with a room tail; limited to -1 dBFS, -17 LUFS. |
| `scene.html`, `scene.js` | the picture, as a pure function of time (`renderAt(t)`): police lights and smoke, the dashcam frame, the stage and spotlight, the dancer and his reflection, the kinetic text. |
| `render.mjs` | draws every frame in headless Chrome through `tools/cdp.mjs` (`--at 2.0,4.5` for stills while designing). |
| `bbox.py`, `dance-bbox.json` | the dancer's box per frame (his reflection's floor line). |
| `build.sh` | all of the above, then the encode. |

## Knobs

- Timing: `timeline.json` (lines are in song seconds after the drop; `chirps` and `shotAt` after that line's voice).
- The dancer's size and place: `#dancerBox` in `scene.html` (589×331 at 638,739 = 0.46 of GPT's frame, his travel
  centred at the bottom) and the scale in `build.sh` step 1. GPT's frame is used whole: no crop, no tracking.
- Levels: the `db(...)` targets in `mix.py`.
- Look: colours, fonts and sizes in `scene.html`; motion in `scene.js` (each line has its own block in `renderText`).
