@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 sniper u0.8 dropout: cant and lift variants, per-hand pixels" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus2.mjs sniper 0.65,0.8,0.9 qa/2026-10-29-GB-245/grid13.json rfocus6 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus6.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus6.txt"