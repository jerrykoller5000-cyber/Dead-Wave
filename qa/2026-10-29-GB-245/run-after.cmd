@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 after: glove pixels per reload frame, 9 guns" --minutes 40 -- node "qa/2026-10-29-GB-245/probe.mjs" after > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\after.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-after.txt"