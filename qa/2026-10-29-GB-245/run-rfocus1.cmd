@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 firing-hand search: cant and muzzle dip both ways, ak, per-hand pixels" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus.mjs ak 0.35,0.5,0.65 qa/2026-10-29-GB-245/grid7.json rfocus1 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus1.txt"