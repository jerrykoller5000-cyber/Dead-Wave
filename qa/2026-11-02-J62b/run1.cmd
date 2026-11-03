@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE
node tools/tests/run-all.mjs t215 t95 t38 t105 t121 t122 t146 t150 t180 t187 t188 t189 t194 t195 t217 t218 t221 t228 t229 t242 t262 t283 tcl281 t277 t284 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs tcl281 t277
echo === SMOKE
node tools/smoke-real.mjs
echo === END