@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 seat sweep: aa12 support hand below its drum: higher lift and tip" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2d.mjs aa12 0.1,0.16,0.22,0.4,0.48,0.55,0.62,0.7 qa/2026-10-29-GB-245/grid25.json seat5 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\seat5.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-seat5.txt"
