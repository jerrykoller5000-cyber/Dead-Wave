# antigravity — AG-82 Frame time on Jerry's GPU, after CU-148 — 2026-10-18
Changed:          On Jerry's RTX 5080, 48-shambler `megaswarm` holds 48.9–54.1 fps (334–470 draws, 508k–559k tris), while full-match last pushes with 48 mixed zombies on Nights 5, 10, 14, 18, and 20 run at 31.5–35.2 fps (1% low 26.9–29.6 fps) on default/`high` (549–640 draws, 738k–951k tris). Switching to `--gfx max` (4096 shadow map, unlimited foliage) keeps Nights 5–20 at 31.1–38.5 fps (1% low 26.2–29.8 fps, 550–740 draws, 751k–949k tris), with Night 14 (921k–951k tris) and Night 20 (860k–876k tris) carrying the heaviest triangle loads. Also captured and verified ChatGPT's GP-19925 HQ story board shots at 1280x720 and 390x844 (`qa/2026-10-18-GP-19925-shots/`).
Files:            qa/2026-10-18-AG-82/report.md, qa/2026-10-18-AG-82/bench-lines.jsonl, qa/2026-10-18-AG-82/bench-results.json, qa/2026-10-18-AG-82/run-ag82.mjs, qa/2026-10-18-AG-82/run-ag82-max.mjs, qa/2026-10-18-GP-19925-shots/report.json
Tests:            node crew/crew.mjs slot run antigravity AG-82 --checks "GP-19925 HQ story board shots + AG-82 bench.mjs nights 5,10,14,18,20 and megaswarm(48) at default and High" -- node qa/2026-10-18-AG-82/run-ag82.mjs → 12/12 bench runs + 6/6 GP-19925 shots pass; node crew/crew.mjs slot run antigravity AG-82 --checks "AG-82 bench.mjs nights 5,10,14,18,20 and megaswarm(48) at --gfx max" -- node qa/2026-10-18-AG-82/run-ag82-max.mjs → 6/6 max bench runs pass (Rule 16: queued through the machine-wide game-test slot, single instance, released on exit)
Screenshots:      qa/2026-10-18-GP-19925-shots/threat-report-orders-desktop-1280.png, qa/2026-10-18-GP-19925-shots/threat-report-orders-narrow-390.png, qa/2026-10-18-GP-19925-shots/relay-hush-origin-desktop-1280.png, qa/2026-10-18-GP-19925-shots/relay-hush-origin-narrow-390.png, qa/2026-10-18-GP-19925-shots/guardian-night6-and-reward-desktop-1280.png, qa/2026-10-18-GP-19925-shots/guardian-night6-and-reward-narrow-390.png
Not verified:     None (all 18 GPU benchmark runs across default, `--gfx high`, and `--gfx max` verified on NVIDIA GeForce RTX 5080).
Requests:         FYI sent to claude with AG-82 JSON lines for CL-203 budgets; replied DONE to ChatGPT's GP-19925 HQ story board request.
Contract changes: none

## Two-Line Summary
1. On Jerry's RTX 5080, 48-shambler `megaswarm` holds **48.9–54.1 fps** (`334–470` draws, `508k–559k` tris), while full-match last pushes with 48 mixed zombies on **Nights 5, 10, 14, 18, and 20** run at **31.5–35.2 fps** (1% low **26.9–29.6 fps**) on default/`high` (`549–640` draws, `738k–951k` tris).
2. Switching to `--gfx max` (`4096` shadow map, unlimited foliage) keeps Nights 5–20 at **31.1–38.5 fps** (1% low **26.2–29.8 fps**, `550–740` draws, `751k–949k` tris), with **Night 14** (`921k–951k` tris) and **Night 20** (`860k–876k` tris) carrying the heaviest triangle loads.

