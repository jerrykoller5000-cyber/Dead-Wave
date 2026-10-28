@echo off
node tools/realtest.mjs t215 t95
node tools/tests/run-all.mjs t282 --jobs 1

