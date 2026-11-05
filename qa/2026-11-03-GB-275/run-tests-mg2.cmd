@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === SWEEP current hold
node qa/2026-11-03-GB-275/sweep.mjs qa/2026-11-03-GB-275/cands11.json qa/2026-11-03-GB-275/sweep11.json
echo === AFTER shots and probe
node qa/2026-11-03-GB-275/drive-minigun.mjs after
echo === REAL remaining hold, hand and viewmodel tests
node tools/realtest.mjs t228 t249 t54 t68 t77 t23 t298 tcl281 tcl301 --all
echo === TESTPAGE same
node tools/tests/run-all.mjs t215 t95 t188 t107 t180 t185 t189 t195 t202 t228 t249 t54 t68 t77 t23 t298 --jobs 1 --all-fails
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE
