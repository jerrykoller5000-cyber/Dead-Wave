@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
copy /y index.html qa\2026-11-02-GB-253\index.gb253.html >nul
copy /y qa\2026-11-02-GB-253\index.revert.html index.html >nul
echo === T80 REVERTED
node tools/tests/run-all.mjs t80 --jobs 1 --all-fails
copy /y qa\2026-11-02-GB-253\index.gb253.html index.html >nul
echo === RESTORED
