@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 sweep 2: reload lift x tilt in pixels, aa12 sniper ak" --minutes 40 -- node qa/2026-10-29-GB-245/tune2.mjs sweep2 qa/2026-10-29-GB-245/sets2.json 0.2,0.35,0.5,0.65 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\sweep2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-sweep2.txt"
