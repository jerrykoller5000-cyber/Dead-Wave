@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === PROBE GB253
node tools/tests/run-all.mjs tgb253 t80 --jobs 1 --all-fails --no-retry
copy /y index.html qa\2026-11-02-GB-253\index.gb253b.html >nul
copy /y qa\2026-11-02-GB-253\index.pre2.html index.html >nul
echo === PROBE REVERTED
node tools/tests/run-all.mjs tgb253 t80 --jobs 1 --all-fails --no-retry
copy /y qa\2026-11-02-GB-253\index.gb253b.html index.html >nul
echo === RESTORED
