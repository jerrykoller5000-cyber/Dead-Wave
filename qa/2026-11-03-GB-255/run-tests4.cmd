@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE t215 t95 t76 t80
node tools/tests/run-all.mjs t215 t95 t76 t80 --jobs 1 --all-fails
echo === GRAZE CHAINS x3 pages
node tools/realtest.mjs tgb255g tgb255g tgb255g --all
echo === REAL t80 x2 + t215 t95 t76
node tools/realtest.mjs t80 t80 t215 t95 t76
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE
