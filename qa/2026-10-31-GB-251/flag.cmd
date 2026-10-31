@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
:wait
if exist "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\probe.done" goto go
timeout /t 30 /nobreak > nul
goto wait
:go
set CHROME_ARGS=--js-flags=--max-optimized-bytecode-size=200000
node crew/crew.mjs slot run grokbot GB-251 --checks "GB-251 probe: same night 20 --alloc x3 with V8 allowed to optimize big functions (CHROME_ARGS js-flags)" --minutes 30 -- cmd /c "node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-flag-0.log 2>&1 && node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-flag-1.log 2>&1 && node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-flag-2.log 2>&1" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\flag.slot.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\flag.done"
