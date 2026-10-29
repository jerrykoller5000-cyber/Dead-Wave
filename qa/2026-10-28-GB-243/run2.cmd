@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-243 --checks "t15 t76 t80 real renderer x3 (after t76 cadence)" --minutes 60 -- node tools/realtest.mjs t15 t76 t80 t15 t76 t80 t15 t76 t80 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-243\real2.log" 2>&1
node crew/crew.mjs slot run grokbot GB-243 --checks "t15 t76 t80 test page" --minutes 30 -- node tools/tests/run-all.mjs t15 t76 t80 --jobs 1 --all-fails > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-243\page2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-243\ran2.txt"
