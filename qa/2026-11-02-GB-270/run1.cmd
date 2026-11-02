@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node tools/tests/run-all.mjs t222 t215 t95 --jobs 1 --all-fails
node tools/tests/run-all.mjs t222 --jobs 1 --all-fails
node tools/realtest.mjs t222 --all
