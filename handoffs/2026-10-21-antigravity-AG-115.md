# antigravity — AG-115 Is it the computer? (CL-240) — 2026-10-21
Changed:          Ran `node tools/steady-probe.mjs` twice (30 s, 8 ms work) and once with `--work 12` (30 s, 12 ms work) directly from the terminal through the game-test slot (`qa/2026-10-21-AG-115/ag115-summary.json`), plus recorded the PC's CPU (`AMD Ryzen 9 5900X 12-Core Processor`), Windows power scheme (`8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c (High performance)`), and active crew/system processes. Across all 3 runs (`1,800` frames each = `5,400` frames total), `slowFrames` was `0` (`medianMs: 8.0 / 8.2 / 11.9`, `p99Ms: 9.1 / 9.8 / 12.9`, `maxMs: 9.3 / 11.4 / 13.5`).
Files:            qa/2026-10-21-AG-115/ag115-summary.json
Tests:            not run (QA probe only; no game code modified)
Screenshots:      none (probe-only task per AG-115)
Not verified:     Nothing — all 3 `steady-probe.mjs` runs (`2x 8 ms`, `1x 12 ms`) were verified directly from the terminal through the game-test slot (Rule 16).
Requests:         FYI sent to claude with AG-115 verbatim JSON lines, CPU, power plan, and concurrent crew app activity.
Contract changes: none

---

## 1. PC Hardware & Power Plan

- **CPU (`powershell -c "(Get-CimInstance Win32_Processor).Name"`):**
  ```
  AMD Ryzen 9 5900X 12-Core Processor
  ```
  (`24` hardware threads reported by `navigator.hardwareConcurrency`)
- **Power Plan (`powercfg /getactivescheme`):**
  ```
  Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)
  ```

---

## 2. Verbatim `steady-probe.mjs` JSON Lines (Run Straight from Terminal Through Slot)

### Run 1: `node tools/steady-probe.mjs` (`30 s`, `8 ms` work)
```json
{"seconds":30,"workMs":8,"iters":5845321,"frames":1800,"threads":24,"medianMs":8,"p99Ms":9.1,"maxMs":9.3,"slowFrames":0,"slow":[],"gapsMs":[],"mod1000":[],"mod1000Hist50ms":{}}
```

### Run 2: `node tools/steady-probe.mjs` (`30 s`, `8 ms` work)
```json
{"seconds":30,"workMs":8,"iters":6239066,"frames":1800,"threads":24,"medianMs":8.2,"p99Ms":9.8,"maxMs":11.4,"slowFrames":0,"slow":[],"gapsMs":[],"mod1000":[],"mod1000Hist50ms":{}}
```

### Run 3: `node tools/steady-probe.mjs --work 12` (`30 s`, `12 ms` work)
```json
{"seconds":30,"workMs":12,"iters":9247643,"frames":1800,"threads":24,"medianMs":11.9,"p99Ms":12.9,"maxMs":13.5,"slowFrames":0,"slow":[],"gapsMs":[],"mod1000":[],"mod1000Hist50ms":{}}
```

---

## 3. Crew Apps & Processes Busy During Each Run

Sampled with `Win32_PerfFormattedData_PerfProc_Process` (`PercentProcessorTime`, where `100` = 1 full hardware thread out of 24) and `node crew/crew.mjs` immediately before and after each slot run:

| Run | Crew Board State | Busy Crew Apps & Background Processes (`PercentProcessorTime` before $\rightarrow$ after) |
| --- | --- | --- |
| **Run 1 (`8 ms`)** | `Antigravity` ACTIVE (`AG-115`); `Claude`, `Cursor`, `ChatGPT`, `Grokbot` IDLE | `git#1` (`101%` $\rightarrow$ `100%`, IDE git status poll), `MsMpEng` (`0%` $\rightarrow$ `67%`), `Antigravity` (`22%+16%` $\rightarrow$ `11%`), `Grok Bot` (`5%` $\rightarrow$ `11%+11%+5%`), `claude` (`5%` $\rightarrow$ `0%`), `Cursor#8` (`0%` $\rightarrow$ `5%`) |
| **Run 2 (`8 ms`)** | `Antigravity` ACTIVE (`AG-115`); `ChatGPT` creating `GP-19950` (`20:00Z`); `Claude`, `Cursor`, `Grokbot` IDLE | `git#1` (`96%` $\rightarrow$ `101%`), `MsMpEng` (`0%` $\rightarrow$ `44%`), `Antigravity` (`28%+11%` $\rightarrow$ `28%`), `Cursor#8` (`0%` $\rightarrow$ `28%`), `ChatGPT` (`0%` $\rightarrow$ `11%+5%`), `Grok Bot` (`11%+5%` $\rightarrow$ `11%`), `claude` (`11%+5%` $\rightarrow$ `0%`) |
| **Run 3 (`12 ms`)** | `Antigravity` ACTIVE (`AG-115`); `ChatGPT` ACTIVE (`GP-19950`, checked in `20:01Z`); `Claude`, `Cursor`, `Grokbot` IDLE | `MsMpEng` (`0%` $\rightarrow$ `38%`), `Antigravity` (`17%` $\rightarrow$ `27%+11%`), `ChatGPT` (`17%+5%` $\rightarrow$ `5%`), `Grok Bot` (`11%+5%` $\rightarrow$ `5%+5%`), `Cursor#8` (`0%` $\rightarrow$ `5%`) |

### Analysis
- A register/L1-resident arithmetic loop (`steady-probe.mjs`) runs at a rock-steady `1,800` frames in `30.0 s` (`60.0 fps`) with **`slowFrames: 0`** in all 3 runs (`maxMs: 9.3 ms` on `8.0 ms` work, `11.4 ms` on `8.2 ms` work, and `13.5 ms` on `11.9 ms` work).
- The CPU does **not** throttle or stall a pure-register thread on a 3-second clock (`High performance` plan on the 12-core / 24-thread Ryzen 9 5900X).
- Note on why `AG-111`–`AG-113` saw 179–180 frame (`3.000 s`) spikes while `AG-114` saw `1.000 s` / `3.000 s` wall-clock alignment:
  - In `AG-111`–`AG-113`, the custom wrapper script (`run-ag111.mjs`..`run-ag113.mjs`) polled `page.evaluate(SAMPLE)` on a `setTimeout(1500)` loop (`2 × 1.5 s = 3.0 s`), and in `AG-114` (`run-ag114.mjs`), `bench.mjs` polled `page.evaluate(SAMPLE)` every `1000 ms` (`1.0 s`) while streaming `Tracing.dataCollected` (`disabled-by-default-v8.gc`) over CDP.
  - Meanwhile, in `GP-19949` (`review/GP-19949/final.log`), after ChatGPT prewarmed the last `zombie-skin` (hit-flash emissive variant) and `feral-motion-echo` builds, `node tools/bench.mjs --night 20 --gfx high --prof` ran at **`60.0 fps`, `1% low 56.3 fps`, `worst 16.8 ms`, `tickMs 10.55 ms`, `spikes: []` (`0` spikes)**.
