@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === T76 REAL x6
node tools/realtest.mjs t76 t76 t76 t76 t76 t76
echo === TESTPAGE
node tools/tests/run-all.mjs t76 t215 t95 t80 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t215 t95 t80
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE