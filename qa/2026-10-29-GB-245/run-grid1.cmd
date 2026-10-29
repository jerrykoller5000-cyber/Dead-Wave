@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 grid: tip x cant x up x in, glove pixels, m4 aa12 sniper" --minutes 45 -- node qa/2026-10-29-GB-245/grid.mjs grid1 m4,aa12,sniper 0.35,0.6 qa/2026-10-29-GB-245/grid1.json > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\grid1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-grid1.txt"