## JSON Lines (`tools/bench.mjs` on Jerry's GPU)
```json
{"scenario":"night","seconds":10,"fps":34.8,"low":29.2,"worst":39.2,"hitches":0,"draws":634,"triangles":769849,"zombies":48,"gfx":"high","windows":9,"night":5,"push":2,"pushes":3,"last":true}
{"scenario":"night","seconds":10,"fps":32.3,"low":27.5,"worst":35.2,"hitches":0,"draws":598,"triangles":778457,"zombies":48,"gfx":"high","windows":9,"night":10,"push":3,"pushes":4,"last":true}
{"scenario":"night","seconds":10,"fps":34,"low":27.5,"worst":121.4,"hitches":1,"draws":598,"triangles":920569,"zombies":48,"gfx":"high","windows":9,"night":14,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":35.2,"low":29.6,"worst":32.9,"hitches":0,"draws":633,"triangles":755437,"zombies":48,"gfx":"high","windows":9,"night":18,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":31.5,"low":26.9,"worst":58,"hitches":1,"draws":570,"triangles":863293,"zombies":48,"gfx":"high","windows":9,"night":20,"push":5,"pushes":6,"last":true}
{"scenario":"megaswarm","seconds":10,"fps":48.9,"low":38.9,"worst":23.6,"hitches":2,"draws":470,"triangles":559064,"zombies":48,"gfx":"high","windows":9,"count":48}
{"scenario":"night","seconds":10,"fps":35,"low":29.5,"worst":38.2,"hitches":0,"draws":549,"triangles":737969,"zombies":48,"gfx":"high","windows":9,"night":5,"push":2,"pushes":3,"last":true}
{"scenario":"night","seconds":10,"fps":34.9,"low":27.9,"worst":68.8,"hitches":1,"draws":634,"triangles":759769,"zombies":48,"gfx":"high","windows":9,"night":10,"push":3,"pushes":4,"last":true}
{"scenario":"night","seconds":10,"fps":33.6,"low":27.7,"worst":34.1,"hitches":0,"draws":640,"triangles":950685,"zombies":48,"gfx":"high","windows":9,"night":14,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":34,"low":28.6,"worst":34.3,"hitches":0,"draws":596,"triangles":768397,"zombies":48,"gfx":"high","windows":9,"night":18,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":33.5,"low":27.6,"worst":36.6,"hitches":2,"draws":617,"triangles":875553,"zombies":48,"gfx":"high","windows":9,"night":20,"push":5,"pushes":6,"last":true}
{"scenario":"megaswarm","seconds":10,"fps":52.3,"low":38.5,"worst":22,"hitches":2,"draws":342,"triangles":507602,"zombies":48,"gfx":"high","windows":9,"count":48}
{"scenario":"night","seconds":10,"fps":37.3,"low":29.8,"worst":28.4,"hitches":0,"draws":550,"triangles":751397,"zombies":48,"gfx":"max","windows":9,"night":5,"push":2,"pushes":3,"last":true}
{"scenario":"night","seconds":10,"fps":38.5,"low":29,"worst":70,"hitches":1,"draws":632,"triangles":755041,"zombies":48,"gfx":"max","windows":9,"night":10,"push":3,"pushes":4,"last":true}
{"scenario":"night","seconds":10,"fps":31.1,"low":27.3,"worst":36.6,"hitches":0,"draws":740,"triangles":949419,"zombies":48,"gfx":"max","windows":9,"night":14,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":33.7,"low":27.4,"worst":37.9,"hitches":0,"draws":636,"triangles":761129,"zombies":48,"gfx":"max","windows":9,"night":18,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":32.7,"low":26.2,"worst":38.7,"hitches":0,"draws":572,"triangles":859685,"zombies":48,"gfx":"max","windows":9,"night":20,"push":5,"pushes":6,"last":true}
{"scenario":"megaswarm","seconds":10,"fps":54.1,"low":40.6,"worst":22,"hitches":2,"draws":334,"triangles":507631,"zombies":48,"gfx":"max","windows":9,"count":48}
```
