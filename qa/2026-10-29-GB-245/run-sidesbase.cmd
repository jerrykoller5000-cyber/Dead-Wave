@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 per-hand baseline, all nine guns, at rest and mid-reload" --minutes 30 -- node qa/2026-10-29-GB-245/sidesbase.mjs > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\sidesbase.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-sidesbase.txt"