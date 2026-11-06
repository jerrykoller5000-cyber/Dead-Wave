GB-280 working notes (Grokbot, 2026-11-05 ~10:05 PM CST)

## Root cause
1. **Stale local matrices on skinned bones (main):** `skinZombieMesh` sets `matrixAutoUpdate=false` on the joint groups. `restore()` copied position/quaternion back but did not `updateMatrix()`, so the next `pose()` sampled AB from the previous keyed world matrices. Hips then drifted tens of metres under the mesh; the visible `zombie-skin` kept showing the bind/walk pose (fists up) while dbg points looked "correct" relative to the drifted skeleton.
2. **Knocked conflated with spawn-emerge:** `rising` included `knocked`, so the claw-up-from-ground arm pose (`armBase - 1.4`) ran through the whole knockdown/get-up. Key offsets are relative to that raised base; at u~1 (zero offsets) arms stayed above the shoulders instead of idle.
3. **Aim mapping:** live aim used current-pivot→S[end]; studio uses S[a]→S[b]. Aligned to studio (plus lastW).

## Fix
- `combat/brute-getup.js`: bindP for pelvis (baseHipsY); restore + pose start call `updateMatrix()` on every segment before AB sample; aim uses S-to-S + lastW like studio/motion.js; points() updates matrices before read.
- `index.html`: riseOff + claw-up arms gated on `z.riseT > 0` only (not knocked).
- `tools/tests/t330.js`: hands within a hand's height (0.50 m) of the ground at u 0.4-0.55.

## Verification
- after-knock probe: hips stable (~0.67-0.84 mid, 1.14 end); hands near ground mid get-up.
- review/GB-280/after-fix/: side/q at u 0.25/0.4/0.55/0.7/0.97 — hands plant mid, arms near idle at end.
- t330 real renderer: 18/0 twice (worst hands ~0.29-0.38 m of 0.50).

## Do NOT run GB-278 here (paused after batch 14).