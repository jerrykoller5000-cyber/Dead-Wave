@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === REAL t215 t95 t188
node tools/realtest.mjs t215 t95 t188 --all
echo === REAL surrounding hold, hand and viewmodel tests
node tools/realtest.mjs t107 t180 t185 t189 t195 t202 t228 t249 t54 t68 t77 t23 t298 tcl281 tcl301 --all
echo === TESTPAGE same
node tools/tests/run-all.mjs t215 t95 t188 t107 t180 t185 t189 t195 t202 t228 t249 t54 t68 t77 t23 t298 --jobs 1 --all-fails
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE