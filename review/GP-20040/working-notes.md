# GP-20040 — J19 stocked-gun low-ready study

Status 2026-11-07 17:45Z: Grokbot checked out GB-294, five hip rows were changed, and the final `after/` pair for each gun was captured. See `handoffs/2026-11-07-chatgpt-GP-20040.md` for proof and the sniper limitation.

Action: five stocked guns rest against the right shoulder at hip, with the butt behind the lower-right frame, a readable receiver near the edge, and the muzzle near and below screen centre. ADS remains the existing sight-line pose. References: Claude's J19 p20 holds and the earlier `review/GP-20018/hip-sweep-*` gameplay study.

The capture harness applies hip values in memory and records 1280×720 WebGPU hip and ADS PNGs for M4, AK, shotgun, AA12, and sniper. Each of `before`, `candidate-a`, `candidate-b`, `candidate-c`, and `candidate-d` produced 10 frames with zero page errors through the shared game-test slot. `samples.json` in each directory records active viewmodel and pose values.

Final source uses candidate D for M4, AK, shotgun and AA12. The sniper uses `[0.23, -0.28, -0.57]`, yaw `0`, pitch `0.025`, roll `0.09`, because larger hip rotations failed the scope-axis check at ADS 0.80. No model, grip, ADS, or non-hip pose changed.

Review the five `after/*-hip.png` against `before/*-hip.png` and `after/*-ads.png`. The final `tcl281` gate passed 153/0. The sniper is the main point for Claude's visual judgment.
