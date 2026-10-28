# GP-19968 — consumer hookup for the world owner

The six identities, strings and images are complete in `ui/hikers.js`, `ui/strings.js` and `ui/assets/hikers/`.
World placement remains the owner's work. The proposed hookup is intentionally small:

```js
import {paintHikerPosters, loadHikerPortraits, drawHikerRoster} from '../ui/hikers.js';

// Once AG-125's trailhead board and all its existing canvases exist:
board.userData.portraitsReady = paintHikerPosters(board.userData.posters);
board.userData.portraitsReady.catch(error => console.warn('Hiker posters:', error));
```

The painter keeps the existing canvas dimensions, repaints the whole sheet (portrait, canonical name,
age, approved one-line trace, ranger contact), and flags the owner's existing texture for upload.
It adds no geometry, no per-frame work, no random world changes, and no network dependency.
Callers can await `portraitsReady` for proof. Do not enlarge a canvas after its GPU texture is allocated.

For the ranger search board and a paper copy at the hikers' camp, create a canvas at its final dimensions
before creating a texture, then fill it once the cached local images resolve:

```js
const portraits = await loadHikerPortraits();
drawHikerRoster(ctx, {w: canvas.width, h: canvas.height}, portraits);
texture.needsUpdate = true;
```

The contact sheet's natural aspect is 1152:1120. Reuse its canvas/material for both surfaces where practical.
Keep the ranger lockbox's existing search log and its day/code legible; this is an additional roster, not a
replacement for the puzzle clue. At the hikers' camp it belongs on an existing supported surface near the kit;
the world owner decides its seat by world-design rules 8, 12 and 13. The module does not move any prop or reach.

When all three consumers are wired, take fresh production captures (no injected painter) and have Antigravity
inspect them. The runtime preview demonstrates supplied artwork only and cannot close that integration gate.
