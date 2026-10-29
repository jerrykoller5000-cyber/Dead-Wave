@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 tuning sweep 1: reload lift and tilt, glove pixels per hand" --minutes 40 -- node qa/2026-10-29-GB-245/tune.mjs sweep1 qa/2026-10-29-GB-245/sets1.json m4,sniper,aa12 0.35,0.65 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\sweep1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-sweep1.txt"
