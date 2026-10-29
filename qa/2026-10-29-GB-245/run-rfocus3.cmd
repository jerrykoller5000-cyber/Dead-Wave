@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 keep-the-gun-at-rest test: reload mount tilt off, small cant, per-hand pixels" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2.mjs ak 0.2,0.35,0.5,0.65,0.8 qa/2026-10-29-GB-245/grid9.json rfocus3 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus3.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus3.txt"