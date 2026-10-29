@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 grid6: high lift, per-hand glove pixels, m4 aa12 sniper" --minutes 45 -- node qa/2026-10-29-GB-245/sides.mjs grid6 m4,aa12,sniper 0.2,0.35,0.5,0.65,0.8 qa/2026-10-29-GB-245/grid6.json > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\grid6.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-grid6.txt"