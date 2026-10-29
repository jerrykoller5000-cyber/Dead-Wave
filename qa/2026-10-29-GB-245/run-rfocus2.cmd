@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 downward reload framing, 4-state per-hand pixels, ak" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus2.mjs ak 0.35,0.5,0.65 qa/2026-10-29-GB-245/grid8.json rfocus2 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus2.txt"