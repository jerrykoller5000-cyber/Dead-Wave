@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 control: can the per-hand count see the firing glove at all" --minutes 25 -- node qa/2026-10-29-GB-245/sidescheck.mjs > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\sidescheck.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-sidescheck.txt"