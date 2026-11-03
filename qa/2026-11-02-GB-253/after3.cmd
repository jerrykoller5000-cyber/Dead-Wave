@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE
node tools/tests/run-all.mjs t80 t148 tcl275a t27 t215 t95 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t215 t95 t74
echo === SMOKE
node tools/smoke-real.mjs
