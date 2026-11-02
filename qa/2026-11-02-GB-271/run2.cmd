@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node tools/tests/run-all.mjs tgb271 --jobs 1 --all-fails
node tools/tests/run-all.mjs t74 t71 t75 t76 t77 t78 t83 t85 t98 t108 t109 t139 t143 t148 t215 t95 --jobs 1 --all-fails
node tools/tests/run-all.mjs t74 --jobs 1 --all-fails
node tools/tests/run-all.mjs t74 --jobs 1 --all-fails
node tools/realtest.mjs t74 t215 t95
node tools/smoke-real.mjs
