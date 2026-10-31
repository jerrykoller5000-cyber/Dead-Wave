@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 before shots: pistol and uzi mags, both views" --minutes 25 -- node qa/2026-10-31-GB-260/shots.mjs after > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\shots-after.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-shots-after.txt"