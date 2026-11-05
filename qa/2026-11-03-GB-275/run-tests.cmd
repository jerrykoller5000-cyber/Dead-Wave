@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === REAL t188 x2
node tools/realtest.mjs t188 t188 --all
echo === REAL surrounding chainsaw and hold tests
node tools/realtest.mjs t215 t95 t107 t180 t185 t189 t195 t202 t228 t249 t54 t68 t77 t23 tcl281 --all
echo === TESTPAGE same
node tools/tests/run-all.mjs t215 t95 t107 t180 t185 t189 t195 t202 t228 t249 t54 t68 t77 t23 --jobs 1 --all-fails
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE