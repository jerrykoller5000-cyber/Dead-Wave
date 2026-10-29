@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 grid: negative cant x turn at up 0.1 in 0.16, glove pixels, m4 aa12 sniper" --minutes 30 -- node qa/2026-10-29-GB-245/grid.mjs grid3 m4,aa12,sniper 0.2,0.35,0.5,0.65 qa/2026-10-29-GB-245/grid3.json > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\grid3.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-grid3.txt"
