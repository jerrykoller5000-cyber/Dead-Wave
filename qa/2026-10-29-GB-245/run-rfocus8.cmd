@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 uzi stage 2: lift toward the magwell, per-hand glove pixels at 6 reload points" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus2.mjs uzi 0.1,0.25,0.4,0.55,0.7,0.85 qa/2026-10-29-GB-245/grid15.json rfocus8 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus8.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus8.txt"
