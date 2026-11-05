@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE
node tools/tests/run-all.mjs t215 t95 t80 t74 t77 t78 t83 t85 t148 t27 t108 t143 tcl275a --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t215 t95 t74 t77 t78 t83 t85 t80 t108 t143 t148
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE
