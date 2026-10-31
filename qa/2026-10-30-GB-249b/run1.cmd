@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up run 1: t111 and t76 alone, test page" --minutes 20 -- node tools/tests/run-all.mjs t111 t76 --jobs 1 --all-fails --agent grokbot --task GB-249 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249b\page-run1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up probe: how roundInfoDbg reads each head (temporary tgbprobe111, its lines print as FAIL PROBE), test page" --minutes 10 -- node tools/tests/run-all.mjs tgbprobe111 --jobs 1 --all-fails --no-retry --agent grokbot --task GB-249 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249b\page-probe1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up run 1: t111 and t76 alone plus the head probe, real renderer" --minutes 30 -- node tools/realtest.mjs t111 t76 tgbprobe111 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249b\real-run1.log" 2>&1
del "C:\Users\Zero\Desktop\Tiny Trek\tools\tests\tgbprobe111.js"
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249b\run1.done"
