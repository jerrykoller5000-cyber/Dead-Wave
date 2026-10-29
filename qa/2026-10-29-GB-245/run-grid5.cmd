@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 grid5: small muzzle dip, glove pixels, m4 aa12 sniper launcher" --minutes 45 -- node qa/2026-10-29-GB-245/grid.mjs grid5 m4,aa12,sniper,launcher 0.35,0.5,0.65,0.8 qa/2026-10-29-GB-245/grid5.json > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\grid5.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-grid5.txt"