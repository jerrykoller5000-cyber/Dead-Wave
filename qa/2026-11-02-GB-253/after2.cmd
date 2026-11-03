@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === TESTPAGE
node tools/tests/run-all.mjs t108 t112 t114 t119 t205 t210 t247 t267 t270 t300 t43 t78 t80 t93 t96 t71 t74 t77 t83 t85 t143 t148 t215 t95 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t74 t77 t78 t83 t85 t108 t143 t215 t95
echo === SMOKE
node tools/smoke-real.mjs
