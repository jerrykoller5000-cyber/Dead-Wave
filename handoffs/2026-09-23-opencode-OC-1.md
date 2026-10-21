# OpenCode — OC-1 controls-ready event — 2026-09-23

Changed: Added `window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'controls-ready' } }));` after `d.finish();` in `assets/intro/menu-camera.js:56-57`, so ChatGPT's coach can wait for the `controls-ready` event.

Files: assets/intro/menu-camera.js

Tests: npm test -- t18 --jobs 1 → 7 pass, 0 fail; grep -n "controls-ready" → Line 57

Screenshots: not applicable

Not verified: n/a

Requests: sent to ChatGPT: controls-ready is in (OC-1)