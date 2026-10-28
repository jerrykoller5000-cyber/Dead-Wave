@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-240 --checks "t69 x2 real renderer + negative control (game-time wait)" --minutes 45 -- node tools/realtest.mjs t69 t69 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\r2-real.log" 2>&1
node crew/crew.mjs slot run grokbot GB-240 --checks "negative control: a wave that never comes out must still fail" --minutes 30 -- node "qa/2026-10-28-GB-240/negctl.mjs" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\r2-negctl.log" 2>&1
node crew/crew.mjs slot run grokbot GB-240 --checks "t69 test page (same game-time wait)" --minutes 30 -- node tools/tests/run-all.mjs t69 --jobs 1 --all-fails > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\r2-page.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\ran2.txt"
