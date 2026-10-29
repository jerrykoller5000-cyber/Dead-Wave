@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 weak guns: cant/lift variants for aa12 and launcher, per-hand pixels" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2.mjs aa12,launcher 0.2,0.35,0.5,0.65,0.8 qa/2026-10-29-GB-245/grid12.json rfocus5 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus5.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus5.txt"