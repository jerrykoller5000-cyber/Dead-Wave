@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 seat sweep: ak+aa12 support hand at the well, side+tip candidates" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2d.mjs ak,aa12 0.1,0.16,0.22,0.4,0.48,0.55,0.62,0.7 qa/2026-10-29-GB-245/grid24.json seat4 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\seat4.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-seat4.txt"
