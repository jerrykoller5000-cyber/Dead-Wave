@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 seat sweep: m4 support-hand glove px at the well vs side shift" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2c.mjs m4 0.12,0.16,0.45,0.52,0.6,0.66 qa/2026-10-29-GB-245/grid22.json seat2 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\seat2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-seat2.txt"
