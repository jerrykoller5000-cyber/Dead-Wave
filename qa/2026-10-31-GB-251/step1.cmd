@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
copy /y qa\2026-10-31-GB-251\index.after2.html index.html > nul
node qa\2026-10-31-GB-251\check.mjs index.html qa\2026-10-31-GB-251\index.after.html "%TEMP%\gb251-inline.mjs" > qa\2026-10-31-GB-251\check.log 2>&1
if errorlevel 1 goto bad
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-split-0.log 2>&1
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-split-1.log 2>&1
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-split-2.log 2>&1
exit /b 0
:bad
copy /y qa\2026-10-31-GB-251\index.after.html index.html > nul
echo RESTORED >> qa\2026-10-31-GB-251\check.log
exit /b 1
