@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE
node tools/tests/run-all.mjs t215 t95 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t215 t95
echo === SMOKE
node tools/smoke-real.mjs
