@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 probe: the shambler's head read four ways (no test, no game file)" --minutes 15 -- node qa/2026-10-29-GB-249/probe-runner.mjs --html index.html qa/2026-10-29-GB-249/probe.js --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\probe1.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\probe1.done"
