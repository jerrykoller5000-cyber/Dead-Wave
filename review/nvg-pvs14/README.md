# GP-165 — PVS-14 inspired NVG view

A single circular eyepiece, soft edge falloff, pale phosphor tone response, highlight-derived halation, fine moving scintillation and three tiny fixed peripheral specks. Reduced-motion CSS stops grain animation. HUD remains above the optical mask.

Production: ui/night-vision.css and index.html's NVG stylesheet link/SVG/overlay markup only. Old inline NVG CSS moved/replaced. No camera zoom, FOV, world lighting, fog, gear, input, audio or gameplay code changes by GP-165. Existing startup prewarm and activation/removal paths remain intact. Tone and phosphor color share one lookup, avoiding two full-canvas filter stages.

Reference: [ATN PVS-14 manual](https://www.atncorp.com/manual/pvs14), circular image and normal faint random scintillation. This is an artistic screen-space adaptation for the existing third-person game, not a calibrated 40-degree optical simulation or temporal auto-gain model. The prior pale phosphor style is retained.

## Evidence

- tools/camera.mjs: before/ and after/ training, wide and outdoor PNGs with matching camera metadata; after/flashlight.png has actual flashlight ON. Outdoor before temporarily applies saved baseline CSS to the same current scene, then removes it. No production file was reverted.
- node ui/nvg-review.mjs before/after: real-renderer activation/deactivation assertions pass, filter disappears when off, zero browser errors. Final after captures were repeated following filter optimization.
- npm test -- t101 t161 t177 t186 t215 --jobs 2 --all-fails: 5 checks, 64 pass, 0 fail (tests.log). Gear gating, night fog/rims, input and encoding. No tests changed; full suite not rerun for this presentation-only change.
- Initial full inline-script equality check passed. GB-151 later added pistol-grip code to the shared file, preserved by this task. Final updateNvgVisual and toggleNvg functions are exactly baseline. The current full index hash therefore includes that concurrent work; no claim that all current scripts equal the older snapshot.
- Quiet scene FPS 60.17 before / 59.80 final, zero errors. Final warm camera reload 8.7 seconds; no controlled cold-boot claim.
- Same-page warmed 48-body final A/B sequence after/before/before/after: 37.13 old / 36.86 new FPS, under 1% difference. Both are below the repository's 60 FPS horde target. Independent normal visible-game hardware acceptance remains unverified. Exact blocks: performance-final.json. The earlier unoptimized timing remains in performance.json, not the final result.
- NVIDIA RTX 5080 ANGLE/D3D11, offscreen camera with raf=timer. Source/image hashes and limits: summary.json.

Independent player-distance readability, peripheral visibility, scope overlap and visible-GPU acceptance requested from Antigravity. Reduced-motion CSS was implemented/inspected; OS preference switching was not exercised. No new dependencies or player-facing text.
