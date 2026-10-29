@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 grid 2: sideways x lift x pull-in x cant, glove pixels" --minutes 45 -- node qa/2026-10-29-GB-245/grid.mjs grid2 m4,aa12,sniper 0.35,0.6 qa/2026-10-29-GB-245/grid2.json > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\grid2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-grid2.txt"
