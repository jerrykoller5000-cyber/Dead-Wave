@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-244 --checks "t282 real renderer, run 1 of 2" --minutes 40 -- node tools/realtest.mjs t282 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-244\r1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-244 --checks "t282 real renderer, run 2 of 2" --minutes 40 -- node tools/realtest.mjs t282 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-244\r2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-244\ran.txt"
