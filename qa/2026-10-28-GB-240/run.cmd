@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-240 --checks "t69 x2 + t75 x3, real renderer (t69 at the HQ for the night-1 claw-up hold; t75 after GP-19977)" --minutes 30 -- node tools/realtest.mjs t69 t69 t75 t75 t75 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\real.log" 2>&1
node crew/crew.mjs slot run grokbot GB-240 --checks "t69 on the test page (same wait)" --minutes 15 -- node tools/tests/run-all.mjs t69 --jobs 1 --all-fails > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\page.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-240\ran.txt"