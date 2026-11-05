@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === T76 TESTPAGE x3
node tools/tests/run-all.mjs t76 --jobs 1 --all-fails
node tools/tests/run-all.mjs t76 --jobs 1 --all-fails
node tools/tests/run-all.mjs t76 --jobs 1 --all-fails
echo === GRAZE CURRENT
node tools/realtest.mjs tgb255f --all
echo === GRAZE BEFORE
set TT_PAGE=zz-gb255-before.html
node qa\2026-11-03-GB-255\realpage.mjs tgb255f --all
echo === DONE