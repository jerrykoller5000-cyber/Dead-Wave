@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
:wait
if exist "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\run.done" goto go
timeout /t 30 /nobreak > nul
goto wait
:go
node crew/crew.mjs slot run grokbot GB-251 --checks "GB-251 probe: own-key count of the live zombies at night 20 (--eval, 10 s)" --minutes 15 -- node tools/bench.mjs --night 20 --gfx high --seconds 10 --eval qa\2026-10-31-GB-251\keys.eval.js > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\keys.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-251\probe.done"