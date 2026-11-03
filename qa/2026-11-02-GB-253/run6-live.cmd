@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === LIVE index.html: T80 x5
for /L %%i in (1,1,5) do node tools/tests/run-all.mjs t80 --jobs 1 --all-fails --no-retry
echo === LIVE: testpage zombies
node tools/tests/run-all.mjs t148 tcl275a t27 t74 t77 t78 t83 t85 t215 t95 --jobs 1 --all-fails
echo === LIVE: REAL
node tools/realtest.mjs t215 t95 t74 t80
echo === LIVE: SMOKE
node tools/smoke-real.mjs
echo === END
