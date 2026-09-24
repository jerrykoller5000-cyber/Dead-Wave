# Dead-Wave QA — Antigravity's Field Guide

This directory holds the visual test harness, reports, and screenshots captured by **Antigravity (Gemini 3.8 Flash)** on Jerry's PC with real hardware GPU rendering.

Antigravity is the crew's eyes: we run the game in Chrome on Jerry's GPU, verify all visual aspects, and report back to the code owners with screenshot proof.

---

## 1. How the Game is Served

The game requires an HTTP server because native ES modules and import maps cannot be loaded via `file://`.

Run in a background terminal:
```bash
npm run serve
# or directly:
node tools/serve.mjs 8971
```
The game is served at `http://127.0.0.1:8971/index.html?debug=1`.
With `?debug=1`, `window.TT` is exposed globally in DevTools and evaluation scripts.

---

## 2. How to Run Load Time Tests

To measure the real load time to the title screen on Jerry's GPU:
```bash
node tools/loadtime.mjs
```
Options:
- `--bg`: Measures background-tab behavior (verifies hidden-tab pre-roll pump)
- `--cold`: Clears browser cache before timing
- `--runs <N>`: Measures across multiple runs

---

## 3. How to Capture Screenshots

### Option A: Antigravity Automated QA Rig (`qa/shoot-qa.mjs`)
Captures both the interactive UI (Title Screen with menu) and clean world shots (`hq`, `pit`, `pit-bank`, `cave-shale-front`):
```bash
node qa/shoot-qa.mjs <task-id>
# Example:
node qa/shoot-qa.mjs 2026-09-23-AG-1
```
Screenshots land in `qa/shots/<task-id>/`.

### Option B: Built-in Shot Rig (`tools/shoot.mjs`)
Captures named clean world views (hiding UI overlays):
```bash
# List all 25 named views:
node tools/shoot.mjs --list

# Shoot specific views to QA directory on Jerry's GPU:
node tools/shoot.mjs hq pit lake-shore cave-shale-front --out qa/shots/<task-id> --show

# Compare two sets of shots:
node tools/shoot.mjs --compare <dirA> <dirB>
```

---

## 4. Screenshot Organization

All screenshots are stored under:
```
qa/shots/<date>-<task>/
  ├── title.png
  ├── hq.png
  ├── pit.png
  ├── pit-bank.png
  └── cave-shale-front.png
```

---

## 5. Reporting Findings

Per `AGENTS.md`:
1. Every claim ("works" or "regression") must name a screenshot file.
2. Every task ends with a handoff report at `qa/YYYY-MM-DD-<task>.md` using the handoff template.
3. Bugs and regressions are sent directly to the owner via:
   ```bash
   node crew/crew.mjs request antigravity <owner> "<summary>" "<steps, expected, seen, screenshot path>"
   ```
   Owners:
   - `claude`: World, terrain, water, caves, flora, lighting
   - `cursor`: Core engine, boot, loader, colliders, tools
   - `grokbot`: Combat, zombies, builds, turrets, wave director
   - `chatgpt`: UI, HUD, menus, shop, economy, onboarding
   - `opencode`: Contracts, test suite runs
