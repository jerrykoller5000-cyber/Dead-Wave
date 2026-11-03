@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
copy /y qa\2026-11-02-GB-253\index.fix1.html index.html >nul
echo === FIX (1) ONLY: T80 x5
for /L %%i in (1,1,5) do node tools/tests/run-all.mjs t80 --jobs 1 --all-fails --no-retry
echo === FIX (1) ONLY: t215 t95
node tools/tests/run-all.mjs t215 t95 --jobs 1 --all-fails
copy /y qa\2026-11-02-GB-253\index.gb253d.html index.html >nul
echo === GB253: T80 x5
for /L %%i in (1,1,5) do node tools/tests/run-all.mjs t80 --jobs 1 --all-fails --no-retry
echo === GB253: testpage zombies
node tools/tests/run-all.mjs t148 tcl275a t27 t74 t77 t78 t83 t85 t215 t95 --jobs 1 --all-fails
echo === GB253: REAL
node tools/realtest.mjs t215 t95 t74 t80
echo === GB253: SMOKE
node tools/smoke-real.mjs
echo === END
